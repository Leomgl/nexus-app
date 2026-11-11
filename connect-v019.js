(function nexusConnectV019(){
 'use strict';
 const KEY='nexus_connect_v019_preferences';
 const FRESH_MS=5*60*1000;
 let adapter=null,running=false,lastCheck=0,initialized=false,latest={received:0,auto:0,errors:0,date:''};
 const defaults=()=>({autoReceive:true,autoGaming:false,autoRituel:false});
 const safe=x=>adapter?.escape?.(x)||String(x??'');
 const ico=x=>adapter?.svg?.(x)||'';
 function preferences(){
  try{const v=JSON.parse(localStorage.getItem(KEY)||'null');
   return {autoReceive:v?.autoReceive!==false,autoGaming:v?.autoGaming===true,autoRituel:v?.autoRituel===true};}
  catch{return defaults();}
 }
 function save(next){try{localStorage.setItem(KEY,JSON.stringify(next));return true}catch{adapter?.toast?.('Impossible de mémoriser les préférences.');return false}}
 function pair(app){return adapter?.state?.().linkConnections?.find(x=>x.sourceApp===app);}
 function validDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T12:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
 }
 function sourceOf(item){
  const p=item?.payload,app=p?.sourceApp;
  if(app!=='gaming'&&app!=='rituel')return null;
  const connected=pair(app);
  if(!connected||connected.id!==item.pairId||!Array.isArray(connected.scopes))return null;
  const scope=app==='gaming'?'pass_paid':'product_paid';
  if(item.scope!==scope||!connected.scopes.includes(scope))return null;
  if(item.status!=='pending'||item.targetId||item.targetKind)return null;
  if(p?.destination!=='transactions'||p.type!==(app==='gaming'?'gaming.proposal.v1':'rituel.proposal.v1')||
   p.isPaid!==true||p.currency!=='EUR')return null;
  if(typeof p.sourceId!=='string'||!p.sourceId||p.sourceId.length>140)return null;
  if(app==='gaming'&&!p.sourceId.endsWith(':paid'))return null;
  if(!Number.isSafeInteger(p.priceCents)||p.priceCents<=0||p.priceCents>1e10||!validDate(p.paymentDate))return null;
  if(typeof p.title!=='string'||!p.title.trim()||p.title.length>140)return null;
  if(typeof item.sourceKey!=='string'||!/^[a-f0-9]{64}$/i.test(item.sourceKey))return null;
  if(!Number.isInteger(item.revision)||item.revision<1||item.revision>1e6)return null;
  return {app,title:p.title.trim(),sourceId:p.sourceId,paymentDate:p.paymentDate,priceCents:p.priceCents};
 }
 function alreadyPaid(d,info){
  const tx=d.transactions.find(t=>t.originApp===info.app&&t.originSourceId===info.sourceId);
  if(tx)return tx;
  const linked=d.linkInbox.find(x=>x.payload?.sourceApp===info.app&&
   x.payload?.sourceId===info.sourceId&&x.status==='accepted'&&x.targetKind==='transactions'&&x.targetId);
  return linked?d.transactions.find(t=>t.id===linked.targetId)||{missing:true}:null;
 }
 async function accept(item){
  if(!adapter)return {accepted:false,reason:'not-ready'};
  const info=sourceOf(item);
  if(!info)return {accepted:false,reason:'ineligible'};
  const prefs=preferences();
  if(info.app==='gaming'&&!prefs.autoGaming||info.app==='rituel'&&!prefs.autoRituel)
   return {accepted:false,reason:'disabled'};
  const d=adapter.state();
  const previous=JSON.parse(JSON.stringify(item));
  const prior=alreadyPaid(d,info);
  if(prior?.missing)return {accepted:false,reason:'missing-target'};
  const now=new Date().toISOString();
  let transaction=null;
  if(prior){
   // A re-paired app must reuse the existing accounting entry, never create another.
   item.targetId=prior.id;item.targetKind='transactions';item.status='accepted';
   item.acceptedMode='deduplicated';item.updatedAt=now;
  }else{
   const existsInOtherPending=d.linkInbox.some(x=>x!==item&&x.payload?.sourceApp===info.app&&
    x.payload.sourceId===info.sourceId&&x.status==='pending'&&x.createdAt<item.createdAt);
   if(existsInOtherPending)return {accepted:false,reason:'conflicting-proposal'};
   transaction={id:adapter.uid(),createdAt:now,updatedAt:now,title:info.title,
    type:'expense',amountCents:info.priceCents,date:info.paymentDate,
    category:info.app==='gaming'?'Loisirs':'Shopping',projectId:'',purchaseId:'',notes:String(item.payload.details||'').slice(0,500),
    originApp:info.app,originSourceId:info.sourceId,
    originLink:{pairId:item.pairId,sourceKey:item.sourceKey,revision:item.revision}};
   d.transactions.push(transaction);
   item.targetId=transaction.id;item.targetKind='transactions';item.status='accepted';
   item.acceptedMode='auto';item.updatedAt=now;
  }
  try{
   await adapter.persist();
   if(!(await adapter.verifyLedger(item.targetId,item.pairId,item.sourceKey)))throw Error('Vérification locale impossible');
   return {accepted:true,created:Boolean(transaction),id:item.targetId};
  }catch(error){
   if(transaction)d.transactions=d.transactions.filter(x=>x.id!==transaction.id);
   Object.assign(item,previous);
   return {accepted:false,reason:'persist-failed'};
  }
 }
 async function processPending(){
  if(!adapter)return {processed:0,created:0,skipped:0};
  const p=preferences();const d=adapter.state();
  const candidates=d.linkInbox.filter(x=>x.status==='pending'&&(
   x.payload?.sourceApp==='gaming'&&p.autoGaming||
   x.payload?.sourceApp==='rituel'&&p.autoRituel));
  let created=0,processed=0,skipped=0;
  for(const entry of candidates.slice(0,100)){
   const result=await accept(entry);
   if(result.accepted){processed++;if(result.created)created++;}
   else skipped++;
  }
  if(processed)adapter.safeRender?.();
  return {processed,created,skipped};
 }
 async function synchronize(options={}){
  if(running)return {busy:true};
  if(!adapter)return {error:'Not ready'};
  if(typeof navigator!=='undefined'&&navigator.onLine===false){
   if(options.manual)adapter.toast('Connexion requise pour recevoir les nouveautés.');return {offline:true};
  }
  if(!options.manual&&document.visibilityState==='hidden')return {hidden:true};
  if(!options.manual&&!preferences().autoReceive)return {disabled:true};
  if(!options.manual&&Date.now()-lastCheck<FRESH_MS)return {fresh:true};
  running=true;lastCheck=Date.now();
  let received=0,errors=0,auto=0;
  try{
   for(const [app,importer] of [['gaming',window.NexusGamingImport],['rituel',window.NexusRituelImport]]){
    if(!pair(app)||!importer?.synchronize)continue;
    try{const result=await importer.synchronize();received+=result.received||0;}
    catch(err){errors++;console.warn('NEXUS Connect reception '+app,err?.message);}
   }
   const results=await processPending();auto=results.created;
   latest={received,errors,auto,date:new Date().toISOString()};
   adapter.safeRender?.();
   if(options.manual)adapter.toast(received+' proposition(s) reçue(s) · '+auto+' nouvelle(s) dépense(s).'+(errors?' '+errors+' connexion(s) en erreur.':''));
   return latest;
  }finally{running=false}
 }
 function settingsCard(){
  const p=preferences(),appGaming=pair('gaming'),appRituel=pair('rituel');
  const pending=(adapter?.state?.().linkInbox||[]).filter(x=>x.status==='pending');
  const control=(key,title,description,enabled,available=true)=>
   `<label class="nx-connect2-setting"><span><strong>${safe(title)}</strong><small>${safe(description)}</small></span><input type="checkbox" data-connect2-pref="${key}" ${enabled?'checked':''} ${available?'':'disabled'}></label>`;
  return `<section class="preferences-panel nx-connect2-panel">
   <div class="pref-heading">${ico('link')} <div><h2>NEXUS Connect 2.0</h2><p>Chaque app reste spécialisée ; NEXUS reçoit uniquement les propositions autorisées.</p></div></div>
   ${control('autoReceive','Recevoir les nouveautés automatiquement','Quand NEXUS est ouverte et connectée. Les apps spécialisées doivent aussi transmettre leurs nouveautés.',p.autoReceive)}
   ${control('autoGaming','Pass Gaming payé → Budget','Uniquement si prix, devise EUR et date réelle d’achat sont renseignés. Une correction ultérieure demande une validation.',p.autoGaming,Boolean(appGaming?.scopes?.includes('pass_paid')))}
   ${control('autoRituel','Produit Rituel payé → Budget','Uniquement les achats explicitement confirmés et datés dans Rituel.',p.autoRituel,Boolean(appRituel?.scopes?.includes('product_paid')))}
   <div class="settings-option"><div><strong>Réception et contrôle</strong><p>${pending.length} proposition(s) à examiner · ${latest.date?'dernière vérification effectuée':'non vérifié pendant cette session'}. Jamais de modification automatique d’une dépense déjà enregistrée.</p></div>
    <button type="button" class="btn btn-soft btn-small" data-action="connect2-refresh">${ico('refresh')} Recevoir</button></div>
   <p class="pref-hint">L’automatisation est désactivée par défaut. Tu restes maître des autorisations : Réglages → Applications & connexions. Les propositions trop anciennes ou sans date d’achat sont à examiner manuellement.</p>
  </section>`;
 }
 function onChange(target){
  const key=target?.dataset?.connect2Pref;
  if(!['autoReceive','autoGaming','autoRituel'].includes(key))return false;
  if(key==='autoGaming'&&!pair('gaming')?.scopes?.includes('pass_paid'))return true;
  if(key==='autoRituel'&&!pair('rituel')?.scopes?.includes('product_paid'))return true;
  const p=preferences();p[key]=Boolean(target.checked);
  if(save(p)){
   adapter?.toast?.(target.checked?'Connect 2.0 : autorisation activée.':'Connect 2.0 : autorisation désactivée.');
   if(target.checked&&key!=='autoReceive')void processPending();
   if(target.checked&&key==='autoReceive')void synchronize({manual:true});
  }
  return true;
 }
 function act(kind){
  if(kind!=='connect2-refresh')return false;
  void synchronize({manual:true});return true;
 }
 function init(){
  if(initialized)return;initialized=true;
  // Visibility/online checks only while the application is open; no unsupported background promises.
  window.addEventListener('online',()=>{void synchronize();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void synchronize();});
  window.setInterval(()=>{if(document.visibilityState==='visible')void synchronize();},FRESH_MS);
  window.setTimeout(()=>{void synchronize();},1800);
 }
 function attach(value){adapter=value;}
 window.NexusConnect2=Object.freeze({attach,init,synchronize,processPending,accept,settingsCard,onChange,act,validDate,sourceOf,preferences,alreadyPaid});
})();
