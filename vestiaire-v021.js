(function nexusVestiaireV021(){
 'use strict';
 let api=null,running=false,lastCheck=0,timer=null,initialized=false;
 const CORE=()=>window.NexusLinkCore;
 const ORIGIN='https://vestiaire-app.q9pfwtztsc.workers.dev/';
 const SCOPE='outfit_catalog';
 const esc=s=>api?.escape?.(s)??String(s||'');
 const svg=s=>api?.svg?.(s)||'';
 const db=()=>api?.state?.()||{};
 const pair=()=>db().linkConnections?.find(p=>p.sourceApp==='vestiaire'&&p.scopes?.length===1&&p.scopes[0]===SCOPE)||null;
 const catalog=()=>db().vestiaireCatalogs?.find(x=>x.pairId===pair()?.id)||null;
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const knownOccasions=new Set(['Restaurant','Travail','Soirée','Casual','Sport','Voyage','Événement','Libre']);
 const validISO=s=>typeof s==='string'&&Number.isFinite(new Date(s).getTime());
 function validCatalog(msg,p){
  const x=msg?.payload;
  if(!p||msg.invalid||msg.scope!==SCOPE||!Number.isSafeInteger(msg.revision)||msg.revision<1||
    x?.type!=='vestiaire.catalog.v1'||x.sourceApp!=='vestiaire'||x.revision!==msg.revision||
    !Array.isArray(x.looks)||x.looks.length>24||x.total>50000||x.omitted>50000)return null;
  const ids=new Set(),looks=[];
  for(const row of x.looks){
   if(typeof row?.id!=='string'||!row.id||row.id.length>100||ids.has(row.id)||
    typeof row.name!=='string'||!row.name||row.name.length>85||
    typeof row.occasion!=='string'||row.occasion.length>25||
    typeof row.style!=='string'||row.style.length>25||
    typeof row.available!=='boolean'||!Number.isInteger(row.warmth)||row.warmth<0||row.warmth>3)return null;
   ids.add(row.id);
   looks.push({id:row.id,name:row.name,occasion:row.occasion,style:row.style,available:row.available,warmth:row.warmth});
  }
  return {pairId:p.id,revision:msg.revision,sourceKey:msg.sourceKey,
   looks,sharedAt:validISO(x.sharedAt)?x.sharedAt:new Date().toISOString(),
   receivedAt:new Date().toISOString(),total:Math.max(looks.length,Number(x.total)||looks.length),
   omitted:Math.max(0,Number(x.omitted)||0)};
 }
 // V2 keeps the v1 catalog compatible, while receiving a complete encrypted snapshot in pages.
 function validPage(msg,p){
  const x=msg?.payload;
  if(!p||msg.invalid||msg.scope!==SCOPE||!Number.isSafeInteger(msg.revision)||msg.revision<1||
     x?.type!=='vestiaire.catalog.page.v2'||x.sourceApp!=='vestiaire'||x.revision!==msg.revision||
     typeof x.batchId!=='string'||!/^[a-f0-9-]{36}$/i.test(x.batchId)||
     !Number.isSafeInteger(x.pageIndex)||!Number.isSafeInteger(x.pageCount)||
     x.pageCount<1||x.pageCount>200||x.pageIndex<0||x.pageIndex>=x.pageCount||
     !Number.isSafeInteger(x.total)||x.total<0||x.total>50000||
     !Array.isArray(x.looks)||x.looks.length>24||x.looks.length>x.total||
     !validISO(x.sharedAt))return null;
  const record=validCatalog({...msg,payload:{...x,type:'vestiaire.catalog.v1',omitted:0}},p);
  if(!record)return null;
  return {pairId:p.id,revision:msg.revision,batchId:x.batchId,
   pageIndex:x.pageIndex,pageCount:x.pageCount,total:x.total,sharedAt:x.sharedAt,
   looks:record.looks};
 }
 function assembledTransfer(t){
  if(!t||!Array.isArray(t.pages)||t.pageCount!==t.pages.length||
   !t.pages.every(Array.isArray))return null;
  const looks=t.pages.flat(),ids=new Set();
  if(looks.length!==t.total)throw Error('Catalogue reçu incomplet ou total incorrect');
  for(const row of looks){if(ids.has(row.id))throw Error('Doublon de tenue entre lots');ids.add(row.id);}
  return {pairId:t.pairId,revision:t.revision,sourceKey:'catalog-v2',
   looks,total:t.total,omitted:0,sharedAt:t.sharedAt,receivedAt:new Date().toISOString()};
 }
 async function activateTransfer(t){
  const record=assembledTransfer(t);if(!record)return false;
  const before=(db().vestiaireCatalogs||[]).slice(),oldTransfers=(db().vestiaireTransfers||[]).slice();
  db().vestiaireCatalogs=[...before.filter(x=>x.pairId!==t.pairId),record];
  db().vestiaireTransfers=oldTransfers.filter(x=>x.pairId!==t.pairId);
  try{
   await api.persist();
   if(!await api.verify('catalog',t.pairId,t.revision))throw Error('Catalogue complet non confirmé en stockage');
  }catch(err){
   db().vestiaireCatalogs=before;db().vestiaireTransfers=oldTransfers;
   try{await api.persist();}catch{}
   throw err;
  }
  return true;
 }
 async function receivePage(msg,page,p){
  const old=catalog(),transfers=db().vestiaireTransfers||[];
  const newest=Math.max(old?.revision||0,0,...transfers.filter(x=>x.pairId===p.id).map(x=>x.revision));
  if(page.revision<newest||old?.revision>=page.revision){await CORE().acknowledge(p,msg.id);return false;}
  const previous=transfers.find(x=>x.pairId===p.id&&x.revision===page.revision);
  if(previous&&(previous.batchId!==page.batchId||previous.pageCount!==page.pageCount||
     previous.total!==page.total||previous.sharedAt!==page.sharedAt))
   throw Error('Lots de catalogue incompatibles : une nouvelle synchronisation est nécessaire');
  const next=previous?{...previous,pages:previous.pages.slice()}:
   {pairId:p.id,revision:page.revision,batchId:page.batchId,
    pageCount:page.pageCount,total:page.total,sharedAt:page.sharedAt,pages:Array(page.pageCount).fill(null)};
  const prior=next.pages[page.pageIndex];
  if(prior&&JSON.stringify(prior)!==JSON.stringify(page.looks))
   throw Error('Lot contradictoire avec une copie déjà enregistrée');
  next.pages[page.pageIndex]=page.looks;
  const before=transfers.slice();
  db().vestiaireTransfers=[...transfers.filter(x=>x.pairId!==p.id),next];
  try{
   await api.persist();
   if(!await api.verify('page',p.id,page.revision,page.pageIndex))
    throw Error('Lot non confirmé dans le stockage');
  }catch(err){
   db().vestiaireTransfers=before;
   try{await api.persist();}catch{}
   throw err;
  }
  await CORE().acknowledge(p,msg.id);
  await activateTransfer(next); // leaves the prior complete snapshot intact until all pages arrive
  return true;
 }
 function context(event){
  const value=norm([event.title,event.details].filter(Boolean).join(' '));
  if(/\b(resto|restaurant|diner|dejeuner|brunch|bistrot|gastronomique)\b/.test(value))return 'Restaurant';
  if(/\b(mariage|anniversaire|fete|soiree|cocktail|concert|spectacle)\b/.test(value))return 'Soirée';
  if(/\b(reunion|bureau|travail|client|entretien|conference|seminaire)\b/.test(value))return 'Travail';
  if(/\b(sport|gym|musculation|running|fitness|entrainement|match)\b/.test(value))return 'Sport';
  if(/\b(voyage|week.end|sejour|vacances|depart|vol|train)\b/.test(value))return 'Voyage';
  if(/\b(balade|promenade|shopping|cinema|cafe|sortie)\b/.test(value))return 'Casual';
  return null;
 }
 function cachedWeather(){
  try{
   const c=JSON.parse(localStorage.getItem('nexus_pulse_forecast_v018')||'null');
   if(!c||!c.time||Date.now()-c.time>24*60*60*1000)return null;
   const value=c.data?.current?.apparent_temperature, rain=c.data?.daily?.precipitation_probability_max?.[0];
   return {feels:Number.isFinite(value)?value:null,rain:Number.isFinite(rain)?rain:null};
  }catch{return null}
 }
 function comingEvent(now=new Date()){
  const upper=now.getTime()+72*60*60*1000;
  return (db().events||[]).filter(e=>e.start&&context(e)&&Number.isFinite(new Date(e.start).getTime())&&
   new Date(e.start).getTime()>=now.getTime()-30*60000&&new Date(e.start).getTime()<=upper)
   .sort((a,b)=>String(a.start).localeCompare(String(b.start)))[0]||null;
 }
 function recommend(event,looks,weather=null){
  if(!event||!Array.isArray(looks))return [];
  const occasion=context(event);if(!occasion)return [];
  return looks.filter(x=>x.available).map(x=>{
   let score=x.occasion===occasion?15:x.occasion==='Libre'?2:x.occasion==='Événement'?3:0;
   if(x.occasion==='Sport'&&occasion!=='Sport')score-=9;
   if(occasion==='Restaurant'&&['Smart casual','Classique','Old money'].includes(x.style))score+=3;
   if(occasion==='Soirée'&&['Classique','Old money'].includes(x.style))score+=3;
   if(weather&&weather.feels!==null){
    if(weather.feels<11)score+=x.warmth*2;
    else if(weather.feels>24)score+=(3-x.warmth)*2;
   }
   if(weather&&weather.rain!==null&&weather.rain>=65)score+=x.warmth>=2?2:0;
   return {...x,score};
  }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'fr')).slice(0,3);
 }
 function selected(eventId){return db().vestiaireSelections?.find(x=>x.eventId===eventId)||null;}
 function widget(){
  if(!api)return '';
  const p=pair(),c=catalog(),e=comingEvent();
  if(!p)return `<section class="nxp-widget nxv-widget"><header class="nxp-widget-heading"><div><span class="nxp-kicker">LOOKS CONTEXTUELS</span><h2>Tenue du jour</h2></div>${svg('sparkle')}</header>
   <p class="nxp-muted">Relie Vestiaire pour recevoir des idées de tenues selon tes rendez-vous et la météo.</p>
   <button type="button" class="nxp-small-action" data-action="vestiaire-open-settings">Connecter Vestiaire</button></section>`;
  if(!c)return `<section class="nxp-widget nxv-widget"><header class="nxp-widget-heading"><div><span class="nxp-kicker">VESTIAIRE</span><h2>Tenue du jour</h2></div>${svg('shirt')}</header>
  <p class="nxp-muted">Connexion créée. Envoie ton catalogue résumé depuis Vestiaire pour activer les suggestions.</p>
  <button type="button" class="nxp-small-action" data-action="vestiaire-refresh">Recevoir les tenues</button></section>`;
  if(!e)return `<section class="nxp-widget nxv-widget"><header class="nxp-widget-heading"><div><span class="nxp-kicker">VESTIAIRE</span><h2>Tenue du jour</h2></div>${svg('shirt')}</header>
   <p class="nxp-muted">${c.looks.length} tenue(s) synchronisée(s). Ajoute un restaurant, une sortie ou un rendez-vous reconnu dans l'Agenda pour obtenir des propositions.</p></section>`;
  const weather=cachedWeather(),suggestions=recommend(e,c.looks,weather);
  const current=selected(e.id);
  return `<section class="nxp-widget nxv-widget">
  <header class="nxp-widget-heading"><div><span class="nxp-kicker">SUGGESTIONS · VESTIAIRE</span><h2>Et pour ta tenue ?</h2></div><button type="button" data-action="vestiaire-refresh" title="Rafraîchir les tenues">${svg('refresh')}</button></header>
  <p class="nxv-context">${svg('calendar')} ${esc(e.title)} · ${esc(String(e.start).slice(11,16)||String(e.start).slice(0,10))}
   <span>${esc(context(e))}${weather?.feels!==null&&Number.isFinite(weather?.feels)?' · Ressenti '+Math.round(weather.feels)+'°':''}</span></p>
  ${suggestions.length?suggestions.map((x,i)=>`<div class="nxv-suggestion"><span class="nxv-rank">${i+1}</span>
    <span class="nxv-look"><strong>${esc(x.name)}</strong><small>${esc(x.style)} · ${esc(x.occasion)}${x.warmth>=2?' · Chaud':''}</small></span>
    <button type="button" data-action="vestiaire-select" data-event="${esc(e.id)}" data-look="${esc(x.id)}" title="Choisir cette tenue">${current?.lookId===x.id?svg('circlecheck'):svg('check')}</button>
    <a href="${ORIGIN}?look=${encodeURIComponent(x.id)}" rel="noopener noreferrer" target="_blank" aria-label="Ouvrir ${esc(x.name)} dans Vestiaire">${svg('arrow')}</a>
  </div>`).join(''):'<p class="nxp-muted">Aucune tenue disponible pour cet événement. Vérifie les pièces au lavage dans Vestiaire.</p>'}
  ${current?`<p class="nxv-picked">${svg('circlecheck')} Tenue choisie : ${esc(c.looks.find(l=>l.id===current.lookId)?.name||'Tenue non disponible')} <button type="button" data-action="vestiaire-unselect" data-event="${esc(e.id)}">Annuler</button></p>`:''}
  <p class="nxp-muted nxv-disclaimer">Suggestions locales, sans IA payante. La météo utilise ta ville Pulse, qui peut différer du lieu du rendez-vous. Aucun choix n'est enregistré dans Vestiaire automatiquement.</p>
  </section>`;
 }
 function eventBadge(id){
  const s=selected(id);if(!s)return '';
  const look=catalog()?.looks?.find(x=>x.id===s.lookId);
  return `<div class="linked-section"><h3>${svg('shirt')} Tenue prévue</h3><p class="muted-note">${esc(look?.name||'Tenue Vestiaire non synchronisée')}</p>
   <div class="form-actions"><a href="${ORIGIN}?look=${encodeURIComponent(s.lookId)}" target="_blank" rel="noopener noreferrer" class="btn btn-soft btn-small">Ouvrir dans Vestiaire</a>
   <button type="button" class="btn btn-neutral btn-small" data-action="vestiaire-unselect" data-event="${esc(id)}">Retirer</button></div></div>`;
 }
 function settingsCard(){
  const p=pair(),c=catalog(),pending=(db().vestiaireTransfers||[]).find(x=>x.pairId===p?.id);
  const progress=pending?' · Réception en cours : '+pending.pages.filter(Array.isArray).length+'/'+pending.pageCount+' lots':'';
  return `<section class="preferences-panel nxv-settings"><div class="pref-heading">${svg('shirt')}<div><h2>Vestiaire · Tenues contextuelles</h2><p>Partager un catalogue résumé, chiffré et autorisé, sans exporter les photos.</p></div></div>
  ${p?`<p class="pref-hint">Liaison privée active · ${c?.looks?.length||0} tenues reçues ${c?'· '+esc(c.sharedAt.slice(0,10)):''}${progress}. Ce code permet d'accéder à la connexion : garde-le confidentiel.</p>
   <label class="field"><span>Code privé à importer dans Vestiaire → Réglages</span><textarea id="nxv-code" rows="3" readonly>${esc(CORE().invitation(p))}</textarea></label>
   <div class="form-actions"><button type="button" class="btn btn-soft btn-small" data-action="vestiaire-copy">Copier le code</button>
   <button type="button" class="btn btn-neutral btn-small" data-action="vestiaire-refresh">Recevoir</button>
   <button type="button" class="btn btn-danger btn-small" data-action="vestiaire-revoke">Révoquer et effacer</button></div>`:
   `<p class="pref-hint">Une autorisation crée une liaison chiffrée dédiée aux résumés de looks. Vestiaire ne voit ni ton agenda ni ta météo ; NEXUS ne reçoit ni photos ni la liste des vêtements.</p>
    <button type="button" class="btn btn-soft btn-small" data-action="vestiaire-create">Créer la connexion Vestiaire</button>`}
   <p class="pref-hint"><a href="${ORIGIN}" target="_blank" rel="noopener noreferrer">Ouvrir Vestiaire</a> · ${c?'Les suggestions s’actualisent quand NEXUS et Vestiaire sont ouvertes.':'Aucune donnée partagée avant ton accord.'}</p>
   </section>`;
 }
 async function create(){
  if(pair())return;
  if(!confirm('Créer une connexion chiffrée dédiée au catalogue de tenues Vestiaire ? NEXUS ne partagera aucun rendez-vous.'))return;
  try{
   const p=await CORE().createPair('vestiaire',[SCOPE]);
   db().linkConnections.push(p);
   await api.persist();
   if(!await api.verify('pair',p.id)){db().linkConnections=db().linkConnections.filter(x=>x.id!==p.id);await api.persist();api.toast('Connexion non confirmée dans le stockage.');return;}
   api.render();api.toast('Connexion créée. Copie le code dans Vestiaire.');
  }catch(err){api.toast('Connexion impossible : '+String(err?.message||err).slice(0,70));}
 }
 async function copy(){
  if(!pair())return;
  try{await navigator.clipboard.writeText(CORE().invitation(pair()));api.toast('Code Vestiaire copié.');}
  catch{document.getElementById('nxv-code')?.select();api.toast('Sélectionne et copie le code.');}
 }
 async function receive(manual=false){
  const p=pair();
  if(!p||running||!CORE())return {received:0};
  if(!manual&&typeof navigator!=='undefined'&&navigator.onLine===false)return {offline:true};
  if(!manual&&typeof document!=='undefined'&&document.visibilityState==='hidden')return {hidden:true};
  if(!manual&&Date.now()-lastCheck<90*1000)return {fresh:true};
  lastCheck=Date.now();running=true;
  let received=0,invalid=0;
  try{
   // Recover a fully persisted batch if the app closed after its last page was acknowledged.
   for(const t of (db().vestiaireTransfers||[]).filter(x=>x.pairId===p.id)){
    if(assembledTransfer(t))await activateTransfer(t);
   }
   const messages=await CORE().inbox(p);
   for(const msg of messages.slice(0,50)){
    const page=validPage(msg,p);
    if(page){if(await receivePage(msg,page,p))received++;continue;}
    const record=validCatalog(msg,p);
    if(!record){invalid++;continue;}
    const pending=db().vestiaireTransfers||[];
    const newest=Math.max(catalog()?.revision||0,0,...pending.filter(x=>x.pairId===p.id).map(x=>x.revision));
    if(record.revision<=newest){await CORE().acknowledge(p,msg.id);continue;}
    const before=(db().vestiaireCatalogs||[]).slice(),oldPending=pending.slice();
    db().vestiaireCatalogs=[...before.filter(x=>x.pairId!==p.id),record];
    db().vestiaireTransfers=pending.filter(x=>x.pairId!==p.id);
    try{
     await api.persist();
     if(!await api.verify('catalog',p.id,record.revision))
      throw Error('Sauvegarde du catalogue non confirmée');
    }catch(err){
     db().vestiaireCatalogs=before;db().vestiaireTransfers=oldPending;
     try{await api.persist();}catch{}
     throw err;
    }
    await CORE().acknowledge(p,msg.id);received++;
   }
   if(received)api.safeRender?.();
   const waiting=(db().vestiaireTransfers||[]).find(x=>x.pairId===p.id);
   const progress=waiting?' · '+waiting.pages.filter(Array.isArray).length+'/'+waiting.pageCount+' lots reçus':'';
   if(manual)api.toast(received+' lot(s) reçu(s)'+progress+(invalid?' · '+invalid+' message(s) ignoré(s)':'')+'.');
   return {received,invalid};
  }catch(err){if(manual)api.toast('Réception impossible : '+String(err.message||err).slice(0,70));return {received,error:String(err.message||err)};}
  finally{running=false;}
 }
 async function select(eventId,lookId){
  const e=db().events?.find(x=>x.id===eventId),c=catalog();
  if(!e||!c?.looks?.some(x=>x.id===lookId&&x.available))return api.toast('Tenue ou événement indisponible.');
  const previous=(db().vestiaireSelections||[]).slice();
  const value={eventId,lookId,selectedAt:new Date().toISOString()};
  db().vestiaireSelections=[...previous.filter(x=>x.eventId!==eventId),value];
  await api.persist();
  if(!await api.verify('selection',eventId,lookId)){
   db().vestiaireSelections=previous;await api.persist();api.toast('Sélection non enregistrée.');return;
  }
  api.safeRender?.();api.toast('Tenue choisie pour ce rendez-vous.');
 }
 async function unselect(eventId){
  const before=(db().vestiaireSelections||[]).slice();
  db().vestiaireSelections=before.filter(x=>x.eventId!==eventId);
  await api.persist();
  if(!await api.verify('removedSelection',eventId)){db().vestiaireSelections=before;await api.persist();return api.toast('Impossible de retirer la sélection.');}
  api.safeRender?.();
  if(typeof document!=='undefined'&&document.querySelector('.modal-overlay'))api.showEvent?.(eventId);
  api.toast('Tenue retirée du rendez-vous.');
 }
 async function revoke(){
  const p=pair();if(!p)return;
  if(!confirm('Révoquer cette connexion ET retirer de NEXUS les tenues reçues et les choix enregistrés ? Le dressing dans Vestiaire reste intact.'))return;
  try{
   await CORE().revoke(p);
   db().linkConnections=db().linkConnections.filter(x=>x.id!==p.id);
   db().vestiaireCatalogs=db().vestiaireCatalogs.filter(x=>x.pairId!==p.id);
   db().vestiaireTransfers=(db().vestiaireTransfers||[]).filter(x=>x.pairId!==p.id);
   db().vestiaireSelections=[];
   await api.persist();api.render();api.toast('Connexion et catalogues Vestiaire effacés de NEXUS.');
  }catch(err){api.toast('Révocation impossible : '+String(err?.message||err).slice(0,70))}
 }
 async function act(kind,target){
  if(kind==='vestiaire-create'){await create();return true;}
  if(kind==='vestiaire-copy'){await copy();return true;}
  if(kind==='vestiaire-refresh'){await receive(true);return true;}
  if(kind==='vestiaire-open-settings'){api.navTo('settings');return true;}
  if(kind==='vestiaire-select'){await select(target.dataset.event,target.dataset.look);return true;}
  if(kind==='vestiaire-unselect'){await unselect(target.dataset.event);return true;}
  if(kind==='vestiaire-revoke'){await revoke();return true;}
  return false;
 }
 function init(){
  if(initialized)return;initialized=true;
  if(typeof window==='undefined'||typeof document==='undefined')return;
  window.addEventListener('online',()=>{void receive();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void receive();});
  timer=window.setInterval(()=>{if(document.visibilityState==='visible')void receive();},3*60*1000);
  window.setTimeout(()=>void receive(),2400);
 }
 function attach(value){api=value;}
 window.NexusVestiaire=Object.freeze({attach,init,widget,eventBadge,settingsCard,act,validCatalog,validPage,assembledTransfer,context,recommend,comingEvent,receive,pair});
})();
