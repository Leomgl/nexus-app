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
async function pendingKeys(){
 const handle=await db();
 return new Promise((resolve,reject)=>{
  const r=handle.transaction(DB_TABLE,"readonly").objectStore(DB_TABLE).getAllKeys();
  r.onsuccess=()=>resolve(r.result.filter(x=>typeof x==="string"&&
   x.startsWith("pending:entity:")).slice(0,128));
  r.onerror=()=>reject(r.error);
 });
}
let identityPromise=null;
async function secret(){
 if(!identityPromise){
  identityPromise=(async()=>{
   const saved=await read("hmac-secret");
   if(saved)return saved;
   const created=newNotificationIdentitySecret();
   await write("hmac-secret",created);
   return created;
  })().catch(error=>{identityPromise=null;throw error});
 }
 return identityPromise;
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
 // Resume durable local pending work once the isolated enrollment exists.
 void retryPending().catch(e=>console.warn("LINK pilot: pending retry deferred",e));
}
async function forgetStagingCredential(){
 await write("stagingCredential",null);
}
/** One-use invitation created by LINK Test after owner Face ID. No prod Hub
 * token or independent push permission is needed in Nexus. */
async function enrollStagingInvitation(value){
 if(!pilot())throw Error("PILOT_DISABLED");
 const invitation=String(value||"").trim().toLowerCase();
 if(!/^[a-f0-9]{64}$/.test(invitation))throw Error("CODE_TEST_INVALIDE");
 const response=await fetch(STAGING+"/api/v2/hub/enroll",{
  method:"POST",cache:"no-store",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({appId:"nexus",invitation})
 });
 const valueJSON=await response.json().catch(()=>null);
 if(!response.ok)throw Error(valueJSON?.error||"INSCRIPTION_STAGING_INDISPONIBLE");
 if(valueJSON?.appId!=="nexus"||!valueJSON?.transportEnabled||
    !/^[a-f0-9]{64}$/.test(valueJSON?.credential||"")||
    !(Date.parse(valueJSON?.expiresAt)>Date.now()))
  throw Error("INSCRIPTION_STAGING_INVALIDE");
 await configureStagingCredential(valueJSON.credential);
 return {enrolled:true,expiresAt:valueJSON.expiresAt};
}

async function resumeInflight(key){
 let outstanding=await read("inflight:"+key);
 if(!outstanding)return {status:"clear"};
 const token=await credential();
 if(!token)return {status:"local-only",phase:"inflight"};
 const client=createLinkNotificationClient({
  endpoint:STAGING,credentialProvider:async()=>token
 });
 let state=await read(key)||emptyEntityNotificationState();
 for(let i=outstanding.index;i<outstanding.changes.length;i++){
  let change=outstanding.changes[i];
  // A lost HTTP ACK can strand an older upsert in the durable outbox.
  // After its delivery window has passed, replaying that upsert would now
  // be rejected by LINK (INTENT_OUT_OF_WINDOW) on EVERY reconnection and
  // prevent the cancellation/next version behind it from proceeding.
  //
  // Instead, replace the command DURABLY with a higher-revision cancel.
  // This works whether LINK originally saw the upsert (cancel existing)
  // or never saw it (server creates a tombstone). Never send stale pushes.
  if(change.operation==="upsert"&&
     Date.parse(change.item.dueAt)<Date.now()-5*60*1000){
   if(change.item.revision>=1000000)throw Error("REVISION_EXHAUSTED");
   const revision=change.item.revision+1;
   change={
    operation:"cancel",item:{id:change.item.id,revision},
    journalEntry:{...change.journalEntry,revision,status:"cancelled"}
   };
   outstanding={
    ...outstanding,
    changes:outstanding.changes.map((entry,n)=>n===i?change:entry)
   };
   await write("inflight:"+key,outstanding);
  }
  await client.submit(change);
  // A successful server write and a lost client ACK are both retried with
  // the same opaque ID/revision. The server is idempotent.
  state=applyEntityNotificationAck(state,change);
  await write(key,state);
  await write("inflight:"+key,{changes:outstanding.changes,index:i+1});
 }
 await write("inflight:"+key,null);
 return {status:"synced",writes:outstanding.changes.length};
}
async function deliverDelta(key,target){
 // NEVER plan a newer desired state before replaying any unresolved write:
 // an upsert may have reached LINK even if our local journal missed its ACK.
 const oldInflight=await resumeInflight(key);
 if(oldInflight.status==="local-only")return oldInflight;
 const old=await read(key)||emptyEntityNotificationState();
 const planned=await planEntityNotifications({
  secret:await secret(),appId:"nexus",entityId:target.entityId,
  schedule:target.schedule,eventAt:target.eventAt,
  category:target.category,previous:old
 });
 await write(key,planned.state); // persist epochs BEFORE any request
 if(!planned.changes.length)return {status:"unchanged",writes:0};
 // Crash-safe durable command outbox is written before the first fetch.
 await write("inflight:"+key,{changes:planned.changes,index:0});
 return resumeInflight(key);
}
async function transmit(key,target){
 let next=target;
 if(next.resetFirst){
  // A previous cancellation may have reached LINK without local ACK.
  // Replay it, then finish cancellation before minting fresh IDs.
  const reset=await deliverDelta(key,{
   ...next,schedule:emptyNotificationSchedule(),resetFirst:false
  });
  if(reset.status==="local-only")return reset;
  next={...next,resetFirst:false};
  await write("pending:"+key,next);
 }
 const result=await deliverDelta(key,next);
 if(result.status!=="local-only")await write("pending:"+key,null);
 return result;
}
async function sync(item,kind,{removed=false}={}){
 if(!pilot())return {status:"disabled"};
 if(!["event","task"].includes(kind)||!item?.id)return {status:"invalid"};
 const key=idOf(item,kind);
 return serial(key,async()=>{
  const raw=removed?emptyNotificationSchedule():enabledSchedule(item,kind);
  const schedule=kind==="task"&&item.done?{...raw,enabled:false}:raw;
  const previousPending=await read("pending:"+key);
  const target={
   entityId:item.id,
   kind,
   schedule,
   eventAt:eventAt(item,kind),
   category:kind==="event"?"appointment":"reminder",
   resetFirst:schedule.enabled===true&&(
    previousPending?.resetFirst===true||
    previousPending?.schedule?.enabled===false)
  };
  // A private local outbox records the most recent desired state, not a
  // business title, content, or push subscription. It is retried only on
  // explicit edits, reconnection, visibility or staging enrollment.
  await write("pending:"+key,target);
  return transmit(key,target);
 });
}
async function retryPending(){
 if(!pilot()||!await credential())return {retried:0};
 let retried=0;
 for(const pendingKey of await pendingKeys()){
  const key=pendingKey.slice("pending:".length);
  await serial(key,async()=>{
   const target=await read(pendingKey);
   if(!target)return;
   await transmit(key,target);
   retried++;
  });
 }
 return {retried};
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
 configureStagingCredential,forgetStagingCredential,enrollStagingInvitation,
 retryEntity:onEntityChanged,retryPending
});
window.NexusLinkNotifyPilot=adapter;
// Event-driven offline recovery. No interval, cron, or global business-data
// scan: if the local outbox is empty this makes ZERO LINK/D1 requests.
window.addEventListener("online",()=>void retryPending().catch(()=>{}));
document.addEventListener("visibilitychange",()=>{
 if(!document.hidden)void retryPending().catch(()=>{});
});

/** Deliberately small lab control surface, visible ONLY with opt-in URL.
 * Never asks for an Apple Push subscription or touches production LINK.
 */
function showStagingPilotPanel(){
 if(!pilot()||typeof document.createElement!=="function"||!document.body)return;
 const host=document.createElement("aside");
 host.setAttribute("aria-label","Pilote notifications LINK staging");
 host.style.cssText="position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom) + 15px);z-index:99999;max-width:min(390px,calc(100vw - 24px));font:14px system-ui,sans-serif;color:#f7f7fb;";
 const toggle=document.createElement("button");
 toggle.textContent="🔗 LINK · Test";
 toggle.type="button";
 toggle.style.cssText="font:inherit;color:white;background:#be241d;border:0;border-radius:12px;padding:12px 16px;min-height:44px;font-weight:700;box-shadow:0 5px 25px #0006;";
 host.append(toggle);
 const body=document.createElement("div");
 body.hidden=true;
 body.style.cssText="background:#10141f;border:1px solid #3d4251;border-radius:14px;padding:16px;margin-top:8px;box-shadow:0 5px 30px #0008;";
 const heading=document.createElement("strong");
 heading.textContent="Notifications via LINK Test";
 const note=document.createElement("p");
 note.textContent="Pilote isolé. Dans LINK Test → Face ID → Raccorder Nexus, crée une invitation valable 15 minutes et colle-la ici.";
 note.style.lineHeight="1.5";
 const label=document.createElement("label");
 label.textContent="Invitation unique de LINK Test";
 const input=document.createElement("input");
 input.type="password";input.placeholder="Coller le code à usage unique";
 input.setAttribute("autocomplete","off");input.setAttribute("spellcheck","false");
 input.style.cssText="width:100%;box-sizing:border-box;padding:12px;border:1px solid #4f5669;border-radius:9px;background:#1c2332;color:white;margin:8px 0;min-height:44px;font:inherit";
 const connect=document.createElement("button");
 connect.type="button";connect.textContent="Inscrire Nexus au staging";
 connect.style.cssText="border:0;border-radius:10px;background:#cf2a23;color:white;font:inherit;font-weight:700;min-height:44px;padding:12px;width:100%;margin-top:7px";
 const status=document.createElement("p");
 status.style.cssText="color:#c2c7d5;white-space:normal;font-size:12px;line-height:1.5";
 status.setAttribute("role","status");
 const refresh=async()=>{
  try{
   const known=await credential();
   status.textContent=known?
    "Liaison de test inscrite. LINK reste le seul distributeur Web Push.":
    "Non inscrit : aucune intention n'est envoyée au staging.";
  }catch{status.textContent="Stockage privé indisponible."}
 };
 toggle.addEventListener("click",()=>{
  body.hidden=!body.hidden;
  if(!body.hidden)void refresh();
 });
 connect.addEventListener("click",async()=>{
  connect.disabled=true;status.textContent="Validation de l'invitation…";
  try{
   await enrollStagingInvitation(input.value);
   input.value="";
   await refresh();
  }catch(error){
   status.textContent="LINK staging : "+String(error?.message||"connexion indisponible").slice(0,90);
  }finally{connect.disabled=false}
 });
 body.append(heading,note,label,input,connect,status);
 host.append(body);document.body.append(host);
}
if(typeof document.createElement==="function"&&pilot()){
 if(document.readyState==="loading")
  document.addEventListener("DOMContentLoaded",showStagingPilotPanel,{once:true});
 else showStagingPilotPanel();
}
