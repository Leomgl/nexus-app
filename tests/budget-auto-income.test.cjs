'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

function setup(){
 const state={notes:[],transactions:[],recurrences:[],quickExpenses:[],budgetCategories:[],limits:[],trash:[],projects:[],savingsGoals:[]};
 global.data=state;
 global.window={}; // No DOM event timers in Node.
 global.localStorage={getItem:()=>null,setItem:()=>{}};
 delete global.document;
 global.dateKey=(d)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 global.uid=(()=>{let i=0;return ()=> 'auto-income-'+(++i)})();
 global.money=x=>(Number(x)/100).toFixed(2)+' €';
 global.escapeHtml=x=>String(x??'');
 global.persist=async()=>{};
 global.toast=()=>{};
 global.render=()=>{};
 global.formatDate=x=>x;
 delete require.cache[require.resolve('../budget-v08.js')];
 require('../budget-v08.js');
 return {api:window.NexusBudget,state};
}
const monthly=(o={})=>({id:'salary',title:'Salaire',type:'income',active:true,
 autoBook:true,autoBookFrom:'2026-11-11',frequency:'monthly',day:11,
 startDate:'2026-01-01',amountCents:175000,category:'Salaire',skips:[],...o});

test('recurring income only becomes due after explicit per-rule opt-in date',()=>{
 const {api,state}=setup(),at=new Date('2026-11-11T12:00:00');
 state.recurrences=[monthly({autoBook:false}),monthly({id:'r2',autoBookFrom:'',autoBook:true}),
  monthly({id:'r3',autoBookFrom:'2026-11-12'}),
  monthly({id:'r4',active:false}),monthly({id:'r5',amountCents:0}),monthly({id:'r6',autoBookFrom:'2026-11-31'})];
 assert.deepEqual(api.autoIncomeCandidates(state,at),[]);
 state.recurrences=[monthly()];
 assert.deepEqual(api.autoIncomeCandidates(state,at).map(x=>[x.rule.id,x.identity,x.date]),
  [['salary','2026-11','2026-11-11']]);
 assert.equal(api.autoIncomeCandidates(state,new Date('2026-11-10T12:00:00')).length,0);
});

test('automatic salary logs once, on scheduled date, and never on repeated app openings',async()=>{
 const {api,state}=setup();
 state.recurrences=[monthly()];
 let saved;let writeCount=0;
 global.persist=async()=>{saved=JSON.parse(JSON.stringify(state));writeCount++;};
 api.attachAutoIncome({verify:async rows=>rows.every(row=>saved.transactions.some(tx=>tx.id===row.id&&tx.recurrenceId===row.recurrenceId))});
 const first=await api.startAutoIncome(); // real current time may vary, test using fixed dates after start below
 // Reset and explicitly run a fixed date to keep regression test independent of wall clock.
 state.transactions=[];
 saved=JSON.parse(JSON.stringify(state));
 const result=await api.autoPostIncome({at:new Date('2026-11-11T12:00:00'),redraw:false});
 assert.equal(result.created,1);
 assert.equal(state.transactions.length,1);
 assert.equal(state.transactions[0].date,'2026-11-11');
 assert.equal(state.transactions[0].amountCents,175000);
 assert.equal(state.transactions[0].type,'income');
 assert.equal(state.transactions[0].autoRecorded,true);
 assert.equal(state.transactions[0].incomeVerified,false);
 assert.equal(state.transactions[0].recurrenceId,'salary');
 assert.equal(state.transactions[0].occurrenceKey,'2026-11');
 assert.equal((await api.autoPostIncome({at:new Date('2026-11-11T13:00:00'),redraw:false})).created,0);
 assert.equal(state.transactions.length,1);
 assert.ok(writeCount>=1);
});

test('opening after days offline catches up only dues since activation and respects skipped/manual occurrences',()=>{
 const {api,state}=setup(),at=new Date('2027-01-18T12:00:00');
 state.recurrences=[monthly({autoBookFrom:'2026-11-11'})];
 let due=api.autoIncomeCandidates(state,at);
 assert.deepEqual(due.map(x=>x.identity),['2026-11','2026-12','2027-01']);
 state.transactions.push({id:'manual',type:'income',recurrenceId:'salary',occurrenceKey:'2026-12',date:'2026-12-11',amountCents:175000});
 state.recurrences[0].skips.push('2027-01');
 due=api.autoIncomeCandidates(state,at);
 assert.deepEqual(due.map(x=>x.identity),['2026-11']);
});

test('salary on 31st clamps in February; weekly and yearly incomes are independently supported',()=>{
 const {api,state}=setup();
 state.recurrences=[
  monthly({id:'month-end',autoBookFrom:'2027-01-31',day:31}),
  monthly({id:'weekly',autoBookFrom:'2027-02-01',frequency:'weekly',weekday:1}),
  monthly({id:'yearly',autoBookFrom:'2027-01-01',frequency:'yearly',month:2,day:28})
 ];
 const due=api.autoIncomeCandidates(state,new Date('2027-02-28T12:00:00'));
 assert.ok(due.find(x=>x.rule.id==='month-end'&&x.date==='2027-02-28'));
 assert.equal(due.filter(x=>x.rule.id==='weekly').length,4);
 assert.equal(due.filter(x=>x.rule.id==='yearly').length,1);
 const febLeap=api.autoIncomeCandidates({transactions:[],recurrences:[monthly({day:31,autoBookFrom:'2028-01-31'})]},
  new Date('2028-02-29T12:00:00'));
 assert.ok(febLeap.find(x=>x.date==='2028-02-29'));
});

test('same-date same-title unlinked manual salary blocks an ambiguous automatic duplicate',async()=>{
 const {api,state}=setup();
 state.recurrences=[monthly()];
 state.transactions.push({id:'manual',title:'Salaire',type:'income',date:'2026-11-11',amountCents:175000});
 global.persist=async()=>{};
 api.attachAutoIncome({verify:async()=>true});
 await api.startAutoIncome();
 const result=await api.autoPostIncome({at:new Date('2026-11-11T12:00:00'),redraw:false});
 assert.equal(result.created,0);
 assert.equal(result.ambiguous,1);
 assert.equal(state.transactions.length,1);
});

test('failure to persist income must roll back pending write instead of reporting false success',async()=>{
 const {api,state}=setup();
 state.recurrences=[monthly()];
 let writes=0;
 global.persist=async()=>{writes++};
 api.attachAutoIncome({verify:async()=>false});
 await api.startAutoIncome();
 const result=await api.autoPostIncome({at:new Date('2026-11-11T12:00:00'),redraw:false});
 assert.equal(result.created,0);
 assert.equal(result.error,'storage');
 assert.equal(state.transactions.length,0);
 assert.ok(writes>=2);
});

test('manual receipt confirmation does not create another transaction',async()=>{
 const {api,state}=setup();
 state.transactions=[{id:'tx',type:'income',autoRecorded:true,incomeVerified:false,amountCents:120000}];
 let writes=0;global.persist=async()=>{writes++};
 await api.verifyIncome('tx');
 assert.equal(state.transactions.length,1);
 assert.equal(state.transactions[0].incomeVerified,true);
 assert.match(state.transactions[0].verifiedAt,/^\d{4}-\d{2}-\d{2}/);
 assert.equal(writes,1);
});

test('automatic income is clearly identified and opt-in is not enabled for expenses',()=>{
 const js=fs.readFileSync(path.join(root,'budget-v08.js'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const recycle=fs.readFileSync(path.join(root,'recycle.js'),'utf8');
 assert.match(js,/name="autoBook"/);
 assert.match(js,/v\.type==='income'&&v\.autoBook==='on'/);
 assert.match(js,/autoBookFrom:enabled\?activation:''/);
 assert.match(js,/Programmé · à vérifier/);
 assert.match(js,/Revenu programmé automatiquement · réception non vérifiée/);
 assert.match(js,/b8-income-verify/);
 assert.match(app,/await window\.NexusBudget\?\.startAutoIncome\?\.\(\)/);
 assert.match(app,/window\.NexusBudget\?\.attachAutoIncome/);
 assert.match(recycle,/record\.autoRecorded===true/);
 assert.match(recycle,/rule\.skips/);
});
