/* NEXUS local finance: no banking network calls. */
(function budgetFinanceV02110(){
'use strict';
const esc=x=>escapeHtml(String(x??''));
const eur=x=>money(Number(x)||0);
const dateOK=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
const cents=x=>{
 const s=String(x??'').trim().replace(/[\s\u00a0\u202f€]/g,'').replace(',','.');
 if(!/^\d+(?:\.\d{1,2})?$/.test(s))return null;
 const [whole,part='']=s.split('.'),n=Number(whole)*100+Number(part.padEnd(2,'0'));
 return Number.isSafeInteger(n)&&n>=0&&n<=100000000000?n:null;
};
const input=x=>Number.isSafeInteger(x)?String(x/100):'';
const monthPlus=(month,offset)=>dateKey(new Date(Number(month.slice(0,4)),Number(month.slice(5,7))-1+offset,1,12)).slice(0,7);
const nextMonth=date=>monthPlus(date.slice(0,7),1);
const monthDiff=(start,end)=>(Number(end.slice(0,4))-Number(start.slice(0,4)))*12+Number(end.slice(5,7))-Number(start.slice(5,7));
const endOfMonth=month=>dateKey(new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0,12));
const latest=rule=>(Array.isArray(rule?.loanScheduleRevisions)?rule.loanScheduleRevisions:[]).at(-1)||null;
function scheduledAmount(rule,month){
 if(rule?.commitmentKind!=='loan')return rule?.amountCents||0;
 const plan=[...(rule.loanScheduleRevisions||[])].reverse().find(x=>x.effectiveMonth<=month);
 if(!plan)return rule.amountCents||0;
 const i=monthDiff(plan.effectiveMonth,month);
 if(i<0||i>=plan.months)return 0;
 return i===plan.months-1?plan.lastCents:plan.monthlyCents;
}
function scheduledTotal(rule,transactions){
 const plan=latest(rule);if(!plan)return null;
 const paid=new Set((transactions||[]).filter(t=>t.recurrenceId===rule.id&&t.type==='expense'&&/^\d{4}-\d{2}$/.test(t.occurrenceKey||'')).map(t=>t.occurrenceKey));
 let done=0,remaining=0,remainingScheduledCents=0;
 for(let i=0;i<plan.months;i++){
  const month=monthPlus(plan.effectiveMonth,i),amount=i===plan.months-1?plan.lastCents:plan.monthlyCents;
  if(paid.has(month))done++;else{remaining++;remainingScheduledCents+=amount;}
 }
 return {total:plan.months,done,remaining,remainingScheduledCents};
}
function calculate({principalCents,extraCents,aprPercent,mode,months,paymentCents}){
 if(!Number.isSafeInteger(principalCents)||principalCents<=0||!Number.isSafeInteger(extraCents)||extraCents<=0||
  extraCents>principalCents||!Number.isFinite(aprPercent)||aprPercent<0||aprPercent>100||
  !['reduce-payment','reduce-term'].includes(mode))return null;
 const balance=principalCents-extraCents,rate=aprPercent/1200;
 if(balance===0)return {balanceCents:0,months:0,monthlyCents:0,lastCents:0,totalScheduledCents:0};
 if(mode==='reduce-payment'&&(!Number.isInteger(months)||months<1||months>600))return null;
 if(mode==='reduce-term'&&(!Number.isSafeInteger(paymentCents)||paymentCents<=0))return null;
 let payment=paymentCents;
 if(mode==='reduce-payment'){
  // Theoretical annuity formulas alone can leave a few cents unpaid: compute
  // the smallest *integer-cent* payment that actually amortises within the term.
  const paysOff=guess=>{
   let debt=balance;
   for(let i=0;i<months;i++){
    const interest=Math.ceil(debt*rate-1e-9);
    if(guess<=interest)return false;
    debt=Math.max(0,debt+interest-guess);
    if(debt===0)return true;
   }
   return false;
  };
  let low=1,high=balance+Math.ceil(balance*rate-1e-9);
  if(!Number.isSafeInteger(high))return null;
  while(low<high){
   const mid=Math.floor((low+high)/2);
   if(paysOff(mid))high=mid;else low=mid+1;
  }
  payment=low;
 }
 let remaining=balance,total=0,last=0,count=0;
 for(let i=1;i<=600;i++){
  const interest=Math.ceil(remaining*rate-1e-9);
  const due=remaining+interest;
  const actual=Math.min(payment,due);
  if(actual<=interest)return null;
  remaining=due-actual;total+=actual;last=actual;count=i;
  if(remaining===0)break;
  if(mode==='reduce-payment'&&i>=months)return null;
 }
 if(remaining!==0)return null;
 return {balanceCents:balance,months:count,monthlyCents:payment,lastCents:last,totalScheduledCents:total};
}
async function saved(){
 if(typeof dbHandle!=='undefined'&&dbHandle)return new Promise((resolve,reject)=>{
  const q=dbHandle.transaction(DB_STORE,'readonly').objectStore(DB_STORE).get('main');
  q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
 });
 return JSON.parse(localStorage.getItem(BACKUP_KEY)||'null');
}
async function checkSave(verify){
 await persist();const snapshot=await saved();
 if(!snapshot||!verify(snapshot))throw Error('Sauvegarde locale non vérifiée');
}
async function revert(rule,transactionId){
 const ix=data.recurrences.findIndex(x=>x.id===rule.id);
 if(ix>=0)data.recurrences[ix]=rule;
 if(transactionId)data.transactions=data.transactions.filter(t=>t.id!==transactionId);
 try{await persist();}catch(e){console.warn('Budget rollback failed',e);}
}
const loan=id=>data.recurrences.find(x=>x.id===id&&x.commitmentKind==='loan');
let preview=null;
function extraForm(id){
 const r=loan(id);if(!r)return;
 if(!dateOK(r.startDate)||r.schedulePending){toast('Renseigne d’abord la première échéance du prêt.');return;}
 const today=dateKey(new Date()),start=nextMonth(today),p=latest(r);
 const current=scheduledAmount(r,start)||r.amountCents||0;
 const remaining=r.endDate&&r.endDate.slice(0,7)>=start?monthDiff(start,r.endDate.slice(0,7))+1:null;
 modal('Remboursement anticipé · '+r.title,`<form id="fin-extra" class="b8-form">
  <p class="muted-note">Utilise le capital restant dû réel fourni par la banque. Les échéances déjà confirmées ne seront pas modifiées.</p>
  <div class="b8-form-grid"><label class="b8-field">Date du versement réellement payé<input name="date" type="date" value="${today}" required></label>
   <label class="b8-field">Versement anticipé (€)<input name="extra" inputmode="decimal" placeholder="500,00" required></label></div>
  <div class="b8-form-grid"><label class="b8-field">Capital restant dû AVANT versement (€)<input name="balance" inputmode="decimal" required></label>
   <label class="b8-field">Taux nominal annuel (%)<input name="apr" inputmode="decimal" required value="${Number.isFinite(r.loanAprPercent)?r.loanAprPercent:p?.aprPercent??''}" placeholder="0 = sans intérêts"></label></div>
  <label class="b8-field">Recalculer<select name="mode">
    <option value="reduce-term">La date de fin (mensualité conservée)</option>
    <option value="reduce-payment">La mensualité (durée conservée)</option>
   </select></label>
  <div class="b8-form-grid"><label class="b8-field">Mensualité souhaitée (€) si fin raccourcie<input name="payment" inputmode="decimal" value="${input(current)}"></label>
   <label class="b8-field">Échéances restantes si mensualité réduite<input name="months" type="number" min="1" max="600" step="1" value="${remaining??''}"></label></div>
  <p class="b8-form-note">Les nouvelles échéances commencent le mois suivant ce versement. Simulation hors assurance, frais et règles particulières du contrat. Un versement déjà effectué est enregistré une seule fois dans le Journal.</p>
  <div class="form-actions"><button type="button" class="btn btn-neutral" data-action="close-modal">Annuler</button><button type="submit" class="btn">Prévisualiser</button></div>
 </form>`);
 document.getElementById('fin-extra')?.addEventListener('submit',e=>{
  e.preventDefault();if(!e.currentTarget.reportValidity())return;
  const v=Object.fromEntries(new FormData(e.currentTarget).entries()),date=String(v.date||''),mode=v.mode;
  const principalCents=cents(v.balance),extraCents=cents(v.extra),aprPercent=Number(String(v.apr).replace(',','.'));
  if(!dateOK(date)||date>dateKey(new Date())||(p&&date<p.date)||String(v.apr).trim()===''){toast('Vérifie la date et le taux nominal.');return;}
  const result=calculate({principalCents,extraCents,aprPercent,mode,months:Number(v.months),paymentCents:cents(v.payment)});
  if(!result){toast('Impossible de calculer cet échéancier : vérifie le capital, le taux et la durée.');return;}
  const effectiveMonth=nextMonth(date),endDate=result.months?endOfMonth(monthPlus(effectiveMonth,result.months-1)):date;
  if(data.transactions.some(t=>t.recurrenceId===id&&t.type==='expense'&&/^\d{4}-\d{2}$/.test(t.occurrenceKey||'')&&t.occurrenceKey>=effectiveMonth)){
   toast('Des mensualités futures sont déjà confirmées. Ajuste leur historique avant le recalcul.');return;
  }
  preview={loanId:id,date,principalCents,extraCents,aprPercent,mode,effectiveMonth,endDate,...result};
  modal('Simulation · '+r.title,`<div class="b8-form">
   <p class="muted-note">Calcul indicatif sur les montants déclarés : compare-le à l’échéancier officiel de la banque.</p>
   <div class="b20-summary"><div><span>Capital après versement</span><strong>${eur(result.balanceCents)}</strong></div>
     <div><span>Mensualité future</span><strong>${result.months?eur(result.monthlyCents):'Prêt soldé'}</strong></div>
     <div><span>Échéances restantes</span><strong>${result.months}</strong></div>
     <div><span>Nouvelle date de fin</span><strong>${safe(formatDate(endDate,{month:'short',year:'numeric'}))}</strong></div></div>
   <p class="b8-form-note">Versement : ${eur(extraCents)} · dernière mensualité : ${result.months?eur(result.lastCents):'aucune'} · prochaines échéances à partir de ${effectiveMonth}. Taux nominal : ${aprPercent}%.</p>
   <div class="form-actions"><button type="button" class="btn btn-neutral" data-action="fin-loan-extra" data-id="${esc(id)}">Modifier</button>
     <button class="btn" data-action="fin-loan-confirm" data-id="${esc(id)}">Confirmer le versement payé</button></div></div>`);
 });
}
async function confirmExtra(id){
 const p=preview,r=loan(id);if(!p||!r||p.loanId!==id)return;
 if(data.transactions.some(t=>t.loanExtraPaymentFor===id&&t.date===p.date&&t.amountCents===p.extraCents)){
  toast('Ce versement anticipé existe déjà.');return;
 }
 if(data.transactions.some(t=>t.recurrenceId===id&&t.type==='expense'&&/^\d{4}-\d{2}$/.test(t.occurrenceKey||'')&&t.occurrenceKey>=p.effectiveMonth)){
  toast('Une mensualité future a été confirmée depuis le calcul.');return;
 }
 const old=JSON.parse(JSON.stringify(r)),now=new Date().toISOString(),transactionId=uid(),adjustmentId=uid();
 const tx={id:transactionId,title:'Remboursement anticipé · '+r.title,type:'expense',
  amountCents:p.extraCents,date:p.date,category:r.category||'Autres',projectId:r.projectId||'',
  loanExtraPaymentFor:id,loanAdjustmentId:adjustmentId,
  notes:'Versement supplémentaire déclaré ; distinct de la mensualité normale.',createdAt:now,updatedAt:now};
 const adjustment={id:adjustmentId,transactionId,date:p.date,effectiveMonth:p.effectiveMonth,
  extraCents:p.extraCents,principalBeforeCents:p.principalCents,principalAfterCents:p.balanceCents,
  aprPercent:p.aprPercent,mode:p.mode,months:p.months,monthlyCents:p.monthlyCents,
  lastCents:p.lastCents,endDate:p.endDate,createdAt:now};
 r.loanScheduleRevisions=[...(r.loanScheduleRevisions||[]),adjustment];
 r.loanAprPercent=p.aprPercent;r.endDate=p.endDate;r.updatedAt=now;
 data.transactions.push(tx);
 try{
  await checkSave(saved=>saved.transactions?.some(t=>t.id===transactionId&&t.loanExtraPaymentFor===id&&t.amountCents===p.extraCents)&&
   saved.recurrences?.some(x=>x.id===id&&x.loanScheduleRevisions?.some(a=>a.id===adjustmentId&&a.transactionId===transactionId)));
  preview=null;closeModal();render();toast('Remboursement enregistré et échéancier recalculé.');
 }catch(e){await revert(old,transactionId);toast('Versement non enregistré : '+e.message);}
}
function adjustForm(id){
 const r=loan(id),p=latest(r);if(!p)return;
 modal('Ajuster les échéances · '+r.title,`<form id="fin-adjust" class="b8-form">
   <p class="muted-note">Corrige les prévisions selon l’échéancier officiel de la banque. Cela ne modifie aucun paiement déjà comptabilisé.</p>
   <label class="b8-field">Mensualité prévue (€)<input name="monthly" inputmode="decimal" required value="${input(p.monthlyCents)}"></label>
   <label class="b8-field">Nombre de mensualités depuis ${p.effectiveMonth}<input name="months" type="number" min="1" max="600" required value="${p.months}"></label>
   <label class="b8-field">Dernière mensualité (€)<input name="last" inputmode="decimal" required value="${input(p.lastCents)}"></label>
   <div class="form-actions"><button type="button" class="btn btn-neutral" data-action="close-modal">Annuler</button><button class="btn" type="submit">Enregistrer les corrections</button></div></form>`);
 document.getElementById('fin-adjust')?.addEventListener('submit',async e=>{
  e.preventDefault();if(!e.currentTarget.reportValidity())return;
  const v=Object.fromEntries(new FormData(e.currentTarget).entries()),monthlyCents=cents(v.monthly),lastCents=cents(v.last),months=Number(v.months);
  if(!monthlyCents||!lastCents||lastCents>monthlyCents||!Number.isInteger(months)||months<1||months>600){toast('Vérifie le nouveau calendrier.');return;}
  const endMonth=monthPlus(p.effectiveMonth,months-1);
  if(data.transactions.some(t=>t.recurrenceId===id&&/^\d{4}-\d{2}$/.test(t.occurrenceKey||'')&&t.occurrenceKey>endMonth)){
   toast('Une mensualité déjà confirmée dépasse la nouvelle fin.');return;
  }
  const old=JSON.parse(JSON.stringify(r)),a=r.loanScheduleRevisions.at(-1),now=new Date().toISOString();
  Object.assign(a,{months,monthlyCents,lastCents,endDate:endOfMonth(endMonth),manualOverride:true,updatedAt:now});
  r.endDate=a.endDate;r.updatedAt=now;
  try{
   await checkSave(saved=>saved.recurrences?.some(x=>x.id===id&&x.loanScheduleRevisions?.at(-1)?.monthlyCents===monthlyCents&&x.loanScheduleRevisions.at(-1)?.months===months));
   closeModal();render();toast('Calendrier modifié selon les montants déclarés.');
  }catch(e){await revert(old);toast('Correction non enregistrée.');}
 });
}
async function incomeToggle(id){
 const r=data.recurrences.find(x=>x.id===id&&x.type==='income'&&!x.commitmentKind);if(!r)return;
 const old=JSON.parse(JSON.stringify(r));r.active=!r.active;
 if(r.active&&r.autoBook===true)r.autoBookFrom=dateKey(new Date());
 r.updatedAt=new Date().toISOString();
 try{
  await checkSave(saved=>saved.recurrences?.some(x=>x.id===id&&x.active===r.active&&x.autoBookFrom===r.autoBookFrom));
  render();toast(r.active?'Revenu réactivé sans rattrapage des mois en pause.':'Revenu mis en pause. Historique conservé.');
 }catch(e){Object.assign(r,old);try{await persist();}catch{}toast('Mise en pause non enregistrée.');}
}
function variableForm(){
 modal('Ajouter un versement variable',`<form id="fin-variable" class="b8-form">
   <p class="muted-note">Indemnité CPAM, complément employeur ou autre rentrée irrégulière, sans modifier le salaire récurrent.</p>
   <label class="b8-field">Provenance<select name="source"><option value="cpam">Indemnités CPAM</option><option value="employer">Complément employeur</option><option value="other">Autre versement</option></select></label>
   <div class="b8-form-grid"><label class="b8-field">Montant reçu (€)<input name="amount" inputmode="decimal" required></label>
    <label class="b8-field">Date réelle de réception<input name="date" type="date" required value="${dateKey(new Date())}"></label></div>
   <label class="b8-field">Commentaire facultatif<textarea name="notes" maxlength="500" rows="2"></textarea></label>
   <p class="b8-form-note">Ajoute uniquement les montants réellement reçus. Aucune anticipation de droits CPAM ni écriture automatique.</p>
   <div class="form-actions"><button type="button" class="btn btn-neutral" data-action="close-modal">Annuler</button><button type="submit" class="btn">Enregistrer le revenu</button></div></form>`);
 document.getElementById('fin-variable')?.addEventListener('submit',async e=>{
  e.preventDefault();if(!e.currentTarget.reportValidity())return;
  const v=Object.fromEntries(new FormData(e.currentTarget).entries()),amountCents=cents(v.amount),date=String(v.date||'');
  const labels={cpam:'Indemnités CPAM',employer:'Complément employeur',other:'Autre versement'},title=labels[v.source];
  if(!title||!amountCents||!dateOK(date)||date>dateKey(new Date())){toast('Vérifie la date de réception et le montant.');return;}
  if(data.transactions.some(t=>t.type==='income'&&t.title===title&&t.date===date&&t.amountCents===amountCents)){
   toast('Un versement identique a déjà été enregistré à cette date.');return;
  }
  const id=uid(),now=new Date().toISOString();
  data.transactions.push({id,title,type:'income',amountCents,date,incomeSource:v.source,category:v.source==='cpam'?'Indemnités':'Salaire',
   notes:String(v.notes||'').slice(0,500),createdAt:now,updatedAt:now});
  try{
   await checkSave(saved=>saved.transactions?.some(x=>x.id===id&&x.date===date&&x.amountCents===amountCents&&x.incomeSource===v.source));
   closeModal();render();toast('Revenu variable enregistré dans le Journal.');
  }catch(e){data.transactions=data.transactions.filter(x=>x.id!==id);try{await persist();}catch{}toast('Revenu non enregistré.');}
 });
}
function act(kind,button){
 const id=button?.dataset?.id;
 if(kind==='fin-loan-extra'){extraForm(id);return true;}
 if(kind==='fin-loan-confirm'){void confirmExtra(id);return true;}
 if(kind==='fin-loan-adjust'){adjustForm(id);return true;}
 if(kind==='fin-income-toggle'){void incomeToggle(id);return true;}
 if(kind==='fin-income-new'){variableForm();return true;}
 return false;
}
window.NexusBudgetFinance=Object.freeze({act,calculate,scheduledAmount,scheduledTotal,monthDiff,nextMonth});
})();
