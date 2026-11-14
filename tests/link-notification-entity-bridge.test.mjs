import test from "node:test";
import assert from "node:assert/strict";
import {
 newNotificationIdentitySecret,opaqueNotificationId,emptyEntityNotificationState,
 planEntityNotifications,applyEntityNotificationAck
} from "../link-notifications/notification-entity-bridge.mjs";
const schema="link.notification.schedule.v1";
const id0="00000000-0000-4000-8000-000000000001";
const id1="00000000-0000-4000-8000-000000000002";
const day="2026-11-15T12:00:00.000Z";
const now="2026-11-14T12:00:00.000Z";
const secret=newNotificationIdentitySecret();
const schedule=(rules,enabled=true)=>({schema,enabled,rules});
const relative=(ruleId=id0,value=30)=>({id:ruleId,kind:"relative",unit:"minutes",value});
const absolute=(ruleId=id1,at="2026-11-15T11:00:00.000Z")=>({id:ruleId,kind:"fixed",at});
const ctx={secret,appId:"nexus",entityId:"private-calendar-item-42",category:"appointment",now};
const ackAll=(state,changes)=>changes.reduce((s,c)=>applyEntityNotificationAck(s,c),state);

test("stable opaque HMAC: deterministic, salted, does not disclose business identifier",async()=>{
 const args={...ctx,ruleId:id0,epoch:"v1",occurrenceId:"single"};
 const a=await opaqueNotificationId(args),b=await opaqueNotificationId(args);
 const c=await opaqueNotificationId({...args,secret:newNotificationIdentitySecret()});
 assert.equal(a,b);assert.match(a,/^[a-f0-9]{64}$/);
 assert.notEqual(a,c);assert.ok(!a.includes(ctx.entityId));
});
test("same Nexus event and five settings re-sync 100 times with zero writes",async()=>{
 const rules=[relative(id0),absolute(id1)];
 let result=await planEntityNotifications({...ctx,schedule:schedule(rules),eventAt:day});
 assert.equal(result.changes.length,2);
 let state=ackAll(result.state,result.changes);
 for(let i=0;i<100;i++){
  result=await planEntityNotifications({...ctx,schedule:schedule(rules),eventAt:day,previous:state});
  assert.deepEqual(result.changes,[]);
  state=result.state;
 }
 assert.equal(Object.keys(state.journal).length,2);
});
test("moving event changes only relative reminder, stable opaque ID and increased revision",async()=>{
 const rules=[relative(id0),absolute(id1)];
 let result=await planEntityNotifications({...ctx,schedule:schedule(rules),eventAt:day});
 let state=ackAll(result.state,result.changes);
 const oldByDate=Object.fromEntries(Object.values(state.journal).map(x=>[x.dueAt,x]));
 result=await planEntityNotifications({...ctx,schedule:schedule(rules),
  eventAt:"2026-11-16T12:00:00.000Z",previous:state});
 assert.equal(result.changes.length,1);
 assert.equal(result.changes[0].operation,"upsert");
 assert.equal(result.changes[0].item.revision,2);
 const existing=oldByDate["2026-11-15T11:30:00.000Z"];
 assert.equal(result.changes[0].item.id,existing.id);
});
test("OFF cancels once, re-enabling uses a new epoch instead of terminal ID",async()=>{
 let result=await planEntityNotifications({...ctx,schedule:schedule([relative()]),eventAt:day});
 let state=ackAll(result.state,result.changes);
 const old=result.changes[0].item.id;
 result=await planEntityNotifications({...ctx,schedule:schedule([relative()],false),eventAt:day,previous:state});
 assert.deepEqual(result.changes.map(c=>c.operation),["cancel"]);
 state=ackAll(result.state,result.changes);
 assert.equal(Object.keys(state.journal).length,0);
 result=await planEntityNotifications({...ctx,schedule:schedule([relative()],false),eventAt:day,previous:state});
 assert.equal(result.changes.length,0);
 result=await planEntityNotifications({...ctx,schedule:schedule([relative()]),eventAt:day,previous:state});
 assert.equal(result.changes.length,1);
 assert.notEqual(result.changes[0].item.id,old);
});
test("deleted rule cancels just that rule; no full-app snapshot and no duplicates",async()=>{
 let result=await planEntityNotifications({...ctx,schedule:schedule([relative(id0),absolute(id1)]),eventAt:day});
 let state=ackAll(result.state,result.changes);
 const previousIDs=Object.keys(state.journal);
 result=await planEntityNotifications({...ctx,schedule:schedule([absolute(id1)]),eventAt:day,previous:state});
 assert.equal(result.changes.length,1);assert.equal(result.changes[0].operation,"cancel");
 state=ackAll(result.state,result.changes);
 assert.equal(Object.keys(state.journal).length,1);
 assert.equal(state.journal[previousIDs.find(x=>x!==result.changes[0].item.id)].revision,1);
});
test("offline never ACKs and next retry reuses the exact same opaque ID",async()=>{
 const first=await planEntityNotifications({...ctx,schedule:schedule([relative()]),eventAt:day});
 const second=await planEntityNotifications({...ctx,schedule:schedule([relative()]),eventAt:day,previous:first.state});
 assert.equal(first.changes[0].item.id,second.changes[0].item.id);
 assert.equal(second.changes[0].item.revision,1);
 assert.equal(Object.values(second.state.journal).length,0);
});
test("no business data in outbound changes",async()=>{
 const r=await planEntityNotifications({...ctx,schedule:schedule([relative()]),eventAt:day});
 const json=JSON.stringify(r.changes);
 assert.ok(!json.includes(ctx.entityId));
 assert.ok(!json.includes("private-calendar"));
 assert.deepEqual(Object.keys(r.changes[0].item).sort(),["category","dueAt","id","revision"]);
});
