(function budget020(){
'use strict';
(() => {
 const validDate=value=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const d=new Date(value+'T12:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
 };
 const safeCents=value=>Number.isSafeInteger(value)&&value>=0&&value<=100000000000;
 const safe=val=>escapeHtml(String(val??''));
 const fmt=value=>money(Number(value)||0);
 const today=()=>dateKey(new Date());
 const dateLabel=value=>validDate(value)?formatDate(value,{day:'numeric',month:'short',year:'numeric'}):'À préciser';
 const nowISO=()=>new Date().toISOString();
 const panelTitle=(title,sub,action='')=>`<div class="b20-heading"><div><h2>${title}</h2><p>${sub}</p></div>${action}</div>`;
 const field=(label,name,value='',attributes='')=>`<label class="b8-field">${label}<input name="${name}" value="${safe(value)}" ${attributes}></label>`;
 const checked=flag=>flag?'checked':'';
 const pendingRules=kind=>data.recurrences.filter(r=>r.commitmentKind===kind);
 const byTitle=(a,b)=>String(a.title||'').localeCompare(String(b.title||''),'fr');
 function periodEndDate(firstDate,installments){
  if(!validDate(firstDate)||!Number.isSafeInteger(installments)||installments<1||installments>600)return '';
  const [y,m]=firstDate.split('-').map(Number);
  // Last calendar day of final installment's month; preserves end-of-month recurrence clamping.
  return dateKey(new Date(y,m-1+installments,0,12));
 }
 function commitmentMonthlyEquivalent(rule){
  const amount=safeCents(rule?.amountCents)?rule.amountCents:0;
  return rule?.frequency==='yearly'?Math.round(amount/12):amount;
 }
 function loanProgress(rule,transactions){
  const count=Number.isInteger(rule?.loanInstallments)?Math.max(0,Math.min(600,rule.loanInstallments)):0;
  const confirmed=new Set((transactions||[]).filter(t=>t.recurrenceId===rule?.id&&
   t.type==='expense'&&typeof t.occurrenceKey==='string'&&/^\d{4}-\d{2}$/.test(t.occurrenceKey))
   .map(t=>t.occurrenceKey));
  const done=Math.min(count,confirmed.size);
  const remaining=count-done;
  return {total:count,done,remaining,remainingScheduledCents:remaining*(safeCents(rule?.amountCents)?rule.amountCents:0)};
 }
 function goalBalance(goal){
  const initial=safeCents(goal?.startingCents)?goal.startingCents:0;
  return (Array.isArray(goal?.contributions)?goal.contributions:[]).reduce((sum,x)=>{
   if(!safeCents(x?.amountCents)||x.amountCents===0)return sum;
   return sum+(x.direction==='withdraw'?-x.amountCents:x.direction==='deposit'?x.amountCents:0);
  },initial);
 }
 function goalProgress(goal){
  const target=safeCents(goal?.targetCents)?goal.targetCents:0;
  const balance=goalBalance(goal);
  return {target,balance,remaining:Math.max(0,target-balance),percent:target>0?Math.max(0,Math.min(100,Math.round(balance/target*100))):0,
   complete:target>0&&balance>=target};
 }
 function nextDue(rule){
  const reference=new Date();const current=new Date(reference.getFullYear(),reference.getMonth(),1,12);
  for(let i=0;i<25;i++){
   const date=new Date(current.getFullYear(),current.getMonth()+i,1,12);
   const key=dateKey(date).slice(0,7);
   const result=window.NexusBudget?.occurrences?.(rule,key)||[];
   const upcoming=result.filter(o=>o.date>=today()&&!o.skipped).sort((a,b)=>a.date.localeCompare(b.date));
   if(upcoming.length)return upcoming[0].date;
  }
  return '';
 }
 function subscriptionRow(r){
  const monthly=commitmentMonthlyEquivalent(r),next=r.active?nextDue(r):'';
  return `<article class="b20-item">
   <div class="b20-item-icon">${svg('refresh')}</div>
   <div class="b20-item-main"><div class="b20-item-title"><strong>${safe(r.title)}</strong><span class="b20-status ${r.active?'':'paused'}">${r.active?'Actif':'En pause'}</span></div>
    <small>${r.frequency==='yearly'?'Annuel':'Mensuel'} · ${r.active&&next?'Prochain : '+dateLabel(next):r.active?'Échéance terminée ou non définie':'Prévision suspendue'}</small>
    ${r.serviceUrl?`<a class="b20-link" href="${safe(r.serviceUrl)}" target="_blank" rel="noopener noreferrer">Voir le service ${svg('arrow')}</a>`:''}
   </div>
   <div class="b20-amount"><strong>${fmt(r.amountCents)}</strong><small>${r.frequency==='yearly'?fmt(monthly)+'/mois estimés':'par mois'}</small></div>
   <button type="button" class="b20-edit" data-action="b20-sub-edit" data-id="${safe(r.id)}" aria-label="Modifier ${safe(r.title)}">${svg('edit')}</button>
  </article>`;
 }
 function loanRow(r){
  const p=loanProgress(r,data.transactions);
  const next=r.active?nextDue(r):'';
  const percent=p.total?Math.round(p.done/p.total*100):0;
  return `<article class="b20-loan">
   <div class="b20-loan-top"><div><strong>${safe(r.title)}</strong><small>${r.active?'Échéancier actif':'Échéancier suspendu'}${r.loanPrincipalCents?' · Montant financé déclaré : '+fmt(r.loanPrincipalCents):''}</small></div>
    <button type="button" class="b20-edit" data-action="b20-loan-edit" data-id="${safe(r.id)}" aria-label="Modifier ${safe(r.title)}">${svg('edit')}</button></div>
   <div class="b20-loan-stats"><div><span>Mensualité prévue</span><strong>${fmt(r.amountCents)}</strong></div><div><span>Échéances confirmées</span><strong>${p.done}/${p.total}</strong></div>
    <div><span>Reste à confirmer *</span><strong>${fmt(p.remainingScheduledCents)}</strong></div></div>
   <div class="b20-track"><i style="width:${percent}%"></i></div>
   <small class="b20-muted">${next?'Prochaine échéance : '+dateLabel(next):'Pas de prochaine échéance active'} · ${p.remaining} mensualité(s) non confirmée(s)</small>
  </article>`;
 }
 function commitmentsView(recurrencesHtml=''){
  const subs=pendingRules('subscription').sort(byTitle);
  const loans=pendingRules('loan').sort(byTitle);
  const active=subs.filter(r=>r.active).reduce((sum,r)=>sum+commitmentMonthlyEquivalent(r),0);
  const totalLoan=loans.filter(r=>r.active).reduce((sum,r)=>sum+r.amountCents,0);
  return `<div class="b20-wrap">
    <div class="b20-summary"><div><span>Abonnements actifs, équivalent mensuel</span><strong>${fmt(active)}</strong></div>
    <div><span>Mensualités de prêts actives</span><strong>${fmt(totalLoan)}</strong></div></div>
    <section class="b8-panel b20-panel">
      ${panelTitle('Mes abonnements','Échéances prévues, regroupées sans double comptabilisation.',
       `<button class="btn btn-small" data-action="b20-sub-new">${svg('plus')} Abonnement</button>`)}
      <div class="b20-list">${subs.length?subs.map(subscriptionRow).join(''):`<div class="b20-blank">${svg('refresh')}<strong>Aucun abonnement enregistré</strong><p>Ajoute tes services mensuels ou annuels.</p></div>`}</div>
    </section>
    <section class="b8-panel b20-panel">
      ${panelTitle('Prêts et crédits','Mensualités prévues, durée du contrat et échéances confirmées.',
       `<button class="btn btn-small" data-action="b20-loan-new">${svg('plus')} Prêt</button>`)}
      <div class="b20-loan-grid">${loans.length?loans.map(loanRow).join(''):`<div class="b20-blank">${svg('wallet')}<strong>Aucun prêt enregistré</strong><p>Renseigne une mensualité et une durée : NEXUS prépare l’échéancier.</p></div>`}</div>
      <p class="b8-disclaimer">* Le reste à confirmer correspond aux mensualités prévues non enregistrées dans NEXUS. Ce n'est ni le capital restant dû ni un relevé bancaire. Les intérêts éventuels sont inclus uniquement si tu les as intégrés dans la mensualité.</p>
    </section>
    <div class="b20-legacy">${recurrencesHtml}</div>
  </div>`;
 }
 function goalCard(goal){
  const p=goalProgress(goal);
  const late=validDate(goal.targetDate)&&goal.targetDate<today()&&!p.complete;
  const months=validDate(goal.targetDate)?Math.max(1,(Number(goal.targetDate.slice(0,4))-new Date().getFullYear())*12+
   Number(goal.targetDate.slice(5,7))-(new Date().getMonth()+1)+1):0;
  const pace=months&&p.remaining?Math.ceil(p.remaining/months):0;
  const project=data.projects.find(x=>x.id===goal.projectId);
  return `<article class="b20-goal">
   <div class="b20-goal-top"><span class="b20-goal-label">${goal.paused?'EN PAUSE':p.complete?'OBJECTIF ATTEINT':'EN COURS'}</span>
    <button type="button" class="b20-edit" data-action="b20-goal-edit" data-id="${safe(goal.id)}" aria-label="Modifier ${safe(goal.title)}">${svg('edit')}</button></div>
   <strong class="b20-goal-name">${safe(goal.title)}</strong>
   <div class="b20-goal-sums"><strong>${fmt(p.balance)}</strong><span>sur ${fmt(p.target)}</span></div>
   <div class="b20-track"><i style="width:${p.percent}%"></i></div>
   <div class="b20-goal-foot"><span>${p.percent}% · ${fmt(p.remaining)} à réunir</span><strong>${p.complete?'Terminé':validDate(goal.targetDate)?(late?'Échéance dépassée':'Cible '+dateLabel(goal.targetDate)):'Sans échéance'}</strong></div>
   ${project?`<span class="b20-goal-project">${svg('briefcase')} ${safe(project.title)}</span>`:''}
   ${pace&&!late&&!p.complete?`<p class="b20-goal-hint">Repère indicatif : environ ${fmt(pace)} à mettre de côté par mois jusqu’à la date cible.</p>`:''}
   <div class="b20-goal-actions"><button class="btn btn-soft btn-small" type="button" data-action="b20-goal-contribution" data-id="${safe(goal.id)}">+ Versement / retrait</button>
   <button class="btn btn-neutral btn-small" type="button" data-action="b20-goal-history" data-id="${safe(goal.id)}">Historique</button></div>
  </article>`;
 }
 let goalFilter='all';
 function goalsView(){
  const all=data.savingsGoals||[];
  const shown=all.filter(g=>goalFilter==='all'||goalFilter==='paused'&&g.paused||
    goalFilter==='completed'&&!g.paused&&goalProgress(g).complete||
    goalFilter==='active'&&!g.paused&&!goalProgress(g).complete);
  const tracked=all.filter(g=>!g.paused);
  const total=tracked.reduce((sum,g)=>sum+goalProgress(g).balance,0);
  const targets=tracked.reduce((sum,g)=>sum+goalProgress(g).target,0);
  return `<div class="b20-wrap">
   <section class="b20-goals-intro"><div><span class="b20-eyebrow">FINANCER MES ENVIES</span><h2>Mes objectifs</h2>
   <p>Prépare tes projets et suis ce que tu as réellement mis de côté, à ton rythme.</p></div>
   <button class="btn" data-action="b20-goal-new">${svg('plus')} Objectif</button></section>
   <div class="b20-summary"><div><span>Montant suivi dans les objectifs actifs</span><strong>${fmt(total)}</strong></div>
    <div><span>Cibles des objectifs actifs</span><strong>${fmt(targets)}</strong></div></div>
   <div class="b20-filters">${[['all','Tous'],['active','En cours'],['completed','Atteints'],['paused','En pause']]
    .map(([id,label])=>`<button type="button" data-action="b20-goal-filter" data-filter="${id}" class="${goalFilter===id?'active':''}">${label}</button>`).join('')}</div>
   <div class="b20-goal-grid">${shown.length?shown.map(goalCard).join(''):`<div class="b20-blank">${svg('star')}<strong>${all.length?'Aucun objectif dans ce filtre':'Ton prochain projet commence ici'}</strong><p>Ajoute un objectif d’épargne et associe-le à un projet si tu veux.</p></div>`}</div>
   <p class="b8-disclaimer">Les sommes mises de côté sont déclarées manuellement. Elles n'ajoutent aucune transaction au Journal, ne retirent rien du budget et ne représentent pas un solde bancaire vérifié.</p>
  </div>`;
 }
 function httpsURL(raw){
  const val=String(raw||'').trim();
  if(!val)return '';
  try{const u=new URL(val);return u.protocol==='https:'&&!u.username&&!u.password&&val.length<=400?u.href:'';}catch{return '';}
 }
 function projectField(projectId=''){
  const items=(data.projects||[]).slice().sort(byTitle);
  return `<label class="b8-field">Projet lié (facultatif)<select name="projectId"><option value="">Aucun</option>
   ${items.map(p=>`<option value="${safe(p.id)}" ${p.id===projectId?'selected':''}>${safe(p.title)}</option>`).join('')}
   </select></label>`;
 }
 function subscriptionForm(rule={}){
  const editing=!!rule.id;
  const first=validDate(rule.startDate)?rule.startDate:dateKey(new Date());
  const content=`<form id="b20-sub-form" class="b8-form">
    ${field('Nom du service','title',rule.title||'','maxlength="130" placeholder="Ex. Stockage iCloud" required')}
    <div class="b8-form-grid">${field('Prix payé par échéance (€)','amount',Number.isInteger(rule.amountCents)?String(rule.amountCents/100):'','inputmode="decimal" required')}
     <label class="b8-field">Fréquence<select name="frequency"><option value="monthly" ${rule.frequency!=='yearly'?'selected':''}>Mensuelle</option>
      <option value="yearly" ${rule.frequency==='yearly'?'selected':''}>Annuelle</option></select></label></div>
    <div class="b8-form-grid">${field('Première échéance','firstDate',first,'type="date" required')}
     ${field('Date de fin (facultative)','endDate',rule.endDate||'','type="date"')}</div>
    ${field('Lien du service (facultatif)','serviceUrl',rule.serviceUrl||'','type="url" maxlength="400" placeholder="https://..."')}
    ${projectField(rule.projectId||'')}
    <label class="b8-field">Notes<textarea name="notes" maxlength="800" rows="2">${safe(rule.notes||'')}</textarea></label>
    <label class="b8-checkbox"><input name="active" type="checkbox" ${checked(rule.active!==false)}> Abonnement actif</label>
    <p class="b8-form-note">Une seule règle de récurrence est créée. Chaque échéance devra être confirmée dans NEXUS avant d’apparaître dans tes dépenses réelles. Modifier l’abonnement ne modifie jamais tes transactions passées.</p>
    <div class="form-actions">${editing?`<button type="button" class="btn btn-danger btn-small" data-action="b20-rule-delete" data-id="${safe(rule.id)}">Supprimer</button>`:''}
    <button type="button" class="btn btn-neutral" data-action="close-modal">Annuler</button>
    <button type="submit" class="btn">${svg('check')} Enregistrer</button></div></form>`;
  modal(editing?'Modifier un abonnement':'Nouvel abonnement',content);
  const form=document.getElementById('b20-sub-form');
  form?.addEventListener('submit',async evt=>{
   evt.preventDefault();if(!form.reportValidity())return;
   const v=Object.fromEntries(new FormData(form).entries());
   const title=String(v.title||'').trim(),amount=toCents(v.amount);
   const date=String(v.firstDate||''),end=String(v.endDate||''),url=String(v.serviceUrl||'').trim();
   if(!title||title.length>130||!safeCents(amount)||amount<=0||!validDate(date)||
     end&&(!validDate(end)||end<date)||!['monthly','yearly'].includes(v.frequency)||
     url&&!httpsURL(url)||(v.projectId&&!data.projects.some(p=>p.id===v.projectId))){
    toast('Vérifie le montant, les dates, le lien et le projet.');return;
   }
   if(editing&&(rule.frequency!==v.frequency||rule.startDate!==date)&&
     data.transactions.some(t=>t.recurrenceId===rule.id)&&
     !confirm('Modifier le calendrier d’un abonnement déjà utilisé ? Les dépenses enregistrées resteront intactes.'))return;
   const now=nowISO(),parts=date.split('-').map(Number);
   const updated={...rule,id:rule.id||uid(),title,amountCents:amount,type:'expense',frequency:v.frequency,
    startDate:date,endDate:end,day:parts[2],month:parts[1],weekday:1,category:rule.category||'Abonnements',
    projectId:v.projectId||'',commitmentKind:'subscription',serviceUrl:httpsURL(url),
    notes:String(v.notes||'').slice(0,800),active:v.active==='on',
    skips:Array.isArray(rule.skips)?rule.skips:[],createdAt:rule.createdAt||now,updatedAt:now};
   const index=data.recurrences.findIndex(r=>r.id===updated.id);
   if(index<0)data.recurrences.push(updated);else data.recurrences[index]=updated;
   await persist();closeModal();render();toast('Abonnement enregistré.');
  });
 }
 function loanForm(rule={}){
  const editing=!!rule.id,first=validDate(rule.startDate)?rule.startDate:dateKey(new Date());
  modal(editing?'Modifier un prêt':'Nouveau prêt',`<form id="b20-loan-form" class="b8-form">
    ${field('Nom du prêt','title',rule.title||'','maxlength="130" placeholder="Ex. Prêt auto" required')}
    <div class="b8-form-grid">${field('Mensualité prévue (€)','amount',Number.isInteger(rule.amountCents)?String(rule.amountCents/100):'','inputmode="decimal" required')}
    ${field('Nombre de mensualités','installments',rule.loanInstallments||12,'type="number" min="1" max="600" step="1" required')}</div>
    <div class="b8-form-grid">${field('Première échéance','firstDate',first,'type="date" required')}
    ${field('Montant initial financé (€), facultatif','principal',Number.isInteger(rule.loanPrincipalCents)?String(rule.loanPrincipalCents/100):'','inputmode="decimal"')}</div>
    <label class="b8-field">Catégorie<select name="category">${window.NexusBudget?.categoryOptions?.(rule.category||'Autres',!!rule.id)||'<option>Autres</option>'}</select></label>
    ${projectField(rule.projectId||'')}
    <label class="b8-field">Notes<textarea name="notes" maxlength="800" rows="2">${safe(rule.notes||'')}</textarea></label>
    <label class="b8-checkbox"><input type="checkbox" name="active" ${checked(rule.active!==false)}> Échéancier actif</label>
    <p class="b8-form-note">Le nombre de mensualités définit la durée du calendrier, sans calcul d'intérêts ni déduction automatique d'un capital restant dû. Seuls les paiements confirmés alimentent le Journal.</p>
    <div class="form-actions">${editing?`<button type="button" class="btn btn-danger btn-small" data-action="b20-rule-delete" data-id="${safe(rule.id)}">Supprimer</button>`:''}
    <button type="button" class="btn btn-neutral" data-action="close-modal">Annuler</button>
    <button type="submit" class="btn">${svg('check')} Enregistrer</button></div></form>`);
  const form=document.getElementById('b20-loan-form');
  form?.addEventListener('submit',async evt=>{
   evt.preventDefault();if(!form.reportValidity())return;
   const v=Object.fromEntries(new FormData(form).entries());
   const amount=toCents(v.amount),principal=String(v.principal||'').trim()?toCents(v.principal):null;
   const installments=Number(v.installments),date=String(v.firstDate||''),title=String(v.title||'').trim();
   if(!title||title.length>130||!safeCents(amount)||amount<=0||!Number.isSafeInteger(installments)||installments<1||installments>600||
      !validDate(date)||principal!==null&&!safeCents(principal)||(v.projectId&&!data.projects.some(p=>p.id===v.projectId))){
      toast('Vérifie la mensualité, la durée, la date et le montant initial.');return;
   }
   if(editing&&(rule.startDate!==date||rule.loanInstallments!==installments)&&
      data.transactions.some(t=>t.recurrenceId===rule.id)&&
      !confirm('Modifier la durée ou la première date d’un prêt ayant des échéances enregistrées ? Les paiements déjà confirmés resteront intacts.'))return;
   const now=nowISO(),parts=date.split('-').map(Number);
   const updated={...rule,id:rule.id||uid(),title,type:'expense',amountCents:amount,frequency:'monthly',
     day:parts[2],month:parts[1],weekday:1,startDate:date,endDate:periodEndDate(date,installments),
     commitmentKind:'loan',loanInstallments:installments,loanPrincipalCents:principal,
     category:v.category||'Autres',projectId:v.projectId||'',notes:String(v.notes||'').slice(0,800),
     active:v.active==='on',skips:Array.isArray(rule.skips)?rule.skips:[],
     createdAt:rule.createdAt||now,updatedAt:now};
   const index=data.recurrences.findIndex(x=>x.id===updated.id);
   if(index<0)data.recurrences.push(updated);else data.recurrences[index]=updated;
   await persist();closeModal();render();toast('Échéancier de prêt enregistré.');
  });
 }
 function goalForm(goal={}){
  const editing=!!goal.id;
  modal(editing?'Modifier un objectif':'Nouvel objectif d’épargne',`<form id="b20-goal-form" class="b8-form">
   ${field('Objectif','title',goal.title||'','maxlength="130" placeholder="Ex. Week-end à Rome" required')}
   <div class="b8-form-grid">${field('Somme visée (€)','target',Number.isInteger(goal.targetCents)?String(goal.targetCents/100):'','inputmode="decimal" required')}
   ${field('Déjà mis de côté avant NEXUS (€)','starting',Number.isInteger(goal.startingCents)?String(goal.startingCents/100):'0','inputmode="decimal" required')}</div>
   ${field('Date cible (facultative)','targetDate',goal.targetDate||'','type="date"')}
   ${projectField(goal.projectId||'')}
   <label class="b8-field">Notes<textarea name="notes" maxlength="800" rows="2">${safe(goal.notes||'')}</textarea></label>
   <label class="b8-checkbox"><input name="paused" type="checkbox" ${checked(goal.paused)}> Objectif en pause</label>
   <p class="b8-form-note">Les versements/retraits seront enregistrés dans l’historique de cet objectif. Ils ne créent pas de dépenses bancaires dans le Journal.</p>
   <div class="form-actions">${editing?`<button type="button" class="btn btn-danger btn-small" data-action="b20-goal-delete" data-id="${safe(goal.id)}">Supprimer</button>`:''}
   <button type="button" class="btn btn-neutral" data-action="close-modal">Annuler</button>
   <button type="submit" class="btn">${svg('check')} Enregistrer</button></div></form>`);
  const form=document.getElementById('b20-goal-form');
  form?.addEventListener('submit',async evt=>{
   evt.preventDefault();if(!form.reportValidity())return;
   const v=Object.fromEntries(new FormData(form).entries()),target=toCents(v.target),starting=toCents(v.starting);
   const title=String(v.title||'').trim(),targetDate=String(v.targetDate||'');
   if(!title||title.length>130||!safeCents(target)||target<=0||!safeCents(starting)||
      targetDate&&!validDate(targetDate)||v.projectId&&!data.projects.some(p=>p.id===v.projectId)){
    toast('Vérifie l’objectif, le montant et la date cible.');return;
   }
   const current=(goal.contributions||[]).reduce((sum,x)=>sum+(x.direction==='deposit'?x.amountCents:-x.amountCents),0);
   if(starting+current<0){toast('Le montant initial ne peut pas rendre l’historique négatif.');return;}
   const now=nowISO();
   const next={...goal,id:goal.id||uid(),title,targetCents:target,startingCents:starting,targetDate,
    projectId:v.projectId||'',notes:String(v.notes||'').slice(0,800),paused:v.paused==='on',
    contributions:Array.isArray(goal.contributions)?goal.contributions:[],createdAt:goal.createdAt||now,updatedAt:now};
   const index=data.savingsGoals.findIndex(x=>x.id===next.id);
   if(index>=0)data.savingsGoals[index]=next;else data.savingsGoals.push(next);
   await persist();closeModal();render();toast('Objectif enregistré.');
  });
 }
 function contributionForm(id){
  const goal=data.savingsGoals.find(x=>x.id===id);if(!goal)return;
  modal('Versement / retrait · '+goal.title,`<form id="b20-contribution-form" class="b8-form">
   <p class="b8-form-note">Montant actuellement suivi : <strong>${fmt(goalBalance(goal))}</strong>. Cette opération concerne uniquement ton objectif d’épargne et n’affecte pas le Journal.</p>
   <label class="b8-field">Opération<select name="direction"><option value="deposit">Argent mis de côté</option>
    <option value="withdraw">Argent retiré de cet objectif</option></select></label>
   <div class="b8-form-grid">${field('Montant (€)','amount','','inputmode="decimal" required')}
    ${field('Date réelle','date',today(),'type="date" required max="'+today()+'"')}</div>
   ${field('Note (facultative)','note','','maxlength="160"')}
   <div class="form-actions"><button type="button" class="btn btn-neutral" data-action="close-modal">Annuler</button>
   <button class="btn" type="submit">${svg('check')} Enregistrer</button></div></form>`);
  const form=document.getElementById('b20-contribution-form');
  form?.addEventListener('submit',async evt=>{
   evt.preventDefault();if(!form.reportValidity())return;
   const v=Object.fromEntries(new FormData(form).entries()),amount=toCents(v.amount),day=String(v.date||'');
   if(!safeCents(amount)||amount<=0||!validDate(day)||day>today()||!['deposit','withdraw'].includes(v.direction)){
    toast('Vérifie le montant, le type d’opération et la date.');return;
   }
   if(v.direction==='withdraw'&&goalBalance(goal)<amount){toast('Ce retrait dépasserait le montant disponible dans cet objectif.');return;}
   const now=nowISO(),entry={id:uid(),amountCents:amount,direction:v.direction,date:day,note:String(v.note||'').slice(0,160),createdAt:now};
   if(!Array.isArray(goal.contributions))goal.contributions=[];
   goal.contributions.push(entry);goal.updatedAt=now;
   await persist();closeModal();render();toast('Progression d’épargne mise à jour.');
  });
 }
 function history(id){
  const goal=data.savingsGoals.find(g=>g.id===id);if(!goal)return;
  const p=goalProgress(goal),rows=[...(goal.contributions||[])].sort((a,b)=>b.date.localeCompare(a.date));
  modal('Historique · '+goal.title,`<div class="b20-history">
    <div class="b20-summary"><div><span>Somme suivie</span><strong>${fmt(p.balance)}</strong></div><div><span>Objectif</span><strong>${fmt(p.target)}</strong></div></div>
    <p class="muted-note">Montant initial déclaré : ${fmt(goal.startingCents)}. Les opérations ci-dessous ne sont pas des transactions du Journal.</p>
    ${rows.length?rows.map(e=>`<div class="b20-history-row">
    <span><strong>${e.direction==='deposit'?'Versement':'Retrait'}</strong><small>${dateLabel(e.date)}${e.note?' · '+safe(e.note):''}</small></span>
    <strong>${e.direction==='deposit'?'+':'−'}${fmt(e.amountCents)}</strong>
    <button class="b20-edit" data-action="b20-goal-entry-delete" data-id="${safe(goal.id)}" data-entry="${safe(e.id)}" aria-label="Annuler ce mouvement">${svg('trash')}</button>
    </div>`).join(''):'<p class="muted-note">Aucun mouvement pour le moment.</p>'}
    <div class="form-actions"><button class="btn btn-neutral" data-action="close-modal">Fermer</button>
    <button class="btn" data-action="b20-goal-contribution" data-id="${safe(goal.id)}">Ajouter un mouvement</button></div></div>`);
 }
 async function removeContribution(goalId,entryId){
  const g=data.savingsGoals.find(x=>x.id===goalId),e=g?.contributions?.find(x=>x.id===entryId);
  if(!e)return;
  if(!confirm('Supprimer ce mouvement d’épargne ? L’historique et le total seront recalculés.'))return;
  const after={...g,contributions:g.contributions.filter(x=>x.id!==entryId)};
  if(goalBalance(after)<0){toast('Suppression impossible : solde de l’objectif négatif.');return;}
  g.contributions=after.contributions;g.updatedAt=nowISO();
  await persist();history(goalId);render();toast('Mouvement supprimé.');
 }
 function act(kind,button){
  const id=button?.dataset?.id;
  if(kind==='b20-sub-new'){subscriptionForm();return true;}
  if(kind==='b20-sub-edit'){const r=data.recurrences.find(x=>x.id===id&&x.commitmentKind==='subscription');if(r)subscriptionForm(r);return true;}
  if(kind==='b20-loan-new'){loanForm();return true;}
  if(kind==='b20-loan-edit'){const r=data.recurrences.find(x=>x.id===id&&x.commitmentKind==='loan');if(r)loanForm(r);return true;}
  if(kind==='b20-rule-delete'){if(data.recurrences.some(x=>x.id===id&&['subscription','loan'].includes(x.commitmentKind)))window.NexusRecycle?.remove?.('recurrences',id);return true;}
  if(kind==='b20-goal-new'){goalForm();return true;}
  if(kind==='b20-goal-edit'){const g=data.savingsGoals.find(x=>x.id===id);if(g)goalForm(g);return true;}
  if(kind==='b20-goal-contribution'){contributionForm(id);return true;}
  if(kind==='b20-goal-history'){history(id);return true;}
  if(kind==='b20-goal-entry-delete'){void removeContribution(id,button?.dataset?.entry);return true;}
  if(kind==='b20-goal-delete'){window.NexusRecycle?.remove?.('savingsGoals',id);return true;}
  if(kind==='b20-goal-filter'){goalFilter=['all','active','completed','paused'].includes(button?.dataset?.filter)?button.dataset.filter:'all';render();return true;}
  return false;
 }
 window.NexusBudget20=Object.freeze({commitmentsView,goalsView,act,periodEndDate,loanProgress,goalBalance,goalProgress,commitmentMonthlyEquivalent,validDate});
})();
})();
