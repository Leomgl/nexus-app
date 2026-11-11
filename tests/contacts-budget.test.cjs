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
 require('../contacts-v017.js');
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

test('V0.17 contacts: compact cards, alphabetical jump, tag filters and favorites',()=>{
 global.window={};
 delete require.cache[require.resolve('../contacts-v017.js')];
 require('../contacts-v017.js');
 const data={contacts:[
  {id:'c1',name:'Émilie Durand',favorite:true,tags:['Famille'],phone:'+33600000001'},
  {id:'c2',name:'Zoé',favorite:false,tags:['Travail'],phone:'+33600000002'},
  {id:'c3',name:'Arthur',favorite:false,tags:['Famille','Amis'],phone:'+33600000003'}
 ]};
 window.NexusContacts.attach({state:()=>data,escape:s=>String(s).replace(/</g,'&lt;'),svg:()=>''});
 const html=window.NexusContacts.view();
 assert.match(html,/nx-contact-query/);
 assert.match(html,/nx-contact-sort/);
 assert.match(html,/nx-contact-tag/);
 assert.match(html,/nx-contact-index/);
 const visible=window.NexusContacts.visibleContacts();
 assert.deepEqual(visible.map(x=>x.name),['Arthur','Émilie Durand','Zoé']);
 assert.deepEqual(window.NexusContacts.tagCatalog(),['Amis','Famille','Travail']);
 assert.match(html,/Ajouter/);
 assert.doesNotMatch(html,/nx-contact-card/,'Cards are rendered in a separate compact result slot');
});

test('V0.17 parses photo base64 and vCard tags without saving remote photo links',()=>{
 global.window={};
 delete require.cache[require.resolve('../contacts-v017.js')];
 require('../contacts-v017.js');
 const photo='AQIDBAUG';
 const text=[
  'BEGIN:VCARD','VERSION:3.0','FN:Chloé',
  'TEL:+33611111111','CATEGORIES:Famille,Amis',
  'PHOTO;ENCODING=b;TYPE=JPEG:'+photo,
  'END:VCARD','BEGIN:VCARD','FN:Jean',
  'PHOTO;VALUE=URI:https://example.com/img.jpg',
  'END:VCARD'
 ].join('\r\n');
 const [a,b]=window.NexusContacts.parseVcards(text);
 assert.equal(a.name,'Chloé');
 assert.deepEqual(a.tags,['Famille','Amis']);
 assert.equal(a.photoRaw,'data:image/jpeg;base64,'+photo);
 assert.equal(b.photoRaw,'','A remote photo URL must never be fetched or stored');
});
