'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');

function setup(state={recurrences:[],transactions:[]}){
 let saved=null,preview='',changes=0;
 const context={
  data:state,window:{},dbHandle:null,DB_STORE:'data',BACKUP_KEY:'backup',
  localStorage:{getItem:()=>JSON.stringify(saved),setItem:(_key,val)=>{saved=JSON.parse(val);}},
  escapeHtml:x=>String(x).replace(/</g,'&lt;'),uid:(()=>{let i=0;return ()=>String(++i);})(),
  persist:async()=>{saved=JSON.parse(JSON.stringify(state));changes++;},
  modal:(_title,markup)=>{preview=markup;},closeModal:()=>{},render:()=>{},
  toast:()=>{},svg:()=>'',alert:message=>{throw new Error(message);}
 };
 vm.runInNewContext(fs.readFileSync(path.join(root,'budget-import-v0216.js'),'utf8'),context,{filename:'budget-import-v0216.js'});
 return {api:context.window.NexusBudgetImport,state,preview:()=>preview,saved:()=>saved,changes:()=>changes};
}
test('notion CSV import parses French decimal amounts and accented loan categories',()=>{
 const {api}=setup();
 const csv=['Nom,Catégorie,Montant,Montant signé,Type,État',
  'Prêt voiture,Prêt,"120,25 €","-120,25",Sortie,Passer',
  'Apple Music,Abonnement,"5,99 €","-5,99",Sortie,Arrive'].join('\r\n');
 const rows=api.parseCSV(csv);
 assert.equal(rows.length,2);
 const loan=api.fromRaw(rows[0],'test');
 assert.equal(loan.amountCents,12025);
 assert.equal(loan.commitmentKind,'loan');
 assert.equal(loan.type,'expense');
 assert.equal(api.fromRaw(rows[1],'test').commitmentKind,'subscription');
});
test('import only adds missing recurrences and never counts a repeated salary or service',async()=>{
 const state={recurrences:[
  {id:'salary',title:'Salaire',type:'income',category:'Salaire',amountCents:200000},
  {id:'sub',title:'ChatGPT',type:'expense',category:'Abonnements',amountCents:2000}
 ],transactions:[]};
 const {api,preview,saved}=setup(state);
 const payload={kind:'nexus-budget-import',version:1,items:[
  {title:'Salaire',type:'income',amountCents:200000,category:'Salaire'},
  {title:'ChatGPT',type:'expense',amountCents:-2000,commitmentKind:'subscription',category:'Abonnements'},
  {title:'Crédit voiture',type:'expense',amountCents:-10555,commitmentKind:'loan',category:'Prêt'}
 ]};
 const file={name:'budget.json',size:100,text:async()=>JSON.stringify(payload)};
 await api.onFiles({files:[file],value:'test'});
 assert.match(preview(),/1 à ajouter/);
 await api.act('budget-import-confirm');
 assert.equal(state.recurrences.length,3);
 assert.equal(state.transactions.length,0);
 assert.equal(saved().recurrences.length,3);
 assert.equal(state.recurrences[2].schedulePending,true);
 assert.equal(state.recurrences[2].commitmentKind,'loan');
 assert.equal(state.recurrences[2].loanInstallments,null);
 assert.equal(state.recurrences[0].amountCents,200000);
 await api.onFiles({files:[file],value:'test'});
 assert.match(preview(),/0 à ajouter/);
});
test('duplicated titles with different amounts are not silently overwritten',()=>{
 const {api}=setup({recurrences:[{title:'Prêt voiture',type:'expense',amountCents:10000}],transactions:[]});
 const candidate=api.fromRaw({nom:'Voitures',categorie:'Prêt',montantsigne:'-150,00',type:'Sortie'},'test');
 const existing=api.existing(candidate);
 assert.equal(existing.exists,true);
 assert.match(existing.label,/montant différent/);
});
