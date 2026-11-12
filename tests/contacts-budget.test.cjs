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


test('safe replacement matches old IDs, preserves favorites and keeps missing contacts recoverable',async()=>{
 global.window={};
 delete require.cache[require.resolve('../contacts-v017.js')];
 require('../contacts-v017.js');
 const data={contacts:[
  {id:'old-a',name:'Alice',phone:'+33601010101',favorite:true,tags:['Famille'],notes:'Rappel familial'},
  {id:'old-b',name:'Bastien',email:'bastien@example.fr',favorite:false,tags:['Travail']},
  {id:'old-c',name:'Chloé',phone:'+33602020202'}
 ]};
 let next=1;
 window.NexusContacts.attach({state:()=>data,uid:()=> 'new-'+next++,svg:()=>'',escape:s=>String(s)});
 const vcard=[
  'BEGIN:VCARD','FN:Alice','TEL:+33601010101','END:VCARD',
  'BEGIN:VCARD','FN:Bastien','EMAIL:bastien@example.fr','END:VCARD',
  'BEGIN:VCARD','FN:Émilie','TEL:+33603030303','END:VCARD',
  'BEGIN:VCARD','FN:Alice','TEL:+33601010101','END:VCARD'
 ].join('\r\n');
 const parsed=window.NexusContacts.parseVcards(vcard);
 const plan=window.NexusContacts.planReimport(parsed);
 assert.equal(plan.updates.length,2);
 assert.equal(plan.newOnes.length,1);
 assert.deepEqual(plan.removed.map(c=>c.id),['old-c']);
 assert.equal(plan.duplicateCount,1);
 const built=await window.NexusContacts.buildReimportRecords(plan,'2026-11-11T14:30:00.000Z');
 assert.equal(built.records.length,3);
 assert.deepEqual(built.records.map(c=>c.id),['old-a','old-b','new-1']);
 assert.equal(built.records[0].favorite,true);
 assert.deepEqual(built.records[0].tags,['Famille']);
 assert.equal(built.records[0].notes,'Rappel familial');
 assert.equal(built.records[2].name,'Émilie');
});

test('contact management exposes separate safe replacement and confirmed reset actions',()=>{
 global.window={};
 delete require.cache[require.resolve('../contacts-v017.js')];
 require('../contacts-v017.js');
 window.NexusContacts.attach({state:()=>({contacts:[{id:'a',name:'Alice'}]}),svg:()=>'',escape:s=>String(s)});
 const html=window.NexusContacts.view();
 assert.match(html,/contacts-manage/);
 assert.match(html,/nx-contact-count-row/);
});


test('contacts with leading emoji stay in proper A-Z order',()=>{
 global.window={};
 delete require.cache[require.resolve('../contacts-v017.js')];
 require('../contacts-v017.js');
 const data={contacts:[
  {id:'m',name:'🌹 maman'},
  {id:'z',name:'Zoé'},
  {id:'a',name:'Alexandre'},
  {id:'b',name:'🐻 Bastien'},
  {id:'e',name:'Émilie'}
 ]};
 window.NexusContacts.attach({state:()=>data,svg:()=>'',escape:s=>String(s)});
 assert.deepEqual(window.NexusContacts.visibleContacts().map(c=>c.id),['a','b','e','m','z']);
});


test('rendered directory alphabet sections always display A before M even with emoji names',()=>{
 global.window={};
 delete require.cache[require.resolve('../contacts-v017.js')];
 require('../contacts-v017.js');
 window.NexusContacts.attach({state:()=>({contacts:[
  {id:'m',name:'🌹 maman'}, {id:'a',name:'Alexandre'}, {id:'ma',name:'Marie'},
  {id:'c',name:'Charles'}
 ]}),svg:()=>'',escape:s=>String(s)});
 const nodes={
  'nx-contacts-results':{innerHTML:''},
  'nx-contact-index':{innerHTML:'',hidden:false},
  'nx-contact-count':{textContent:''}
 };
 const priorDocument=global.document;
 global.document={getElementById:id=>nodes[id]||null};
 try{
  window.NexusContacts.redrawResults();
  const html=nodes['nx-contacts-results'].innerHTML;
  assert.ok(html.indexOf('id="nx-letter-A"')>=0);
  assert.ok(html.indexOf('id="nx-letter-M"')>html.indexOf('id="nx-letter-A"'));
  assert.ok(html.indexOf('id="nx-letter-C"')<html.indexOf('id="nx-letter-M"'));
  assert.equal(nodes['nx-contact-count'].textContent,'4 contacts affichés');
 }finally{global.document=priorDocument;}
});

test('UI and offline cache agree on version 0.21.6',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(html,/data-nexus-version/);
 assert.match(app,/NEXUS_VERSION='0\.21\.6'/);
 assert.match(html,/contacts-v017\.js\?v=0174/);
 assert.match(html,/pulse-v018\.js\?v=0215/);
 assert.match(html,/pulse-v018\.css\?v=0180/);
 assert.match(sw,/pulse-v018\.js\?v=0215/);
 assert.match(html,/https:\/\/api\.open-meteo\.com/);
 assert.match(html,/https:\/\/geocoding-api\.open-meteo\.com/);
 assert.match(html,/app\.js\?v=0216/);
 assert.match(html,/settings-v0214\.js\?v=0215/);
 assert.match(html,/settings-v0214\.css\?v=0214/);
 assert.match(sw,/nexus-v0\.21\.6/);
 assert.match(sw,/contacts-v017\.js\?v=0174/);
 assert.match(html,/connect-v019\.js\?v=0191/);
 assert.match(sw,/connect-v019\.js\?v=0191/);
 assert.match(html,/link-import\.js\?v=0190/);
 const assets=[...html.matchAll(/(?:src|href)="(\.\/[^"]+\.(?:js|css)(?:\?v=[^"]+)?)"/g)].map(x=>x[1]);
 for(const asset of assets)assert.ok(sw.includes("'"+asset+"'"),'offline cache does not include '+asset);
 assert.match(html,/budget-v08\.js\?v=0216/);
 assert.match(html,/budget-v020\.js\?v=0216/);
 assert.match(html,/budget-v020\.css\?v=0216/);
 assert.match(sw,/budget-v020\.js\?v=0216/);
 assert.match(sw,/recycle\.js\?v=0212/);
 assert.match(app,/savingsGoals:\[\]/);
 assert.match(html,/vestiaire-v021\.js\?v=0211/);
 assert.match(html,/vestiaire-v021\.css\?v=0210/);
 assert.match(sw,/vestiaire-v021\.js\?v=0211/);
 assert.match(html,/link-core\.js\?v=0210/);
 assert.match(html,/push-context-v0213\.js\?v=0213/);
 assert.match(html,/push-client\.js\?v=0213/);
 assert.match(sw,/push-context-v0213\.js\?v=0213/);
 assert.match(sw,/push-client\.js\?v=0213/);

});

test('Pulse prioritizes overdue tasks and upcoming appointments without changing source records',()=>{
 global.window={};
 delete require.cache[require.resolve('../pulse-v018.js')];
 require('../pulse-v018.js');
 const data={
  tasks:[{id:'a',title:'Ancien',dueDate:'2026-11-10',done:false,priority:3},
   {id:'b',title:'Aujourd’hui',dueDate:'2026-11-11',done:false},
   {id:'c',title:'Fait',dueDate:'2026-11-10',done:true}],
  events:[{id:'e',title:'Restaurant',start:'2026-11-11T20:00:00'},
   {id:'p',title:'Passé',start:'2026-11-10T14:00:00'}],linkInbox:[{status:'pending'}]
 };
 window.NexusPulse.attach({state:()=>data,dateKey:d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')});
 const result=window.NexusPulse.pulsePriorities(data,new Date('2026-11-11T14:00:00'));
 assert.deepEqual(result.urgent.map(t=>t.id),['a','b']);
 assert.deepEqual(result.todays.map(e=>e.id),['e']);
 assert.equal(result.overdue.length,1);
 assert.equal(result.pending.length,1);
 assert.equal(data.tasks.length,3);
});

test('Pulse renders a personalizable compact cockpit and preserves quick capture',()=>{
 global.window={};
 delete require.cache[require.resolve('../pulse-v018.js')];
 require('../pulse-v018.js');
 const data={events:[],tasks:[],notes:[],projects:[],purchases:[],transactions:[],limits:[],linkInbox:[],linkConnections:[]};
 window.NexusPulse.attach({
  state:()=>data,svg:()=>'',escape:x=>String(x).replace(/</g,'&lt;'),
  formatDate:()=> '11 novembre',dateKey:()=> '2026-11-11',
  money:v=>v+' €',monthTotals:()=>({income:0,expense:0}),forecast:()=>({pending:[]})
 });
 const html=window.NexusPulse.view(['today','weather','budget','focus','links','recent']);
 assert.match(html,/NEXUS PULSE/);
 assert.match(html,/quick-capture/);
 assert.match(html,/data-action="quick-save"/);
 assert.match(html,/nxp-widget-today/);
 assert.match(html,/nxp-weather-data/);
 assert.match(html,/nxp-widget-budget/);
 assert.match(html,/nxp-widget-links/);
 assert.equal(window.NexusPulse.getLocation().label,'Lille');
 assert.deepEqual(window.NexusPulse.weatherLabel(61),['Pluie','rain']);
 assert.doesNotMatch(window.NexusPulse.view(['recent']),/nxp-widget-today/);
});


test('Connect 2.0 requires explicit opt-in and a verified paid date before adding Gaming expenses',async()=>{
 global.window={};delete require.cache[require.resolve('../connect-v019.js')];
 require('../connect-v019.js');
 const prefs=new Map();
 global.localStorage={getItem:key=>prefs.get(key)||null,setItem:(key,value)=>prefs.set(key,value)};
 const data={transactions:[],linkConnections:[{id:'pair-1',sourceApp:'gaming',scopes:['pass_paid']}],linkInbox:[]};
 const make=(id,paymentDate)=>({id,pairId:'pair-1',sourceKey:id[0].repeat(64),revision:1,scope:'pass_paid',status:'pending',
  targetId:'',targetKind:'',createdAt:'2026-11-11T12:00:00.000Z',
  payload:{type:'gaming.proposal.v1',sourceApp:'gaming',destination:'transactions',
   sourceId:'battle-pass-1:paid',title:'Pass saison 12',isPaid:true,currency:'EUR',paymentDate,priceCents:1299}});
 data.linkInbox.push(make('a','2026-11-09'));
 let n=0;let saved;
 window.NexusConnect2.attach({state:()=>data,uid:()=> 'tx-'+(++n),
  persist:async()=>{saved=structuredClone(data);},
  verifyLedger:async(id,pairId,sourceKey)=>saved.transactions.some(t=>t.id===id&&t.amountCents===1299)&&
    saved.linkInbox.some(x=>x.targetId===id&&x.pairId===pairId&&x.sourceKey===sourceKey&&x.status==='accepted'),
  safeRender:()=>{},toast:()=>{},svg:()=>'',escape:x=>x});
 assert.equal((await window.NexusConnect2.accept(data.linkInbox[0])).reason,'disabled');
 assert.equal(data.transactions.length,0);
 prefs.set('nexus_connect_v019_preferences',JSON.stringify({autoReceive:true,autoGaming:true,autoRituel:false}));
 const accepted=await window.NexusConnect2.accept(data.linkInbox[0]);
 assert.equal(accepted.created,true);
 assert.equal(data.transactions.length,1);
 assert.equal(data.transactions[0].date,'2026-11-09');
 assert.equal(data.transactions[0].amountCents,1299);
 assert.equal(data.transactions[0].originSourceId,'battle-pass-1:paid');
 assert.equal(data.linkInbox[0].status,'accepted');
 data.linkInbox.push(make('b','2026-11-09'));
 const duplicate=await window.NexusConnect2.accept(data.linkInbox[1]);
 assert.equal(duplicate.accepted,true);
 assert.equal(duplicate.created,false);
 assert.equal(data.transactions.length,1);
 assert.equal(data.linkInbox[1].targetId,'tx-1');
 data.linkInbox.push(make('c',''));
 assert.equal((await window.NexusConnect2.accept(data.linkInbox[2])).reason,'ineligible');
 data.linkInbox.push({...make('d','2026-11-09'),sourceKey:'d'.repeat(64),targetId:'tx-1'});
 assert.equal((await window.NexusConnect2.accept(data.linkInbox[3])).reason,'ineligible');
 delete global.localStorage;
});

test('Connect 2.0 validates permission, EUR currency, paid flag and verified Rituel purchases',async()=>{
 global.window={};delete require.cache[require.resolve('../connect-v019.js')];require('../connect-v019.js');
 global.localStorage={getItem:()=>JSON.stringify({autoReceive:true,autoGaming:false,autoRituel:true}),setItem:()=>{}};
 const d={transactions:[],linkConnections:[{id:'pair-r',sourceApp:'rituel',scopes:['product_paid']}],linkInbox:[]};
 const row={id:'rituel-row',pairId:'pair-r',sourceKey:'e'.repeat(64),revision:1,scope:'product_paid',status:'pending',targetId:'',targetKind:'',
  payload:{type:'rituel.proposal.v1',sourceApp:'rituel',destination:'transactions',sourceId:'purchase-1',
   title:'Parfum payé',currency:'EUR',isPaid:true,paymentDate:'2026-11-10',priceCents:3999}};
 d.linkInbox.push(row);
 window.NexusConnect2.attach({state:()=>d,uid:()=> 'rituel-tx',persist:async()=>{},verifyLedger:async()=>true,
   safeRender:()=>{},escape:x=>x,svg:()=>'',toast:()=>{}});
 assert.equal(window.NexusConnect2.sourceOf(row).app,'rituel');
 let check={...row,payload:{...row.payload,currency:'USD'}};
 assert.equal(window.NexusConnect2.sourceOf(check),null);
 check={...row,payload:{...row.payload,isPaid:false}};assert.equal(window.NexusConnect2.sourceOf(check),null);
 check={...row,scope:'restock_purchase'};assert.equal(window.NexusConnect2.sourceOf(check),null);
 const done=await window.NexusConnect2.accept(row);
 assert.equal(done.created,true);
 assert.equal(d.transactions[0].category,'Shopping');
 assert.equal(d.transactions[0].date,'2026-11-10');
 delete global.localStorage;
});

test('Connect 2.0 rolls back unsaved budget writes and preserves pending proposal',async()=>{
 global.window={};delete require.cache[require.resolve('../connect-v019.js')];require('../connect-v019.js');
 global.localStorage={getItem:()=>JSON.stringify({autoGaming:true,autoReceive:true}),setItem:()=>{}};
 const row={id:'bad-write',pairId:'pg',sourceKey:'f'.repeat(64),revision:1,scope:'pass_paid',status:'pending',targetId:'',targetKind:'',
  payload:{type:'gaming.proposal.v1',sourceApp:'gaming',destination:'transactions',sourceId:'pass-5:paid',
   title:'Pass testé',currency:'EUR',isPaid:true,paymentDate:'2026-11-11',priceCents:499}};
 const d={transactions:[],linkConnections:[{id:'pg',sourceApp:'gaming',scopes:['pass_paid']}],linkInbox:[row]};
 window.NexusConnect2.attach({state:()=>d,uid:()=> 'no-save',persist:async()=>{},
  verifyLedger:async()=>false,safeRender:()=>{},escape:x=>x,svg:()=>{},toast:()=>{}});
 const result=await window.NexusConnect2.accept(row);
 assert.equal(result.reason,'persist-failed');
 assert.equal(d.transactions.length,0);
 assert.equal(row.status,'pending');
 assert.equal(row.targetId,'');
 assert.equal(row.acceptedMode,undefined);
 delete global.localStorage;
});
