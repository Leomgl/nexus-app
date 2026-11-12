/* NEXUS: import privé du budget, jamais de montants dans le dépôt public. */
'use strict';
(() => {
 let proposal=[];
 const clean=x=>String(x??'').trim().slice(0,130);
 const fold=x=>clean(x).toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 const aliases={applecareiphone:'applecare',applecareplus:'applecare',pretvoiture:'voiture',pretvoitures:'voiture',creditvoiture:'voiture',voitures:'voiture',creditmac:'mac',pretmac:'mac'};
 const key=x=>aliases[fold(x)]||fold(x);
 const fmt=n=>(n/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
 const esc=x=>escapeHtml(String(x??''));
 function cents(raw){
  if(typeof raw==='number')return Number.isSafeInteger(raw)?raw:null;
  let s=String(raw??'').replace(/[€\s\u00a0\u202f]/g,'').trim();
  if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
  if(!/^-?\d+(?:\.\d{1,2})?$/.test(s))return null;
  const sign=s.startsWith('-')?-1:1,parts=s.replace(/^-/,'').split('.');
  const n=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0'));
  return Number.isSafeInteger(n)?sign*n:null;
 }
 function parseCSV(str){
  const rows=[];let row=[],cell='',quoted=false;
  const text=String(str).replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
   const ch=text[i];
   if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
   else if(ch===','&&!quoted){row.push(cell);cell='';}
   else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>String(v).trim()))rows.push(row);row=[];cell='';}
   else cell+=ch;
  }
  if(quoted)throw new Error('CSV : guillemets non fermés.');
  row.push(cell);if(row.some(v=>String(v).trim()))rows.push(row);
  if(rows.length<2)throw new Error('CSV vide.');
  const header=rows.shift().map(fold);
  if(!['nom','categorie','montant'].every(h=>header.includes(h)))throw new Error('Colonnes CSV incompatibles.');
  return rows.map(cols=>Object.fromEntries(header.map((h,i)=>[h,cols[i]??''])));
 }
 function fromRaw(raw,origin){
  const title=clean(raw.title??raw.nom),category=clean(raw.category??raw.categorie);
  const signed=raw.amountCents!==undefined?cents(raw.amountCents):cents(raw.montantsigne||raw.montant);
  if(!title||!Number.isSafeInteger(signed)||!signed||Math.abs(signed)>100000000000)throw new Error('Ligne invalide : '+(title||'?'));
  const type=raw.type==='income'||fold(raw.type)==='entree'||signed>0?'income':'expense';
  const kind=raw.commitmentKind!==undefined?String(raw.commitmentKind):
   type==='income'?'':/pret|credit/.test(fold(category))?'loan':/abonn/.test(fold(category))||key(title)==='revolut'?'subscription':'';
  if(!['','subscription','loan'].includes(kind))throw new Error('Type de récurrence inconnu.');
  const flags=['Date de prélèvement à préciser'];
  if(kind==='loan'&&!Number.isSafeInteger(raw.loanInstallments))flags.push('Durée du prêt à préciser');
  if(!category)flags.push('Catégorie à vérifier');
  return {title,type,amountCents:Math.abs(signed),commitmentKind:kind,frequency:'monthly',
    category:category||(kind==='subscription'?'Abonnements':type==='income'?'Salaire':'Autres'),
    source:clean(raw.source||origin),flags,importKey:type+'|'+key(title)};
 }
 function existing(item){
  const found=[...(data.recurrences||[]),...(data.transactions||[])].find(r=>
   r.type===item.type&&(r.importKey===item.importKey||key(r.title)===key(item.title)||
    item.type==='income'&&key(item.title)==='salaire'&&(key(r.title)==='salaire'||key(r.category)==='salaire')));
  return found?{exists:true,label:found.amountCents===item.amountCents?'Déjà présent':'Déjà présent · montant différent'}:{exists:false,label:'Nouveau'};
 }
 function preview(){
  const count=proposal.filter(x=>!x.duplicate).length;
  const rows=proposal.map(x=>'<div class="b21-import-row"><span><strong>'+esc(x.title)+'</strong><small>'+
   esc(x.commitmentKind==='loan'?'Prêt':x.commitmentKind==='subscription'?'Abonnement':x.type==='income'?'Revenu régulier':'Autre récurrence')+
   ' · '+esc(x.source)+' · Dates à compléter</small></span><span><strong>'+(x.type==='income'?'+':'−')+
   fmt(x.amountCents)+'</strong><small class="'+(x.duplicate?'b21-dup':'b21-new')+'">'+esc(x.reason)+'</small></span></div>').join('');
  modal('Importer dans le budget','<div class="b21-import"><p class="muted-note">'+proposal.length+
   ' lignes analysées · <strong>'+count+' à ajouter</strong> · '+(proposal.length-count)+' doublons ignorés.</p>'+
   '<div class="b21-import-list">'+rows+'</div>'+
   '<p class="b8-form-note">Import dans Engagements, sans aucune opération ajoutée au Journal. Dates et durées manquantes à compléter : pas de fausses échéances ou notifications. Les états du CSV sont ignorés. Rien ne modifie les lignes existantes.</p>'+
   '<div class="form-actions"><button type="button" class="btn btn-neutral" data-action="close-modal">Annuler</button>'+
   '<button type="button" class="btn" data-action="budget-import-confirm" '+(count?'':'disabled')+'>'+svg('check')+' Ajouter '+count+' ligne(s)</button></div></div>');
 }
 async function onFiles(input){
  const files=[...(input?.files||[])];if(input)input.value='';
  if(!files.length)return;
  try{
   if(files.length>10||files.some(f=>f.size>1000000))throw new Error('10 fichiers maximum, 1 Mo chacun.');
   const items=[];
   for(const f of files){
    let entries;const raw=await f.text();
    if(/\.json$/i.test(f.name)){
     const obj=JSON.parse(raw);
     if(obj?.kind!=='nexus-budget-import'||obj.version!==1||!Array.isArray(obj.items)||obj.items.length>250)
      throw new Error('Format JSON non reconnu.');
     entries=obj.items;
    }else if(/\.csv$/i.test(f.name))entries=parseCSV(raw);
    else throw new Error('Choisis des fichiers .csv ou .json');
    if(entries.length>250)throw new Error('Trop de lignes.');
    for(const entry of entries)items.push(fromRaw(entry,f.name.slice(0,50)));
   }
   if(!items.length)throw new Error('Aucune ligne à importer.');
   const seen=new Set();
   proposal=items.map(x=>{
    const match=existing(x),repeated=seen.has(x.importKey);
    seen.add(x.importKey);
    return {...x,duplicate:match.exists||repeated,reason:repeated?'En double dans les fichiers':match.label};
   });
   preview();
  }catch(err){proposal=[];alert('Import impossible : '+(err.message||'fichier invalide'));}
 }
 async function apply(){
  const additions=proposal.filter(x=>!x.duplicate&&!existing(x).exists);
  if(!additions.length){proposal=[];closeModal();toast('Toutes les lignes sont déjà présentes.');return;}
  const now=new Date().toISOString(),ids=[];
  for(const x of additions){
   const id=uid();ids.push(id);
   data.recurrences.push({
    id,title:x.title,type:x.type,amountCents:x.amountCents,category:x.category,
    frequency:'monthly',commitmentKind:x.commitmentKind||undefined,
    active:true,day:1,month:1,weekday:1,startDate:'',endDate:'',schedulePending:true,
    loanInstallments:x.commitmentKind==='loan'?null:undefined,
    loanPrincipalCents:x.commitmentKind==='loan'?null:undefined,
    autoBook:false,notifyDays:[2,0],projectId:'',skips:[],
    importKey:x.importKey,importSource:x.source,notes:x.flags.join(' · '),
    createdAt:now,updatedAt:now
   });
  }
  try{
   await persist();
   let saved;
   if(dbHandle)saved=await new Promise((resolve,reject)=>{
    const request=dbHandle.transaction(DB_STORE,'readonly').objectStore(DB_STORE).get('main');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
   });
   else saved=JSON.parse(localStorage.getItem(BACKUP_KEY)||'null');
   if(!ids.every(id=>saved?.recurrences?.some(r=>r.id===id)))throw new Error('Sauvegarde non confirmée.');
   proposal=[];closeModal();render();toast(ids.length+' éléments ajoutés · Dates à compléter.');
  }catch(err){
   for(const id of ids){const i=data.recurrences.findIndex(r=>r.id===id);if(i!==-1)data.recurrences.splice(i,1);}
   await persist();alert('Import non confirmé : '+err.message);
  }
 }
 function act(kind){
  if(kind==='budget-import-open'){document.getElementById('nexus-budget-import-file')?.click();return true;}
  if(kind==='budget-import-confirm')return apply();
  return false;
 }
 window.NexusBudgetImport=Object.freeze({act,onFiles,parseCSV,fromRaw,existing});
})();
