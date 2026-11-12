const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
function harness(data={linkConnections:[],events:[],santeDaily:[],santeCalendars:[]}){
 const window={SanteLinkCore:{invitation:()=> 'NXS1.private-invite'}};
 const notifications=[];
 const ctx={window,console,Date,crypto:webcrypto,confirm:()=>true,navigator:{clipboard:{}},document:{addEventListener(){}},localStorage:{getItem(){return null},setItem(){}},setTimeout,clearTimeout};
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync('nexus-sante.js','utf8'),ctx,{filename:'nexus-sante.js'});
 const api=window.NexusSanteBridge;
 api.attach({state:()=>data,escape:v=>String(v).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])),svg:()=>'',persist:async()=>{},verify:async()=>true,render:()=>{},safeRender:()=>{},toast:x=>notifications.push(x),openSettings:()=>{}});
 return {api,data,notifications};
}
test('SANTE Pulse only shows current day, with no false real-time indicator',()=>{
 const {api,data}=harness();
 assert.match(api.widget(),/Connecter Santé/);
 data.linkConnections.push({id:'test',sourceApp:'sante'});
 assert.match(api.widget(),/Connexion créée/);
 data.santeDaily=[{day:'2020-01-01',done:1,total:2,items:[],sharedAt:new Date().toISOString()}];
 assert.match(api.widget(),/Dernier suivi reçu/);
 const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 data.santeDaily=[{day:today,done:1,total:2,items:[{id:'m',name:'',time:'08:00',done:true}],sharedAt:new Date().toISOString()}];
 const html=api.widget();assert.match(html,/1.*2/);assert.match(html,/08:00/);assert.match(html,/Pris/);
});
test('Reject malformed health calendar and dose summary before persistence',()=>{
 const {api}=harness();
 const daily={type:'sante.daily.v1',sourceApp:'sante',day:'2026-11-11',done:1,total:2,items:[{id:'a',name:'',time:'08:00',done:true}]};
 assert.ok(api.validDaily(daily));assert.equal(api.validDaily({...daily,done:3}),null);
 const cal={type:'sante.calendar.v1',sourceApp:'sante',revision:1,events:[{id:'12345678-1234-4234-8234-123456789012',kind:'appointment',title:'RDV fictif',start:'2026-11-14T10:00:00.000Z',location:'',deleted:false}]};
 assert.ok(api.validCalendar(cal));
 assert.equal(api.validCalendar({...cal,events:[cal.events[0],cal.events[0]]}),null);
});
test('Agenda import creates one event with Nexus reminders and preserves local edits',async()=>{
 const {api,data}=harness();
 data.linkConnections=[{id:'private-pair',sourceApp:'sante'}];
 const v={id:'12345678-1234-4234-8234-123456789012',kind:'appointment',title:'RDV démo',start:'2026-11-14T10:00:00.000Z',location:'Clinique fictive',deleted:false};
 data.santeCalendars=[{revision:1,events:[v],pairId:'private-pair'}];
 await api.act('sante-import');
 assert.equal(data.events.length,1);
 assert.equal(data.events[0].originApp,'sante');
 assert.deepEqual(Array.from(data.events[0].reminderMinutes),[1440,60]);
 await api.act('sante-import');
 assert.equal(data.events.length,1,'idempotency');
 data.events[0].title='Édité localement dans Nexus';
 data.santeCalendars[0].revision=2;
 data.santeCalendars[0].events[0]={...v,title:'Changement depuis Santé'};
 await api.act('sante-import');
 assert.equal(data.events[0].title,'Édité localement dans Nexus','never overwrite local edit');
});

test('Optional hydration totals are validated and rendered only when shared',()=>{
 const {api,data}=harness();
 const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 const base={type:'sante.daily.v1',sourceApp:'sante',day:today,total:0,done:0,items:[]};
 assert.equal(api.validDaily(base).hydration,null);
 const hydration={day:today,fluidMl:1350,waterMl:1000,caffeineMg:120,entries:5,targetMl:2000};
 assert.equal(api.validDaily({...base,hydration}).hydration.fluidMl,1350);
 assert.equal(api.validDaily({...base,hydration:{...hydration,fluidMl:-1}}),null);
 assert.equal(api.validDaily({...base,hydration:{...hydration,waterMl:1400}}),null);
 data.linkConnections.push({id:'pair',sourceApp:'sante'});
 data.santeDaily=[{...api.validDaily({...base,hydration}),sharedAt:new Date().toISOString()}];
 assert.match(api.widget(),/Boissons du jour/);
 assert.match(api.widget(),/1350/);
 data.santeDaily=[{...api.validDaily(base),sharedAt:new Date().toISOString()}];
 assert.doesNotMatch(api.widget(),/Boissons du jour/);
});

test('Medical calendar projection only includes medical events and normalises the time in ISO',()=>{
 const {api,data}=harness();
 const medicalId='12345678-1234-4234-8234-123456789012';
 data.events=[
  {id:medicalId,title:'RDV chez le médecin',start:'2026-11-16T08:15:00',location:'Centre fictif'},
  {id:'22345678-1234-4234-8234-123456789012',title:'Révision voiture',start:'2026-11-16T09:00:00',location:'Garage'},
  {id:'32345678-1234-4234-8234-123456789012',title:'Contrôle',start:'2026-11-17T14:00:00',healthSync:true}
 ];
 const snapshot=api.outgoing();
 assert.deepEqual(Array.from(snapshot,e=>e.id),[medicalId,'32345678-1234-4234-8234-123456789012']);
 assert.equal(snapshot[0].start,new Date('2026-11-16T08:15:00').toISOString());
 assert.equal(snapshot[0].location,'Centre fictif');
 assert.equal(snapshot[0].deleted,false);
 assert.equal(snapshot[0].notes,undefined);
});
test('Nexus preserves original source ID and baseline when editing an appointment imported from Santé',async()=>{
 const {api,data}=harness();
 data.linkConnections=[{id:'pair',sourceApp:'sante'}];
 const id='12345678-1234-4234-8234-123456789012';
 data.santeCalendars=[{revision:1,events:[{id,kind:'appointment',title:'Consultation fictive',start:'2026-11-16T07:15:00Z',location:'Cabinet',deleted:false}]}];
 await api.act('sante-import');
 assert.equal(data.events.length,1);
 const saved={...data.events[0]};
 const edited={...saved,title:'Consultation déplacée'};
 api.markChange(saved,edited);data.events[0]=edited;
 const row=api.outgoing()[0];
 assert.equal(row.id,id);
 assert.equal(row.title,'Consultation déplacée');
 assert.equal(row.base.title,'Consultation fictive');
 assert.equal(data.santeNexusRevision,1);
});
test('Deleting a medical event generates one tombstone and restoring it removes the tombstone',()=>{
 const {api,data}=harness();
 const row={id:'12345678-1234-4234-8234-123456789012',title:'Dentiste',start:'2026-11-16T08:15:00'};
 data.events=[row];
 api.markDeleted(row);data.events=[];
 assert.equal(api.outgoing().length,1);
 assert.equal(api.outgoing()[0].deleted,true);
 data.events=[row];api.markRestored(row);
 assert.equal(api.outgoing().length,1);
 assert.equal(api.outgoing()[0].deleted,false);
});
