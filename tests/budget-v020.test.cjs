'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

function setup(){
 global.window={NexusBudget:{occurrences:()=>[],categoryOptions:()=>'<option value="Autres">Autres</option>'}};
 global.money=cents=>(Number(cents)/100).toFixed(2)+' €';
 global.escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 global.svg=name=>'<svg>'+name+'</svg>';
 global.dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 global.formatDate=x=>String(x);
 global.data={recurrences:[],transactions:[],savingsGoals:[],projects:[]};
 global.render=()=>{};
 delete require.cache[require.resolve('../budget-v020.js')];
 require('../budget-v020.js');
 return window.NexusBudget20;
}

test('loan term end preserves last-month day and leap years',()=>{
 const b=setup();
 assert.equal(b.periodEndDate('2027-01-31',2),'2027-02-28');
 assert.equal(b.periodEndDate('2028-01-31',2),'2028-02-29');
 assert.equal(b.periodEndDate('2026-11-11',12),'2027-10-31');
 assert.equal(b.periodEndDate('2026-12-31',1),'2026-12-31');
 assert.equal(b.periodEndDate('2026-11-31',12),'');
 assert.equal(b.periodEndDate('2026-11-11',601),'');
 assert.equal(b.firstScheduledDate({frequency:'monthly',day:20,startDate:'2026-01-01'}),'2026-01-20');
 assert.equal(b.firstScheduledDate({frequency:'monthly',day:20,startDate:'2026-01-25'}),'2026-02-20');
 assert.equal(b.firstScheduledDate({frequency:'yearly',day:10,month:11,startDate:'2026-04-01'}),'2026-11-10');
});

test('loan progress only counts uniquely confirmed recurring installments; not bank balance',()=>{
 const b=setup();
 const rule={id:'loan-1',amountCents:32500,loanInstallments:18};
 const tx=[
  {id:'a',recurrenceId:'loan-1',occurrenceKey:'2026-11',type:'expense'},
  {id:'duplicate',recurrenceId:'loan-1',occurrenceKey:'2026-11',type:'expense'},
  {id:'b',recurrenceId:'loan-1',occurrenceKey:'2026-12',type:'expense'},
  {id:'gaming',originApp:'gaming',occurrenceKey:'2027-01',type:'expense'},
  {id:'income',recurrenceId:'loan-1',occurrenceKey:'2027-02',type:'income'}
 ];
 assert.deepEqual(b.loanProgress(rule,tx),{total:18,done:2,remaining:16,remainingScheduledCents:520000});
 assert.equal(b.loanProgress({...rule,loanInstallments:2},tx).remaining,0);
 assert.equal(b.commitmentMonthlyEquivalent({amountCents:11988,frequency:'yearly'}),999);
 assert.equal(b.commitmentMonthlyEquivalent({amountCents:1200,frequency:'monthly'}),1200);
});

test('goal progress is manual and does not mutate or count transactions',()=>{
 const b=setup(),ledger=[];
 const goal={id:'g1',title:'Projet',targetCents:120000,startingCents:20000,contributions:[
  {id:'c1',amountCents:8500,direction:'deposit',date:'2026-10-11'},
  {id:'c2',amountCents:3000,direction:'withdraw',date:'2026-11-01'}
 ]};
 global.data.savingsGoals.push(goal);
 global.data.transactions=ledger;
 assert.equal(b.goalBalance(goal),25500);
 assert.deepEqual(b.goalProgress(goal),{target:120000,balance:25500,remaining:94500,percent:21,complete:false});
 assert.equal(b.goalProgress({...goal,targetCents:20000}).complete,true);
 assert.equal(ledger.length,0);
 const markup=b.goalsView();
 assert.match(markup,/Mes objectifs/);
 assert.match(markup,/Projet/);
 assert.match(markup,/21%/);
 assert.match(markup,/Versement \/ retrait/);
 assert.equal(ledger.length,0);
});

test('commitment cards share the legacy recurrence ledger rather than creating duplicate transactions',()=>{
 const b=setup();
 global.data.recurrences=[
  {id:'s1',commitmentKind:'subscription',title:'iCloud',amountCents:299,frequency:'monthly',active:true,startDate:'2026-01-01'},
  {id:'l1',commitmentKind:'loan',title:'Prêt auto',amountCents:18000,frequency:'monthly',loanInstallments:10,active:true,startDate:'2026-01-01'}
 ];
 global.data.transactions=[{id:'txn1',recurrenceId:'l1',occurrenceKey:'2026-01',type:'expense',amountCents:18000}];
 const before=JSON.stringify(global.data);
 const markup=b.commitmentsView('<section id="legacy-schedule">Échéancier</section>');
 assert.match(markup,/iCloud/);
 assert.match(markup,/Prêt auto/);
 assert.match(markup,/1\/10/);
 assert.match(markup,/legacy-schedule/);
 global.data.recurrences.push({id:'old',title:'Ancien abonnement',type:'expense',frequency:'monthly',day:2,amountCents:499,active:true,startDate:'2026-01-01'});
 const classified=b.commitmentsView('<div>Récurrences historiques</div>');
 assert.match(classified,/Classer une récurrence/);
 assert.match(classified,/data-action="b20-classify"/);
 assert.match(markup,/Reste à confirmer/);
 assert.equal(JSON.stringify(global.data),before);
});

test('budget navigation retains legacy Journal, categories, statistics and recurrences',()=>{
 const js=fs.readFileSync(path.join(root,'budget-v08.js'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const recycle=fs.readFileSync(path.join(root,'recycle.js'),'utf8');
 assert.match(js,/\['daily','Quotidien'\]/);
 assert.match(js,/\['commitments','Engagements'\]/);
 assert.match(js,/\['goals','Objectifs'\]/);
 assert.match(js,/tab==='journal'\?journal\(\)/);
 assert.match(js,/tab==='stats'\?stats\(\)/);
 assert.match(js,/window\.NexusBudget20\?\.commitmentsView/);
 assert.match(js,/window\.NexusBudget20\?\.goalsView/);
 assert.match(app,/savingsGoals:\[\]/);
 assert.match(app,/function assignData\(incoming\)\{for\(const key of Object\.keys\(data\)\)/);
 assert.match(recycle,/budgetCategories','savingsGoals/);
 assert.match(recycle,/savingsGoals:'Objectif/);
});
