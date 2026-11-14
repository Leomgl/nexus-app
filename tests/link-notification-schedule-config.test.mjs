import test from "node:test";
import assert from "node:assert/strict";
import {
 NOTIFICATION_SCHEDULE_SCHEMA,NOTIFICATION_SCHEDULE_MAX_RULES,
 emptyNotificationSchedule,validateNotificationSchedule,resolveNotificationSchedule
} from "../link-notifications/notification-schedule-config.mjs";

const ids=Array.from({length:7},(_,i)=>"0000000"+i+"-0000-4000-8000-00000000000"+i);
const R=(i,unit,value)=>({id:ids[i],kind:"relative",unit,value});
const F=(i,at)=>({id:ids[i],kind:"fixed",at});
const config=(rules,enabled=true)=>({schema:NOTIFICATION_SCHEDULE_SCHEMA,enabled,rules});
const start="2026-11-14T12:00:00.000Z";
const event="2026-11-16T12:00:00.000Z";
test("common schedule defaults to off for every app and supports five mixed rules",()=>{
 assert.deepEqual(resolveNotificationSchedule(emptyNotificationSchedule(),{now:start,eventAt:event}),[]);
 assert.equal(NOTIFICATION_SCHEDULE_MAX_RULES,5);
 const items=[R(0,"days",1),R(1,"hours",2),R(2,"minutes",15),
  F(3,"2026-11-15T09:00:00.000Z"),R(4,"minutes",5)];
 assert.equal(validateNotificationSchedule(config(items)).rules.length,5);
 assert.throws(()=>validateNotificationSchedule(config([...items,R(5,"minutes",1)])),/INVALID_NOTIFICATION_SCHEDULE/);
});
test("relative days, hours, minutes follow a moved event, while fixed absolute does not",()=>{
 const setup=config([R(0,"days",1),R(1,"hours",2),R(2,"minutes",15),
 F(3,"2026-11-15T10:00:00.000Z")]);
 const before=resolveNotificationSchedule(setup,{eventAt:event,now:start});
 const changed=resolveNotificationSchedule(setup,{
  eventAt:"2026-11-17T14:00:00.000Z",now:start
 });
 const item=(a,id)=>a.find(x=>x.ruleId===ids[id]).dueAt;
 assert.equal(item(before,0),"2026-11-15T12:00:00.000Z");
 assert.equal(item(before,1),"2026-11-16T10:00:00.000Z");
 assert.equal(item(before,2),"2026-11-16T11:45:00.000Z");
 assert.equal(item(before,3),item(changed,3));
 for(const i of [0,1,2])assert.notEqual(item(before,i),item(changed,i));
});
test("disabled switch gives no notifications; relative rules require an event deadline",()=>{
 const schedule=config([R(0,"minutes",30),F(1,"2026-11-15T10:00:00.000Z")]);
 assert.deepEqual(resolveNotificationSchedule({...schedule,enabled:false},{now:start}),[]);
 assert.throws(()=>resolveNotificationSchedule(schedule,{now:start}),/RELATIVE_RULE_NEEDS_EVENT_DATE/);
 assert.equal(resolveNotificationSchedule(config([F(1,"2026-11-15T10:00:00.000Z")]),{now:start}).length,1);
});
test("overlapping alerts at same instant never produce duplicate pushes",()=>{
 const setup=config([R(0,"days",1),R(1,"hours",24),F(2,"2026-11-15T12:00:00.000Z")]);
 const output=resolveNotificationSchedule(setup,{eventAt:event,now:start});
 assert.equal(output.length,1);
 assert.equal(output[0].dueAt,"2026-11-15T12:00:00.000Z");
});
test("past/horizon restrictions avoid D1 schedules outside allowed window",()=>{
 const setup=config([F(0,"2026-11-12T10:00:00.000Z"),
 F(1,"2027-04-15T10:00:00.000Z"),R(2,"minutes",10)]);
 const output=resolveNotificationSchedule(setup,{eventAt:event,now:start});
 assert.equal(output.length,1);
 assert.equal(output[0].ruleId,ids[2]);
});
test("unknown or private fields are rejected, never silently serialized",()=>{
 const valid=config([R(0,"minutes",15)]);
 assert.throws(()=>validateNotificationSchedule({...valid,patient:"secret"}),/INVALID_NOTIFICATION_SCHEDULE/);
 assert.throws(()=>validateNotificationSchedule(config([{
  ...R(0,"minutes",15),title:"Private medication"}])),/INVALID_RELATIVE_NOTIFICATION/);
 assert.throws(()=>validateNotificationSchedule(config([R(0,"minutes",0)])),/INVALID_RELATIVE_NOTIFICATION/);
 assert.throws(()=>validateNotificationSchedule(config([R(0,"days",91)])),/INVALID_RELATIVE_NOTIFICATION/);
 assert.throws(()=>validateNotificationSchedule(config([R(0,"hours",2),R(0,"minutes",45)])),/INVALID_NOTIFICATION_RULE/);
 assert.throws(()=>validateNotificationSchedule(config([F(0,"2026-11-15T10:00")])) ,/INVALID_FIXED_NOTIFICATION/);
});
test("calendar days preserve local event wall clock across Europe/Paris DST",()=>{
 const original=process.env.TZ;
 try{
  process.env.TZ="Europe/Paris";
  const morning=config([R(0,"days",1)]);
  const result=resolveNotificationSchedule(morning,{
   eventAt:"2026-03-29T07:00:00.000Z",now:"2026-03-26T12:00:00.000Z"
  });
  // 29 March: 09:00 CEST; 28 March: 09:00 CET, so 23 real hours before.
  assert.equal(result[0].dueAt,"2026-03-28T08:00:00.000Z");
 }finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original}
});
