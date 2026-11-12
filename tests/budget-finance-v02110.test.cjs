(function financeTests(){
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const deep=x=>JSON.parse(JSON.stringify(x));
function setup(){
 const state={transactions:[],recurrences:[],projects:[],savingsGoals:[]};
 let snapshot=deep(state),modalHTML='',modalName='',uidCount=0;
 const forms={};
 const context={
  window:{},data:state,dbHandle:null,DB_STORE:'data',BACKUP_KEY:'finance-local',
  localStorage:{getItem:()=>JSON.stringify(snapshot),setItem:(_k,v)=>{snapshot=JSON.parse(v);}},
  document:{getElementById:id=>{
   if(!forms[id])forms[id]={values:{},handler:null,reportValidity:()=>true,addEventListener(_type,cb){this.handler=cb;}};
   return forms[id];
  }},
  FormData:class{
   constructor(form){this.form=form;}
   entries(){return Object.entries(this.form.values);}
  },
  persist:async()=>{snapshot=deep(state);},
  uid:()=>`financial-${++uidCount}`,
  money:x=>(x/100).toFixed(2)+' €',
  escapeHtml:x=>String(x).replaceAll('<','&lt;'),
  dateKey:d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),
  formatDate:x=>x,
  modal:(title,body)=>{modalName=title;modalHTML=body;},
  toast:()=>{},closeModal:()=>{},render:()=>{},console
 };
 vm.runInNewContext(fs.readFileSync(path.join(root,'budget-finance-v02110.js'),'utf8'),context,{filename:'budget-finance-v02110.js'});
 const submit=(id,values)=>{
  const form=forms[id];
  assert.ok(form?.handler,`Expected submit handler for ${id}`);
  form.values=values;
  return form.handler({preventDefault(){},currentTarget:form});
 };
 return {api:context.window.NexusBudgetFinance,data:state,forms,submit,snapshot:()=>snapshot,
  modal:()=>modalHTML,title:()=>modalName,today:context.dateKey(new Date())};
}
test('early repayment simulation with zero interest and fixed remaining term',()=>{
 const {api}=setup();
 const p=api.calculate({principalCents:100000,extraCents:50000,aprPercent:0,mode:'reduce-payment',months:10});
 assert.ok(p);
 assert.equal(p.monthlyCents,5000);
 assert.equal(p.months,10);
 assert.equal(p.lastCents,5000);
 assert.equal(p.totalScheduledCents,50000);
});
test('shorter loan duration keeps target instalment, with a smaller last instalment',()=>{
 const {api}=setup();
 const p=api.calculate({principalCents:100000,extraCents:50000,aprPercent:0,mode:'reduce-term',paymentCents:6000});
 assert.ok(p);
 assert.equal(p.months,9);
 assert.equal(p.lastCents,2000);
 assert.equal(p.totalScheduledCents,50000);
});
test('interest rounding still repays every remaining cent by selected maturity',()=>{
 const {api}=setup();
 for(const sample of [
  {principalCents:50000,extraCents:5000,aprPercent:8,mode:'reduce-payment',months:10},
  {principalCents:1030952,extraCents:50000,aprPercent:5.49,mode:'reduce-payment',months:49},
  {principalCents:600000,extraCents:50000,aprPercent:5,mode:'reduce-payment',months:24}
 ]){
  const plan=api.calculate(sample);
  assert.ok(plan,'expected a valid loan plan');
  assert.equal(plan.months,sample.months);
  assert.ok(plan.lastCents<=plan.monthlyCents);
  assert.ok(plan.totalScheduledCents>sample.principalCents-sample.extraCents);
 }
 assert.equal(api.calculate({principalCents:50000,extraCents:5000,aprPercent:20,mode:'reduce-term',paymentCents:1}),null);
 assert.equal(api.calculate({principalCents:50000,extraCents:50001,aprPercent:0,mode:'reduce-payment',months:10}),null);
});
test('the old calendar stays unchanged while only future months take the revised payment',()=>{
 const {api}=setup();
 const r={id:'car',commitmentKind:'loan',amountCents:6000,loanScheduleRevisions:[{
  effectiveMonth:'2026-12',months:3,monthlyCents:5000,lastCents:1200
 }]};
 assert.equal(api.scheduledAmount(r,'2026-11'),6000);
 assert.equal(api.scheduledAmount(r,'2026-12'),5000);
 assert.equal(api.scheduledAmount(r,'2027-01'),5000);
 assert.equal(api.scheduledAmount(r,'2027-02'),1200);
 assert.equal(api.scheduledAmount(r,'2027-03'),0);
 const progress=api.scheduledTotal(r,[{recurrenceId:'car',type:'expense',occurrenceKey:'2026-12'}]);
 assert.equal(progress.total,3);
 assert.equal(progress.done,1);
 assert.equal(progress.remainingScheduledCents,6200);
});
test('confirmed early repayment enters Journal once and rewrites the future calendar only',async()=>{
 const x=setup(),{api,data}=x;
 data.recurrences.push({id:'loan-a',commitmentKind:'loan',title:'Prêt de test',
  amountCents:6000,loanInstallments:120,active:true,day:12,
  startDate:'2025-01-12',endDate:'2035-01-31',category:'Autres'});
 api.act('fin-loan-extra',{dataset:{id:'loan-a'}});
 assert.match(x.modal(),/Remboursement anticipé/);
 x.submit('fin-extra',{date:x.today,extra:'500',balance:'1000',apr:'0',mode:'reduce-payment',payment:'60',months:'10'});
 assert.match(x.modal(),/Simulation/);
 assert.match(x.modal(),/50.00 €|50,00/);
 api.act('fin-loan-confirm',{dataset:{id:'loan-a'}});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(data.transactions.length,1);
 assert.equal(data.transactions[0].amountCents,50000);
 assert.equal(data.transactions[0].loanExtraPaymentFor,'loan-a');
 assert.equal(data.recurrences[0].loanScheduleRevisions.length,1);
 assert.equal(x.snapshot().transactions.length,1);
 assert.equal(api.scheduledAmount(data.recurrences[0],api.nextMonth(x.today)),5000);
 api.act('fin-loan-confirm',{dataset:{id:'loan-a'}});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(data.transactions.length,1);
});
test('salary pause and resume preserve historical revenue and stop further forecast rules',async()=>{
 const x=setup();
 x.data.recurrences.push({id:'income-1',type:'income',title:'Revenu fixe',active:true,autoBook:true,autoBookFrom:'2025-01-01'});
 x.data.transactions.push({id:'old-income',type:'income',title:'Revenu fixe',amountCents:123456,date:'2025-01-10'});
 x.api.act('fin-income-toggle',{dataset:{id:'income-1'}});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(x.data.recurrences[0].active,false);
 assert.equal(x.data.transactions.length,1);
 assert.equal(x.snapshot().recurrences[0].active,false);
 x.api.act('fin-income-toggle',{dataset:{id:'income-1'}});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(x.data.recurrences[0].active,true);
 assert.equal(x.data.recurrences[0].autoBookFrom,x.today);
 assert.equal(x.data.transactions.length,1);
});
test('variable CPAM and employer amounts are manual incomes and never monthly rules',async()=>{
 const x=setup(),{api,data}=x;
 api.act('fin-income-new',{dataset:{}});
 x.submit('fin-variable',{source:'cpam',amount:'200,50',date:x.today,notes:'Virement'});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(data.transactions.length,1);
 assert.equal(data.transactions[0].type,'income');
 assert.equal(data.transactions[0].incomeSource,'cpam');
 assert.equal(data.transactions[0].amountCents,20050);
 assert.equal(data.recurrences.length,0);
 assert.equal(x.snapshot().transactions.length,1);
 api.act('fin-income-new',{dataset:{}});
 x.submit('fin-variable',{source:'cpam',amount:'200,50',date:x.today,notes:'Doublon'});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(data.transactions.length,1);
});
test('NEXUS Budget calculates forecasts from scheduled amounts and keeps income auto opt-in',()=>{
 const b=fs.readFileSync(path.join(root,'budget-v08.js'),'utf8');
 const screen=fs.readFileSync(path.join(root,'budget-v020.js'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const push=fs.readFileSync(path.join(root,'push-context-v0213.js'),'utf8');
 assert.match(b,/scheduledAmount.*rule,identity/);
 assert.match(b,/x\.amountCents\?\?x\.rule\.amountCents/);
 assert.match(b,/rule\.active!==true/);
 assert.match(screen,/fin-loan-extra/);
 assert.match(screen,/fin-income-toggle/);
 assert.match(screen,/fin-income-new/);
 assert.match(app,/kind\.startsWith\('fin-'\)/);
 assert.match(push,/amountCents:occurrence\.amountCents/);
});
})();
