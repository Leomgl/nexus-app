import test from "node:test";
import assert from "node:assert/strict";

const old={
 indexedDB:globalThis.indexedDB,HTMLElement:globalThis.HTMLElement,
 customElements:globalThis.customElements,location:globalThis.location,
 window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch
};
let created=false,offline=false;
const kv=new Map(),opened=[],calls=[];
const fakeDb={
 objectStoreNames:{contains:()=>created},
 createObjectStore(){created=true},
 transaction(){
  const tx={oncomplete:null,onerror:null,objectStore(){
   return {
    get(key){const r={};queueMicrotask(()=>{r.result=kv.get(key);r.onsuccess?.()});return r},
    getAllKeys(){const r={};queueMicrotask(()=>{r.result=[...kv.keys()];r.onsuccess?.()});return r},
    put(value,key){queueMicrotask(()=>{kv.set(key,value);tx.oncomplete?.()})},
    delete(key){queueMicrotask(()=>{kv.delete(key);tx.oncomplete?.()})}
   };
  }};
  return tx;
 }
};
globalThis.indexedDB={open(name){
 opened.push(name);
 const req={};
 queueMicrotask(()=>{req.result=fakeDb;
  if(!created)req.onupgradeneeded?.();
  req.onsuccess?.();
 });
 return req;
}};
globalThis.HTMLElement=class{};
const components=new Map();
globalThis.customElements={get:n=>components.get(n),
 define:(n,v)=>components.set(n,v)};
globalThis.location={href:"https://leomgl.github.io/nexus-app/index.html?linkNotificationsLive=1"};
const handlers={};
let delegated=0;
const capability={schema:"link.notification.capability.v1",token:"live-nexus-test-capability",
 expiresAt:new Date(Date.now()+600000).toISOString()};
globalThis.window={
 addEventListener:(name,cb)=>handlers[name]=cb,
 LinkHubAdapter:{
  notificationEnrollmentActive:async()=>true,
  notificationCapability:async()=>{delegated++;return capability}
 }
};
globalThis.document={addEventListener:(name,cb)=>handlers[name]=cb,hidden:false};
globalThis.fetch=async(url,options)=>{
 if(offline)throw Error("offline");
 assert.ok(url.startsWith("https://link-app.q9pfwtztsc.workers.dev"),
  "Live pilot may NEVER use the staging origin");
 assert.ok(url.endsWith("/api/v2/notifications/intents"));
 assert.equal(options.headers.Authorization,"Bearer "+capability.token);
 assert.ok(!JSON.stringify(options).includes("hubCredential"));
 const command=JSON.parse(options.body);
 calls.push({...command.items[0],operation:command.operation});
 return new Response(JSON.stringify({schema:"link.notification.result.v1",
  status:command.operation==="upsert"?"created":"cancelled",changed:true}));
};
await import("../link-notifications/nexus-pilot.mjs");
const pilot=globalThis.window.NexusLinkNotifyPilot;
const ruleId="00000000-0000-4000-8000-000000000067";
const event={
 id:"test-real-link",start:new Date(Date.now()+25*60000).toISOString(),
 title:"PRIVATE NAME MUST NOT LEAVE NEXUS",
 linkNotificationSchedule:{schema:"link.notification.schedule.v1",enabled:true,rules:[
  {id:ruleId,kind:"relative",unit:"minutes",value:2}
 ]}
};

test("real canary uses official GitHub Pages origin, separate local journal and delegated capability",async()=>{
 assert.equal(pilot.active(),true);
 assert.equal(pilot.mode(),"live");
 const r=await pilot.onEntityChanged(event,"event");
 assert.equal(r.status,"synced");
 assert.equal(calls.length,1);
 assert.equal(calls[0].operation,"upsert");
 assert.equal(calls[0].revision,1);
 assert.equal(delegated,1);
 assert.ok(opened.includes("nexus-link-notifications-live-canary-v1"));
 assert.ok(!opened.includes("nexus-link-notifications-pilot-v1"));
 assert.ok(!JSON.stringify(calls).includes("PRIVATE NAME"));
});

test("identical live edits have zero network calls and do not write again",async()=>{
 const before=calls.length;
 for(let i=0;i<30;i++)
  assert.equal((await pilot.onEntityChanged(event,"event")).status,"unchanged");
 assert.equal(calls.length,before);
});

test("live canary edit offline persists and replays only the changed occurrence",async()=>{
 const move={...event,start:new Date(Date.parse(event.start)+10*60000).toISOString()};
 offline=true;
 try{assert.equal((await pilot.onEntityChanged(move,"event")).status,"deferred")}
 finally{offline=false}
 const before=calls.length;
 const recovered=await pilot.retryPending();
 assert.equal(recovered.retried,1);
 const result=calls.slice(before);
 assert.equal(result.length,1);
 assert.equal(result[0].revision,2);
 assert.equal(result[0].id,calls[0].id);
 assert.ok(!kv.has("inflight:entity:event:"+event.id));
});

test("delete produces only an opaque cancel and cannot publish business content",async()=>{
 const prior=calls.length;
 const r=await pilot.onEntityRemoved(event,"event");
 assert.equal(r.status,"synced");
 const delta=calls.slice(prior);
 assert.equal(delta.length,1);
 assert.equal(delta[0].operation,"cancel");
 assert.equal(delta[0].revision,3);
 assert.equal(delta[0].id,calls[0].id);
 assert.ok(!JSON.stringify(delta).includes(event.title));
});

test.after(()=>{
 for(const [k,v] of Object.entries(old))
  if(v===undefined)delete globalThis[k];
  else globalThis[k]=v;
});
