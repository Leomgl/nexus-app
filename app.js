/* NEXUS V0.7 — modular command center, unchanged local data model. */
'use strict';
const ICONS = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  notes:'<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9"/><path d="M8 12h7M8 16h8M15 3l6 6M14 9l6-6"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  check:'<rect x="3" y="4" width="18" height="17" rx="3"/><path d="m8 12 3 3 5-6"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.2a4 4 0 0 1 0 7.6M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chevleft:'<path d="m14 18-6-6 6-6"/>',
  chevright:'<path d="m10 18 6-6-6-6"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  sparkle:'<path d="m12 3 1.8 5.5L19 10l-5.2 1.5L12 17l-1.8-5.5L5 10l5.2-1.5z"/><path d="m20 17 .7 2.3L23 20l-2.3.7L20 23l-.7-2.3L17 20l2.3-.7z"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  trash:'<path d="M4 7h16M10 11v7M14 11v7M6 7l1 14h10l1-14M9 7V4h6v3"/>',
  edit:'<path d="m16 5 3 3M3 21l4-.8L20 7a2 2 0 0 0-3-3L4 17z"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
  upload:'<path d="M12 21V9m-4 4 4-4 4 4M4 7V3h16v4"/>',
  mail:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>',
  phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2A19 19 0 0 1 2.1 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7 10a16 16 0 0 0 7 7l1.5-1.9a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 1.9z"/>',
  layers:'<path d="m12 2 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6"/>',
  shield:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/>',
  export:'<path d="M14 3h7v7m0-7-9 9M19 13v7H4V5h7"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 10v6M12 7h.01"/>',
  wallet:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M17 14h2"/>',
  cart:'<circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M2 3h2l3 13h12l3-9H5"/>',
  briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  star:'<path d="m12 3 2.7 5.65 6.23.91-4.47 4.36 1.06 6.18L12 17.19l-5.52 2.9 1.05-6.17-4.47-4.36 6.24-.91z"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  more:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  euro:'<path d="M19 6a8 8 0 1 0 0 12M4 10h11M4 14h11"/>',
  circlecheck:'<circle cx="12" cy="12" r="10"/><path d="m7 12 3 3 7-7"/>'
};
const svg = (name) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.file}</svg>`;
const escapeHtml = (value='') => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data = {notes:[],events:[],tasks:[],contacts:[],projects:[],purchases:[],transactions:[],limits:[],recurrences:[],quickExpenses:[],budgetCategories:[],trash:[],linkConnections:[],linkInbox:[]};
let currentView='home', taskFilter='open', calendarMonth = new Date(new Date().getFullYear(),new Date().getMonth(),1);
let selectedDay = dateKey(new Date()), toastTimeout;
let budgetMonth = dateKey(new Date()).slice(0,7), purchaseFilter = 'planned', projectFilter = 'active';
const DB_NAME='nexus-v0-1', DB_STORE='data', BACKUP_KEY='nexus_local_fallback_v1';

const MODULES=[
 ['notes','notes','Notes','Capture et mémoire'],
 ['calendar','calendar','Agenda','Le temps et les rendez-vous'],
 ['tasks','check','Rappels','À faire et échéances'],
 ['contacts','users','Personnes','Contacts et contexte'],
 ['projects','briefcase','Projets','Objectifs et suivi'],
 ['purchases','cart','Achats','Envies et besoins'],
 ['budget','wallet','Budget','Journal, récurrences et statistiques']
];
const HOME_WIDGETS=[
 ['today',"Aujourd'hui",'Rendez-vous et tâches prioritaires'],
 ['focus','Projet en focus','Un objectif à faire avancer'],
 ['budget','Budget du mois','Dépenses et plafond'],
 ['recent','Activité récente','Derniers éléments']
];
const UI_KEY='nexus_interface_v07';
const defaultUI=()=>({slot1:'projects',slot2:'budget',theme:'sage',density:'comfortable',widgets:HOME_WIDGETS.map(x=>x[0])});
function readUI(){
 const defaults=defaultUI();let stored;
 try{stored=JSON.parse(localStorage.getItem(UI_KEY)||'null');}catch{return defaults;}
 if(!stored||typeof stored!=='object')return defaults;
 const valid=x=>MODULES.some(m=>m[0]===x);
 const slot1=valid(stored.slot1)?stored.slot1:defaults.slot1;
 let slot2=valid(stored.slot2)?stored.slot2:defaults.slot2;
 if(slot1===slot2)slot2=MODULES.find(m=>m[0]!==slot1)[0];
 const widgets=Array.isArray(stored.widgets)?[...new Set(stored.widgets.filter(x=>HOME_WIDGETS.some(w=>w[0]===x)))]:defaults.widgets;
 return {slot1,slot2,widgets,theme:['sage','slate'].includes(stored.theme)?stored.theme:'sage',
   density:['comfortable','compact'].includes(stored.density)?stored.density:'comfortable'};
}
let UI=readUI();
function applyUI(){
 document.documentElement.dataset.theme=UI.theme;
 document.documentElement.dataset.density=UI.density;
}
function saveUI(){try{localStorage.setItem(UI_KEY,JSON.stringify(UI));}catch{}applyUI();render();}
function moduleInfo(view){return MODULES.find(m=>m[0]===view);}
function moduleCount(view){
 if(view==='notes')return data.notes.length+' notes';
 if(view==='calendar')return data.events.filter(e=>e.start&&new Date(e.start).getTime()>=Date.now()).length+' à venir';
 if(view==='tasks')return data.tasks.filter(t=>!t.done).length+' à faire';
 if(view==='contacts')return data.contacts.length+' contacts';
 if(view==='projects')return data.projects.filter(p=>p.status==='active').length+' actifs';
 if(view==='purchases')return data.purchases.filter(p=>p.status==='planned').length+' à prévoir';
 if(view==='budget')return money(monthTotals(dateKey(new Date()).slice(0,7)).expense)+' dépensés';
 return '';
}
function setSlot(index,value){
 if(!moduleInfo(value))return;
 const key=index===1?'slot1':'slot2',other=index===1?'slot2':'slot1';
 const before=UI[key];
 if(before===value)return;
 UI[key]=value;if(UI[other]===value)UI[other]=before;
 saveUI();toast('Navigation personnalisée.');
}

let dbHandle=null;
function dateKey(date){let y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`;}
function formatDate(raw, opts={day:'numeric',month:'long'}){if(!raw)return 'Sans date';const d=new Date(raw.length===10?`${raw}T12:00:00`:raw);return Number.isNaN(d.getTime())?'Date invalide':new Intl.DateTimeFormat('fr-FR',opts).format(d);}
function sortEvents(items){return [...items].sort((a,b)=>a.start.localeCompare(b.start));}
function uid(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`nx_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;}
function openDb(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window))return reject(new Error('IndexedDB indisponible'));const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function loadData(){try{dbHandle=await openDb();const stored=await new Promise((resolve,reject)=>{const r=dbHandle.transaction(DB_STORE,'readonly').objectStore(DB_STORE).get('main');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(stored)assignData(stored);else if(localStorage.getItem(BACKUP_KEY)){assignData(JSON.parse(localStorage.getItem(BACKUP_KEY)));await persist();}}catch(err){console.warn('IndexedDB unavailable; fallback localStorage',err);try{const local=JSON.parse(localStorage.getItem(BACKUP_KEY)||'null');if(local)assignData(local);}catch{}}}
function assignData(incoming){for(const key of Object.keys(data)){data[key]=Array.isArray(incoming?.[key])?incoming[key].filter(v=>v&&typeof v==='object'):[];}}
async function persist(){const snapshot=JSON.parse(JSON.stringify(data));try{if(dbHandle){await new Promise((resolve,reject)=>{const tx=dbHandle.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(snapshot,'main');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}else localStorage.setItem(BACKUP_KEY,JSON.stringify(snapshot));}catch(err){console.error(err);toast('Enregistrement impossible : exporte tes données.');}finally{window.NexusPush?.onLocalChange?.();window.NexusCloud?.onLocalChange?.();}}
function toast(message){const box=document.getElementById('toast');box.textContent=message;box.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>box.classList.remove('visible'),2800);}
function iconsInDom(){document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=svg(el.dataset.icon);el.removeAttribute('data-icon');});}

function navTo(view){currentView=view==='hub'?'categories':view;render();window.scrollTo({top:0,behavior:'instant'});}
function navDestination(value){return value==='slot1'||value==='slot2'?UI[value]:value;}
function navActive(){
 const active=['home','categories','settings'].includes(currentView)?currentView:
  currentView===UI.slot1?'slot1':currentView===UI.slot2?'slot2':'categories';
 document.querySelectorAll('[data-nav]').forEach(el=>{
  el.classList.toggle('active',el.dataset.nav===active);
  if(el.tagName==='BUTTON')el.setAttribute('aria-current',el.dataset.nav===active?'page':'false');
 });
 for(const index of [1,2]){
  const m=moduleInfo(UI['slot'+index])||MODULES[0];
  document.querySelectorAll('[data-slot-label="'+index+'"]').forEach(el=>{el.textContent=m[2];});
  document.querySelectorAll('[data-slot-icon="'+index+'"]').forEach(el=>{el.innerHTML=svg(m[1]);});
 }
}
function render(){
 const views={home:homeView,categories:categoriesView,settings:settingsView,
  notes:notesView,calendar:calendarView,tasks:tasksView,contacts:contactsView,
  projects:projectsView,budget:budgetView,purchases:purchasesView};
 const info=moduleInfo(currentView);
 const breadcrumb=info?`<div class="module-breadcrumb">
  <button data-view="categories">${svg('chevleft')} Catégories</button><span>${escapeHtml(info[2])}</span>
  <button data-action="pin-module" data-module="${currentView}" data-slot="1" title="Placer en raccourci 1">${svg('plus')} Slot 1</button>
  <button data-action="pin-module" data-module="${currentView}" data-slot="2" title="Placer en raccourci 2">${svg('plus')} Slot 2</button>
 </div>`:'';
 document.getElementById('view-root').innerHTML=breadcrumb+(views[currentView]||homeView)();
 document.getElementById('today-small').textContent=formatDate(dateKey(new Date()),{weekday:'short',day:'numeric',month:'short'});
 applyUI();iconsInDom();navActive();
}

const section=(title,view)=>`<div class="section-title"><h2>${title}</h2><button data-view="${view}">Tout voir ${svg('arrow')}</button></div>`;
const empty=(title,desc,icon='file')=>`<div class="empty">${svg(icon)}<strong>${escapeHtml(title)}</strong><p>${escapeHtml(desc)}</p></div>`;
const noteLinks=(id)=>({
  events:data.events.filter(x=>x.noteId===id),tasks:data.tasks.filter(x=>x.noteId===id),
  purchases:data.purchases.filter(x=>x.noteId===id),transactions:data.transactions.filter(x=>x.noteId===id)
});


function homeView(){
 const now=new Date(),today=dateKey(now),month=today.slice(0,7);
 const next=sortEvents(data.events.filter(e=>e.start&&new Date(e.start).getTime()>=Date.now()));
 const todayEvents=sortEvents(data.events.filter(e=>e.start?.slice(0,10)===today));
 const openTasks=data.tasks.filter(t=>!t.done);
 const urgent=openTasks.filter(t=>t.dueDate&&t.dueDate<=today).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
 const otherTasks=openTasks.filter(t=>!t.dueDate||t.dueDate>today).sort((a,b)=>String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')));
 const projects=data.projects.filter(p=>p.status==='active');
 const spent=monthTotals(month).expense,limit=data.limits.find(l=>l.month===month)?.limitCents;
 const hello=now.getHours()<12?'Bonjour':now.getHours()<18?'Bon après-midi':'Bonsoir';
 const widgets={
  today:()=>`<section class="nexus-widget"><div class="widget-title"><div><span class="eyebrow">TA JOURNÉE</span><h2>Aujourd'hui</h2></div><button data-view="calendar">Voir l'agenda ${svg('arrow')}</button></div>
  <div class="widget-columns"><div class="widget-panel"><div class="widget-subtitle">${svg('calendar')} Rendez-vous</div>
   ${todayEvents.length?todayEvents.slice(0,3).map(eventRow).join(''):empty('Journée libre','Aucun rendez-vous aujourd’hui.','calendar')}
   ${!todayEvents.length&&next.length?`<p class="next-event">Prochain : ${escapeHtml(next[0].title)} · ${formatDate(next[0].start)}</p>`:''}</div>
  <div class="widget-panel"><div class="widget-subtitle">${svg('check')} À ne pas oublier</div>
   ${urgent.length?urgent.slice(0,3).map(taskRow).join(''):otherTasks.length?otherTasks.slice(0,2).map(taskRow).join(''):empty('Tout est au vert','Aucune tâche prioritaire.','circlecheck')}</div></div></section>`,
  focus:()=>{const p=[...projects].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0];
   if(!p)return `<section class="nexus-widget"><div class="widget-title"><div><span class="eyebrow">GARDER LE CAP</span><h2>Projet en focus</h2></div><button data-view="projects">Projets ${svg('arrow')}</button></div>
   <div class="focus-card"><span class="focus-icon">${svg('briefcase')}</span><div><strong>Une idée à mettre en mouvement ?</strong><p>Crée un projet, puis relie-y tes notes et actions.</p></div>
   <button class="btn btn-small" data-action="new-project">${svg('plus')} Projet</button></div></section>`;
   const tasks=projectTasks(p.id),done=tasks.filter(t=>t.done).length,percent=tasks.length?Math.round(done*100/tasks.length):0;
   return `<section class="nexus-widget"><div class="widget-title"><div><span class="eyebrow">GARDER LE CAP</span><h2>Projet en focus</h2></div><button data-view="projects">Tous les projets ${svg('arrow')}</button></div>
   <button class="focus-card focus-card-clickable" data-action="project-detail" data-id="${p.id}"><span class="focus-icon">${svg('briefcase')}</span>
    <div><span class="tag">EN COURS</span><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description||'Un seul endroit pour les idées, rappels et achats.')}</p>
    <div class="focus-progress"><span>${done}/${tasks.length} tâches · ${percent}%</span><span class="progress-track"><i style="width:${percent}%"></i></span>
    <small>${money(projectSpent(p.id))} dépensés · ${data.events.filter(e=>e.projectId===p.id).length} rendez-vous</small></div></div></button></section>`},
  budget:()=>`<section class="nexus-widget"><div class="widget-title"><div><span class="eyebrow">PILOTER</span><h2>Budget du mois</h2></div><button data-view="budget">Détails ${svg('arrow')}</button></div>
   <button class="home-budget" data-view="budget"><span>Dépenses · ${formatDate(today,{month:'long',year:'numeric'})}</span><strong>${money(spent)}</strong>
    <small>${limit>0?`Sur ${money(limit)} de plafond · ${Math.round(spent/limit*100)}% utilisés`:'Aucun plafond défini'}</small>
    ${window.NexusBudget?.forecast?.(month)?.pending?.length?
      `<small class="b8-home-due">${window.NexusBudget.forecast(month).pending.length} échéance(s) à confirmer ce mois</small>`:''}
    ${limit>0?`<span class="progress-track"><i style="width:${Math.min(100,Math.round(spent/limit*100))}%"></i></span>`:''}</button></section>`,
  recent:()=>{const activity=[
    ...data.notes.map(x=>({date:x.updatedAt||x.createdAt,title:x.title,kind:'note',icon:'notes',id:x.id})),
    ...data.projects.map(x=>({date:x.updatedAt||x.createdAt,title:x.title,kind:'project',icon:'briefcase',id:x.id})),
    ...data.events.map(x=>({date:x.createdAt||x.start,title:x.title,kind:'event',icon:'calendar',id:x.id})),
    ...data.purchases.map(x=>({date:x.updatedAt||x.createdAt,title:x.title,kind:'purchase',icon:'cart',id:x.id}))
   ].filter(x=>x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,4);
   return `<section class="nexus-widget"><div class="widget-title"><div><span class="eyebrow">TA MÉMOIRE</span><h2>Activité récente</h2></div><button data-view="notes">Mes notes ${svg('arrow')}</button></div>
    <div class="activity-list">${activity.length?activity.map(x=>`<button class="activity-entry" data-action="${x.kind}-detail" data-id="${x.id}">
     <span class="item-ico">${svg(x.icon)}</span><span><strong>${escapeHtml(x.title||'Sans titre')}</strong><small>${formatDate(x.date,{day:'numeric',month:'short'})}</small></span>${svg('chevright')}</button>`).join(''):empty('Ça commence ici','Tes prochaines captures apparaîtront ici.','notes')}</div></section>`;}
 };
 return `<section class="nexus-welcome"><div class="welcome-copy">
  <div class="eyebrow">${svg('sparkle')} NEXUS · SECOND CERVEAU</div>
  <h1>${hello}<span class="punctuation">.</span></h1>
  <p>${todayEvents.length} RDV aujourd'hui · ${urgent.length} priorité(s) · ${projects.length} projet(s) actifs</p>
  <div class="welcome-date">${formatDate(today,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
  </div><div class="welcome-emblem">N</div></section>
 <section class="capture-card"><div class="capture-top"><div><div class="eyebrow">${svg('bolt')} CAPTURE RAPIDE</div><h2>Qu’as-tu en tête ?</h2></div>
  <span>Une idée devient une action.</span></div>
  <label class="sr-only" for="quick-capture">Capture rapide</label>
  <textarea id="quick-capture" rows="2" maxlength="12000" placeholder="Un rendez-vous, une idée, une dépense, un projet…"></textarea>
  <div class="capture-footer"><div class="capture-shortcuts">
   <button data-action="new-event">${svg('calendar')} RDV</button>
   <button data-action="new-task">${svg('check')} Tâche</button>
   <button data-action="new-purchase">${svg('cart')} Achat</button>
   <button data-action="new-transaction">${svg('wallet')} Dépense</button></div>
   <button class="btn capture-submit" data-action="quick-save">${svg('arrow')} Capturer</button></div></section>
 ${UI.widgets.length?UI.widgets.map(id=>widgets[id]?.()||'').join(''):
  `<div class="empty home-empty"><strong>Ton accueil est prêt à être personnalisé.</strong><p>Active les widgets de ton choix.</p>
  <button class="btn btn-small" data-view="settings">Personnaliser</button></div>`}
 <div class="home-bottom-links"><button data-view="settings">${svg('sliders')} Personnaliser l’accueil</button>
 <button data-view="categories">${svg('grid')} Voir toutes les catégories ${svg('arrow')}</button></div>`;
}

function eventRow(e){const p=data.contacts.find(c=>c.id===e.personId);return `<div class="row-item"><span class="item-ico blue">${svg('calendar')}</span><div class="item-copy"><strong>${escapeHtml(e.title)}</strong><small>${formatDate(e.start,{weekday:'short',day:'numeric',month:'short'})} · ${escapeHtml(e.start.slice(11,16))}${e.location?' · '+escapeHtml(e.location):''}${p?' · '+escapeHtml(p.name):''}</small></div><button class="row-arrow" data-action="event-detail" data-id="${e.id}" aria-label="Voir le rendez-vous">${svg('chevright')}</button></div>`;}
function taskRow(t){const date=t.dueDate?formatDate(t.dueDate,{weekday:'short',day:'numeric',month:'short'}):'Sans échéance';return `<div class="task-row"><button class="check-round ${t.done?'checked':''}" data-action="toggle-task" data-id="${t.id}" aria-label="${t.done?'Réactiver':'Terminer'} le rappel">${t.done?svg('check'):''}</button><button class="task-main ${t.done?'done':''}" data-action="task-detail" data-id="${t.id}"><strong>${escapeHtml(t.title)}</strong><small>${date}${t.noteId?' · Lié à une note':''}</small></button><button class="row-arrow" data-action="task-detail" data-id="${t.id}">${svg('chevright')}</button></div>`;}
function noteCard(n){
 const linked=noteLinks(n.id),linkedCount=Object.values(linked).reduce((sum,items)=>sum+items.length,0);
 return `<button class="note-card" data-action="note-detail" data-id="${n.id}"><div class="note-card-header">
  <span>${formatDate(n.updatedAt||n.createdAt,{day:'numeric',month:'short'})}</span>${svg('notes')}</div>
  <h3>${escapeHtml(n.title||'Sans titre')}</h3><p>${escapeHtml(n.body||'Note vide')}</p><div class="note-card-footer">
  ${linkedCount?`<span class="tag">${linkedCount} lien${linkedCount>1?'s':''}</span>`:`<span class="tag peach">À explorer</span>`}
  </div></button>`;
}
function notesView(){return `<div class="page-header"><div><div class="eyebrow">CAPTURER & RELIER</div><h1 class="page-title">Mes notes</h1><p class="subtitle">Toutes tes idées, sans les perdre.</p></div><button class="btn" data-action="new-note">${svg('plus')} Ajouter</button></div><div class="cards-grid">${data.notes.length?[...data.notes].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(noteCard).join(''):empty('Une page blanche, plein d’idées','Ajoute ta première note pour commencer.','notes')}</div>`;}
function calendarView(){const yy=calendarMonth.getFullYear(),mm=calendarMonth.getMonth(),first=new Date(yy,mm,1),offset=(first.getDay()+6)%7,daysInMonth=new Date(yy,mm+1,0).getDate();const dayCells=[];for(let i=0;i<offset;i++)dayCells.push('<span></span>');for(let d=1;d<=daysInMonth;d++){const date=dateKey(new Date(yy,mm,d)),ev=data.events.filter(e=>e.start?.startsWith(date)).length,ta=data.tasks.filter(t=>!t.done&&t.dueDate===date).length;dayCells.push(`<button class="day-cell ${date===selectedDay?'selected':''} ${date===dateKey(new Date())?'today':''}" data-action="calendar-day" data-day="${date}"><span>${d}</span><span class="dot-row">${ev?'<i></i>':''}${ta?'<i class="task-dot"></i>':''}</span></button>`);}const chosen=sortEvents(data.events.filter(e=>e.start?.slice(0,10)===selectedDay)),due=data.tasks.filter(t=>!t.done&&t.dueDate===selectedDay);return `<div class="page-header"><div><div class="eyebrow">LE TEMPS, AU BON ENDROIT</div><h1 class="page-title">Calendrier</h1><p class="subtitle">Une vue claire de tes rendez-vous et rappels.</p></div><button class="btn" data-action="new-event">${svg('plus')} RDV</button></div><div class="agenda-layout"><div class="card calendar-panel"><div class="calendar-header"><h2>${formatDate(dateKey(first),{month:'long',year:'numeric'})}</h2><div class="calendar-arrows"><button data-action="calendar-prev" aria-label="Mois précédent">${svg('chevleft')}</button><button data-action="calendar-next" aria-label="Mois suivant">${svg('chevright')}</button></div></div><div class="calendar-week">${['L','M','M','J','V','S','D'].map(s=>`<span>${s}</span>`).join('')}</div><div class="calendar-days">${dayCells.join('')}</div><div class="muted-note" style="margin-top:13px">Point vert = rendez-vous · Point orange = rappel</div></div><div class="card agenda-detail"><h3>${formatDate(selectedDay,{weekday:'long',day:'numeric',month:'long'})}</h3>${chosen.length||due.length?chosen.map(e=>`<div class="due-item"><span class="time-chip">${escapeHtml(e.start.slice(11,16))}</span><button data-action="event-detail" data-id="${e.id}">${escapeHtml(e.title)}<small>${escapeHtml(e.location||'Sans lieu')}</small></button></div>`).join('')+due.map(t=>`<div class="due-item"><span class="time-chip" style="background:#fff0e6;color:#ab7753">À faire</span><button data-action="task-detail" data-id="${t.id}">${escapeHtml(t.title)}</button></div>`).join(''):empty('Journée libre','Aucun événement sur cette date.','calendar')}<button class="btn btn-soft btn-small" style="margin-top:16px" data-action="new-event">${svg('plus')} Ajouter un RDV</button></div></div><div class="section-title"><h2>À venir</h2></div><div class="list-stack">${sortEvents(data.events.filter(e=>e.start>=dateKey(new Date()))).slice(0,7).map(eventRow).join('')||empty('Agenda vide','Ajoute ton premier rendez-vous.','calendar')}</div>`;}
function tasksView(){const filtered=data.tasks.filter(t=>taskFilter==='all'||(taskFilter==='done'?t.done:!t.done)).sort((a,b)=>(a.done-b.done)||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')));return `<div class="page-header"><div><div class="eyebrow">GARDER LE CAP</div><h1 class="page-title">Rappels</h1><p class="subtitle">Ce qu'il faut faire, sans y penser deux fois.</p></div><button class="btn" data-action="new-task">${svg('plus')} Ajouter</button></div><div class="toolbar"><div class="segmented">${[['open','À faire'],['done','Terminés'],['all','Tous']].map(([key,label])=>`<button data-action="task-filter" data-filter="${key}" class="${taskFilter===key?'active':''}">${label}</button>`).join('')}</div></div><div class="list-stack">${filtered.length?filtered.map(taskRow).join(''):empty('Rien à afficher','Crée un rappel ou transforme une note en tâche.','check')}</div>`;}
function contactsView(){const contacts=[...data.contacts].sort((a,b)=>a.name.localeCompare(b.name,'fr'));return `<div class="page-header"><div><div class="eyebrow">LES BONNES PERSONNES</div><h1 class="page-title">Personnes</h1><p class="subtitle">Ton petit répertoire de contexte.</p></div><button class="btn" data-action="new-contact">${svg('plus')} Ajouter</button></div><div class="cards-grid">${contacts.length?contacts.map(c=>`<button class="person-card" data-action="contact-detail" data-id="${c.id}"><span class="person-initial">${escapeHtml(c.name[0]?.toUpperCase()||'?')}</span><span><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.role||c.email||c.phone||'Contact')}</small></span><span class="row-arrow">${svg('chevright')}</span></button>`).join(''):empty('Ton réseau commence ici','Ajoute une personne pour la rattacher aux rendez-vous.','users')}</div>`;}

const fmtEuro = new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
function money(cents){return fmtEuro.format((Number(cents)||0)/100);}
function euroInput(cents){return Number.isInteger(cents)?String(cents/100):'';}
function toCents(input){
 const str=String(input??'').trim().replace(/\s/g,'').replace(',','.');
 if(!/^\d+(?:\.\d{1,2})?$/.test(str)) return null;
 const n=Math.round(Number(str)*100);
 return Number.isSafeInteger(n)?n:null;
}
function monthTotals(month,projectId=''){
 const entries=data.transactions.filter(t=>t.date?.slice(0,7)===month&&(!projectId||t.projectId===projectId));
 return {
  income:entries.filter(t=>t.type==='income').reduce((s,t)=>s+(Number(t.amountCents)||0),0),
  expense:entries.filter(t=>t.type==='expense').reduce((s,t)=>s+(Number(t.amountCents)||0),0)
 };
}
function projectSpent(id){
 return data.transactions.filter(t=>t.type==='expense'&&t.projectId===id).reduce((s,t)=>s+(Number(t.amountCents)||0),0);
}
function projectTasks(id){return data.tasks.filter(t=>t.projectId===id);}
function projectOptions(selected=''){
 const removed=selected&&!data.projects.some(p=>p.id===selected);
  return `<option value="">Aucun projet</option>`+(removed?`<option value="${escapeHtml(selected)}" selected>Projet lié temporairement indisponible</option>`:'')+
   data.projects.map(p=>`<option value="${escapeHtml(p.id)}" ${selected===p.id?'selected':''}>${escapeHtml(p.title)}</option>`).join('');
}

const NEW_PROJECT_VALUE='__create_project__';
function projectField(selected=''){
 return `<div class="field project-field"><label for="f-projectId">Projet associé</label>
  <select name="projectId" id="f-projectId">${projectOptions(selected)}<option value="${NEW_PROJECT_VALUE}">＋ Créer un nouveau projet…</option></select>
  <div class="inline-project-create" hidden>
   <p class="muted-note">Le projet et cette fiche seront enregistrés ensemble.</p>
   ${input('Nom du projet','newProjectTitle','','text','maxlength="120" placeholder="Ex. Préparation du voyage"')}
   <div class="field"><label for="f-newProjectDescription">Description (facultative)</label>
   <textarea name="newProjectDescription" id="f-newProjectDescription" rows="2" maxlength="1000" placeholder="Une idée, un objectif…"></textarea></div>
  </div></div>`;
}
function wireProjectField(form){
 const select=form.querySelector('#f-projectId'),panel=form.querySelector('.inline-project-create');
 const name=form.querySelector('[name="newProjectTitle"]');
 if(!select||!panel||!name)return;
 const note=form.querySelector('#f-body');
 function update(){
  const isNew=select.value===NEW_PROJECT_VALUE;
  panel.hidden=!isNew;
  name.disabled=!isNew;name.required=isNew;
  form.querySelector('[name="newProjectDescription"]').disabled=!isNew;
  if(isNew&&!name.value.trim())name.value=(note?analyzeNote(note.value).projectTitle:'')||form.querySelector('[name="title"]')?.value.trim()||'';
 }
 select.addEventListener('change',update);
 if(note)note.addEventListener('input',()=>{
  if(select.value===NEW_PROJECT_VALUE&&!name.dataset.customized){
   const suggestion=analyzeNote(note.value).projectTitle;
   if(suggestion)name.value=suggestion;
  }
 });
 name.addEventListener('input',()=>{name.dataset.customized='yes';});
 update();
}
function takeInlineProject(values){
 const creating=values.projectId===NEW_PROJECT_VALUE;
 const title=String(values.newProjectTitle||'').trim();
 if(creating&&!title)throw new Error('Donne un nom au nouveau projet.');
 const now=new Date().toISOString();
 const project=creating?{
  id:uid(),title:title.slice(0,120),description:String(values.newProjectDescription||'').trim().slice(0,1000),
  status:'active',deadline:'',budgetCents:null,createdAt:now,updatedAt:now
 }:null;
 if(project)values.projectId=project.id;
 delete values.newProjectTitle;delete values.newProjectDescription;
 return project;
}


const EVENT_REMINDER_OPTIONS=[
 [1440,'1 jour avant'],[720,'12 h avant'],[240,'4 h avant'],[120,'2 h avant'],
 [60,'1 h avant'],[45,'45 min avant'],[30,'30 min avant'],[15,'15 min avant'],[5,'5 min avant']
];
function normalizeEventReminders(values){
 return [...new Set((Array.isArray(values)?values:[]).map(Number)
   .filter(n=>Number.isInteger(n)&&n>=1&&n<=10080))].sort((a,b)=>b-a).slice(0,20);
}
function eventReminderLabel(minutes){
 if(minutes===1440)return '1 jour';
 if(minutes%1440===0)return (minutes/1440)+' jours';
 if(minutes%60===0)return (minutes/60)+' h';
 return minutes+' min';
}
function eventRemindersField(obj){
 // Existing appointments without reminderMinutes keep their old global schedule until edited.
 const selected=normalizeEventReminders(Array.isArray(obj.reminderMinutes)?obj.reminderMinutes:[60]);
 const known=EVENT_REMINDER_OPTIONS.map(pair=>pair[0]);
 const extra=selected.filter(n=>!known.includes(n));
 const choices=[...EVENT_REMINDER_OPTIONS,...extra.map(m=>[m,eventReminderLabel(m)+' avant'])];
 return `<fieldset class="event-reminders">
  <legend>Alertes pour ce rendez-vous</legend>
  <p class="muted-note">Coche les délais souhaités pour CE rendez-vous. Aucun délai coché = aucune notification.</p>
  <div class="reminder-choices">${choices.map(([minutes,label])=>
   `<label class="reminder-choice"><input type="checkbox" name="reminderMinute" value="${minutes}" ${selected.includes(minutes)?'checked':''}><span>${escapeHtml(label)}</span></label>`).join('')}</div>
  ${input('Autre délai (en minutes avant)','customReminderMinutes','','number','min="1" max="10080" step="1" placeholder="Ex. 90"')}
  <small class="muted-note">Les notifications doivent être activées une fois dans Réglages. L'envoi est géré par Cloudflare environ toutes les 5 minutes.</small>
 </fieldset>`;
}

const projectStatus={active:'En cours',paused:'En pause',completed:'Terminé'};
const purchaseStatus={planned:'À acheter',purchased:'Acheté',canceled:'Abandonné'};
const txCategories=['Courses','Transport','Maison','Loisirs','Santé','Abonnements','Shopping','Équipement','Autres','Salaire','Vente'];
function projectMini(p){
 const tasks=projectTasks(p.id),done=tasks.filter(t=>t.done).length,percent=tasks.length?Math.round(100*done/tasks.length):0;
 return `<button class="project-mini" data-action="project-detail" data-id="${p.id}"><span class="item-ico green">${svg('briefcase')}</span>
 <span class="item-copy"><strong>${escapeHtml(p.title)}</strong><small>${tasks.length?`${done}/${tasks.length} tâches terminées`:'Aucune tâche liée'}${p.deadline?' · '+formatDate(p.deadline):''}</small>
 <span class="progress-track"><i style="width:${percent}%"></i></span></span><span class="row-arrow">${svg('chevright')}</span></button>`;
}
function purchaseRow(p){
 const project=data.projects.find(pr=>pr.id===p.projectId);
 return `<div class="row-item"><span class="item-ico peach">${svg('cart')}</span><div class="item-copy"><strong>${escapeHtml(p.title)}</strong>
 <small>${Number.isInteger(p.priceCents)?money(p.priceCents):'Prix à renseigner'} · ${escapeHtml(purchaseStatus[p.status]||'À acheter')}${project?' · '+escapeHtml(project.title):''}</small></div>
 <button class="row-arrow" data-action="purchase-detail" data-id="${p.id}" aria-label="Voir l'achat">${svg('chevright')}</button></div>`;
}
function transactionRow(t){
 const p=data.projects.find(x=>x.id===t.projectId);
 return `<div class="row-item"><span class="item-ico ${t.type==='income'?'green':'peach'}">${svg('wallet')}</span>
  <div class="item-copy"><strong>${escapeHtml(t.title)}</strong><small>${formatDate(t.date,{day:'numeric',month:'short'})} · ${escapeHtml(t.category||'Autres')}${p?' · '+escapeHtml(p.title):''}${t.recurrenceId?' · Récurrence':t.quickExpenseId?' · Raccourci':''}</small></div>
  <strong class="money-chip ${t.type==='income'?'positive':'negative'}">${t.type==='income'?'+':'−'}${money(t.amountCents)}</strong>
  <button class="row-arrow" data-action="transaction-detail" data-id="${t.id}">${svg('chevright')}</button></div>`;
}

function categoriesView(){
 const groups=[
 ['CAPTURER & PLANIFIER',['notes','calendar','tasks']],
 ['ORGANISER & RELIER',['projects','contacts']],
 ['SUIVRE & PILOTER',['purchases','budget']]
 ];
 return `<div class="nexus-page-heading"><div class="eyebrow">TON SYSTÈME, TES REPÈRES</div>
 <h1 class="page-title">Catégories<span class="punctuation">.</span></h1>
 <p class="subtitle">Sept blocs qui travaillent ensemble, sans t'imposer de parcours.</p></div>
 ${groups.map(([name,views])=>`<section class="module-group"><h2 class="module-group-title">${name}</h2>
 <div class="module-grid">${views.map(view=>{
  const m=moduleInfo(view);
  return `<button class="module-card" data-view="${view}"><span class="module-symbol">${svg(m[1])}</span>
   <strong>${escapeHtml(m[2])}</strong><span class="module-desc">${escapeHtml(m[3])}</span>
   <span class="module-foot">${escapeHtml(moduleCount(view))}${svg('arrow')}</span></button>`;
 }).join('')}</div></section>`).join('')}
 <div class="category-advice">${svg('link')} Une idée peut devenir un projet, un rendez-vous ou une dépense, sans perdre son contexte.</div>`;
}
function hubView(){return categoriesView();}

function projectsView(){
 let items=[...data.projects].filter(p=>projectFilter==='all'||p.status===projectFilter).sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''));
 return `<div class="page-header"><div><div class="eyebrow">IDÉES → ACTIONS</div><h1 class="page-title">Mes projets</h1><p class="subtitle">Notes, tâches, achats et dépenses réunis autour d'un objectif.</p></div><button class="btn" data-action="new-project">${svg('plus')} Projet</button></div>
 <div class="toolbar"><div class="segmented">${[['active','En cours'],['paused','En pause'],['completed','Terminés'],['all','Tous']].map(([status,label])=>`<button class="${projectFilter===status?'active':''}" data-action="project-filter" data-filter="${status}">${label}</button>`).join('')}</div></div>
 <div class="project-grid">${items.length?items.map(p=>{
  const tasks=projectTasks(p.id),done=tasks.filter(t=>t.done).length,spent=projectSpent(p.id),limit=p.budgetCents;
  const progress=tasks.length?Math.round(done/tasks.length*100):0;
  return `<button class="project-card" data-action="project-detail" data-id="${p.id}">
   <div class="project-top"><span class="tag">${escapeHtml(projectStatus[p.status]||'En cours')}</span>${svg('briefcase')}</div>
   <h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description||'Aucune description pour le moment.')}</p>
   <div class="project-stats"><span>${done}/${tasks.length} tâches</span><strong>${progress}%</strong></div>
   <span class="progress-track"><i style="width:${progress}%"></i></span>
   <div class="project-bottom"><span>Dépensé : ${money(spent)}</span><span>${Number.isInteger(limit)&&limit>0?`Prévu : ${money(limit)}`:'Sans budget défini'}</span></div>
  </button>`;
 }).join(''):empty('Aucun projet ici','Ajoute un projet : il pourra contenir notes, rappels, achats et dépenses.','briefcase')}</div>`;
}
function purchasesView(){
 const filter=data.purchases.filter(p=>purchaseFilter==='all'||p.status===purchaseFilter);
 const total=data.purchases.filter(p=>p.status==='planned'&&Number.isInteger(p.priceCents)).reduce((s,p)=>s+p.priceCents,0);
 return `<div class="page-header"><div><div class="eyebrow">ENVIES & BESOINS</div><h1 class="page-title">Achats</h1><p class="subtitle">Ta wishlist utile, avec des liens vers tes projets et ton budget.</p></div><button class="btn" data-action="new-purchase">${svg('plus')} Achat</button></div>
 <div class="card purchase-summary"><div><span class="eyebrow">MONTANT PRÉVU, PRIX CONNUS</span><h2>${money(total)}</h2><p>${data.purchases.filter(p=>p.status==='planned').length} achat(s) à prévoir</p></div>${svg('cart')}</div>
 <div class="toolbar"><div class="segmented">${[['planned','À acheter'],['purchased','Achetés'],['canceled','Abandonnés'],['all','Tous']].map(([key,label])=>`<button data-action="purchase-filter" data-filter="${key}" class="${purchaseFilter===key?'active':''}">${label}</button>`).join('')}</div></div>
 <div class="list-stack">${filter.length?filter.sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0)).map(purchaseRow).join(''):empty('Aucun achat ici','Ajoute un achat, puis rattache-le à un projet.','cart')}</div>`;
}
function budgetView(){
 return window.NexusBudget?.view?.()||empty('Budget indisponible','Actualise la page pour charger les dernières ressources.','wallet');
}
function projectDetail(id){
 const p=data.projects.find(x=>x.id===id);if(!p)return;
 const events=sortEvents(data.events.filter(e=>e.projectId===id)),tasks=projectTasks(id),notes=data.notes.filter(n=>n.projectId===id),purchases=data.purchases.filter(x=>x.projectId===id);
 const tx=data.transactions.filter(x=>x.projectId===id&&x.type==='expense'),spent=projectSpent(id);
 modal('Projet',`<div class="eyebrow">PROJET · ${escapeHtml(projectStatus[p.status]||'En cours')}</div><h2 class="detail-title">${escapeHtml(p.title)}</h2>
 <p class="subtitle">${escapeHtml(p.description||'Pas encore de description.')}</p>
 <div class="project-facts"><span>${svg('calendar')} ${p.deadline?formatDate(p.deadline):'Pas de date limite'}</span><span>${svg('wallet')} ${money(spent)} dépensés${p.budgetCents?` / ${money(p.budgetCents)} prévus`:''}</span></div>
 <div class="form-actions" style="justify-content:flex-start"><button class="btn btn-soft btn-small" data-action="edit-project" data-id="${id}">${svg('edit')} Modifier</button><button class="btn btn-danger btn-small" data-action="delete-project" data-id="${id}">${svg('trash')} Supprimer</button></div>
 <div class="linked-section"><h3>${svg('calendar')} Rendez-vous (${events.length})</h3>
  ${events.map(e=>`<div class="due-item"><button data-action="event-detail" data-id="${e.id}">${escapeHtml(e.title)}
    <small>${formatDate(e.start)} · ${escapeHtml(e.start?.slice(11,16)||'')}</small></button></div>`).join('')||'<p class="muted-note">Aucun rendez-vous lié.</p>'}
  <button class="btn btn-neutral btn-small" data-action="new-event-for-project" data-id="${id}">${svg('plus')} Nouveau rendez-vous</button></div>
  <div class="linked-section"><h3>${svg('check')} Rappels (${tasks.length})</h3>${tasks.map(taskRow).join('')||'<p class="muted-note">Aucun rappel lié.</p>'}
 <button class="btn btn-neutral btn-small" data-action="task-for-project" data-id="${id}">${svg('plus')} Nouveau rappel</button></div>
 <div class="linked-section"><h3>${svg('notes')} Notes (${notes.length})</h3>${notes.map(n=>`<div class="due-item"><button data-action="note-detail" data-id="${n.id}">${escapeHtml(n.title)}</button></div>`).join('')||'<p class="muted-note">Aucune note liée.</p>'}
 <button class="btn btn-neutral btn-small" data-action="note-for-project" data-id="${id}">${svg('plus')} Nouvelle note</button></div>
 <div class="linked-section"><h3>${svg('cart')} Achats (${purchases.length})</h3>${purchases.map(purchaseRow).join('')||'<p class="muted-note">Aucun achat lié.</p>'}
 <button class="btn btn-neutral btn-small" data-action="purchase-for-project" data-id="${id}">${svg('plus')} Ajouter un achat</button></div>
 <div class="linked-section"><h3>${svg('wallet')} Dépenses (${tx.length})</h3>${tx.map(transactionRow).join('')||'<p class="muted-note">Aucune dépense liée.</p>'}
 <button class="btn btn-neutral btn-small" data-action="transaction-for-project" data-id="${id}">${svg('plus')} Ajouter une dépense</button></div>`);
}
function purchaseDetail(id){
 const p=data.purchases.find(x=>x.id===id);if(!p)return;
 const project=data.projects.find(x=>x.id===p.projectId),note=data.notes.find(x=>x.id===p.noteId),budgetEntry=data.transactions.find(t=>t.purchaseId===p.id);
 modal('Achat',`<div class="eyebrow">${escapeHtml(purchaseStatus[p.status]||'À acheter')}</div><h2 class="detail-title">${escapeHtml(p.title)}</h2>
 <div class="detail-content">${Number.isInteger(p.priceCents)?money(p.priceCents):'Prix à renseigner'}${p.shop?`\nMagasin / site : ${escapeHtml(p.shop)}`:''}${p.details?`\n\n${escapeHtml(p.details)}`:''}</div>
 <div class="form-actions" style="justify-content:flex-start">
 ${p.status==='planned'?`<button class="btn btn-small" data-action="mark-purchased" data-id="${id}">${svg('check')} Marquer acheté</button>`:''}
 ${p.status==='purchased'&&!budgetEntry?`<button class="btn btn-small" data-action="expense-from-purchase" data-id="${id}">${svg('wallet')} Ajouter au budget</button>`:''}
 ${budgetEntry?`<button class="btn btn-neutral btn-small" data-action="transaction-detail" data-id="${budgetEntry.id}">${svg('link')} Dépense liée</button>`:''}
 <button class="btn btn-soft btn-small" data-action="edit-purchase" data-id="${id}">${svg('edit')} Modifier</button>
 <button class="btn btn-danger btn-small" data-action="delete-purchase" data-id="${id}">${svg('trash')} Supprimer</button></div>
 ${project?`<div class="linked-section"><h3>${svg('briefcase')} Projet associé</h3><button class="btn btn-neutral btn-small" data-action="project-detail" data-id="${project.id}">${escapeHtml(project.title)}</button></div>`:''}
 ${note?`<div class="linked-section"><h3>${svg('link')} Note d'origine</h3><button class="btn btn-neutral btn-small" data-action="note-detail" data-id="${note.id}">${escapeHtml(note.title)}</button></div>`:''}`);
}
function transactionDetail(id){
 const t=data.transactions.find(x=>x.id===id);if(!t)return;
 const project=data.projects.find(x=>x.id===t.projectId),purchase=data.purchases.find(x=>x.id===t.purchaseId);
 const recurrence=data.recurrences.find(x=>x.id===t.recurrenceId);
 const quick=data.quickExpenses.find(x=>x.id===t.quickExpenseId);
 modal('Opération',`<div class="eyebrow">${t.type==='income'?'RECETTE':'DÉPENSE'}</div><h2 class="detail-title">${escapeHtml(t.title)}</h2>
 <h2 class="money-detail ${t.type==='income'?'positive':'negative'}">${t.type==='income'?'+':'−'}${money(t.amountCents)}</h2>
 <div class="detail-content">${formatDate(t.date,{day:'numeric',month:'long',year:'numeric'})} · ${escapeHtml(t.category||'Autres')}</div>
 <div class="form-actions" style="justify-content:flex-start"><button class="btn btn-soft btn-small" data-action="edit-transaction" data-id="${id}">${svg('edit')} Modifier</button>
 <button class="btn btn-danger btn-small" data-action="delete-transaction" data-id="${id}">${svg('trash')} Supprimer</button></div>
 ${project?`<div class="linked-section"><h3>${svg('briefcase')} Projet lié</h3><button class="btn btn-neutral btn-small" data-action="project-detail" data-id="${project.id}">${escapeHtml(project.title)}</button></div>`:''}
 ${purchase?`<div class="linked-section"><h3>${svg('cart')} Achat d'origine</h3><button class="btn btn-neutral btn-small" data-action="purchase-detail" data-id="${purchase.id}">${escapeHtml(purchase.title)}</button></div>`:''}
 ${recurrence?`<div class='linked-section'><h3>${svg('calendar')} Récurrence source</h3><button class='btn btn-neutral btn-small' data-action='b8-open-rule' data-id='${escapeHtml(recurrence.id)}'>${escapeHtml(recurrence.title)} · Gérer</button></div>`:t.recurrenceId?`<div class='linked-section'><p class='muted-note'>Récurrence supprimée : opération conservée.</p></div>`:''}
 ${quick?`<div class='linked-section'><h3>${svg('bolt')} Raccourci source</h3><button class='btn btn-neutral btn-small' data-action='b8-open-quick' data-id='${escapeHtml(quick.id)}'>${escapeHtml(quick.title)} · Modifier</button></div>`:''}`);
}
function extraCaptureForm(kind,obj={},context={}){
 const originNote=context.noteId?data.notes.find(n=>n.id===context.noteId):null;
 const inheritedProjectId=context.projectId||originNote?.projectId||'';
 const existing=Boolean(obj.id);
 let title='',content='';
 if(kind==='project'){
  title=existing?'Modifier le projet':'Nouveau projet';
  content=`${input('Nom du projet','title',obj.title||((context.noteId&&data.notes.find(n=>n.id===context.noteId))?(analyzeNote(data.notes.find(n=>n.id===context.noteId).body).projectTitle||data.notes.find(n=>n.id===context.noteId).title):'')||'','text','required maxlength="120"')}<div class="field"><label for="f-description">Description</label><textarea name="description" id="f-description" placeholder="Objectif, idées, contexte...">${escapeHtml(obj.description||'')}</textarea></div>
  <div class="field-grid">${input('Échéance (facultative)','deadline',obj.deadline||'','date')}
  <div class="field"><label for="f-status">État</label><select name="status" id="f-status">${Object.entries(projectStatus).map(([key,label])=>`<option value="${key}" ${obj.status===key?'selected':''}>${label}</option>`).join('')}</select></div></div>
  ${input('Budget prévu (€), facultatif','budgetEuros',euroInput(obj.budgetCents),'text','inputmode="decimal" placeholder="Ex. 350,00"')}`;
 }
 if(kind==='purchase'){
  title=existing?'Modifier l’achat':'Nouvel achat';
  const note=context.noteId?data.notes.find(n=>n.id===context.noteId):null,detected=note?analyzeNote(note.body):{};
  content=`${input('Quel achat ?','title',obj.title||detected.purchaseTitle||'','text','required maxlength="140"')}
  <div class="field-grid">${input('Prix estimé (€)','priceEuros',euroInput(obj.priceCents),'text','inputmode="decimal" placeholder="Facultatif"')}
  <div class="field"><label for="f-priority">Priorité</label><select name="priority" id="f-priority">${[[1,'Normale'],[2,'Importante'],[3,'Urgente']].map(([k,v])=>`<option value="${k}" ${Number(obj.priority||1)===k?'selected':''}>${v}</option>`).join('')}</select></div></div>
  ${input('Boutique / lien (facultatif)','shop',obj.shop||'','text','maxlength="250"')}
  ${projectField(obj.projectId||inheritedProjectId||'')}
  <div class="field"><label for="f-status">État</label><select name="status" id="f-status">${Object.entries(purchaseStatus).map(([key,label])=>`<option value="${key}" ${obj.status===key?'selected':''}>${label}</option>`).join('')}</select></div>
  <div class="field"><label for="f-details">Détails</label><textarea name="details" id="f-details">${escapeHtml(obj.details||'')}</textarea></div>`;
 }
 if(kind==='transaction'){
  title=existing?'Modifier l’opération':'Nouvelle opération';
  const purchase=context.purchaseId?data.purchases.find(x=>x.id===context.purchaseId):null;
  const detectedExpense=context.noteId?analyzeNote(data.notes.find(n=>n.id===context.noteId)?.body||''):{};
  content=`<div class="field"><label for="f-type">Type</label><select id="f-type" name="type"><option value="expense" ${(obj.type||'expense')==='expense'?'selected':''}>Dépense</option><option value="income" ${obj.type==='income'?'selected':''}>Recette</option></select></div>
  ${input('Libellé','title',obj.title||purchase?.title||detectedExpense.expenseTitle||'','text','required maxlength="140"')}
  <div class="field-grid">${input('Montant (€)','amountEuros',euroInput(obj.amountCents??purchase?.priceCents??detectedExpense.amountCents),'text','required inputmode="decimal" placeholder="Ex. 49,90"')}
  ${input('Date','date',obj.date||dateKey(new Date()),'date','required')}</div>
  <div class="field"><label for="f-category">Catégorie</label><select name="category" id="f-category">${window.NexusBudget?.categoryOptions?.(obj.category||'Autres',!!obj.id)||txCategories.map(c=>`<option value="${escapeHtml(c)}" ${(obj.category||'Autres')===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}</select></div>
  ${projectField(obj.projectId||inheritedProjectId||purchase?.projectId||'')}
  ${purchase?`<p class="muted-note">${svg('link')} Cette dépense sera reliée à l'achat « ${escapeHtml(purchase.title)} ».</p>`:''}`;
 }
 if(kind==='limit'){
  title='Plafond mensuel';
  const current=data.limits.find(x=>x.month===budgetMonth);
  content=`<p class="subtitle">Plafond des dépenses pour ${formatDate(budgetMonth+'-01',{month:'long',year:'numeric'})}. Vide pour le supprimer.</p>
  ${input('Montant maximum (€)','limitEuros',euroInput(current?.limitCents),'text','inputmode="decimal" placeholder="Ex. 800,00"')}`;
 }
 modal(title,`<form id="extra-form" data-kind="${kind}">${content}<div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Annuler</button><button type="submit" class="btn">${svg('check')} Enregistrer</button></div></form>`);
 const form=document.getElementById('extra-form');wireProjectField(form);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const v=Object.fromEntries(new FormData(form).entries());
  if(kind==='limit'){
   const cents=v.limitEuros.trim()?toCents(v.limitEuros):0;
   if(cents===null){toast('Montant invalide : utilise 25,50 par exemple.');return;}
   const previous=data.limits.find(x=>x.month===budgetMonth);
   if(cents===0&&previous){
    await window.NexusRecycle?.remove?.('limits',previous.id,{ask:false});
    return;
   }
   data.limits=data.limits.filter(x=>x.month!==budgetMonth);
   if(cents>0)data.limits.push({id:previous?.id||uid(),month:budgetMonth,limitCents:cents});
  }else{
   const base={...obj,...v,id:obj.id||uid(),createdAt:obj.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
   if(kind==='project'){
    const cents=v.budgetEuros.trim()?toCents(v.budgetEuros):null;
    if(cents===null&&v.budgetEuros.trim()){toast('Budget invalide');return;}
    base.budgetCents=cents;delete base.budgetEuros;
   }
   if(kind==='purchase'){
    const cents=v.priceEuros.trim()?toCents(v.priceEuros):null;
    if(cents===null&&v.priceEuros.trim()){toast('Prix invalide');return;}
    base.priceCents=cents;
    base.noteId=obj.noteId||context.noteId||null;
    base.priority=Number(v.priority)||1;
    if(base.status==='purchased'&&!base.purchasedAt)base.purchasedAt=dateKey(new Date());
    if(base.status!=='purchased')base.purchasedAt=null;
    delete base.priceEuros;
   }
   if(kind==='transaction'){
    const cents=toCents(v.amountEuros);
    if(cents===null||cents<=0){toast('Le montant doit être supérieur à zéro.');return;}
    if(context.purchaseId&&data.transactions.some(x=>x.purchaseId===context.purchaseId&&x.id!==base.id)){
     toast('Cet achat possède déjà une dépense liée.');return;
    }
    base.amountCents=cents;
    base.purchaseId=obj.purchaseId||context.purchaseId||null;
    base.noteId=obj.noteId||context.noteId||null;
    delete base.amountEuros;
   }
   if(kind==='purchase'||kind==='transaction'){
    let newProject=null;
    try{newProject=takeInlineProject(base);}catch(error){toast(error.message);return;}
    if(newProject)data.projects.push(newProject);
   }
   if(kind==='project'&&context.noteId){
    const note=data.notes.find(x=>x.id===context.noteId);
    if(note){note.projectId=base.id;note.updatedAt=new Date().toISOString();}
   }
   const key={project:'projects',purchase:'purchases',transaction:'transactions'}[kind];
   const ix=data[key].findIndex(x=>x.id===base.id);
   if(ix>=0)data[key][ix]=base;else data[key].push(base);
  }
  await persist();closeModal();render();
  toast(existing?'Modifications enregistrées':'Enregistré dans NEXUS');
  if(context.noteId&&['purchase','project','transaction'].includes(kind))noteDetail(context.noteId);
  if(kind==='limit')navTo('budget');
 });
}

function modal(title,content){document.getElementById('modal-root').innerHTML=`<div class="modal-overlay" data-action="overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><div class="modal-header"><h2>${escapeHtml(title)}</h2><button class="modal-close" data-action="close-modal" aria-label="Fermer">${svg('x')}</button></div><div class="modal-body">${content}</div></section></div>`;iconsInDom();}
function closeModal(){document.getElementById('modal-root').innerHTML='';}
const input=(label,name,value='',type='text',other='')=>`<div class="field"><label for="f-${name}">${escapeHtml(label)}</label><input id="f-${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${other}></div>`;
function contactOptions(selected=''){return `<option value="">Aucune / à renseigner</option>`+data.contacts.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${escapeHtml(c.name)}</option>`).join('');}
function captureForm(kind, obj={}, context={}){
 const originNote=context.noteId?data.notes.find(n=>n.id===context.noteId):null;
 const inheritedProjectId=context.projectId||originNote?.projectId||'';
 let title='',content='', existing=Boolean(obj.id);
 if(kind==='note'){
  title=existing?'Modifier la note':'Nouvelle note';
  content=`<form id="entity-form" data-kind="note">${input('Titre','title',obj.title||'','text','required maxlength="120"')}<div class="field"><label for="f-body">Ta note</label><textarea id="f-body" name="body" placeholder="Ex. RDV chez le garagiste samedi à 14h à Lille. Penser à prendre le devis...">${escapeHtml(obj.body||'')}</textarea></div>${projectField(obj.projectId||inheritedProjectId||'')}<div class="info-strip">${svg('sparkle')} Après l'enregistrement, NEXUS proposera des actions à partir du texte. Rien ne sera créé sans ta validation.</div><div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Annuler</button><button class="btn" type="submit">${svg('check')} Enregistrer</button></div></form>`;
 }
 if(kind==='event'){
  title=existing?'Modifier le rendez-vous':'Nouveau rendez-vous';
  const note=context.noteId?data.notes.find(n=>n.id===context.noteId):null, detected=note?analyzeNote(note.body):{};
  const chosenDate=obj.start?.slice(0,10)||detected.date||selectedDay,chosenTime=obj.start?.slice(11,16)||detected.time||'14:00';
  const personId=obj.personId||detected.personId||'';
  content=`<form id="entity-form" data-kind="event">${input('Intitulé','title',obj.title||detected.eventTitle||'Rendez-vous','text','required maxlength="140"')}<div class="field-grid">${input('Date','date',chosenDate,'date','required')}${input('Heure','time',chosenTime,'time','required')}</div>${eventRemindersField(obj)}${input('Lieu','location',obj.location||detected.location||'')}${projectField(obj.projectId||inheritedProjectId||'')}<div class="field"><label for="f-personId">Personne liée</label><select id="f-personId" name="personId">${contactOptions(personId)}</select></div>${input('Personne libre (optionnel)','personText',obj.personText||detected.personText||'')}<div class="field"><label for="f-details">Détails</label><textarea name="details" id="f-details" style="min-height:85px">${escapeHtml(obj.details||'')}</textarea></div>${context.noteId?`<p class="muted-note">${svg('link')} Sera relié à la note d'origine.</p>`:''}<div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Annuler</button><button class="btn" type="submit">${svg('check')} Enregistrer</button></div></form>`;
 }
 if(kind==='task'){
  title=existing?'Modifier le rappel':'Nouveau rappel';const note=context.noteId?data.notes.find(n=>n.id===context.noteId):null,detected=note?analyzeNote(note.body):{};
  content=`<form id="entity-form" data-kind="task">${input('À faire','title',obj.title||detected.taskTitle||'','text','required maxlength="160"')}${input('Date limite (facultative)','dueDate',obj.dueDate||detected.date||'','date')}${input('Heure du rappel','dueTime',obj.dueTime||'09:00','time')}<div class="field"><label for="f-personId">Personne liée</label><select id="f-personId" name="personId">${contactOptions(obj.personId||detected.personId||'')}</select></div>${projectField(obj.projectId||inheritedProjectId||'')}<div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Annuler</button><button class="btn" type="submit">${svg('check')} Enregistrer</button></div></form>`;
 }
 if(kind==='contact'){
  title=existing?'Modifier la personne':'Ajouter une personne';content=`<form id="entity-form" data-kind="contact">${input('Nom','name',obj.name||context.suggestedName||'','text','required maxlength="130"')}${input('Rôle ou contexte','role',obj.role||'','text','placeholder="Ex. Médecin, collègue..."')}${input('Téléphone','phone',obj.phone||'','tel')}${input('E-mail','email',obj.email||'','email')}<div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Annuler</button><button class="btn" type="submit">${svg('check')} Enregistrer</button></div></form>`;
 }
 modal(title,content);
 const form=document.getElementById('entity-form');wireProjectField(form);form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const values=Object.fromEntries(new FormData(form).entries());
  const reminders=kind==='event'?[...form.querySelectorAll('input[name="reminderMinute"]:checked')].map(el=>Number(el.value)):[];
  if(kind==='event'&&values.customReminderMinutes){
   const minutes=Number(values.customReminderMinutes);
   if(!Number.isInteger(minutes)||minutes<1||minutes>10080){toast('Rappel personnalisé : utilise un entier de 1 à 10 080 minutes.');return;}
   reminders.push(minutes);
  }
  delete values.reminderMinute;delete values.customReminderMinutes;
  let newProject=null;
  if(form.querySelector('[name="projectId"]')){
   try{newProject=takeInlineProject(values);}catch(error){toast(error.message);return;}
  }
  const base={...obj,...values,id:obj.id||uid(),createdAt:obj.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(kind==='contact'&&context.noteId){const n=data.notes.find(x=>x.id===context.noteId);if(n){n.personId=base.id;n.updatedAt=new Date().toISOString();}}
  if(kind==='note'){base.updatedAt=new Date().toISOString();base.projectId=values.projectId??obj.projectId??inheritedProjectId??'';}
  if(kind==='event'){base.reminderMinutes=normalizeEventReminders(reminders);base.start=`${values.date}T${values.time}:00`;base.noteId=obj.noteId||context.noteId||null;base.projectId=values.projectId??obj.projectId??inheritedProjectId??'';delete base.date;delete base.time;}
  if(kind==='task'){base.done=Boolean(obj.done);base.noteId=obj.noteId||context.noteId||null;base.projectId=values.projectId??obj.projectId??inheritedProjectId??'';}
  if(newProject)data.projects.push(newProject);
  const key={note:'notes',event:'events',task:'tasks',contact:'contacts'}[kind];const ix=data[key].findIndex(v=>v.id===base.id);if(ix>=0)data[key][ix]=base;else data[key].push(base);
  await persist();closeModal();render();toast(existing?'Modifications enregistrées':'Élément enregistré');
  if(kind==='note')noteDetail(base.id);
  if(kind==='event'&&base.noteId)noteDetail(base.noteId);
  if(kind==='task'&&base.noteId)noteDetail(base.noteId);
  if(kind==='contact'&&context.noteId)noteDetail(context.noteId);
 });
 if(kind==='note')setTimeout(()=>document.getElementById('f-title')?.focus(),100);
}
const weekdayNames=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
function analyzeNote(raw){
 const body=String(raw||'').slice(0,12000),plain=body.toLocaleLowerCase('fr-FR'),now=new Date();
 const result={eventIntent:false,date:'',time:'',location:'',personId:'',personText:'',taskTitle:'',eventTitle:'Rendez-vous',purchaseTitle:'',projectTitle:'',expenseTitle:'',amountCents:null,expenseIntent:false};
 const norm=value=>String(value).toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const hm=body.match(/(?:^|[^\d])(?:à|vers)?\s*([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/i);
 if(hm){const h=Number(hm[1]),m=Number(hm[2]||0);result.time=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
 const valid=(year,month,day)=>{const date=new Date(year,month-1,day);return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;};
 const future=(m,d,y)=>{if(y){return valid(y,m,d);}const dt=valid(now.getFullYear(),m,d);return dt&&dt.getTime()<new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()?valid(now.getFullYear()+1,m,d):dt;};
 const numeric=plain.match(/\b(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{4}))?\b/);
 if(numeric){const dt=future(Number(numeric[2]),Number(numeric[1]),numeric[3]?Number(numeric[3]):null);if(dt)result.date=dateKey(dt);}
 if(!result.date){
  const names=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const written=plain.match(/\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s+(\d{4}))?/);
  if(written){const dt=future(names.indexOf(written[2])+1,Number(written[1]),written[3]?Number(written[3]):null);if(dt)result.date=dateKey(dt);}
 }
 if(!result.date){
  let add=null;
  const futureRelative=plain.match(/\bdans\s+(\d{1,3})\s+jours?\b/);
  if(futureRelative)add=Math.min(365,Number(futureRelative[1]));
  else if(/\bapr[eè]s[- ]demain\b/.test(plain))add=2;
  else if(/\bdemain\b/.test(plain))add=1;
  else if(/\baujourd['’]hui\b/.test(plain))add=0;
  if(add!==null){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+add);result.date=dateKey(d);}
  else{
   const weekdays=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
   const weekday=weekdays.find(w=>new RegExp('\\b'+w+'\\b').test(plain));
   if(weekday){
    const target=weekdays.indexOf(weekday),d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    let delta=(target-now.getDay()+7)%7;
    if(delta===0&&result.time){const [h,m]=result.time.split(':').map(Number);if(h<now.getHours()||(h===now.getHours()&&m<=now.getMinutes()))delta=7;}
    if(new RegExp('\\b'+weekday+'\\s+prochain\\b').test(plain))delta+=7;
    d.setDate(d.getDate()+delta);result.date=dateKey(d);
   }
  }
 }
 const found=data.contacts.find(c=>c.name&&norm(plain).includes(norm(c.name)));
 if(found)result.personId=found.id;
 if(!result.personId){
  const pm=body.match(/\b(?:avec|chez|voir|appeler)\s+([A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜ][a-zà-ÿ'-]+(?:\s+[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜ][a-zà-ÿ'-]+)?)/u);
  if(pm&&!/^(?:Le|La|Les|Un|Une|Docteur|Cabinet|Médecin)$/.test(pm[1]))result.personText=pm[1];
 }
 const place=body.match(/(?:^|\s)(?:à|au)\s+([A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜ][\p{L}'-]+(?:\s+[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜ][\p{L}'-]+){0,2})/u);
 if(place)result.location=place[1];
 const task=body.match(/(?:penser à|pense à|n['’]oublie pas de|ne pas oublier de|prévoir de|il faut)\s+([^.,!?\n]+)/i);
 if(task)result.taskTitle=task[1].trim().slice(0,150);
 else {
  const simple=body.match(/\b(apporter|préparer|envoyer|réserver)\s+([^.,!?\n]+)/i);
  if(simple)result.taskTitle=(simple[1]+' '+simple[2]).slice(0,150);
 }
 if(/\b(médecin|docteur|cabinet médical|consultation)\b/.test(plain))result.eventTitle='Rendez-vous médical';
 else if(/\b(garage|garagiste|voiture)\b/.test(plain))result.eventTitle='Rendez-vous garage';
 else if(/\bdentiste\b/.test(plain))result.eventTitle='Rendez-vous dentiste';
 else if(/\bréunion\b/.test(plain))result.eventTitle='Réunion';
 else if(/\bappel\b/.test(plain))result.eventTitle='Appel';
 result.eventIntent=/\b(rdv|rendez[- ]vous|réunion|consultation|visite|appel|médecin|dentiste|entretien)\b/.test(plain)||!!(result.time&&result.date);
 const purchase=body.match(/\b(?:acheter|achat(?:\s+de)?|commander|prendre en boutique)\s+([^.,!?\n]+)/i);
 if(purchase)result.purchaseTitle=purchase[1].trim().slice(0,120);
 const project=body.match(/\b(?:nouveau\s+)?projet\s*(?::|de|pour|d['’])\s*([^.,!?\n]+)/i);
 if(project)result.projectTitle=project[1].trim().slice(0,120);
 const euros=body.match(/\b(\d{1,6}(?:[\s\u202f]?\d{3})*(?:[,.]\d{1,2})?)\s*(?:€|euros?)(?=\s|[,.!?\n]|$)/i);
 if(euros){
  const amount=Number(euros[1].replace(/[\s\u202f]/g,'').replace(',','.'));
  if(Number.isFinite(amount)&&amount>0&&amount<=1000000)result.amountCents=Math.round(amount*100);
 }
 result.expenseIntent=!!result.amountCents&&/(?:^|[^\p{L}])(?:paye|payé|paiement|dépensé|dépense|facture|réglé|règlement|prélevé)(?=$|[^\p{L}])/u.test(plain);
 if(result.expenseIntent)result.expenseTitle=(body.match(/(?:payé|dépensé|facture|règlement)\s+(?:pour\s+)?([^.,!?\n]+)/i)?.[1]||'Dépense').trim().slice(0,120);
 return result;
}
function noteDetail(id){
 const n=data.notes.find(v=>v.id===id);if(!n){toast('Note introuvable');return;}
 const linked=noteLinks(id), det=analyzeNote(n.body);
 const linkedContact=data.contacts.find(c=>c.id===n.personId);
 const related=[
  ...(linkedContact?[{type:'contact',icon:'users',title:linkedContact.name,sub:'Personne associée',id:linkedContact.id}]:[]),
  ...linked.events.map(e=>({type:'event',icon:'calendar',title:e.title,sub:formatDate(e.start),id:e.id})),
  ...linked.tasks.map(t=>({type:'task',icon:'check',title:t.title,sub:t.done?'Terminé':'À faire',id:t.id})),
  ...linked.purchases.map(p=>({type:'purchase',icon:'cart',title:p.title,sub:purchaseStatus[p.status],id:p.id})),
  ...linked.transactions.map(t=>({type:'transaction',icon:'wallet',title:t.title,sub:money(t.amountCents),id:t.id}))
 ];
 const suggestions=[
  det.eventIntent&&!linked.events.length?`<div class="suggestion"><span class="item-ico blue">${svg('calendar')}</span><div class="suggestion-body"><strong>Rendez-vous possible</strong><p>${escapeHtml(det.eventTitle)} · ${det.date?formatDate(det.date):'Date à préciser'}${det.time?' · '+det.time:''}</p><button class="btn btn-small" data-action="event-from-note" data-id="${id}">${svg('plus')} Créer dans l'agenda</button></div></div>`:'',
  det.taskTitle&&!linked.tasks.length?`<div class="suggestion"><span class="item-ico peach">${svg('check')}</span><div class="suggestion-body"><strong>Rappel possible</strong><p>${escapeHtml(det.taskTitle)}</p><button class="btn btn-small" data-action="task-from-note" data-id="${id}">${svg('plus')} Créer le rappel</button></div></div>`:'',
  det.purchaseTitle&&!linked.purchases.length?`<div class="suggestion"><span class="item-ico green">${svg('cart')}</span><div class="suggestion-body"><strong>Achat possible</strong><p>${escapeHtml(det.purchaseTitle)}</p><button class="btn btn-small" data-action="purchase-from-note" data-id="${id}">${svg('plus')} Ajouter aux achats</button></div></div>`:'',
  det.projectTitle&&!n.projectId?`<div class="suggestion"><span class="item-ico green">${svg('briefcase')}</span><div class="suggestion-body"><strong>Projet possible</strong><p>${escapeHtml(det.projectTitle)}</p><button class="btn btn-small" data-action="project-from-note" data-id="${id}">${svg('plus')} Créer le projet</button></div></div>`:'',
  det.expenseIntent&&!linked.transactions.length?`<div class="suggestion"><span class="item-ico green">${svg('wallet')}</span><div class="suggestion-body"><strong>Dépense à vérifier</strong><p>${escapeHtml(det.expenseTitle)} · ${money(det.amountCents)}</p><button class="btn btn-small" data-action="transaction-from-note" data-id="${id}">${svg('plus')} Vérifier et enregistrer</button></div></div>`:'',
  det.personText&&!det.personId&&!n.personId?`<div class="suggestion"><span class="item-ico green">${svg('users')}</span><div class="suggestion-body"><strong>Nouvelle personne ?</strong><p>${escapeHtml(det.personText)}</p><button class="btn btn-small" data-action="person-from-note" data-id="${id}">${svg('plus')} Créer un contact</button></div></div>`:''
 ].filter(Boolean).join('');
 const project=data.projects.find(p=>p.id===n.projectId);
 modal('Note',`<div class="detail-head"><div><div class="eyebrow">MA MÉMOIRE</div><h2>${escapeHtml(n.title)}</h2><div class="detail-meta">Mis à jour le ${formatDate(n.updatedAt||n.createdAt,{day:'numeric',month:'long',year:'numeric'})}</div></div></div>
 <div class="detail-content">${escapeHtml(n.body||'Cette note est vide.')}</div>
 ${project?`<div class="project-facts"><button class="btn btn-neutral btn-small" data-action="project-detail" data-id="${project.id}">${svg('briefcase')} ${escapeHtml(project.title)}</button></div>`:''}
 <div class="form-actions" style="justify-content:flex-start"><button class="btn btn-soft btn-small" data-action="edit-note" data-id="${id}">${svg('edit')} Modifier</button><button class="btn btn-danger btn-small" data-action="delete-note" data-id="${id}">${svg('trash')} Supprimer</button></div>
 ${!project?`<div class="note-project-start"><strong>Cette note peut devenir un projet.</strong><p>Son contenu restera la première note du projet. Ajoute ensuite des rendez-vous, achats et dépenses.</p><button class="btn btn-small" data-action="project-from-note" data-id="${id}">${svg('briefcase')} Transformer en projet</button></div>`:''}
  <div class="linked-section"><h3>${svg('sparkle')} Actions suggérées</h3>${suggestions||'<p class="muted-note">Pas de suggestion détectée. Tu peux créer les éléments manuellement.</p>'}
 <div class="form-actions" style="justify-content:flex-start"><button class="btn btn-neutral btn-small" data-action="event-from-note" data-id="${id}">${svg('calendar')} RDV</button>
 <button class="btn btn-neutral btn-small" data-action="task-from-note" data-id="${id}">${svg('check')} Rappel</button>
 <button class="btn btn-neutral btn-small" data-action="purchase-from-note" data-id="${id}">${svg('cart')} Achat</button>
 <button class="btn btn-neutral btn-small" data-action="project-from-note" data-id="${id}">${svg('briefcase')} Projet</button>
 <button class="btn btn-neutral btn-small" data-action="transaction-from-note" data-id="${id}">${svg('wallet')} Dépense</button></div></div>
 <div class="linked-section"><h3>${svg('link')} Éléments reliés (${related.length})</h3>
 ${related.map(x=>`<div class="due-item"><span class="item-ico">${svg(x.icon)}</span><button data-action="${x.type}-detail" data-id="${x.id}">${escapeHtml(x.title)}<small>${escapeHtml(x.sub||'')}</small></button></div>`).join('')||'<p class="muted-note">Aucun lien pour le moment.</p>'}</div>`);
}

function eventDetail(id){
 const e=data.events.find(v=>v.id===id);if(!e)return;
 const person=data.contacts.find(p=>p.id===e.personId);
 const note=data.notes.find(n=>n.id===e.noteId);
 const project=data.projects.find(p=>p.id===e.projectId);
 const notificationLabel=Array.isArray(e.reminderMinutes)?
  (normalizeEventReminders(e.reminderMinutes).map(m=>eventReminderLabel(m)).join(', ')||'Aucune notification')+' avant':
  'Anciennes préférences de notification';
 modal('Rendez-vous',`<div class="eyebrow">AGENDA</div><div class="detail-head"><h2>${escapeHtml(e.title)}</h2></div>
  <div class="detail-content">${svg('calendar')} ${formatDate(e.start,{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · ${escapeHtml(e.start?.slice(11,16)||'')}
  ${e.location?`\\n${svg('pin')} ${escapeHtml(e.location)}`:''}
  ${person||e.personText?`\\n${svg('users')} ${escapeHtml(person?.name||e.personText)}`:''}
  ${e.details?`\\n\\n${escapeHtml(e.details)}`:''}</div>
  <p class="muted-note">${svg('clock')} Rappels : ${escapeHtml(notificationLabel)}</p>
  <div class="form-actions" style="justify-content:flex-start">
   <button class="btn btn-soft btn-small" data-action="edit-event" data-id="${id}">${svg('edit')} Modifier</button>
   <button class="btn btn-neutral btn-small" data-action="event-ics" data-id="${id}">${svg('download')} .ics</button>
   <button class="btn btn-danger btn-small" data-action="delete-event" data-id="${id}">${svg('trash')} Supprimer</button></div>
  ${project?`<div class="linked-section"><h3>${svg('briefcase')} Projet associé</h3>
   <button class="btn btn-neutral btn-small" data-action="project-detail" data-id="${project.id}">${escapeHtml(project.title)}</button></div>`:''}
  ${note?`<div class="linked-section"><h3>${svg('link')} Note d'origine</h3><button class="btn btn-neutral btn-small" data-action="note-detail" data-id="${note.id}">${svg('notes')} ${escapeHtml(note.title)}</button></div>`:''}`);
}

function taskDetail(id){const t=data.tasks.find(x=>x.id===id);if(!t)return;const note=data.notes.find(n=>n.id===t.noteId),person=data.contacts.find(p=>p.id===t.personId);modal('Rappel',`<div class="eyebrow">À FAIRE</div><h2 style="font-size:24px;letter-spacing:-1px">${escapeHtml(t.title)}</h2><p class="muted-note">${t.done?'Terminé':'À faire'} · ${t.dueDate?formatDate(t.dueDate,{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'Sans date limite'}${person?' · '+escapeHtml(person.name):''}</p><div class="form-actions" style="justify-content:flex-start"><button class="btn btn-soft btn-small" data-action="toggle-task" data-id="${id}">${svg('check')} ${t.done?'Réactiver':'Marquer terminé'}</button><button class="btn btn-neutral btn-small" data-action="edit-task" data-id="${id}">${svg('edit')} Modifier</button><button class="btn btn-danger btn-small" data-action="delete-task" data-id="${id}">${svg('trash')} Supprimer</button></div>${note?`<div class="linked-section"><h3>${svg('link')} Note d'origine</h3><button class="btn btn-neutral btn-small" data-action="note-detail" data-id="${note.id}">${svg('notes')} ${escapeHtml(note.title)}</button></div>`:''}`);}
function contactDetail(id){const c=data.contacts.find(x=>x.id===id);if(!c)return;const events=sortEvents(data.events.filter(e=>e.personId===id)),tasks=data.tasks.filter(t=>t.personId===id);const phone=c.phone?c.phone.replace(/[^\d+]/g,''):'';modal('Personne',`<div class="detail-head"><div><div class="eyebrow">PERSONNE</div><h2>${escapeHtml(c.name)}</h2><p class="subtitle">${escapeHtml(c.role||'Contact')}</p></div><span class="person-initial">${escapeHtml(c.name[0]?.toUpperCase())}</span></div><div class="form-actions" style="justify-content:flex-start">${phone?`<a class="btn btn-soft btn-small" href="tel:${escapeHtml(phone)}">${svg('phone')} Appeler</a>`:''}${c.email?`<a class="btn btn-soft btn-small" href="mailto:${escapeHtml(c.email)}">${svg('mail')} E-mail</a>`:''}<button class="btn btn-neutral btn-small" data-action="edit-contact" data-id="${id}">${svg('edit')} Modifier</button><button class="btn btn-danger btn-small" data-action="delete-contact" data-id="${id}">${svg('trash')} Supprimer</button></div><div class="linked-section"><h3>${svg('link')} Dans ton espace (${events.length+tasks.length})</h3>${events.map(e=>`<div class="due-item"><span class="item-ico blue">${svg('calendar')}</span><button data-action="event-detail" data-id="${e.id}">${escapeHtml(e.title)}<small>${formatDate(e.start)}</small></button></div>`).join('')}${tasks.map(t=>`<div class="due-item"><span class="item-ico peach">${svg('check')}</span><button data-action="task-detail" data-id="${t.id}">${escapeHtml(t.title)}</button></div>`).join('')||'<p class="muted-note">Aucun rendez-vous ou rappel associé.</p>'}</div>`);}
function showSearch(){modal('Rechercher partout',`<div class="search-box">${svg('search')}<input id="global-search" type="search" placeholder="Note, achat, projet, personne..." autocomplete="off" aria-label="Rechercher dans NEXUS"></div><div class="search-results" id="search-results"></div>`);const field=document.getElementById('global-search');field.addEventListener('input',()=>renderSearch(field.value));renderSearch('');setTimeout(()=>field.focus(),80);}
function renderSearch(query){
 const q=query.trim().toLocaleLowerCase('fr-FR');
 const types=[
  ['notes','note','notes',x=>`${x.title} ${x.body}`],
  ['events','event','calendar',x=>`${x.title} ${x.location} ${x.personText} ${x.details}`],
  ['tasks','task','check',x=>`${x.title} ${x.dueDate}`],
  ['contacts','contact','users',x=>`${x.name} ${x.role} ${x.email} ${x.phone}`],
  ['projects','project','briefcase',x=>`${x.title} ${x.description}`],
  ['purchases','purchase','cart',x=>`${x.title} ${x.shop} ${x.details}`],
  ['transactions','transaction','wallet',x=>`${x.title} ${x.category} ${x.date}`]
 ];
 const all=types.flatMap(([key,kind,icon,description])=>data[key].map(x=>({
  kind,icon,id:x.id,title:x.name||x.title||'',sub:description(x)
 })));
 const labels={note:'Note',event:'Rendez-vous',task:'Rappel',contact:'Personne',project:'Projet',purchase:'Achat',transaction:'Budget'};
 const found=all.filter(x=>!q||(x.title+' '+x.sub).toLocaleLowerCase('fr-FR').includes(q)).slice(0,40);
 document.getElementById('search-results').innerHTML=found.length?found.map(x=>`<div class="row-item"><span class="item-ico">${svg(x.icon)}</span>
 <div class="item-copy"><strong>${escapeHtml(x.title)}</strong><small>${labels[x.kind]}</small></div>
 <button class="row-arrow" data-action="${x.kind}-detail" data-id="${x.id}">${svg('chevright')}</button></div>`).join(''):empty('Aucun résultat','Essaie un autre mot.','search');
}

function settingsView(){
 const chooseSlot=index=>`<label class="ui-select"><span>Raccourci ${index}</span>
  <select data-pref-slot="${index}" aria-label="Choisir le module du raccourci ${index}">
  ${MODULES.map(m=>`<option value="${m[0]}" ${UI['slot'+index]===m[0]?'selected':''}>${escapeHtml(m[2])}</option>`).join('')}
  </select></label>`;
 const widgets=[...UI.widgets,...HOME_WIDGETS.map(x=>x[0]).filter(id=>!UI.widgets.includes(id))];
 return `<div class="nexus-page-heading"><div class="eyebrow">TON ESPACE · TES RÈGLES</div>
  <h1 class="page-title">Réglages<span class="punctuation">.</span></h1>
  <p class="subtitle">Navigation, accueil, sécurité et données : tout est au même endroit.</p></div>
 <div class="preferences-layout">
  <section class="preferences-panel">
   <div class="pref-heading">${svg('sliders')} <div><h2>Navigation</h2><p>Personnalise les deux raccourcis de ta barre du bas.</p></div></div>
   <div class="slots-visual">
    <span>${svg('home')} Accueil</span><span>${svg('grid')} Catégories</span>
    <span class="custom-slot">${svg(MODULES.find(m=>m[0]===UI.slot1)?.[1]||'briefcase')} ${escapeHtml(MODULES.find(m=>m[0]===UI.slot1)?.[2]||'Projets')}</span>
    <span class="custom-slot">${svg(MODULES.find(m=>m[0]===UI.slot2)?.[1]||'wallet')} ${escapeHtml(MODULES.find(m=>m[0]===UI.slot2)?.[2]||'Budget')}</span>
    <span>${svg('sliders')} Réglages</span>
   </div>
   <div class="pref-select-grid">${chooseSlot(1)}${chooseSlot(2)}</div>
   <p class="pref-hint">Un module ne peut pas occuper les deux slots. S'il est déjà utilisé, NEXUS échange les deux raccourcis.</p>
  </section>
  <section class="preferences-panel">
   <div class="pref-heading">${svg('sparkle')} <div><h2>Apparence</h2><p>Adapte le rendu à ta manière de travailler.</p></div></div>
   <div class="pref-select-grid">
    <label class="ui-select"><span>Palette</span><select data-pref-option="theme">
     <option value="sage" ${UI.theme==='sage'?'selected':''}>Sauge · naturel</option>
     <option value="slate" ${UI.theme==='slate'?'selected':''}>Ardoise · contrasté</option>
    </select></label>
    <label class="ui-select"><span>Densité</span><select data-pref-option="density">
     <option value="comfortable" ${UI.density==='comfortable'?'selected':''}>Confortable</option>
     <option value="compact" ${UI.density==='compact'?'selected':''}>Compacte</option>
    </select></label>
   </div>
   <p class="pref-hint">Mode sombre à venir : on le fera sur toute l'application pour préserver le contraste dans chaque bloc.</p>
  </section>
  <section class="preferences-panel">
   <div class="pref-heading">${svg('layers')} <div><h2>Accueil personnalisé</h2><p>Choisis ce qui apparaît et dans quel ordre.</p></div></div>
   <div class="widget-settings">${widgets.map(id=>{
    const w=HOME_WIDGETS.find(x=>x[0]===id),enabled=UI.widgets.includes(id),position=UI.widgets.indexOf(id);
    return `<div class="widget-setting ${enabled?'':'is-hidden'}">
     <button data-action="toggle-widget" data-widget="${id}" aria-pressed="${enabled}" aria-label="${enabled?'Masquer':'Afficher'} ${escapeHtml(w[1])}">${svg(enabled?'check':'plus')}</button>
     <div><strong>${escapeHtml(w[1])}</strong><small>${escapeHtml(w[2])}</small></div>
     <span class="widget-arrows">
      <button data-action="move-widget" data-widget="${id}" data-dir="-1" ${!enabled||position<=0?'disabled':''} aria-label="Monter ${escapeHtml(w[1])}">${svg('chevleft')}</button>
      <button data-action="move-widget" data-widget="${id}" data-dir="1" ${!enabled||position===UI.widgets.length-1?'disabled':''} aria-label="Descendre ${escapeHtml(w[1])}">${svg('chevright')}</button></span>
    </div>`;
   }).join('')}</div>
   <button class="btn btn-neutral btn-small" data-action="reset-ui">${svg('arrow')} Retrouver l'interface par défaut</button>
  </section>
  <section class="preferences-panel">
   <div class="pref-heading">${svg('shield')} <div><h2>Notifications & sécurité</h2><p>Garde le contrôle de tes autorisations et connexions.</p></div></div>
   <div class="settings-option"><div><strong>Notifications iPhone</strong><p>Activation, test push et rappels par rendez-vous.</p></div>
    <button class="btn btn-soft btn-small" data-action="push-settings">Configurer</button></div>
   <div class="settings-option"><div><strong>Face ID / passkeys</strong><p>Verrouille l'interface avec une vérification serveur.</p></div>
    <button class="btn btn-soft btn-small" data-action="passkey-settings">Configurer</button></div>
   <div class="settings-option"><div><strong>Coffre et synchronisation</strong><p>Sauvegardes chiffrées, transfert et récupération.</p></div>
    <button class="btn btn-soft btn-small" data-action="cloud-vault">Ouvrir</button></div>
  </section>
  ${window.NexusConnections?.settingsCard?.()||''}
  <section class="preferences-panel">
   <div class="pref-heading">${svg('download')} <div><h2>Données & sauvegardes</h2><p>Tes informations restent sous ton contrôle.</p></div></div>
   <div class="settings-option"><div><strong>Exporter les données</strong><p>Une sauvegarde JSON complète des sept modules.</p></div>
    <button class="btn btn-neutral btn-small" data-action="export">${svg('download')} Export</button></div>
   <div class="settings-option"><div><strong>Importer une sauvegarde</strong><p>Remplace tes données locales après confirmation.</p></div>
    <button class="btn btn-neutral btn-small" data-action="restore">${svg('upload')} Import</button></div>
   <div class="settings-option"><div><strong>Corbeille universelle</strong><p>Éléments supprimés, restaurations et suppression définitive. ${window.NexusRecycle?.counts?.().items||0} élément(s) actuellement dans la corbeille.</p></div>
    <button class="btn btn-soft btn-small" data-action="trash-panel">${svg('trash')} Ouvrir</button></div>
   <div class="settings-option"><div><strong>Réinitialisations par module</strong><p>Vider uniquement les Notes, l'Agenda, le Budget ou un autre bloc, avec retour arrière possible.</p></div>
    <button class="btn btn-neutral btn-small" data-action="trash-reset-center">${svg('sliders')} Configurer</button></div>
   <div class="info-strip">${svg('shield')} Tes données locales ne sont pas chiffrées. Le coffre chiffre les sauvegardes avant envoi. Conserve ta clé de récupération.</div>
  </section></div>
  <footer class="settings-version">NEXUS · V0.14 · Local-first · Gratuit · ${data.notes.length} notes · ${data.projects.length} projets</footer>`;
}
function exportJson(){const payload={app:'NEXUS',schemaVersion:2,exportedAt:new Date().toISOString(),data};downloadFile(`nexus-sauvegarde-${dateKey(new Date())}.json`,JSON.stringify(payload,null,2),'application/json');toast('Sauvegarde générée');}
function downloadFile(name,text,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function icsEscape(value){return String(value||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
function eventToIcs(e){const begin=new Date(e.start),end=new Date(begin.getTime()+60*60000);if(isNaN(begin.getTime()))return toast('Date invalide');const dt=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//NEXUS//FR','BEGIN:VEVENT',`UID:${e.id}@nexus.local`,`DTSTAMP:${dt(new Date())}`,`DTSTART:${dt(begin)}`,`DTEND:${dt(end)}`,`SUMMARY:${icsEscape(e.title)}`,`LOCATION:${icsEscape(e.location)}`,`DESCRIPTION:${icsEscape(e.details)}`,'END:VEVENT','END:VCALENDAR'];downloadFile(`nexus-${dateKey(begin)}.ics`,lines.join('\r\n')+'\r\n','text/calendar');toast('Fichier calendrier généré');}
async function deleteEntity(kind,id){
 const key={note:'notes',event:'events',task:'tasks',contact:'contacts',
  project:'projects',purchase:'purchases',transaction:'transactions'}[kind];
 if(!key)return;
 await window.NexusRecycle?.remove?.(key,id);
}
document.addEventListener('click',async event=>{
 const navigation=event.target.closest('[data-nav]');
 if(navigation){event.preventDefault();closeModal();navTo(navDestination(navigation.dataset.nav));return;}
 const view=event.target.closest('[data-view]');if(view){event.preventDefault();closeModal();navTo(view.dataset.view);return;}
 const action=event.target.closest('[data-action]');if(!action)return;const kind=action.dataset.action,id=action.dataset.id;
 if(kind==='overlay'){if(event.target===action)closeModal();return;}
 if(kind==='close-modal'){closeModal();return;}
 if(kind==='toggle-widget'){
  const id=action.dataset.widget;
  if(HOME_WIDGETS.some(w=>w[0]===id)){
   UI.widgets=UI.widgets.includes(id)?UI.widgets.filter(w=>w!==id):[...UI.widgets,id];
   saveUI();
  }
 }
 if(kind==='move-widget'){
  const id=action.dataset.widget,index=UI.widgets.indexOf(id),next=index+Number(action.dataset.dir);
  if(index>=0&&next>=0&&next<UI.widgets.length){
   [UI.widgets[index],UI.widgets[next]]=[UI.widgets[next],UI.widgets[index]];saveUI();
  }
 }
 if(kind==='reset-ui'){
  if(confirm("Réinitialiser uniquement l'interface ? Tes notes, projets et sauvegardes resteront intacts.")){
   UI=defaultUI();saveUI();toast('Interface réinitialisée.');
  }
 }
  if(kind==='pin-module')setSlot(Number(action.dataset.slot),action.dataset.module);
 if(kind==='quick-save'){
  const content=document.getElementById('quick-capture')?.value.trim()||'';
  if(!content){toast('Écris quelque chose avant de capturer.');return;}
  const line=content.split(/\r?\n/).find(x=>x.trim())?.trim()||'Capture rapide';
  const now=new Date().toISOString();
  const note={id:uid(),title:line.slice(0,100),body:content,projectId:'',createdAt:now,updatedAt:now};
  data.notes.push(note);await persist();render();toast('Pensée capturée.');noteDetail(note.id);
 }
  if(kind==='new-note')captureForm('note');
 if(kind==='new-event')captureForm('event');
 if(kind==='new-task')captureForm('task');
 if(kind==='new-contact')captureForm('contact');

 if(kind==='new-project')extraCaptureForm('project');
 if(kind==='new-purchase')extraCaptureForm('purchase');
 if(kind==='new-transaction')extraCaptureForm('transaction');
 if(kind==='project-detail')projectDetail(id);
 if(kind==='purchase-detail')purchaseDetail(id);
 if(kind==='transaction-detail')transactionDetail(id);
 if(kind==='edit-project')extraCaptureForm('project',data.projects.find(x=>x.id===id));
 if(kind==='edit-purchase')extraCaptureForm('purchase',data.purchases.find(x=>x.id===id));
 if(kind==='edit-transaction')extraCaptureForm('transaction',data.transactions.find(x=>x.id===id));
 if(kind==='delete-project')await deleteEntity('project',id);
 if(kind==='delete-purchase')await deleteEntity('purchase',id);
 if(kind==='delete-transaction')await deleteEntity('transaction',id);
 if(kind==='new-event-for-project')captureForm('event',{}, {projectId:id});
  if(kind==='task-for-project')captureForm('task',{}, {projectId:id});
 if(kind==='note-for-project')captureForm('note',{}, {projectId:id});
 if(kind==='purchase-for-project')extraCaptureForm('purchase',{}, {projectId:id});
 if(kind==='transaction-for-project')extraCaptureForm('transaction',{}, {projectId:id});
 if(kind==='project-from-note'){const n=data.notes.find(x=>x.id===id);if(n)extraCaptureForm('project',{}, {noteId:id});}
 if(kind==='transaction-from-note'){const n=data.notes.find(x=>x.id===id);if(n)extraCaptureForm('transaction',{}, {noteId:id});}
 if(kind==='person-from-note'){const n=data.notes.find(x=>x.id===id);if(n)captureForm('contact',{}, {noteId:id,suggestedName:analyzeNote(n.body).personText});}
  if(kind==='purchase-from-note'){const n=data.notes.find(x=>x.id===id);if(n)extraCaptureForm('purchase',{}, {noteId:id,projectId:n.projectId||''});}
 if(kind==='mark-purchased'){
  const p=data.purchases.find(x=>x.id===id);
  if(p){p.status='purchased';p.purchasedAt=dateKey(new Date());p.updatedAt=new Date().toISOString();await persist();render();purchaseDetail(id);toast('Achat marqué comme effectué');}
 }
 if(kind==='expense-from-purchase'){
  const p=data.purchases.find(x=>x.id===id);
  if(p&&p.status==='purchased'&&!data.transactions.some(t=>t.purchaseId===id)) extraCaptureForm('transaction',{}, {purchaseId:id});
 }
 if(['b8-','b9-','b10-'].some(prefix=>kind.startsWith(prefix))){window.NexusBudget?.act?.(kind,action);return;}
  if(kind==='purchase-filter'){purchaseFilter=action.dataset.filter;render();}
 if(kind==='project-filter'){projectFilter=action.dataset.filter;render();}
 if(kind==='budget-limit')extraCaptureForm('limit');
 if(kind==='budget-prev'||kind==='budget-next'){
  const d=new Date(budgetMonth+'-01T12:00:00');
  d.setMonth(d.getMonth()+(kind==='budget-next'?1:-1));
  budgetMonth=dateKey(d).slice(0,7);render();
 }
 if(kind==='search')showSearch();
 if(kind==='settings')navTo('settings');
 if(kind==='cloud-vault')window.NexusCloud?.openPanel();
 if(kind==='push-settings')window.NexusPush?.openPanel();
 if(kind==='passkey-settings')window.NexusFace?.openPanel();
 if(kind==='note-detail')noteDetail(id);
 if(kind==='event-detail')eventDetail(id);
 if(kind==='task-detail')taskDetail(id);
 if(kind==='contact-detail')contactDetail(id);
 if(kind==='edit-note')captureForm('note',data.notes.find(x=>x.id===id));
 if(kind==='edit-event')captureForm('event',data.events.find(x=>x.id===id));
 if(kind==='edit-task')captureForm('task',data.tasks.find(x=>x.id===id));
 if(kind==='edit-contact')captureForm('contact',data.contacts.find(x=>x.id===id));
 if(kind==='event-from-note')captureForm('event',{}, {noteId:id});
 if(kind==='task-from-note')captureForm('task',{}, {noteId:id});
 if(kind==='delete-note')await deleteEntity('note',id);
 if(kind==='delete-event')await deleteEntity('event',id);
 if(kind==='delete-task')await deleteEntity('task',id);
 if(kind==='delete-contact')await deleteEntity('contact',id);
 if(kind==='toggle-task'){const t=data.tasks.find(x=>x.id===id);if(t){t.done=!t.done;await persist();closeModal();render();toast(t.done?'Rappel terminé':'Rappel réactivé');}}
 if(kind==='calendar-prev'){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);render();}
 if(kind==='calendar-next'){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);render();}
 if(kind==='calendar-day'){selectedDay=action.dataset.day;render();}
 if(kind==='task-filter'){taskFilter=action.dataset.filter;render();}
 if(kind==='event-ics'){const e=data.events.find(x=>x.id===id);if(e)eventToIcs(e);}
 if(kind==='export')exportJson();
 if(kind==='restore')document.getElementById('restore-file').click();
 if(kind.startsWith('link-')||kind.startsWith('rituel-')){window.NexusConnections?.act?.(kind,action);return;}
 if(kind.startsWith('trash-')){await window.NexusRecycle?.act?.(kind,action);return;}
});
document.addEventListener('change',event=>{
 if(window.NexusConnections?.onChange?.(event.target))return;
 if(event.target?.id?.startsWith('b8-journal-')){window.NexusBudget?.change?.(event.target);return;}
 const shortcut=event.target.closest('[data-pref-slot]');
 if(shortcut){setSlot(Number(shortcut.dataset.prefSlot),shortcut.value);return;}
 const option=event.target.closest('[data-pref-option]');
 if(option){
  const key=option.dataset.prefOption;
  if(key==='theme'&&['sage','slate'].includes(option.value)){UI.theme=option.value;saveUI();}
  if(key==='density'&&['comfortable','compact'].includes(option.value)){UI.density=option.value;saveUI();}
 }
});
document.addEventListener('input',event=>{
 if(event.target?.id==='b8-journal-search')window.NexusBudget?.inputSearch?.(event.target);
});
document.getElementById('restore-file').addEventListener('change',async event=>{const f=event.target.files?.[0];if(!f)return;try{if(f.size>20_000_000)throw new Error('Fichier trop volumineux');const parsed=JSON.parse(await f.text());if(parsed.app!=='NEXUS'||![1,2].includes(parsed.schemaVersion)||!parsed.data||!['notes','events','tasks','contacts'].every(key=>Array.isArray(parsed.data[key]))||Object.entries(parsed.data).some(([k,v])=>k in data&&!Array.isArray(v)))throw new Error('Ce fichier n’est pas une sauvegarde NEXUS valide.');if(confirm('La restauration remplacera les données actuelles. Continuer ?')){assignData(parsed.data);await persist();closeModal();render();toast('Sauvegarde restaurée');}}catch(err){alert(err.message||'Restauration impossible');}finally{event.target.value='';}});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();showSearch();}});
async function verifyNexusInbox(){
 try{
  let saved;
  if(dbHandle)saved=await new Promise((resolve,reject)=>{
   const r=dbHandle.transaction(DB_STORE,'readonly').objectStore(DB_STORE).get('main');
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  else saved=JSON.parse(localStorage.getItem(BACKUP_KEY)||'null');
  return Array.isArray(saved?.linkInbox)&&JSON.stringify(saved.linkInbox)===JSON.stringify(data.linkInbox);
 }catch{return false}
}
function attachGamingImport(){
 const adapter={state:()=>data,persist,verify:verifyNexusInbox,render,modal,toast,escape:escapeHtml,uid,today:()=>dateKey(new Date())};
 window.NexusGamingImport?.attach?.(adapter);
 window.NexusRituelImport?.attach?.(adapter);
}

(async()=>{await loadData();applyUI();attachGamingImport();render();window.NexusFace?.init?.();if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Offline worker unavailable',err));}})();
