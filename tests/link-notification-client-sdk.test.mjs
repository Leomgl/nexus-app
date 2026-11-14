import test from "node:test";
import assert from "node:assert/strict";
import {nexusNotificationsFromLegacyJobs,planAppNotificationDeltas,
 applyAppNotificationAcknowledgement,createLinkNotificationClient}
 from "../link-notifications/notification-client-sdk.mjs";

const A="a".repeat(64),B="b".repeat(64);
const NOW="2026-11-14T12:00:00.000Z";
const at=minute=>new Date(Date.parse(NOW)+minute*60000).toISOString();
test("Nexus local context is reduced to opaque id, UTC and category, never title/dose/amount",()=>{
 const input={now:NOW,jobs:[
  {id:A,kind:"event",fireAt:Date.parse(at(8))/1000},
  {id:B,kind:"task",fireAt:Date.parse(at(9))/1000}
 ],contexts:{
  ["nexus-"+A.slice(0,16)]:{kind:"event",title:"SECRET_APPOINTMENT",location:"PRIVATE_LOCATION"},
  ["nexus-"+B.slice(0,16)]:{kind:"budget",title:"PRIVATE_AMOUNT",amountCents:60000}
 }};
 const output=nexusNotificationsFromLegacyJobs(input);
 assert.deepEqual(output.map(x=>x.category),["appointment","deadline"]);
 const wire=JSON.stringify(output);
 for(const value of ["SECRET_APPOINTMENT","PRIVATE_LOCATION","PRIVATE_AMOUNT","60000"])
  assert.ok(!wire.includes(value));
});
test("100 identical reminders produce zero commands; one moved reminder changes one row",()=>{
 const initial=[{id:A,dueAt:at(8),category:"reminder"}];
 let changes=planAppNotificationDeltas({previous:{},desired:initial,now:NOW});
 assert.equal(changes.length,1);
 assert.equal(changes[0].operation,"upsert");
 let journal=applyAppNotificationAcknowledgement({},changes[0]);
 for(let i=0;i<100;i++)
  assert.equal(planAppNotificationDeltas({previous:journal,desired:initial,now:NOW}).length,0);
 changes=planAppNotificationDeltas({previous:journal,
  desired:[{...initial[0],dueAt:at(18)}],now:NOW});
 assert.equal(changes.length,1);assert.equal(changes[0].item.revision,2);
 journal=applyAppNotificationAcknowledgement(journal,changes[0]);
 changes=planAppNotificationDeltas({previous:journal,desired:[],completeSnapshot:true,now:NOW});
 assert.equal(changes.length,1);assert.equal(changes[0].operation,"cancel");
 assert.equal(changes[0].item.revision,3);
 journal=applyAppNotificationAcknowledgement(journal,changes[0]);
 assert.equal(planAppNotificationDeltas({previous:journal,desired:[],now:NOW}).length,0);
 assert.throws(()=>planAppNotificationDeltas({previous:journal,desired:initial,now:NOW}),/OCCURRENCE_TERMINAL/);
});
test("only changed occurrence is touched, partial snapshots never cancel omissions",()=>{
 const previous={
  [A]:{id:A,dueAt:at(8),category:"reminder",revision:1,status:"pending"},
  [B]:{id:B,dueAt:at(9),category:"appointment",revision:1,status:"pending"}
 };
 const plan=planAppNotificationDeltas({previous,desired:[
  {id:A,dueAt:at(18),category:"reminder"},
  {id:B,dueAt:at(9),category:"appointment"}],now:NOW});
 assert.equal(plan.length,1);assert.equal(plan[0].item.id,A);
 const partial=planAppNotificationDeltas({previous,desired:[{id:A,dueAt:at(8),category:"reminder"}],now:NOW});
 assert.equal(partial.length,0);
 const full=planAppNotificationDeltas({previous,desired:[{id:A,dueAt:at(8),category:"reminder"}],completeSnapshot:true,now:NOW});
 assert.equal(full.length,1);assert.equal(full[0].operation,"cancel");
});
test("one client: credential stays in memory, only authenticated one-intent commands",async()=>{
 const calls=[];
 const client=createLinkNotificationClient({
  endpoint:"https://link-notifications-staging.q9pfwtztsc.workers.dev",
  credentialProvider:async()=>A,
  fetchImpl:async(url,opts)=>{
   calls.push({url,opts});
   if(url.endsWith("/capability"))return {ok:true,json:async()=>({
    schema:"link.notification.capability.v1",
    token:"temporary-token",expiresAt:new Date(Date.now()+300000).toISOString()
   })};
   return {ok:true,json:async()=>({schema:"link.notification.result.v1",changed:true})};
  }
 });
 let journal={},acked=0;
 const changes=planAppNotificationDeltas({previous:journal,desired:[{id:A,dueAt:at(9),category:"reminder"}],now:NOW});
 await client.flush({changes,onAck:async change=>{
  journal=applyAppNotificationAcknowledgement(journal,change);acked++;
 }});
 assert.equal(acked,1);assert.equal(calls.length,2);
 assert.equal(calls[0].opts.headers.Authorization,"Bearer "+A);
 const sent=JSON.parse(calls[1].opts.body);
 assert.deepEqual(Object.keys(sent).sort(),["items","operation","schema"]);
 assert.equal(sent.operation,"upsert");
 assert.equal(sent.items[0].id,A);
 assert.ok(!("appId" in sent));
 assert.equal(calls[1].opts.headers.Authorization,"Bearer temporary-token");
 const repeat=planAppNotificationDeltas({previous:journal,
  desired:[{id:A,dueAt:at(9),category:"reminder"}],now:NOW});
 assert.equal(repeat.length,0);
 await client.flush({changes:repeat,onAck:()=>{throw Error("should not ACK")}});
 assert.equal(calls.length,2);
});
test("failed network never confirms journal receipt",async()=>{
 const client=createLinkNotificationClient({
  endpoint:"https://link-notifications-staging.q9pfwtztsc.workers.dev",
  credentialProvider:async()=>A,
  fetchImpl:async()=>{throw Error("offline")}
 });
 const changes=planAppNotificationDeltas({desired:[{id:A,dueAt:at(8),category:"reminder"}],now:NOW});
 let acked=false;
 await assert.rejects(client.flush({changes,onAck:async()=>{acked=true}}),/offline/);
 assert.equal(acked,false);
});
test("never allow a credential to be sent to an untrusted notification origin",()=>{
 assert.throws(()=>createLinkNotificationClient({endpoint:"https://attacker.example",credentialProvider:async()=>A}),/INVALID_CLIENT_CONFIG/);
});