'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const deep=x=>JSON.parse(JSON.stringify(x));
const paid=(id='inbox-1')=>({
 id,pairId:'pair-gaming',sourceKey:'a'.repeat(64),revision:1,scope:'pass_paid',
 status:'accepted',targetId:'old-pass',targetKind:'transactions',createdAt:'2026-02-10T15:00:00Z',
 payload:{type:'gaming.proposal.v1',destination:'transactions',sourceApp:'gaming',
  sourceId:'fictional-pass:paid',title:'Pass de combat de démonstration',
  game:'Jeu fictif',details:'Pass payé',priceCents:1234,currency:'EUR',paymentDate:'2026-02-10',
  time:'12:00'}
});
const deleted=()=>({
 id:'old-pass',title:'Pass supprimé',type:'expense',date:'2026-02-10',amountCents:1234,
 originApp:'gaming',originSourceId:'fictional-pass:paid'
});
function setup({grouped=false,failVerify=false,failLedger=false}={}){
 const original=deleted(),proposal=paid();
 const data={linkInbox:[proposal],transactions:[],projects:[],trash:[
  grouped?{id:'reset-budget',label:'Module Budget',items:[{key:'transactions',record:original},
   {key:'limits',record:{id:'limit-1',month:'2026-11',limitCents:25000}}]}:
   {id:'trash-old',key:'transactions',record:original,label:'Pass supprimé'}
 ],limits:[],recurrences:[],quickExpenses:[],budgetCategories:[],savingsGoals:[]};
 let saved=deep(data),lastModal='',toast=[],alerts=[],n=0,writes=0;
 const context={window:{},console,
  escapeHtml:x=>String(x).replaceAll('<','&lt;'),uid:()=>('new-'+(++n)),
  data,persist:async()=>{saved=deep(data);writes++;},closeModal:()=>{},render:()=>{},
  toast:msg=>toast.push(msg),alert:msg=>alerts.push(msg),confirm:()=>true,svg:()=>'',toastTimeout:0,
  modal:(_title,content)=>{lastModal=content;},document:{getElementById:()=>({addEventListener:()=>{}})}
 };
 vm.runInNewContext(fs.readFileSync(path.join(root,'link-import.js'),'utf8'),context,{filename:'link-import.js'});
 context.window.NexusGamingImport.attach({
  state:()=>data,escape:context.escapeHtml,persist:context.persist,uid:context.uid,toast:context.toast,
  verify:async()=>!failVerify&&JSON.stringify(saved.linkInbox)===JSON.stringify(data.linkInbox),
  verifyLedger:async(id,pairId,sourceKey)=>!failLedger&&saved.transactions.some(x=>x.id===id&&x.type==='expense'&&x.amountCents>0)&&
   saved.linkInbox.some(x=>x.targetId===id&&x.pairId===pairId&&x.sourceKey===sourceKey&&x.status==='accepted'),
  modal:context.modal,render:context.render,today:()=> '2026-11-12'
 });
 vm.runInNewContext(fs.readFileSync(path.join(root,'recycle.js'),'utf8'),context,{filename:'recycle.js'});
 return {api:context.window.NexusGamingImport,recycle:context.window.NexusRecycle,data,
  saved:()=>saved,toast,alerts,preview:()=>lastModal,writes:()=>writes};
}
const form={title:'Pass de combat de démonstration',date:'2026-02-10',
 price:'12.34',projectId:'',details:'Pass payé'};
test('a deleted accepted Gaming pass may be explicitly reimported without touching its trash',async()=>{
 const x=setup();
 x.api.review('inbox-1');
 assert.match(x.preview(),/Réimporter dans le Budget/);
 assert.match(x.preview(),/La dépense liée a été supprimée/);
 await x.api.approve('inbox-1',form);
 assert.equal(x.data.transactions.length,1);
 assert.equal(x.data.transactions[0].id,'new-1');
 assert.equal(x.data.transactions[0].originApp,'gaming');
 assert.equal(x.data.transactions[0].originSourceId,'fictional-pass:paid');
 assert.equal(x.data.transactions[0].amountCents,1234);
 assert.equal(x.data.transactions[0].date,'2026-02-10');
 assert.equal(x.data.linkInbox[0].status,'accepted');
 assert.equal(x.data.linkInbox[0].targetId,'new-1');
 assert.equal(x.data.trash.length,1);
 assert.equal(x.saved().transactions.length,1);
 await x.api.approve('inbox-1',form);
 assert.equal(x.data.transactions.length,1);
 assert.equal(x.data.linkInbox[0].targetId,'new-1');
});
test('a second previously accepted inbox item for the same Gaming payment reuses the new transaction',async()=>{
 const x=setup();
 await x.api.approve('inbox-1',form);
 x.data.linkInbox.push({...paid('inbox-2'),targetId:'old-pass',sourceKey:'b'.repeat(64)});
 x.api.review('inbox-2');
 assert.match(x.preview(),/Confirmer la mise à jour/);
 await x.api.approve('inbox-2',form);
 assert.equal(x.data.transactions.length,1);
 assert.equal(x.data.linkInbox[1].targetId,'new-1');
});
test('restoring a single trashed Gaming payment is blocked after explicit reimport',async()=>{
 const x=setup();
 await x.api.approve('inbox-1',form);
 assert.equal(await x.recycle.restore('trash-old'),false);
 assert.equal(x.data.transactions.length,1);
 assert.equal(x.data.trash.length,1);
 assert.match(x.alerts[0],/Restauration bloquée/);
});
test('a whole Budget reset cannot restore another copy of a reimported pass',async()=>{
 const x=setup({grouped:true});
 await x.api.approve('inbox-1',form);
 assert.equal(await x.recycle.restore('reset-budget'),false);
 assert.equal(x.data.transactions.length,1);
 assert.equal(x.data.limits.length,0);
 assert.equal(x.data.trash.length,1);
 assert.match(x.alerts[0],/Restauration bloquée/);
});
test('failed persistence verification rolls back both the in-memory and durable budget transaction',async()=>{
 const x=setup({failVerify:true});
 await x.api.approve('inbox-1',form);
 assert.equal(x.data.transactions.length,0);
 assert.equal(x.data.linkInbox[0].targetId,'old-pass');
 assert.equal(x.saved().transactions.length,0);
 assert.equal(x.saved().linkInbox[0].targetId,'old-pass');
 assert.equal(x.writes(),2);
 assert.match(x.toast.at(-1),/Enregistrement refusé/);
});

test('an unverified Journal write also rolls back the persisted LINK transaction',async()=>{
 const x=setup({failLedger:true});
 await x.api.approve('inbox-1',form);
 assert.equal(x.data.transactions.length,0);
 assert.equal(x.saved().transactions.length,0);
 assert.equal(x.data.linkInbox[0].targetId,'old-pass');
 assert.equal(x.saved().linkInbox[0].targetId,'old-pass');
 assert.equal(x.writes(),2);
});
