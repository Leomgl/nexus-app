import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";

const original={
 crypto:globalThis.crypto,indexedDB:globalThis.indexedDB,
 HTMLElement:globalThis.HTMLElement,customElements:globalThis.customElements,
 window:globalThis.window,document:globalThis.document,
 location:globalThis.location,fetch:globalThis.fetch
};
globalThis.crypto=webcrypto;
const kv=new Map(),trace=[];
let created=false,loseFirstAck=true;
const fakeDB={
 objectStoreNames:{contains:()=>created},
 createObjectStore(){created=true},
 transaction(){
  const tx={oncomplete:null,onerror:null,objectStore(){
   return {
    get(key){const req={};queueMicrotask(()=>{req.result=kv.get(key);req.onsuccess?.()});return req},
    getAllKeys(){const req={};queueMicrotask(()=>{req.result=[...kv.keys()];req.onsuccess?.()});return req},
    put(value,key){queueMicrotask(()=>{kv.set(key,value);tx.oncomplete?.()})},
    delete(key){queueMicrotask(()=>{kv.delete(key);tx.oncomplete?.()})}
   };
  }};
  return tx;
 }
};
globalThis.indexedDB={
 open(){const req={};queueMicrotask(()=>{
  req.result=fakeDB;
  if(!created)req.onupgradeneeded?.();
  req.onsuccess?.();
 });return req}
};
globalThis.HTMLElement=class{};
const registrations=new Map();
globalThis.customElements={get:name=>registrations.get(name),
 define:(name,cls)=>registrations.set(name,cls)};
globalThis.location={href:"https://leomgl.github.io/nexus-app/?linkNotificationsPilot=1"};
const callbacks={};
globalThis.window={addEventListener:(type,cb)=>{callbacks[type]=cb}};
globalThis.document={addEventListener:(type,cb)=>{callbacks[type]=cb},hidden:false};
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{
 status,headers:{"content-type":"application/json"}
});
globalThis.fetch=async(url,init)=>{
 if(url.endsWith("/api/v2/notifications/capability")){
  trace.push({operation:"capability"});
  return json({schema:"link.notification.capability.v1",token:"staging-capability-test",
   expiresAt:new Date(Date.now()+600000).toISOString()});
 }
 if(url.endsWith("/api/v2/notifications/intents")){
  const body=JSON.parse(init.body);
  const item=body.items[0];
  trace.push({...item,operation:body.operation});
  // Simulate a successful server write followed by a lost HTTP ACK.
  if(loseFirstAck){loseFirstAck=false;throw Error("connection lost after server accepted upsert")}
  return json({schema:"link.notification.result.v1",applied:true});
 }
 throw Error("Unexpected fetch "+url);
};
const {default:unused}=await import("../link-notifications/nexus-pilot.mjs").then(
 x=>({default:x.default})
);
const pilot=globalThis.window.NexusLinkNotifyPilot;
const ruleId="00000000-0000-4000-8000-000000000001";
const deadline=new Date(Date.now()+2*86400000).toISOString();
const event={
 id:"opaque-nexus-fixture",start:deadline,
 title:"PRIVATE TITLE MUST NEVER LEAVE DEVICE",
 linkNotificationSchedule:{schema:"link.notification.schedule.v1",enabled:true,
  rules:[{id:ruleId,kind:"relative",unit:"minutes",value:15}]}
};

test("Nexus staging pilot is opt-in, not an implicit production activation",()=>{
 assert.equal(pilot.active(),true);
 assert.equal(registrations.has("link-notify-picker"),true);
});
test("lost upsert ACK -> delete replays old upsert before cancel; restore mints new ID",async()=>{
 await pilot.configureStagingCredential("a".repeat(64));
 const first=await pilot.onEntityChanged(event,"event");
 assert.equal(first.status,"deferred");
 assert.ok(kv.has("inflight:entity:event:"+event.id));
 const removed=await pilot.onEntityRemoved(event,"event");
 assert.equal(removed.status,"synced");
 const operations=trace.filter(x=>x.operation!=="capability");
 assert.equal(operations.length,3);
 assert.deepEqual(operations.map(x=>x.operation),["upsert","upsert","cancel"]);
 assert.equal(operations[0].id,operations[1].id);
 assert.equal(operations[1].id,operations[2].id);
 assert.equal(operations[2].revision,2);
 assert.ok(!kv.has("inflight:entity:event:"+event.id));
 const restored=await pilot.onEntityChanged(event,"event");
 assert.equal(restored.status,"synced");
 const newUpsert=trace.filter(x=>x.operation==="upsert").at(-1);
 assert.notEqual(newUpsert.id,operations[0].id);
 assert.equal(newUpsert.revision,1);
 assert.ok(!JSON.stringify(trace).includes("PRIVATE TITLE"));
});
test("unchanged 100 saves produce zero requests and zero D1 writes",async()=>{
 const before=trace.length;
 for(let i=0;i<100;i++){
  const result=await pilot.onEntityChanged(event,"event");
  assert.equal(result.status,"unchanged");
 }
 assert.equal(trace.length,before);
});
test("local queue is empty after an acknowledged run, so visibility retry sends zero requests",async()=>{
 assert.equal(kv.has("pending:entity:event:"+event.id),false);
 const before=trace.length;
 const result=await pilot.retryPending();
 assert.equal(result.retried,0);
 assert.equal(trace.length,before);
});
test.after(()=>{
 for(const [k,v] of Object.entries(original))
  if(v===undefined)delete globalThis[k];else globalThis[k]=v;
});
