/* NEXUS LINK inbound RITUEL proposals — explicit review, durable dedupe, no silent writes. */
'use strict';
(()=>{
 let api=null,working=false,hubAutoTimer=null,hubAutoBusy=false,hubLifecycleBound=false,lastHubPull=0;
 const esc=x=>api.escape(String(x??''));
 const clean=(x,n)=>String(x??'').trim().slice(0,n);
 const validDate=x=>{
  if(typeof x!=='string'||!/\d{4}-\d\d-\d\d/.test(x)||x.length!==10)return false;
  const d=new Date(x+'T12:00:00Z');
  return !isNaN(d.getTime())&&d.toISOString().startsWith(x);
 };
 const targetLabel={events:'Agenda',tasks:'Rappels',purchases:'Achats',transactions:'Budget',notes:'Notes'};
 const mapping={
  restock_purchase:['purchases'],restock_task:['tasks'],product_paid:['transactions'],routine_schedule:['events'],routine_summary:['notes']
 };
 function connection(){return api?.state().linkConnections?.find(x=>x.sourceApp==='rituel'&&!x.scopes?.includes('trip_context'))}
 function list(){return api?.state().linkInbox||[]}
 function valid(msg,pair){
  const p=msg?.payload;
  if(msg?.invalid||!p||p.type!=='rituel.proposal.v1'||p.sourceApp!=='rituel'||
     !pair.scopes.includes(msg.scope)||!mapping[msg.scope]?.includes(p.destination)||
     typeof msg.sourceKey!=='string'||!/^[a-f0-9]{64}$/i.test(msg.sourceKey)||
     !Number.isSafeInteger(msg.revision)||msg.revision<1||msg.revision>1e6||
     typeof p.title!=='string'||!p.title.trim()||p.title.length>140||
     typeof p.sourceId!=='string'||!p.sourceId||p.sourceId.length>140||
     typeof p.game!=='string'||p.game.length>100||
     typeof p.details!=='string'||p.details.length>500)return false;
  if(p.date&&!validDate(p.date))return false;
  if(typeof p.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time))return false;
  if(p.priceCents!==null&&(!Number.isSafeInteger(p.priceCents)||p.priceCents<0||p.priceCents>1e10))return false;
  if(p.currency!=null&&p.currency!=='EUR')return false;
  if((p.destination==='events'||p.destination==='tasks')&&!validDate(p.date))return false;
  return true;
 }
 async function persistVerified(){
  await api.persist();
  // Never acknowledge a server message unless the full local inbox has been written successfully.
  if(!(await api.verify()))throw Error('Sauvegarde NEXUS non vérifiée. Messages laissés sur le serveur.');
 }
 async function synchronize(){
  const pair=connection();if(!pair)throw Error('Aucun jumelage RITUEL enregistré.');
  if(working)return {busy:true};
  if(!window.NexusLinkCore)throw Error('Module NEXUS LINK indisponible.');
  working=true;
  let received=0,invalid=0,acked=0;
  try{
   for(let round=0;round<6;round++){
    const messages=await window.NexusLinkCore.inbox(pair);
    if(!messages.length)break;
    const toAck=[];
    let changed=false;
    for(const msg of messages){
     if(msg?.payload?.type==='test.ping'){toAck.push(msg.id);continue}
     if(!valid(msg,pair)){invalid++;continue}
     const entry=list().find(x=>x.pairId===pair.id&&x.sourceKey===msg.sourceKey);
     if(!entry){
      api.state().linkInbox.push({id:api.uid(),pairId:pair.id,sourceKey:msg.sourceKey,
       revision:msg.revision,scope:msg.scope,payload:msg.payload,status:'pending',
       createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),targetId:'',targetKind:''});
      changed=true;received++;
     }else if(msg.revision>entry.revision){
      entry.revision=msg.revision;entry.payload=msg.payload;entry.scope=msg.scope;
      entry.status='pending';entry.updatedAt=new Date().toISOString();changed=true;received++;
     }
     toAck.push(msg.id);
    }
    if(changed||(toAck.length&&!(await api.verify())))await persistVerified();
    for(const id of toAck){
     try{await window.NexusLinkCore.acknowledge(pair,id);acked++}
     catch(e){console.warn('NEXUS LINK ack retry on next pull',e.message)}
    }
    if(!toAck.length||messages.length<50)break;
   }
   if(received>0)(api.safeRender||api.render)?.();
   return {received,invalid,acked};
  }finally{working=false}
 }
 async function ingestHubEnvelope(message){
  const pair=connection();
  if(!pair||!api||!valid(message,pair))throw Error("PROPOSITION_RITUEL_NON_VERIFIÉE");
  const original=list().slice();
  const existing=original.find(x=>x.pairId===pair.id&&x.sourceKey===message.sourceKey);
  if(existing&&existing.revision===message.revision&&
    JSON.stringify(existing.payload)!==JSON.stringify(message.payload))
   throw Error("CONFLIT_DE_RÉVISION_RITUEL");
  if(!existing||message.revision>existing.revision){
   const now=new Date().toISOString();
   const next=existing?original.map(x=>x===existing?{...existing,revision:message.revision,
    payload:message.payload,scope:message.scope,status:"pending",updatedAt:now}:x):
    [...original,{id:api.uid(),pairId:pair.id,sourceKey:message.sourceKey,revision:message.revision,
    scope:message.scope,payload:message.payload,status:"pending",createdAt:now,updatedAt:now,
    targetId:"",targetKind:""}];
   api.state().linkInbox=next;
   try{await persistVerified()}
   catch(e){api.state().linkInbox=original;throw e}
  }else if(!(await api.verify()))throw Error("SAUVEGARDE_EXISTANTE_NON_VERIFIÉE");
  return {durable:true,status:"persisted"};
 }
 async function receiveHub({quiet=false}={}){
  const pair=connection();
  if(!pair)throw Error("Liaison Rituel/Nexus absente");
  if(!window.LinkHubBus)throw Error("MODULE_LINK_INDISPONIBLE");
  const result=await window.LinkHubBus.receive({pair,from:"rituel",contractId:"rituel-nexus",
   scopes:pair.scopes.filter(x=>Object.keys(mapping).includes(x)),
   persist:async opened=>{
    const sourceKey=await window.NexusLinkCore.sourceKey(pair,opened.entityId);
    return ingestHubEnvelope({...opened,sourceKey});
   },limit:30});
  if(result.acknowledged>0)(api.safeRender||api.render)?.();
  if(!quiet)api.toast(result.acknowledged+" proposition(s) Rituel confirmée(s) via LINK, "+result.failed+" à réessayer.");
  if(result.failed>0)throw Error("Réception partielle : messages non accusés, nouvelle tentative possible");
  if(!quiet)panel();
  return result;
 }
 function scheduleHubReceive(force=false){
  if(!connection()||typeof navigator!=="undefined"&&navigator.onLine===false)return;
  const now=Date.now();if(!force&&now-lastHubPull<30000)return;
  clearTimeout(hubAutoTimer);
  hubAutoTimer=setTimeout(async()=>{
   if(hubAutoBusy)return;
   if(typeof document!=="undefined"&&document.visibilityState==="hidden")return;
   const stamp=Date.now();if(!force&&stamp-lastHubPull<30000)return;
   lastHubPull=stamp;hubAutoBusy=true;
   try{await receiveHub({quiet:true})}
   catch(error){
    console.warn("NEXUS LINK Rituel Hub différé",error?.message||error);
    // Only LINK receives new proposals; no legacy fallback.
   }finally{hubAutoBusy=false}
  },850);
 }
 function initHubAuto(){
  if(hubLifecycleBound)return;hubLifecycleBound=true;
  if(typeof window==="undefined"||typeof document==="undefined"||typeof window.addEventListener!=="function"||typeof document.addEventListener!=="function")return;
  window.addEventListener("online",()=>scheduleHubReceive(true));
  window.addEventListener("focus",()=>scheduleHubReceive(false));
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")scheduleHubReceive(false)});
  scheduleHubReceive(true);
 }
 async function pull(){
  try{await receiveHub()}
  catch(e){api.toast('Réception RITUEL : '+e.message.slice(0,80))}
 }
 const counters=()=>{const p=connection(),rows=list().filter(x=>x.pairId===p?.id);return {
  pending:rows.filter(x=>x.status==='pending').length,
  accepted:rows.filter(x=>x.status==='accepted').length,
  rejected:rows.filter(x=>x.status==='rejected').length};};
 function panel(){
  const pair=connection();if(!pair){api.toast('Jumelle d’abord RITUEL à NEXUS.');return}
  const mine=list().filter(x=>x.pairId===pair.id).sort((a,b)=>
   Number(b.status==='pending')-Number(a.status==='pending')||String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const totals=counters();
  api.modal('NEXUS LINK · Propositions RITUEL',`<div class="nx-gaming-import">
   <div class="info-strip">RITUEL chiffre les propositions. Rien n’est ajouté aux modules NEXUS sans ta validation. Une modification provenant de RITUEL sera examinée comme une nouvelle révision.</div>
   <div class="nx-gaming-stats"><div><strong>${totals.pending}</strong><small>À examiner</small></div>
    <div><strong>${totals.accepted}</strong><small>Acceptées</small></div><div><strong>${totals.rejected}</strong><small>Ignorées</small></div></div>
   <div class="form-actions"><button class="btn" data-action="rituel-pull">Recevoir via LINK</button>
    <button class="btn" data-action="rituel-hub-pull">Recevoir via LINK</button>
    <button class="btn btn-neutral" data-action="rituel-show-code">Code de jumelage</button></div>
   <div class="nx-gaming-proposals">${mine.length?mine.map(x=>`<div class="nx-gaming-proposal">
    <div class="nx-gaming-proposal-head"><strong>${esc(x.payload.title)}</strong><span class="nx-proposal-state">${x.status==='pending'?'À examiner':x.status==='accepted'?'Acceptée':'Ignorée'}</span></div>
    <small>${esc(targetLabel[x.payload.destination]||'NEXUS')} · ${esc(x.payload.game||'Produit RITUEL')} · Révision ${x.revision}
    ${x.payload.date?' · '+esc(x.payload.date):''}
    ${x.payload.priceCents!=null?' · '+(x.payload.priceCents/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):''}</small>
    <div class="form-actions"><button class="btn btn-soft btn-small" data-action="rituel-review" data-id="${esc(x.id)}">${x.status==='pending'?'Examiner':'Voir / réexaminer'}</button></div>
   </div>`).join(''):'<p class="muted-note">Aucune proposition pour le moment. Lance l’envoi depuis RITUEL, puis appuie sur « Recevoir ».</p>'}</div>
   <p class="muted-note">Les propositions acceptées restent tracées dans ta sauvegarde chiffrée. Les éléments créés restent indépendants et peuvent être modifiés normalement dans NEXUS.</p>
   </div>`);
 }
 function review(id){
  const item=list().find(x=>x.id===id);if(!item)return;
  const p=item.payload,kind=p.destination,exists=item.targetId&&api.state()[kind].some(x=>x.id===item.targetId);
  const date=kind==='transactions'?(p.date||api.today()):p.date||'';
  const price=p.priceCents!=null?(p.priceCents/100).toFixed(2):'';
  const projects=api.state().projects||[];
  const chosenCategory=exists?(api.state().transactions.find(x=>x.id===item.targetId)?.category||'Shopping'):'Shopping';
  const categories=[...new Set(['Shopping','Santé','Courses','Autres',...(api.state().budgetCategories||[]).filter(x=>!x.archived&&typeof x.name==='string').map(x=>x.name)])];
  const chooser=['events','tasks','purchases','transactions'].includes(kind)?
   `<label class="field"><span>Projet NEXUS (facultatif)</span><select name="projectId">
     <option value="">Aucun</option>${projects.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('')}</select></label>`:'';
  api.modal('Examiner · '+p.title,`<div class="nx-gaming-review">
   <p class="muted-note">Destination : <strong>${esc(targetLabel[kind])}</strong> · Données proposées par RITUEL.
    ${exists?'Cette proposition mettra à jour le même élément NEXUS après confirmation.':''}</p>
   <form id="nx-gaming-approve" class="nx-gaming-approve">
    <label class="field"><span>Titre</span><input type="text" name="title" maxlength="140" required value="${esc(p.title)}"></label>
    ${kind!=='notes'?`<label class="field"><span>${kind==='transactions'?'Date réelle de paiement':'Date'}</span>
     <input type="date" name="date" ${kind==='purchases'?'':'required'} value="${esc(date)}"></label>`:''}
    ${['purchases','transactions'].includes(kind)?`<label class="field"><span>Montant (€)${kind==='purchases'?' facultatif':''}</span>
     <input type="text" name="price" inputmode="decimal" ${kind==='transactions'?'required':''} value="${esc(price)}" placeholder="Ex. 6,99"></label>`:''}
    ${chooser}
    ${kind==='transactions'?`<label class="field"><span>Catégorie du budget</span><select name="category">
      ${categories.map(name=>`<option value="${esc(name)}" ${name===chosenCategory?'selected':''}>${esc(name)}</option>`).join('')}
      </select></label>`:''}
    <label class="field"><span>Commentaire</span><textarea name="details" maxlength="1500">${esc(p.details)}</textarea></label>
    <div class="form-actions"><button type="button" class="btn btn-neutral" data-action="rituel-reject" data-id="${esc(item.id)}">Ignorer</button>
     <button type="submit" class="btn">${exists?'Confirmer la mise à jour':'Ajouter à NEXUS'}</button></div></form></div>`);
  document.getElementById('nx-gaming-approve')?.addEventListener('submit',async e=>{
   e.preventDefault();
   const f=new FormData(e.currentTarget),values=Object.fromEntries(f.entries());
   await approve(item.id,values);
  });
 }
 function cents(value){
  const t=String(value||'').trim().replace(/\s/g,'').replace(',','.');
  if(!t)return null;
  if(!/^\d+(?:\.\d{1,2})?$/.test(t))return NaN;
  const n=Math.round(Number(t)*100);
  return Number.isSafeInteger(n)&&n>=0&&n<=1e10?n:NaN;
 }
 async function approve(id,form){
  const item=list().find(x=>x.id===id);if(!item)return;
  const kind=item.payload.destination,now=new Date().toISOString();
  const title=clean(form.title,140),date=String(form.date||'');
  const price=cents(form.price),projectId=String(form.projectId||'');
  const category=clean(form.category,100);
  if(!title||kind!=='notes'&&kind!=='purchases'&&!validDate(date)||
   date&&!validDate(date)||Number.isNaN(price)||
   kind==='transactions'&&(price===null||price<=0)||
   projectId&&!api.state().projects.some(x=>x.id===projectId)){
   api.toast('Vérifie le titre, la date, le montant et le projet.');return;
  }
  const collection=api.state()[kind];
  const target=item.targetId?collection.find(x=>x.id===item.targetId):
   kind==='transactions'?collection.find(x=>x.originApp==='rituel'&&x.originSourceId===item.payload.sourceId)||
    collection.find(x=>(api.state().linkInbox||[]).some(y=>y!==item&&y.status==='accepted'&&
      y.payload?.sourceApp==='rituel'&&y.payload?.sourceId===item.payload.sourceId&&y.targetId===x.id)):null;
  if(item.targetId&&!target){
   api.toast('L’élément NEXUS lié a été supprimé. Restaure-le depuis la corbeille avant de réexaminer.');return;
  }
  const data={...target,id:target?.id||api.uid(),createdAt:target?.createdAt||now,updatedAt:now,
    title,originApp:'rituel',originSourceId:item.payload.sourceId,originLink:{pairId:item.pairId,sourceKey:item.sourceKey,revision:item.revision}};
  if(kind==='events')Object.assign(data,{start:date+'T'+item.payload.time+':00',details:clean(form.details,1500),
    location:target?.location||'',reminderMinutes:target?.reminderMinutes||[],projectId:projectId||target?.projectId||''});
  if(kind==='tasks')Object.assign(data,{dueDate:date,dueTime:item.payload.time,done:target?.done||false,
    projectId:projectId||target?.projectId||''});
  if(kind==='purchases')Object.assign(data,{status:target?.status||'planned',priority:target?.priority||1,
    projectId:projectId||target?.projectId||'',shop:target?.shop||'',priceCents:price,
    details:clean(form.details,1500),plannedDate:date||null});
  if(kind==='transactions')Object.assign(data,{type:'expense',amountCents:price,date,category:category||target?.category||'Shopping',
    projectId:projectId||target?.projectId||'',notes:clean(form.details,1500)});
  if(kind==='notes')Object.assign(data,{body:clean(form.details,1500),projectId:target?.projectId||''});
  // Mutate atomically in app memory, verify local commit before confirming approval.
  const old=target?JSON.parse(JSON.stringify(target)):null,ix=target?collection.indexOf(target):-1;
  const oldEntry=JSON.parse(JSON.stringify(item));
  if(ix>=0)collection[ix]=data;else collection.push(data);
  item.targetId=data.id;item.targetKind=kind;item.status='accepted';item.updatedAt=now;
  try{
   await persistVerified();
   api.render();api.toast(target?'Élément RITUEL mis à jour dans NEXUS.':'Proposition RITUEL ajoutée à NEXUS.');
   panel();
  }catch(err){
   if(ix>=0)collection[ix]=old;else collection.splice(collection.findIndex(x=>x.id===data.id),1);
   Object.assign(item,oldEntry);api.toast('Enregistrement refusé : '+err.message.slice(0,75));
  }
 }
 async function reject(id){
  const item=list().find(x=>x.id===id);if(!item)return;
  item.status='rejected';item.updatedAt=new Date().toISOString();
  try{await persistVerified();panel();api.toast('Proposition ignorée, sans modifier le produit RITUEL.')}
  catch(e){item.status='pending';api.toast('Enregistrement impossible.')}
 }
 function act(kind,button){
  if(kind==='rituel-proposals'){panel();return true}
  if(kind==='rituel-pull'){pull();return true}
  if(kind==='rituel-hub-pull'){receiveHub().catch(e=>api.toast("LINK : "+e.message.slice(0,90)));return true}
  if(kind==='rituel-review'){review(button.dataset.id);return true}
  if(kind==='rituel-reject'){reject(button.dataset.id);return true}
  return false;
 }
 function attach(model){api=model;initHubAuto()}
 window.NexusRituelImport=Object.freeze({attach,synchronize,panel,review,approve,act,valid,counters,receiveHub,scheduleHubReceive,initHubAuto,ingestHubEnvelope});
})();