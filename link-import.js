/* NEXUS LINK inbound Gaming proposals — explicit review, durable dedupe, no silent writes. */
'use strict';
(()=>{
 let api=null,working=false;
 const esc=x=>api.escape(String(x??''));
 const clean=(x,n)=>String(x??'').trim().slice(0,n);
 const validDate=x=>{
  if(typeof x!=='string'||!/\d{4}-\d\d-\d\d/.test(x)||x.length!==10)return false;
  const d=new Date(x+'T12:00:00Z');
  return !isNaN(d.getTime())&&d.toISOString().startsWith(x);
 };
 const targetLabel={events:'Agenda',tasks:'Rappels',purchases:'Achats',transactions:'Budget',notes:'Notes'};
 const mapping={
  installed_summary:['notes'],future_spending:['purchases'],pass_deadline:['events','tasks'],
  pass_paid:['transactions'],dlc_release:['events','purchases'],
  game_release:['events','purchases'],gaming_event:['events']
 };
 function connection(){return api?.state().linkConnections?.find(x=>x.sourceApp==='gaming')}
 function list(){return api?.state().linkInbox||[]}
 function valid(msg,pair){
  const p=msg?.payload;
  if(msg?.invalid||!p||p.type!=='gaming.proposal.v1'||p.sourceApp!=='gaming'||
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
  const pair=connection();if(!pair)throw Error('Aucun jumelage Gaming enregistré.');
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
 async function pull(){
  try{const stats=await synchronize();api.toast(stats.received+' proposition(s) reçue(s).');panel()}
  catch(e){api.toast('Réception Gaming : '+e.message.slice(0,80))}
 }
 const counters=()=>{const p=connection(),rows=list().filter(x=>x.pairId===p?.id);return {
  pending:rows.filter(x=>x.status==='pending').length,
  accepted:rows.filter(x=>x.status==='accepted').length,
  rejected:rows.filter(x=>x.status==='rejected').length};};
 function panel(){
  const pair=connection();if(!pair){api.toast('Jumelle d’abord Gaming à NEXUS.');return}
  const mine=list().filter(x=>x.pairId===pair.id).sort((a,b)=>
   Number(b.status==='pending')-Number(a.status==='pending')||String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const totals=counters();
  api.modal('NEXUS LINK · Propositions Gaming',`<div class="nx-gaming-import">
   <div class="info-strip">Gaming chiffre les propositions. Rien n’est ajouté aux modules NEXUS sans ta validation. Une modification provenant de Gaming sera examinée comme une nouvelle révision.</div>
   <div class="nx-gaming-stats"><div><strong>${totals.pending}</strong><small>À examiner</small></div>
    <div><strong>${totals.accepted}</strong><small>Acceptées</small></div><div><strong>${totals.rejected}</strong><small>Ignorées</small></div></div>
   <div class="form-actions"><button class="btn" data-action="link-pull">Recevoir depuis Gaming</button>
    <button class="btn btn-neutral" data-action="link-show-code">Code de jumelage</button></div>
   <div class="nx-gaming-proposals">${mine.length?mine.map(x=>`<div class="nx-gaming-proposal">
    <div class="nx-gaming-proposal-head"><strong>${esc(x.payload.title)}</strong><span class="nx-proposal-state">${x.status==='pending'?'À examiner':x.status==='accepted'?'Acceptée':'Ignorée'}</span></div>
    <small>${esc(targetLabel[x.payload.destination]||'NEXUS')} · ${esc(x.payload.game||'Gaming')} · Révision ${x.revision}
    ${x.payload.date?' · '+esc(x.payload.date):''}
    ${x.payload.priceCents!=null?' · '+(x.payload.priceCents/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):''}</small>
    <div class="form-actions"><button class="btn btn-soft btn-small" data-action="link-review" data-id="${esc(x.id)}">${x.status==='pending'?'Examiner':'Voir / réexaminer'}</button></div>
   </div>`).join(''):'<p class="muted-note">Aucune proposition pour le moment. Lance l’envoi depuis Gaming, puis appuie sur « Recevoir ».</p>'}</div>
   <p class="muted-note">Les propositions acceptées restent tracées dans ta sauvegarde chiffrée. Les éléments créés restent indépendants et peuvent être modifiés normalement dans NEXUS.</p>
   </div>`);
 }
 function review(id){
  const item=list().find(x=>x.id===id);if(!item)return;
  const p=item.payload,kind=p.destination,exists=item.targetId&&api.state()[kind].some(x=>x.id===item.targetId);
  const date=kind==='transactions'?(p.paymentDate||api.today()):p.date||'';
  const price=p.priceCents!=null?(p.priceCents/100).toFixed(2):'';
  const projects=api.state().projects||[];
  const chooser=['events','tasks','purchases','transactions'].includes(kind)?
   `<label class="field"><span>Projet NEXUS (facultatif)</span><select name="projectId">
     <option value="">Aucun</option>${projects.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('')}</select></label>`:'';
  api.modal('Examiner · '+p.title,`<div class="nx-gaming-review">
   <p class="muted-note">Destination : <strong>${esc(targetLabel[kind])}</strong> · Données proposées par Gaming.
    ${exists?'Cette proposition mettra à jour le même élément NEXUS après confirmation.':''}</p>
   <form id="nx-gaming-approve" class="nx-gaming-approve">
    <label class="field"><span>Titre</span><input type="text" name="title" maxlength="140" required value="${esc(p.title)}"></label>
    ${kind!=='notes'?`<label class="field"><span>${kind==='transactions'?'Date réelle de paiement':'Date'}</span>
     <input type="date" name="date" ${kind==='purchases'?'':'required'} value="${esc(date)}"></label>`:''}
    ${['purchases','transactions'].includes(kind)?`<label class="field"><span>Montant (€)${kind==='purchases'?' facultatif':''}</span>
     <input type="text" name="price" inputmode="decimal" ${kind==='transactions'?'required':''} value="${esc(price)}" placeholder="Ex. 6,99"></label>`:''}
    ${chooser}
    <label class="field"><span>Commentaire</span><textarea name="details" maxlength="1500">${esc(p.details)}</textarea></label>
    <div class="form-actions"><button type="button" class="btn btn-neutral" data-action="link-reject" data-id="${esc(item.id)}">Ignorer</button>
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
  if(!title||kind!=='notes'&&kind!=='purchases'&&!validDate(date)||
   date&&!validDate(date)||Number.isNaN(price)||
   kind==='transactions'&&(price===null||price<=0)||
   projectId&&!api.state().projects.some(x=>x.id===projectId)){
   api.toast('Vérifie le titre, la date, le montant et le projet.');return;
  }
  const collection=api.state()[kind];
  const target=item.targetId?collection.find(x=>x.id===item.targetId):
   kind==='transactions'?collection.find(x=>x.originApp==='gaming'&&x.originSourceId===item.payload.sourceId)||
    collection.find(x=>(api.state().linkInbox||[]).some(y=>y!==item&&y.status==='accepted'&&
      y.payload?.sourceApp==='gaming'&&y.payload?.sourceId===item.payload.sourceId&&y.targetId===x.id)):null;
  if(item.targetId&&!target){
   api.toast('L’élément NEXUS lié a été supprimé. Restaure-le depuis la corbeille avant de réexaminer.');return;
  }
  const data={...target,id:target?.id||api.uid(),createdAt:target?.createdAt||now,updatedAt:now,
    title,originApp:'gaming',originSourceId:item.payload.sourceId,originLink:{pairId:item.pairId,sourceKey:item.sourceKey,revision:item.revision}};
  if(kind==='events')Object.assign(data,{start:date+'T'+item.payload.time+':00',details:clean(form.details,1500),
    location:target?.location||'',reminderMinutes:target?.reminderMinutes||[],projectId:projectId||target?.projectId||''});
  if(kind==='tasks')Object.assign(data,{dueDate:date,dueTime:item.payload.time,done:target?.done||false,
    projectId:projectId||target?.projectId||''});
  if(kind==='purchases')Object.assign(data,{status:target?.status||'planned',priority:target?.priority||1,
    projectId:projectId||target?.projectId||'',shop:target?.shop||'',priceCents:price,
    details:clean(form.details,1500),plannedDate:date||null});
  if(kind==='transactions')Object.assign(data,{type:'expense',amountCents:price,date,category:target?.category||'Loisirs',
    projectId:projectId||target?.projectId||'',notes:clean(form.details,1500)});
  if(kind==='notes')Object.assign(data,{body:clean(form.details,1500),projectId:target?.projectId||''});
  // Mutate atomically in app memory, verify local commit before confirming approval.
  const old=target?JSON.parse(JSON.stringify(target)):null,ix=target?collection.indexOf(target):-1;
  const oldEntry=JSON.parse(JSON.stringify(item));
  if(ix>=0)collection[ix]=data;else collection.push(data);
  item.targetId=data.id;item.targetKind=kind;item.status='accepted';item.updatedAt=now;
  try{
   await persistVerified();
   api.render();api.toast(target?'Élément Gaming mis à jour dans NEXUS.':'Proposition Gaming ajoutée à NEXUS.');
   panel();
  }catch(err){
   if(ix>=0)collection[ix]=old;else collection.splice(collection.findIndex(x=>x.id===data.id),1);
   Object.assign(item,oldEntry);api.toast('Enregistrement refusé : '+err.message.slice(0,75));
  }
 }
 async function reject(id){
  const item=list().find(x=>x.id===id);if(!item)return;
  item.status='rejected';item.updatedAt=new Date().toISOString();
  try{await persistVerified();panel();api.toast('Proposition ignorée, sans supprimer le jeu Gaming.')}
  catch(e){item.status='pending';api.toast('Enregistrement impossible.')}
 }
 function act(kind,button){
  if(kind==='link-proposals'){panel();return true}
  if(kind==='link-pull'){pull();return true}
  if(kind==='link-review'){review(button.dataset.id);return true}
  if(kind==='link-reject'){reject(button.dataset.id);return true}
  return false;
 }
 function attach(model){api=model}
 window.NexusGamingImport=Object.freeze({attach,synchronize,panel,review,approve,act,valid,counters});
})();