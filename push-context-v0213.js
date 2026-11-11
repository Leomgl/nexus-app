/* FORGE #5 · NEXUS V0.21.3 — Contextual Web Push, private data stays on iPhone. */
(function installPushContext(){
 'use strict';
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
 const dayKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const atLocal=(day,hour=9,minute=0)=>{
  if(!validDate(day))return null;
  const [y,m,d]=day.split('-').map(Number);
  const result=new Date(y,m-1,d,hour,minute,0);
  return dayKey(result)===day?result:null;
 };
 const truncate=(s,max)=>String(s??'').replace(/\s+/g,' ').trim().slice(0,max);
 const euro=cents=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(cents/100);
 const hourLabel=d=>String(d.getHours()).padStart(2,'0')+'h'+String(d.getMinutes()).padStart(2,'0');
 const uniqueMinutes=v=>Array.isArray(v)?[...new Set(v.filter(x=>Number.isInteger(x)&&x>=1&&x<=10080))]:[];
 const generic={
  event:{title:'📅 Rendez-vous à venir',body:'Consulte ton agenda dans NEXUS.'},
  task:{title:'✅ Rappel à venir',body:'Une tâche t’attend dans NEXUS.'},
  budget:{title:'💳 Échéance budgétaire',body:'Une rentrée ou sortie d’argent est prévue dans NEXUS.'}
 };
 function message(kind,item,date,delta,settings,contacts){
  if(settings.showDetails!==true)return generic[kind];
  if(kind==='event'){
   const person=contacts.find(p=>p.id===item.personId);
   const guest=truncate(person?.name||item.personText,44);
   const restaurant=/\b(resto|restaurant|d[iî]ner|d[eé]jeuner|brunch|pizzeria)\b/i.test(item.title||'');
   const headline=(restaurant?'🍽️ Restaurant':'📅 Rendez-vous')+' · '+hourLabel(date);
   const chunks=[truncate(item.title,80),item.location?'📍 '+truncate(item.location,65):'',
     guest?'Avec '+guest:''].filter(Boolean);
   return {title:headline,body:truncate(chunks.join(' · '),210)};
  }
  if(kind==='task'){
   const dateText=delta>=1440?'À prévoir':delta>=60?'À faire bientôt':'À faire';
   return {title:'✅ '+truncate(item.title||'Rappel',70),body:dateText+' · '+hourLabel(date)};
  }
  const incoming=item.type==='income';
  const lead=delta===2?'Dans 2 jours':delta===7?'Dans 7 jours':'Aujourd’hui';
  return {
   title:(incoming?'💰 Revenu prévu':'💸 Paiement prévu')+' · '+lead,
   body:truncate(item.title||'Échéance',85)+' · '+(Number.isSafeInteger(item.amountCents)&&item.amountCents>0?euro(item.amountCents):'Montant à vérifier')+
      (incoming?' · Réception à vérifier':' · Paiement à confirmer')
  };
 }
 async function build(state,settings,hash,clock=Date.now()){
  const now=Number(clock),rows=[],contacts=Array.isArray(state.contacts)?state.contacts:[];
  const limit=now+366*86400000;
  async function add(kind,item,at,delta,identity){
   if(!item?.id||!at||!Number.isInteger(delta)||delta<0||delta>10080)return;
   const fireAt=Math.floor((at.getTime()-delta*60000)/1000);
   if(fireAt<now/1000-60||fireAt>limit/1000)return;
   const id=await hash(kind+':'+item.id+':'+identity+':'+delta);
   if(!/^[a-f0-9]{64}$/.test(id))throw new Error('Invalid reminder identifier');
   // Existing D1 push_jobs CHECK accepts only event/task. Budget jobs use the
   // existing task transport, but retain their budget context solely on device.
   const transportKind=kind==='budget'?'task':kind;
   rows.push({job:{id,kind:transportKind,fireAt},display:message(kind,item,at,delta,settings,contacts)});
  }
  const events=Array.isArray(state.events)?state.events:[];
  for(const e of events){
   if(typeof e.start!=='string')continue;
   const at=new Date(e.start);if(!Number.isFinite(at.getTime()))continue;
   const mins=uniqueMinutes(Array.isArray(e.reminderMinutes)?e.reminderMinutes:(Array.isArray(settings.eventMins)?settings.eventMins:[60]));
   for(const delta of mins)await add('event',e,at,delta,at.toISOString());
  }
  const tasks=Array.isArray(state.tasks)?state.tasks:[];
  for(const t of tasks){
   if(t.done||!validDate(t.dueDate))continue;
   const [hour,minute]=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.dueTime||'')?t.dueTime.split(':').map(Number):[9,0];
   const at=atLocal(t.dueDate,hour,minute);
   const mins=uniqueMinutes(Array.isArray(settings.taskMins)?settings.taskMins:[60]);
   for(const delta of mins)await add('task',t,at,delta,at?.toISOString()||'');
  }
  if(settings.budgetEnabled!==false&&window.NexusBudget?.occurrences){
   const current=new Date(now);
   const rules=Array.isArray(state.recurrences)?state.recurrences:[];
   const transactions=Array.isArray(state.transactions)?state.transactions:[];
   for(let offset=0;offset<=12;offset++){
    const date=new Date(current.getFullYear(),current.getMonth()+offset,1,12);
    const month=dayKey(date).slice(0,7);
    for(const rule of rules){
     if(!rule?.id||rule.active===false)continue;
     const days=Array.isArray(rule.notifyDays)?rule.notifyDays:[2,0];
     const validDays=[...new Set(days.filter(x=>Number.isInteger(x)&&x>=0&&x<=7))];
     if(!validDays.length)continue;
     for(const occurrence of window.NexusBudget.occurrences(rule,month)){
      if(occurrence.skipped)continue;
      const linked=transactions.find(tx=>tx.recurrenceId===rule.id&&tx.occurrenceKey===occurrence.identity);
      // A confirmed payment or received salary should no longer be announced.
      if(linked&&(rule.type!=='income'||linked.incomeVerified===true||linked.autoRecorded!==true))continue;
      const at=atLocal(occurrence.date,9);
      for(const delta of validDays){
       const firing=at?new Date(at):null;
       if(firing)firing.setDate(firing.getDate()-delta);
       // For budget notices, subtraction is calendar-day based (09:00 local)
       // rather than 48h UTC, surviving summer/winter timezone transitions.
       await add('budget',rule,firing,0,occurrence.identity+':'+delta);
      }
     }
    }
   }
  }
  rows.sort((a,b)=>a.job.fireAt-b.job.fireAt||a.job.id.localeCompare(b.job.id));
  const selected=rows.slice(0,600),contexts={};
  for(const row of selected)contexts['nexus-'+row.job.id.slice(0,16)]=row.display;
  return {jobs:selected.map(row=>row.job),contexts};
 }
 window.NexusPushContext={build};
})();
