'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'settings-v0214.js'),'utf8');
const adapter=()=>{
 const data={linkConnections:[],linkInbox:[],notes:[],projects:[]};
 const UI={slot1:'projects',slot2:'budget',theme:'sage',density:'comfortable',widgets:['today','budget']};
 return {data,UI,version:'0.21.5',render:()=>{},svg:name=>'<svg data-name="'+name+'"></svg>',
  escape:val=>String(val??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),
  MODULES:[['projects','briefcase','Projets'],['budget','wallet','Budget'],['notes','notes','Notes']],
  HOME_WIDGETS:[['today',"Aujourd'hui",'Priorités'],['budget','Budget du mois','Dépenses'],['recent','Activité','Historique']]};
};
function setup(){
 const context={window:{scrollTo:()=>{}},document:{getElementById:()=>null}};
 vm.runInNewContext(source,context,{filename:'settings-v0214.js'});
 return {api:context.window.NexusSettings,context,env:adapter()};
}
function open(api,page){assert.equal(api.act('settings-open',{dataset:{page}}),true);}
test('settings overview groups all six destinations without importing private data',()=>{
 const {api,env}=setup();
 const markup=api.view(env);
 for(const title of ['Apparence et interface','Notifications','Applications connectées','Sécurité et confidentialité','Données et sauvegardes','À propos de Nexus'])
  assert.ok(markup.includes(title),title);
 assert.match(markup,/nx-settings-search/);
 assert.match(markup,/data-page="apps"/);
 assert.doesNotMatch(markup,/data-pref-slot/,'controls are inside subpages');
 assert.doesNotMatch(markup,/nexus.*secret/i);
});
test('search is accent-insensitive and links to the correct destination without rerendering input',()=>{
 const {api,env,context}=setup();
 api.view(env);
 const results={innerHTML:''};
 context.document.getElementById=key=>key==='nx-settings-results'?results:null;
 assert.equal(api.onInput({id:'nx-settings-search',value:'securite'}),true);
 assert.match(results.innerHTML,/data-page="security"/);
 assert.equal(api.onInput({id:'nx-settings-search',value:'salaire'}),true);
 assert.match(results.innerHTML,/data-page="notifications"/);
 assert.equal(api.onInput({id:'nx-settings-search',value:'totallymissing'}),true);
 assert.match(results.innerHTML,/Aucun réglage/);
 assert.equal(api.onInput({id:'unrelated',value:'x'}),false);
});
test('interface keeps original handlers and widget customization, without changing UI data',()=>{
 const {api,env}=setup();
 const snapshot=JSON.stringify(env.UI);
 open(api,'interface');
 const markup=api.view(env);
 for(const marker of ['data-pref-slot="1"','data-pref-slot="2"','data-action="settings-theme"','data-pref-option="density"','data-action="toggle-widget"','data-action="move-widget"','data-action="reset-ui"'])
  assert.ok(markup.includes(marker),marker);
 assert.equal(JSON.stringify(env.UI),snapshot);
 assert.match(markup,/data-page="home"/);
});
test('palette preview changes theme through the original saveUI pathway',()=>{
 const {api,env}=setup();
 let saved=0;
 env.saveUI=()=>{saved++;};
 open(api,'interface');
 let html=api.view(env);
 assert.match(html,/nx-set-theme-sage selected/);
 assert.equal(api.act('settings-theme',{dataset:{theme:'slate'}}),true);
 assert.equal(saved,1);
 assert.equal(env.UI.theme,'slate');
 html=api.view(env);
 assert.match(html,/nx-set-theme-slate selected/);
 assert.equal(api.act('settings-theme',{dataset:{theme:'invalid'}}),true);
 assert.equal(saved,1);
});
test('application details are separate and only report actual pairing status',()=>{
 const {api,env,context}=setup();
 context.window.NexusConnections={settingsCard:id=>'<section id="pair-'+id+'"></section>'};
 context.window.NexusTravel={settingsCard:()=>'<section id="travel"></section>'};
 context.window.NexusVestiaire={settingsCard:()=>'<section id="wardrobe"></section>'};
 context.window.NexusConnect2={settingsCard:()=>'<section id="connect"></section>'};
 env.data.linkConnections=[{sourceApp:'rituel',scopes:['restock_task']},{sourceApp:'vestiaire',scopes:['outfit_catalog']}];
 open(api,'apps');
 const overview=api.view(env);
 assert.match(overview,/Gaming/);
 assert.match(overview,/Jumelé/);
 assert.match(overview,/Non jumelé/);
 open(api,'app:rituel');
 const ritual=api.view(env);
 assert.match(ritual,/pair-rituel/);
 assert.match(ritual,/id="travel"/);
 assert.doesNotMatch(ritual,/pair-gaming/);
 open(api,'app:gaming');
 const gaming=api.view(env);
 assert.match(gaming,/pair-gaming/);
 assert.doesNotMatch(gaming,/id="travel"/);
 open(api,'app:vestiaire');
 assert.match(api.view(env),/id="wardrobe"/);
 open(api,'apps-automation');
 assert.match(api.view(env),/id="connect"/);
 open(api,'app:health');
 assert.match(api.view(env),/Module en chargement/);
});
test('notifications, security, data and about retain existing action names',()=>{
 const {api,env}=setup();
 for(const [route,actions] of [
  ['notifications',['push-settings']],
  ['security',['passkey-settings']],
  ['data',['cloud-vault','export','restore','trash-panel']],
  ['data-advanced',['trash-reset-center']],
  ['about',['refresh-app']]
 ]) {
  open(api,route);const markup=api.view(env);
  for(const action of actions)assert.ok(markup.includes('data-action="'+action+'"'),route+': '+action);
 }
 api.reset();
 assert.match(api.view(env),/nx-settings-search/);
 assert.equal(api.act('settings-open',{dataset:{page:'unexpected'}}),true);
 assert.match(api.view(env),/nx-settings-search/);
});
test('settings assets and iOS offline cache stay in sync',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(html,/settings-v0214\.js\?v=0215/);
 assert.match(html,/settings-v0214\.css\?v=0214/);
 assert.match(sw,/settings-v0214\.js\?v=0215/);
 assert.match(sw,/settings-v0214\.css\?v=0214/);
 assert.match(app,/NEXUS_VERSION='0\.21\.7'/);
 assert.match(app,/NexusSettings\?\.onInput/);
 assert.match(app,/NexusSettings\?\.act/);
 assert.match(app,/legacySettingsView/);
});
