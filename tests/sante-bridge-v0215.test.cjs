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
