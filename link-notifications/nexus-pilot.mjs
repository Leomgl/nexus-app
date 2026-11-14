/**
 * Nexus-only pilot adapter for the shared LINK "Me notifier" editor.
 *
 * Disabled unless URL explicitly includes ?linkNotificationsPilot=1.
 * Never uses Nexus' legacy Web Push registration or production LINK Hub token.
 * Staging credentials are a separate, explicit enrollment test.
 */
import {
 emptyNotificationSchedule,validateNotificationSchedule
} from "./notification-schedule-config.mjs";
import "./notification-schedule-picker.mjs";
import {createLinkNotificationClient} from "./notification-client-sdk.mjs";
import {
 emptyEntityNotificationState,newNotificationIdentitySecret,
 planEntityNotifications,applyEntityNotificationAck
} from "./notification-entity-bridge.mjs";

const PILOT_QUERY="linkNotificationsPilot";
const STAGING="https://link-notifications-staging.q9pfwtztsc.workers.dev";
const STORE="nexus-link-notifications-pilot-v1";
const DB_TABLE="kv";
const queues=new Map();
const pilot=()=>new URL(location.href).searchParams.get(PILOT_QUERY)==="1";
const idOf=(item,kind)=>"entity:"+kind+":"+item.id;
const localIso=(date,time)=>{
 if(!date||!time)return null;
 const parsed=new Date(date+"T"+time+":00");
 return Number.isFinite(+parsed)?parsed.toISOString():null;
};
const eventAt=(item,kind)=>{
 if(kind==="event"){
  const parsed=new Date(item.start||"");
  return Number.isFinite(+parsed)?parsed.toISOString():null;
 }
 if(kind==="task"){
  if(!item.dueDate)return null;
  return localIso(item.dueDate,String(item.dueTime||"09:00").slice(0,5));
 }
 return null;
};
const enabledSchedule=(item,kind)=>{
 if(item.linkNotificationSchedule){
  try{return validateNotificationSchedule(item.linkNotificationSchedule)}
  catch(err){console.warn("LINK pilot: invalid saved schedule",err);return emptyNotificationSchedule()}
 }
 if(kind!=="event")return emptyNotificationSchedule();
 const mins=Array.isArray(item.reminderMinutes)?item.reminderMinutes:[60];
 const unique=[...new Set(mins.filter(n=>Number.isInteger(n)&&n>0&&n<=129600))].slice(0,5);
 return {
  schema:"link.notification.schedule.v1",
  enabled:unique.length>0,
  rules:unique.map(n=>({
   id:crypto.randomUUID(),kind:"relative",
   unit:n%1440===0?"days":n%60===0?"hours":"minutes",
   value:n%1440===0?n/1440:n%60===0?n/60:n
  }))
 };
};

let opening=null;
function db(){
 if(opening)return opening;
 opening=new Promise((resolve,reject)=>{
  const request=indexedDB.open(STORE,1);
  request.onupgradeneeded=()=>{
   if(!request.result.objectStoreNames.contains(DB_TABLE))
    request.result.createObjectStore(DB_TABLE);
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 }).catch(err=>{opening=null;throw err});
 return opening;
}
async function read(key){
 const handle=await db();
 return new Promise((resolve,reject)=>{
  const r=handle.transaction(DB_TABLE,"readonly").objectStore(DB_TABLE).get(key);
  r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);
 });
}
async function write(key,value){
 const handle=await db();
 return new Promise((resolve,reject)=>{
  const tx=handle.transaction(DB_TABLE,"readwrite");
  if(value===null)tx.objectStore(DB_TABLE).delete(key);
  else tx.objectStore(DB_TABLE).put(value,key);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
 });
}
async function secret(){
 const saved=await read("hmac-secret");
 if(saved)return saved;
 const created=newNotificationIdentitySecret();
 await write("hmac-secret",created);
 return created;
}
function serial(key,callback){
 const previous=queues.get(key)||Promise.resolve();
 const next=previous.catch(()=>{}).then(callback);
 queues.set(key,next);
 next.finally(()=>{if(queues.get(key)===next)queues.delete(key)}).catch(()=>{});
 return next;
}
async function credential(){
 const value=await read("stagingCredential");
 return typeof value==="string"&&/^[a-f0-9]{64}$/i.test(value)?value:null;
}
async function configureStagingCredential(value){
 if(!pilot())throw Error("LINK_PILOT_DISABLED");
 if(typeof value!=="string"||!/^[a-f0-9]{64}$/i.test(value))
  throw Error("INVALID_LINK_STAGING_CREDENTIAL");
 // A separate staging-only Hub enrollment is REQUIRED. Do not import the
 // existing production token from link-hub-adapter.js.
 await write("stagingCredential",value);
}
async function forgetStagingCredential(){
 await write("stagingCredential",null);
}
async function sync(item,kind,{removed=false}={}){
 if(!pilot())return {status:"disabled"};
 if(!["event","task"].includes(kind)||!item?.id)return {status:"invalid"};
 return serial(idOf(item,kind),async()=>{
  const key=idOf(item,kind),old=await read(key)||emptyEntityNotificationState();
  const raw=removed?emptyNotificationSchedule():enabledSchedule(item,kind);
  const config=kind==="task"&&item.done?{...raw,enabled:false}:raw;
  const planned=await planEntityNotifications({
   secret:await secret(),appId:"nexus",entityId:item.id,
   schedule:config,eventAt:eventAt(item,kind),
   category:kind==="event"?"appointment":"reminder",previous:old
  });
  // CRITICAL: persist new HMAC epochs before even attempting a network request.
  // This prevents repeated retries from generating orphan intent IDs.
  let state=planned.state;
  await write(key,state);
  if(!planned.changes.length)return {status:"unchanged",writes:0};
  const token=await credential();
  if(!token)return {status:"local-only",pending:planned.changes.length};
  const client=createLinkNotificationClient({
   endpoint:STAGING,credentialProvider:async()=>token
  });
  await client.flush({changes:planned.changes,onAck:async change=>{
   state=applyEntityNotificationAck(state,change);
   await write(key,state);
  }});
  return {status:"synced",writes:planned.changes.length};
 });
}
async function onEntityChanged(item,kind){
 try{return await sync(item,kind)}
 catch(err){console.warn("LINK pilot: sync deferred; retry required",err);return {status:"deferred"}}
}
async function onEntityRemoved(item,kind){
 try{return await sync(item,kind,{removed:true})}
 catch(err){console.warn("LINK pilot: cancellation deferred; retry required",err);return {status:"deferred"}}
}
function mount(form,item,kind){
 if(!pilot())return;
 const picker=form.querySelector("link-notify-picker");
 if(!picker)return;
 picker.value=enabledSchedule(item,kind);
 const update=()=>{
  if(kind==="event")picker.eventAt=localIso(form.elements.date?.value,form.elements.time?.value);
  else picker.eventAt=localIso(form.elements.dueDate?.value,form.elements.dueTime?.value||"09:00");
 };
 update();
 for(const key of kind==="event"?["date","time"]:["dueDate","dueTime"])
  form.elements[key]?.addEventListener("change",update);
}
function readFromForm(form){
 if(!pilot())return null;
 const picker=form.querySelector("link-notify-picker");
 return picker?validateNotificationSchedule(picker.value):null;
}
const adapter=Object.freeze({
 active:pilot,mount,readFromForm,
 onEntityChanged,onEntityRemoved,
 configureStagingCredential,forgetStagingCredential,
 retryEntity:onEntityChanged
});
window.NexusLinkNotifyPilot=adapter;
// No background polling. An app reconnection merely lets a user-triggered
// retry run; this pilot does not scan business data or call D1 on focus.
