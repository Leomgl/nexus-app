import test from "node:test";
import assert from "node:assert/strict";
import {newNotificationIdentitySecret,planEntityNotifications,
 applyEntityNotificationAck} from "../link-notifications/notification-entity-bridge.mjs";

const ctx={
 secret:newNotificationIdentitySecret(),appId:"nexus",
 entityId:"private-rdv-edited-after-first-push",category:"appointment"
};
const rule=n=>({id:"00000000-0000-4000-8000-00000000000"+n,
 kind:"relative",unit:"minutes",value:n});
const fixed={
 id:"00000000-0000-4000-8000-000000000009",
 kind:"fixed",at:"2026-11-15T09:00:00.000Z"
};
const config=(rules)=>({schema:"link.notification.schedule.v1",enabled:true,rules});
const ack=(state,changes)=>changes.reduce((s,c)=>applyEntityNotificationAck(s,c),state);

test("after first of two alarms fired, reschedule rotates only delivered occurrence; no double sends",async()=>{
 const begin="2026-11-14T12:00:00.000Z";
 const event="2026-11-14T12:04:00.000Z";
 const rules=[rule(1),rule(2),fixed];
 let result=await planEntityNotifications({
  ...ctx,now:begin,eventAt:event,schedule:config(rules)
 });
 assert.equal(result.changes.length,3);
 let state=ack(result.state,result.changes);
 const oldByDue=Object.fromEntries(
  Object.entries(state.journal).map(([id,r])=>[r.dueAt,{id,...r}])
 );
 const delivered=oldByDue["2026-11-14T12:02:00.000Z"];
 const notYetDelivered=oldByDue["2026-11-14T12:03:00.000Z"];
 const fixedOld=oldByDue[fixed.at];
 assert.ok(delivered);assert.ok(notYetDelivered);assert.ok(fixedOld);
 // 12:02:30: -2 min was already sent; -1 min is not yet due.
 const changedTime="2026-11-14T12:02:30.000Z";
 result=await planEntityNotifications({
  ...ctx,now:changedTime,eventAt:"2026-11-14T12:20:00.000Z",
  schedule:config(rules),previous:state
 });
 const newUpserts=result.changes.filter(c=>c.operation==="upsert");
 const cancellations=result.changes.filter(c=>c.operation==="cancel");
 assert.equal(newUpserts.length,2);
 assert.equal(cancellations.length,1);
 assert.equal(cancellations[0].item.id,delivered.id);
 assert.equal(cancellations[0].item.revision,2);
 const shiftedFirst=newUpserts.find(c=>c.item.dueAt==="2026-11-14T12:18:00.000Z");
 const shiftedSecond=newUpserts.find(c=>c.item.dueAt==="2026-11-14T12:19:00.000Z");
 assert.ok(shiftedFirst);assert.ok(shiftedSecond);
 assert.notEqual(shiftedFirst.item.id,delivered.id);
 assert.equal(shiftedFirst.item.revision,1); // terminal old server ID never reopened
 assert.equal(shiftedSecond.item.id,notYetDelivered.id);
 assert.equal(shiftedSecond.item.revision,2);
 assert.ok(!result.changes.some(c=>c.item.id===fixedOld.id));
 state=ack(result.state,result.changes);
 assert.equal(Object.keys(state.journal).length,3);
 // This catches an important previous bug: ACKing old cancellation must NOT
 // rotate the NEW epoch of the very same rule after it was already ACKed.
 for(let i=0;i<100;i++){
  const repeat=await planEntityNotifications({
   ...ctx,now:changedTime,eventAt:"2026-11-14T12:20:00.000Z",
   schedule:config(rules),previous:state
  });
  assert.equal(repeat.changes.length,0);
  state=repeat.state;
 }
});

test("rescheduling a wholly completed appointment creates new IDs for both old delivery slots",async()=>{
 const rules=[rule(1),rule(2)];
 let r=await planEntityNotifications({
  ...ctx,now:"2026-11-14T12:00:00.000Z",
  eventAt:"2026-11-14T12:05:00.000Z",schedule:config(rules)
 });
 let state=ack(r.state,r.changes);
 const oldIds=new Set(Object.keys(state.journal));
 r=await planEntityNotifications({
  ...ctx,now:"2026-11-14T12:07:00.000Z",
  eventAt:"2026-11-14T14:00:00.000Z",schedule:config(rules),previous:state
 });
 assert.equal(r.changes.filter(c=>c.operation==="upsert").length,2);
 assert.equal(r.changes.filter(c=>c.operation==="cancel").length,2);
 for(const change of r.changes.filter(c=>c.operation==="upsert")){
  assert.ok(!oldIds.has(change.item.id));
  assert.equal(change.item.revision,1);
 }
 state=ack(r.state,r.changes);
 const second=await planEntityNotifications({
  ...ctx,now:"2026-11-14T12:07:00.000Z",
  eventAt:"2026-11-14T14:00:00.000Z",schedule:config(rules),previous:state
 });
 assert.deepEqual(second.changes,[]);
});
