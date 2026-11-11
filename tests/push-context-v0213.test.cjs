'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');

function api(){
 const window={NexusBudget:{
  occurrences(rule,month){
   if(rule.active===false||month!=='2026-11')return [];
   return [{rule,date:'2026-11-11',identity:'2026-11',skipped:(rule.skips||[]).includes('2026-11')}];
  }
 }};
 const source=fs.readFileSync(path.resolve(__dirname,'../push-context-v0213.js'),'utf8');
 vm.runInNewContext(source,{window,Intl,Date,Number,String,Array,Set,RegExp,Math}, {filename:'push-context-v0213.js'});
 const hash=async input=>crypto.createHash('sha256').update(input).digest('hex');
 return {build:window.NexusPushContext.build,hash};
}
const date=new Date('2026-11-08T12:00:00').getTime();
const salary={id:'income-1',title:'Mon salaire',type:'income',active:true,amountCents:150000,notifyDays:[2,0]};

test('budget creates two notifications at J-2 and due date, 09:00 local',async()=>{
 const {build,hash}=api();
 const result=await build({recurrences:[salary],transactions:[]},{budgetEnabled:true,showDetails:true},hash,date);
 assert.equal(result.jobs.length,2);
 const dates=result.jobs.map(row=>new Date(row.fireAt*1000));
 assert.deepEqual(dates.map(d=>[d.getFullYear(),d.getMonth()+1,d.getDate(),d.getHours()]),[[2026,11,9,9],[2026,11,11,9]]);
 assert.ok(result.jobs.every(j=>j.kind==='task'&&/^[a-f0-9]{64}$/.test(j.id)));
 assert.ok(Object.values(result.contexts).some(x=>x.title.includes('Dans 2 jours')));
 assert.ok(Object.values(result.contexts).some(x=>x.title.includes('Aujourd')));
 assert.ok(Object.values(result.contexts).every(x=>x.body.includes('Mon salaire')&&x.body.includes('Réception à vérifier')));
});

test('no finance details go over network: only id, kind, and timestamp',async()=>{
 const {build,hash}=api();
 const result=await build({recurrences:[salary],transactions:[]},{budgetEnabled:true,showDetails:true},hash,date);
 for(const job of result.jobs)assert.deepEqual(Object.keys(job).sort(),['fireAt','id','kind']);
 const serialized=JSON.stringify(result.jobs);
 assert.doesNotMatch(serialized,/Mon salaire|150000|Montant/);
});

test('private details are opt-in, default context remains generic on a locked screen',async()=>{
 const {build,hash}=api();
 const appointment={id:'evt',title:'Restaurant du centre',location:'Grande place',personId:'friend',
   start:'2026-11-09T19:30:00',reminderMinutes:[60]};
 const state={events:[appointment],contacts:[{id:'friend',name:'Invité privé'}],recurrences:[salary]};
 const quiet=await build(state,{showDetails:false},hash,date);
 assert.equal(quiet.jobs.length,3);
 assert.doesNotMatch(JSON.stringify(quiet.contexts),/Grande place|Invité privé|Mon salaire|Restaurant du centre|150000/);
 const detail=await build(state,{showDetails:true},hash,date);
 assert.match(JSON.stringify(detail.contexts),/Grande place/);
 assert.match(JSON.stringify(detail.contexts),/Invité privé/);
 assert.match(JSON.stringify(detail.contexts),/Restaurant/);
});

test('no reminders when paused, skipped, manually booked or already confirmed',async()=>{
 const {build,hash}=api();
 const states=[
  {recurrences:[{...salary,active:false}]},
  {recurrences:[{...salary,skips:['2026-11']}]},
  {recurrences:[salary],transactions:[{recurrenceId:'income-1',occurrenceKey:'2026-11',incomeVerified:true}]},
  {recurrences:[salary],transactions:[{recurrenceId:'income-1',occurrenceKey:'2026-11',autoRecorded:false}]},
  {recurrences:[{...salary,notifyDays:[]}]}
 ];
 for(const state of states){
  const res=await build(state,{budgetEnabled:true},hash,date);
  assert.equal(res.jobs.length,0);
 }
 const globalOff=await build({recurrences:[salary]},{budgetEnabled:false},hash,date);
 assert.equal(globalOff.jobs.length,0);
});

test('unverified scheduled income remains eligible, paid expense does not',async()=>{
 const {build,hash}=api();
 const expected=await build({recurrences:[salary],transactions:[{
  recurrenceId:'income-1',occurrenceKey:'2026-11',autoRecorded:true,incomeVerified:false
 }]},{},hash,date);
 assert.equal(expected.jobs.length,2);
 const expense={...salary,id:'expense-1',type:'expense'};
 const paid=await build({recurrences:[expense],transactions:[{recurrenceId:'expense-1',occurrenceKey:'2026-11'}]},{},hash,date);
 assert.equal(paid.jobs.length,0);
});

test('event reminderMinutes=[] disables event alert; done task is ignored',async()=>{
 const {build,hash}=api();
 const state={events:[{id:'evt',start:'2026-11-09T13:00:00',reminderMinutes:[]}],
  tasks:[{id:'done',title:'Terminé',done:true,dueDate:'2026-11-09'}]};
 const res=await build(state,{taskMins:[60],eventMins:[60]},hash,date);
 assert.equal(res.jobs.length,0);
});

test('same inputs produce stable ids and scheduled jobs remain within 600 cap',async()=>{
 const {build,hash}=api();
 const state={recurrences:[salary]};
 const one=await build(state,{},hash,date),two=await build(state,{},hash,date);
 assert.deepEqual(one.jobs,two.jobs);
 assert.ok(one.jobs.length<=600);
});
