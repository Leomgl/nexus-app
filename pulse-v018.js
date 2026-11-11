(function nexusPulseV018(){
 'use strict';
 const WEATHER_PREF='nexus_pulse_weather_v018';
 const WEATHER_CACHE='nexus_pulse_forecast_v018';
 const WEATHER_TTL=45*60*1000;
 const DEFAULT_LOCATION=Object.freeze({label:'Lille',latitude:50.6292,longitude:3.0573,source:'ville'});
 let api=null,loading=null;
 const readLocal=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
 const putLocal=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
 const esc=(x)=>api?.escape?.(x)??String(x||'');
 const svg=(x)=>api?.svg?.(x)||'';
 const date=(x)=>api?.formatDate?.(x)||String(x||'');
 const money=(x)=>api?.money?.(x)||'—';
 const todayKey=()=>api?.dateKey?.(new Date())||new Date().toISOString().slice(0,10);
 const state=()=>api?.state?.()||{events:[],tasks:[],projects:[],notes:[],transactions:[],limits:[],linkConnections:[],linkInbox:[]};
 const greeting=(h)=>h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir';
 const timeOf=(raw)=>/T\d\d:\d\d/.test(String(raw||''))?String(raw).slice(11,16):'';
 function pulsePriorities(d,now=new Date()){
  const today=api?.dateKey?.(now)||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const urgent=(d.tasks||[]).filter(t=>!t.done&&t.dueDate&&t.dueDate<=today)
   .sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate))||Number(b.priority||0)-Number(a.priority||0));
  const events=(d.events||[]).filter(e=>e.start&&Number.isFinite(new Date(e.start).getTime())&&new Date(e.start).getTime()>=now.getTime()-30*60*1000)
   .sort((a,b)=>String(a.start).localeCompare(String(b.start)));
  const todays=events.filter(e=>String(e.start).slice(0,10)===today);
  const overdue=urgent.filter(t=>t.dueDate<today);
  const pending=(d.linkInbox||[]).filter(x=>x.status==='pending');
  return {today,urgent,events,todays,overdue,pending,nextEvent:events[0]||null};
 }
 function header(title,sub,icon,target){
  return `<header class="nxp-widget-heading"><div><span class="nxp-kicker">${esc(sub)}</span><h2>${esc(title)}</h2></div>${target?`<button type="button" data-view="${target}" aria-label="Ouvrir ${esc(title)}">${svg(icon||'arrow')}</button>`:svg(icon||'circlecheck')}</header>`;
 }
 function dailyWidget(d,s){
  const eventList=s.todays.slice(0,3);
  const tasks=s.urgent.slice(0,3);
  const otherTasks=(d.tasks||[]).filter(t=>!t.done&&!s.urgent.some(x=>x.id===t.id))
   .sort((a,b)=>String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'))).slice(0,tasks.length?0:2);
  const selected=tasks.length?tasks:otherTasks;
  return `<section class="nxp-widget nxp-widget-today" aria-labelledby="nxp-daily-title">
  <header class="nxp-widget-heading"><div><span class="nxp-kicker">PRIORITÉS DU JOUR</span><h2 id="nxp-daily-title">Ce qui compte aujourd'hui</h2></div><button type="button" data-view="calendar" aria-label="Ouvrir l'agenda">${svg('calendar')}</button></header>
  <div class="nxp-daily-columns">
   <div class="nxp-daily-group"><div class="nxp-group-heading">${svg('calendar')} Rendez-vous <strong>${s.todays.length}</strong></div>
    ${eventList.length?eventList.map(e=>`<button class="nxp-item" type="button" data-action="event-detail" data-id="${esc(e.id)}"><span class="nxp-item-icon">${svg('clock')}</span><span class="nxp-item-copy"><strong>${esc(e.title||'Rendez-vous')}</strong><small>${esc(timeOf(e.start)||'Aujourd’hui')}${e.location?' · '+esc(e.location):''}</small></span>${svg('chevright')}</button>`).join(''):
       s.nextEvent?`<div class="nxp-next">Pas de RDV restant aujourd'hui. Prochain : <strong>${esc(s.nextEvent.title)}</strong> · ${esc(date(s.nextEvent.start))}</div>`:
       '<p class="nxp-empty">Aucun rendez-vous prévu aujourd’hui.</p>'}
   </div>
   <div class="nxp-daily-group"><div class="nxp-group-heading">${svg('check')} À ne pas oublier <strong>${s.urgent.length}</strong></div>
    ${selected.length?selected.map(t=>`<button class="nxp-item" type="button" data-action="task-detail" data-id="${esc(t.id)}"><span class="nxp-item-icon ${t.dueDate< s.today?'nxp-overdue':''}">${svg('check')}</span><span class="nxp-item-copy"><strong>${esc(t.title||'Rappel')}</strong><small>${t.dueDate<s.today?'En retard':t.dueDate===s.today?'À faire aujourd’hui':t.dueDate?esc(date(t.dueDate)):'Sans échéance'}</small></span>${svg('chevright')}</button>`).join(''):
       '<p class="nxp-empty">Aucune tâche urgente. Belle journée !</p>'}
   </div>
  </div></section>`;
 }
 function budgetWidget(d,s){
  const month=s.today.slice(0,7);
  const totals=api?.monthTotals?.(month)||{income:0,expense:0};
  const limit=(d.limits||[]).find(x=>x.month===month)?.limitCents;
  const remaining=Number.isInteger(limit)&&limit>0?limit-totals.expense:null;
  const percent=remaining===null?0:Math.min(100,Math.max(0,Math.round(totals.expense/limit*100)));
  const pending=api?.forecast?.(month)?.pending?.length||0;
  return `<section class="nxp-widget nxp-widget-budget">${header('Budget','PILOTER', 'wallet','budget')}
   <div class="nxp-big">${money(totals.expense)}</div><p class="nxp-muted">Dépenses enregistrées ce mois</p>
   ${remaining===null?`<p class="nxp-hint">Plafond non défini · ${money(totals.income)} de recettes enregistrées</p>`:
    `<div class="nxp-budget-track"><i style="width:${percent}%"></i></div><p class="nxp-hint">${remaining<0?money(-remaining)+' au-dessus du plafond':money(remaining)+' avant le plafond'} · ${percent}% utilisés</p>`}
   ${pending?`<p class="nxp-flag">${svg('clock')} ${pending} échéance(s) prévisionnelle(s) à confirmer</p>`:''}
  </section>`;
 }
 function focusWidget(d){
  const project=[...(d.projects||[])].filter(p=>p.status==='active')
   .sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0];
  const tasks=project?(d.tasks||[]).filter(t=>t.projectId===project.id):[];
  const done=tasks.filter(t=>t.done).length;
  const percent=tasks.length?Math.round(100*done/tasks.length):0;
  return `<section class="nxp-widget nxp-widget-focus">${header('Projet en focus','AVANCER', 'briefcase','projects')}
  ${project?`<button class="nxp-project" type="button" data-action="project-detail" data-id="${esc(project.id)}"><strong>${esc(project.title)}</strong><p>${esc(project.description||'Projet actif')}</p><div class="nxp-budget-track"><i style="width:${percent}%"></i></div><small>${done}/${tasks.length} tâches terminées · ${percent}%</small></button>`:
  `<p class="nxp-empty">Aucun projet actif.</p><button class="nxp-small-action" data-action="new-project">${svg('plus')} Créer un projet</button>`}</section>`;
 }
 function recentWidget(d){
  const items=[...(d.notes||[]).map(x=>({...x,kind:'note'})),
   ...(d.projects||[]).map(x=>({...x,kind:'project'})),
   ...(d.purchases||[]).map(x=>({...x,kind:'purchase'}))]
   .filter(x=>x.updatedAt||x.createdAt)
   .sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))).slice(0,3);
  return `<section class="nxp-widget nxp-widget-recent">${header('Activité récente','MÉMOIRE', 'notes','notes')}
  ${items.length?items.map(x=>`<button class="nxp-item" data-action="${x.kind}-detail" data-id="${esc(x.id)}"><span class="nxp-item-icon">${svg(x.kind==='project'?'briefcase':x.kind==='purchase'?'cart':'notes')}</span><span class="nxp-item-copy"><strong>${esc(x.title||'Élément sans titre')}</strong><small>${esc(date(x.updatedAt||x.createdAt))}</small></span>${svg('chevright')}</button>`).join(''):
  '<p class="nxp-empty">Tes prochaines idées et projets apparaîtront ici.</p>'}</section>`;
 }
 function connectionsWidget(d,s){
  const counts=s.pending.reduce((a,x)=>{const source=String(x.payload?.sourceApp||x.originApp||'').toLowerCase();
   if(source==='gaming'||source==='rituel')a[source]++;return a;},{gaming:0,rituel:0});
  const linked=[...new Set((d.linkConnections||[]).map(x=>x.sourceApp).filter(Boolean))];
  return `<section class="nxp-widget nxp-widget-links">${header('Applications liées','CONNECT', 'link','settings')}
    ${s.pending.length?`<p class="nxp-flag">${svg('info')} ${s.pending.length} proposition(s) à examiner</p>`:
     '<p class="nxp-muted">Les événements utiles des apps spécialisées arrivent ici.</p>'}
    <div class="nxp-connection-actions">
     ${counts.gaming?`<button class="nxp-small-action" data-action="link-proposals">${svg('grid')} Gaming · ${counts.gaming}</button>`:''}
     ${counts.rituel?`<button class="nxp-small-action" data-action="rituel-proposals">${svg('sparkle')} Rituel · ${counts.rituel}</button>`:''}
     ${linked.length?`<small>${esc(linked.join(' · '))} connecté${linked.length>1?'s':''}</small>`:
      '<small>Connecte Gaming ou Rituel depuis Réglages.</small>'}
    </div>
   </section>`;
 }
 function getLocation(){
  const v=readLocal(WEATHER_PREF);
  if(!v||typeof v.label!=='string'||!validCoords(v.latitude,v.longitude))return DEFAULT_LOCATION;
  return {label:v.label.slice(0,120),latitude:Number(v.latitude),longitude:Number(v.longitude),source:v.source||'ville'};
 }
 function validCoords(lat,lon){return Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180;}
 function weatherLabel(code){
  if(code===0)return ['Ensoleillé','sun'];
  if([1,2].includes(code))return ['Éclaircies','cloudsun'];
  if(code===3)return ['Nuageux','cloud'];
  if([45,48].includes(code))return ['Brouillard','cloud'];
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return ['Pluie','rain'];
  if([71,73,75,77,85,86].includes(code))return ['Neige','snow'];
  if([95,96,99].includes(code))return ['Orages','rain'];
  return ['Conditions variables','cloudsun'];
 }
 function cachedWeather(location){
  const c=readLocal(WEATHER_CACHE);
  if(!c||typeof c.time!=='number'||Date.now()-c.time>24*60*60*1000||c.latitude!==location.latitude||c.longitude!==location.longitude)return null;
  return c;
 }
 function widgetWeather(){
  const location=getLocation();
  const cache=cachedWeather(location);
  return `<section class="nxp-widget nxp-widget-weather">${header('Météo','DEHORS', 'cloudsun')}
  <div class="nxp-weather-location">${svg('pin')} <strong>${esc(location.label)}</strong>
   <button type="button" data-action="pulse-weather-settings" title="Changer de ville" aria-label="Changer de ville">${svg('edit')}</button></div>
  <div id="nxp-weather-data" aria-live="polite">${cache?formatWeather(cache,true):'<p class="nxp-weather-loading">Prévisions en chargement…</p>'}</div>
  <div class="nxp-weather-footer"><span>Source : <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></span>
   <button type="button" data-action="pulse-weather-refresh" title="Actualiser la météo">${svg('refresh')}</button></div>
  </section>`;
 }
 function formatWeather(cache,stale=false){
  const data=cache.data;
  if(!data?.current||!Number.isFinite(data.current.temperature_2m))return '<p class="nxp-empty">Météo indisponible.</p>';
  const code=Number(data.current.weather_code);
  const [label,icon]=weatherLabel(code);
  const feels=data.current.apparent_temperature;
  const max=data.daily?.temperature_2m_max?.[0],min=data.daily?.temperature_2m_min?.[0],rain=data.daily?.precipitation_probability_max?.[0];
  return `<div class="nxp-weather-main"><div class="nxp-weather-icon">${svg(icon)}</div><div><strong>${Math.round(data.current.temperature_2m)}°</strong><span>${esc(label)}</span></div></div>
   <div class="nxp-weather-facts">
    ${Number.isFinite(feels)?`<span>Ressenti ${Math.round(feels)}°</span>`:''}
    ${Number.isFinite(max)&&Number.isFinite(min)?`<span>Max ${Math.round(max)}° · Min ${Math.round(min)}°</span>`:''}
    ${Number.isFinite(rain)?`<span>Pluie ${Math.round(rain)} %</span>`:''}
   </div>${stale?'<small class="nxp-weather-stale">Dernières données enregistrées</small>':''}`;
 }
 function view(selected=[]){
  if(!api)return '';
  const d=state(),now=new Date(),p=pulsePriorities(d,now);
  const options={
   today:()=>dailyWidget(d,p),
   weather:()=>widgetWeather(),
   budget:()=>budgetWidget(d,p),
   focus:()=>focusWidget(d),
   links:()=>connectionsWidget(d,p),
   recent:()=>recentWidget(d)
  };
  const blocks=Array.isArray(selected)?selected.filter(id=>typeof options[id]==='function'):[];
  return `<div class="nx-pulse">
   <section class="nxp-hero"><div class="nxp-hero-copy"><span class="nxp-kicker">NEXUS PULSE · AUJOURD'HUI</span>
    <h1>${greeting(now.getHours())}<span class="punctuation">.</span></h1>
    <p>${esc(date(p.today))} · ${p.todays.length} RDV · ${p.urgent.length} priorité(s)${p.pending.length?' · '+p.pending.length+' proposition(s)':''}</p></div>
    <button type="button" class="nxp-hero-settings" data-view="settings" aria-label="Personnaliser Pulse">${svg('sliders')}</button>
   </section>
   <section class="nxp-capture">
    <div class="nxp-capture-title"><span>${svg('bolt')} CAPTURE ÉCLAIR</span><strong>Une idée, un rendez-vous, une dépense ?</strong></div>
    <label class="sr-only" for="quick-capture">Capture rapide</label>
    <textarea id="quick-capture" rows="2" maxlength="12000" placeholder="Note quelque chose à ne pas oublier…"></textarea>
    <div class="nxp-capture-actions"><div class="nxp-capture-shortcuts">
     <button type="button" data-action="new-event">${svg('calendar')} RDV</button>
     <button type="button" data-action="new-task">${svg('check')} Rappel</button>
     <button type="button" data-action="new-purchase">${svg('cart')} Achat</button>
     <button type="button" data-action="new-transaction">${svg('wallet')} Dépense</button></div>
     <button type="button" class="btn btn-small" data-action="quick-save">${svg('arrow')} Capturer</button></div>
    </section>
    <div class="nxp-widgets">${blocks.map(id=>options[id]()).join('')||`<div class="nxp-widget nxp-no-widget"><h2>Ton espace, tes règles.</h2><p>Active tes widgets depuis les réglages.</p><button data-view="settings" class="btn btn-small">Personnaliser</button></div>`}</div>
    <div class="nxp-bottom"><button type="button" data-view="settings">${svg('sliders')} Personnaliser</button><button type="button" data-view="categories">${svg('grid')} Toutes les catégories</button></div>
   </div>`;
 }
 async function loadWeather(force=false){
  const container=document.getElementById('nxp-weather-data');
  if(!container)return;
  const location=getLocation(),cache=cachedWeather(location);
  if(cache&&!force&&Date.now()-cache.time<WEATHER_TTL){container.innerHTML=formatWeather(cache);return;}
  if(cache)container.innerHTML=formatWeather(cache,true);
  if(loading)return;
  const key=`${location.latitude},${location.longitude}`;
  loading=key;
  const abort=new AbortController();
  const timeout=setTimeout(()=>abort.abort(),12000);
  try{
   const args=new URLSearchParams({
    latitude:String(location.latitude),longitude:String(location.longitude),
    current:'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m',
    daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone:'auto',forecast_days:'2'
   });
   const response=await fetch(`https://api.open-meteo.com/v1/forecast?${args}`,{signal:abort.signal,cache:'no-store'});
   if(!response.ok)throw new Error('Météo indisponible');
   const data=await response.json();
   if(!Number.isFinite(Number(data?.current?.temperature_2m)))throw new Error('Données météo invalides');
   const payload={latitude:location.latitude,longitude:location.longitude,time:Date.now(),data};
   putLocal(WEATHER_CACHE,payload);
   const current=document.getElementById('nxp-weather-data');
   if(current&&getLocation().latitude===location.latitude&&getLocation().longitude===location.longitude)current.innerHTML=formatWeather(payload);
  }catch(err){
   const current=document.getElementById('nxp-weather-data');
   if(current&&!cache)current.innerHTML='<p class="nxp-empty">Impossible de charger la météo. Réessaie avec Internet.</p>';
  }finally{clearTimeout(timeout);loading=null;}
 }
 function afterRender(){if(document.getElementById('nxp-weather-data'))void loadWeather();}
 function weatherSettings(){
  if(!api)return;
  const current=getLocation();
  api.modal('Météo de Pulse',`<div class="nxp-weather-settings">
   <p class="muted-note">Ville actuelle : <strong>${esc(current.label)}</strong>. La météo est demandée à Open-Meteo. Ta position GPS n'est jamais demandée automatiquement.</p>
   <div class="field"><label for="nxp-weather-city">Rechercher une ville</label><input type="search" id="nxp-weather-city" placeholder="Ex. Lille, Paris, Bruxelles" value="${esc(current.source==='position'?'':current.label)}" maxlength="90"></div>
   <div class="form-actions"><button type="button" class="btn btn-soft btn-small" data-action="pulse-weather-search">${svg('search')} Rechercher</button>
   <button type="button" class="btn btn-neutral btn-small" data-action="pulse-weather-gps">${svg('pin')} Ma position</button></div>
   <p class="muted-note">La géolocalisation est facultative ; si tu l'autorises, NEXUS arrondit les coordonnées avant d'appeler la météo.</p>
   <div id="nxp-weather-suggestions" class="nxp-weather-suggestions" aria-live="polite"></div></div>`);
 }
 async function searchCity(){
  const field=document.getElementById('nxp-weather-city');
  const target=document.getElementById('nxp-weather-suggestions');
  const q=String(field?.value||'').trim();
  if(!target)return;
  if(q.length<2){target.textContent='Saisis au moins deux caractères.';return;}
  target.textContent='Recherche en cours…';
  try{
   const url=new URL('https://geocoding-api.open-meteo.com/v1/search');
   url.searchParams.set('name',q);url.searchParams.set('count','6');url.searchParams.set('language','fr');
   const response=await fetch(url.href,{cache:'no-store'});
   if(!response.ok)throw new Error('Recherche indisponible');
   const d=await response.json();
   const places=(Array.isArray(d.results)?d.results:[]).filter(p=>validCoords(p.latitude,p.longitude));
   target.innerHTML=places.length?places.map(p=>{
    const label=[p.name,p.admin1,p.country].filter(Boolean).join(', ').slice(0,120);
    return `<button type="button" class="nxp-weather-place" data-action="pulse-weather-pick" data-label="${esc(label)}" data-lat="${Number(p.latitude)}" data-lon="${Number(p.longitude)}">${svg('pin')} ${esc(label)}</button>`;
   }).join(''):'Aucune ville trouvée. Essaie avec le pays.';
  }catch{target.textContent='Recherche impossible. Vérifie ta connexion.';}
 }
 function saveLocation(location){
  if(!validCoords(location.latitude,location.longitude))return false;
  putLocal(WEATHER_PREF,{label:location.label.slice(0,120),latitude:location.latitude,longitude:location.longitude,source:location.source});
  try{localStorage.removeItem(WEATHER_CACHE);}catch{}
  api.closeModal();api.render();api.toast('Ville météo actualisée.');
  return true;
 }
 function geoLocation(){
  if(!navigator.geolocation){api.toast('Géolocalisation indisponible.');return;}
  api.toast('Autorisation de localisation demandée par iOS.');
  navigator.geolocation.getCurrentPosition(position=>{
   saveLocation({label:'Ma position',latitude:Number(position.coords.latitude.toFixed(2)),longitude:Number(position.coords.longitude.toFixed(2)),source:'position'});
  },()=>api.toast('Localisation refusée ou indisponible.'),{enableHighAccuracy:false,maximumAge:30*60*1000,timeout:12000});
 }
 async function act(kind,button){
  if(kind==='pulse-weather-settings'){weatherSettings();return true;}
  if(kind==='pulse-weather-refresh'){await loadWeather(true);return true;}
  if(kind==='pulse-weather-search'){await searchCity();return true;}
  if(kind==='pulse-weather-gps'){geoLocation();return true;}
  if(kind==='pulse-weather-pick'){
   const lat=Number(button?.dataset.lat),lon=Number(button?.dataset.lon);
   const label=String(button?.dataset.label||'Ville');
   saveLocation({label,latitude:lat,longitude:lon,source:'ville'});return true;
  }
  return false;
 }
 function attach(adapter){api=adapter;}
 window.NexusPulse=Object.freeze({attach,view,afterRender,act,pulsePriorities,weatherLabel,getLocation});
})();
