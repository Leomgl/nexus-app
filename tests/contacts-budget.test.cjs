'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');

test('completed purchase creates exactly one linked budget expense',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const body=app.match(/function registerPurchaseExpense\(p\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(body,'function registerPurchaseExpense is present');
 const context={
  data:{transactions:[]},uid:()=> 'expense-1',dateKey:()=> '2026-11-11',
  p:{id:'purchase-1',status:'purchased',title:'SSD',priceCents:12990,
     category:'Équipement',projectId:'project-1',purchasedAt:'2026-11-10'}
 };
 const run=()=>vm.runInNewContext(body+'\nregisterPurchaseExpense(p)',context);
 assert.equal(run(),true);
 assert.equal(run(),false);
 assert.equal(context.data.transactions.length,1);
 assert.equal(context.data.transactions[0].purchaseId,'purchase-1');
 assert.equal(context.data.transactions[0].amountCents,12990);
 assert.equal(context.data.transactions[0].date,'2026-11-10');
 assert.equal(context.data.transactions[0].category,'Équipement');
 assert.equal(context.data.transactions[0].projectId,'project-1');
 context.p={id:'purchase-2',status:'purchased',title:'Sans prix',priceCents:null};
 assert.equal(run(),false);
 assert.equal(context.data.transactions.length,1);
 context.p.status='planned';context.p.priceCents=1000;
 assert.equal(run(),false);
});

test('Apple-style vCard is read locally, including folded and escaped fields',()=>{
 global.window={};
 require('../contacts-v016.js');
 assert.equal(typeof window.NexusContacts.parseVcards,'function');
 const input=[
  'BEGIN:VCARD','VERSION:3.0','N:Durand;Émilie;;;',
  'FN:Émilie Durand','item1.TEL;type=CELL:+33612345678',
  'EMAIL;TYPE=INTERNET:emilie@example.fr',
  'ADR;TYPE=HOME:;;12 rue\\; bis;Lille;Nord;59000;France',
  'ORG:Atelier Graphique;Studio','NOTE:Amie\\, équipe design',
  'END:VCARD','BEGIN:VCARD','VERSION:4.0',
  'FN:Alexandre ',' Martin','TEL;VALUE=uri:tel:+33700000000','END:VCARD'
 ].join('\r\n');
 const contacts=window.NexusContacts.parseVcards(input);
 assert.equal(contacts.length,2);
 assert.equal(contacts[0].name,'Émilie Durand');
 assert.equal(contacts[0].phone,'+33612345678');
 assert.match(contacts[0].address,/12 rue; bis/);
 assert.equal(contacts[0].organization,'Atelier Graphique');
 assert.equal(contacts[0].notes,'Amie, équipe design');
 assert.equal(contacts[1].name,'Alexandre Martin');
 assert.equal(contacts[1].phone,'+33700000000');
 assert.throws(()=>window.NexusContacts.parseVcards('not a vcard'),/vCard/);
});
