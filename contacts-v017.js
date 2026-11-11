(function nexusContactsV017(){
 'use strict';
 let adapter=null,pending=null,picker=null,photoPicker=null,photoTarget=null;
 const MAX_BYTES=20*1024*1024,MAX_CONTACTS=5000,MAX_IMAGE_BYTES=5*1024*1024;
 const MAX_PHOTO_CHARS=16000,MAX_TOTAL_PHOTO_CHARS=1600000,MAX_PHOTO_IMPORT=250;
 const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
 const state={query:'',onlyFavorites:false,tag:'',sort:'az'};
 const normalize=s=>String(s||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-FR');
 const digits=s=>String(s||'').replace(/\D/g,'');
 const esc=s=>adapter?.escape?adapter.escape(s):String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon=s=>adapter?.svg?.(s)||'';
 const contacts=()=>adapter?.state?.().contacts||[];
 const getTags=c=>Array.isArray(c.tags)?c.tags.filter(t=>typeof t==='string'&&t.trim()):[];
 const validatePhoto=s=>typeof s==='string'&&s.length<MAX_PHOTO_CHARS&&/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(s);
 const letter=c=>{const l=normalize(c.name||'').charAt(0).toUpperCase();return LETTERS.includes(l)?l:'#';};
 const sortNames=(a,b)=>String(a.name||'').localeCompare(String(b.name||''),'fr',{sensitivity:'base'});
 function matches(item){
  const haystack=normalize([item.name,item.phone,item.email,item.organization,item.role,...getTags(item)].filter(Boolean).join(' '));
  return (!state.query||haystack.includes(normalize(state.query)))&&
   (!state.onlyFavorites||Boolean(item.favorite))&&
   (!state.tag||getTags(item).some(t=>normalize(t)===normalize(state.tag)));
 }
 function visibleContacts(){
  const all=contacts().filter(matches);
  if(state.sort==='za')all.sort((a,b)=>-sortNames(a,b));
  else if(state.sort==='favorites')all.sort((a,b)=>Number(Boolean(b.favorite))-Number(Boolean(a.favorite))||sortNames(a,b));
  else if(state.sort==='recent')all.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))||sortNames(a,b));
  else all.sort(sortNames);
  return all;
 }
 const avatar=(c,cls='')=>`<span class="nx-contact-avatar ${cls}">${validatePhoto(c.photo)?`<img src="${esc(c.photo)}" alt="" loading="lazy">`:esc((c.name||'?').trim().charAt(0).toUpperCase())}</span>`;
 function tagCatalog(){
  const tags=[...new Set(contacts().flatMap(getTags).map(t=>t.trim()).filter(Boolean))];
  return tags.sort((a,b)=>a.localeCompare(b,'fr'));
 }
 function view(){
  const tags=tagCatalog();
  return `<section class="nx-contacts-page">
    <header class="nx-contact-heading">
     <div><div class="eyebrow">TON RÉPERTOIRE</div><h1 class="page-title">Personnes<span class="punctuation">.</span></h1>
     <p class="subtitle">${contacts().length} contacts · favoris, groupes et rendez-vous</p></div>
     <div class="nx-contact-header-actions">
      <button type="button" class="btn btn-neutral btn-small" data-action="contacts-import">${icon('upload')} Importer</button>
      <button type="button" class="btn btn-small" data-action="new-contact">${icon('plus')} Ajouter</button>
     </div>
    </header>
    <div class="nx-contact-tools">
     <label class="nx-contacts-search">${icon('search')}<input type="search" id="nx-contact-query" aria-label="Rechercher un contact" placeholder="Rechercher un nom, un numéro…" autocomplete="off" value="${esc(state.query)}"></label>
     <div class="nx-contact-controls">
      <button type="button" data-action="contacts-toggle-favorites" class="nx-contact-filter ${state.onlyFavorites?'active':''}" aria-pressed="${state.onlyFavorites}">${icon('star')} Favoris</button>
      <label class="nx-contact-select"><span class="sr-only">Catégorie</span><select id="nx-contact-tag" aria-label="Filtrer par catégorie"><option value="">Toutes les catégories</option>${tags.map(t=>`<option value="${esc(t)}" ${state.tag===t?'selected':''}>${esc(t)}</option>`).join('')}</select></label>
      <label class="nx-contact-select nx-contact-sort"><span class="sr-only">Trier par</span><select id="nx-contact-sort" aria-label="Trier les contacts">${[['az','A → Z'],['za','Z → A'],['favorites','Favoris d’abord'],['recent','Ajouts récents']].map(([v,l])=>`<option value="${v}" ${state.sort===v?'selected':''}>${l}</option>`).join('')}</select></label>
     </div>
    </div>
    <div class="nx-contact-count" id="nx-contact-count" aria-live="polite"></div>
    <div class="nx-contact-browser">
      <div id="nx-contacts-results" class="nx-contact-results"></div>
      <nav id="nx-contact-index" class="nx-contacts-index" aria-label="Accès alphabétique"></nav>
    </div>
   </section>`;
 }
 function redrawResults(){
  const root=document.getElementById('nx-contacts-results');
  const rail=document.getElementById('nx-contact-index');
  if(!root||!rail)return;
  const all=visibleContacts();
  const buckets=new Map();
  for(const c of all){const l=letter(c);if(!buckets.has(l))buckets.set(l,[]);buckets.get(l).push(c);}
  let html='';
  if(!all.length)html=`<div class="nx-contact-empty"><strong>Aucun contact trouvé</strong><p>Essaie une autre recherche ou modifie tes filtres.</p></div>`;
  else if(state.sort==='az'||state.sort==='za'){
   for(const [l,items] of buckets){
    html+=`<section id="nx-letter-${l==='#'?'other':l}" class="nx-contact-group" aria-label="Lettre ${esc(l)}">
    <h2>${esc(l)}</h2><div class="nx-contacts-grid">${items.map(contactCard).join('')}</div></section>`;
   }
  }else{
   html=`<div class="nx-contacts-grid">${all.map(contactCard).join('')}</div>`;
  }
  root.innerHTML=html;
  const shownLetters=[...buckets.keys()];
  const indexed=(state.sort==='az'||state.sort==='za')&&all.length;
  rail.hidden=!indexed;
  rail.innerHTML=indexed?['#',...LETTERS].map(l=>`<button type="button" data-action="contacts-letter" data-letter="${l}" ${shownLetters.includes(l)?'':'disabled'} aria-label="Aller à la lettre ${l}">${l}</button>`).join(''):'';
  const count=document.getElementById('nx-contact-count');if(count)count.textContent=`${all.length} contact${all.length>1?'s':''} affiché${all.length>1?'s':''}`;
 }
 function contactCard(c){
  return `<button type="button" class="nx-contact-card" data-action="contact-detail" data-id="${esc(c.id)}" aria-label="Ouvrir ${esc(c.name)}">
   ${avatar(c)}<strong title="${esc(c.name)}">${esc(c.name)}</strong>
   ${c.favorite?`<span class="nx-contact-fav-mark" aria-label="Favori">${icon('star')}</span>`:''}
   <span class="nx-contact-chevron">${icon('chevright')}</span>
  </button>`;
 }
 function detail(id){
  if(!adapter)return;
  const c=contacts().find(x=>x.id===id);if(!c)return;
  const phone=String(c.phone||'').replace(/[^\d+]/g,'');
  const validPhone=/^\+?\d{3,15}$/.test(phone);
  const mail=String(c.email||'').trim();
  const validMail=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail);
  const events=adapter.state().events.filter(e=>e.personId===id);
  const tasks=adapter.state().tasks.filter(t=>t.personId===id);
  const tags=getTags(c);
  adapter.modal('Contact',`<div class="nx-contact-detail">
   <div class="nx-contact-profile">${avatar(c,'large')}
    <div><h2>${esc(c.name)}</h2>${c.role||c.organization?`<p>${esc(c.role||c.organization)}</p>`:''}</div>
    <button type="button" class="nx-detail-star ${c.favorite?'active':''}" data-action="contacts-toggle-star" data-id="${esc(id)}" aria-label="${c.favorite?'Retirer des favoris':'Ajouter aux favoris'}">${icon('star')}</button>
   </div>
   <div class="nx-contact-detail-actions">
    ${validPhone?`<a class="btn btn-soft btn-small" href="tel:${phone}">${icon('phone')} Appeler</a><a class="btn btn-soft btn-small" href="sms:${phone}">${icon('mail')} Message</a>`:''}
    ${validMail?`<a class="btn btn-soft btn-small" href="mailto:${esc(mail)}">${icon('mail')} Mail</a>`:''}
    <button type="button" class="btn btn-neutral btn-small" data-action="contacts-set-photo" data-id="${esc(id)}">${icon('upload')} ${validatePhoto(c.photo)?'Changer photo':'Photo'}</button>
   </div>
   ${tags.length?`<div class="nx-contact-detail-tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}
   <div class="nx-contact-detail-info">
    ${c.phone?`<div><small>Téléphone</small><strong>${esc(c.phone)}</strong></div>`:''}
    ${c.email?`<div><small>E-mail</small><strong>${esc(c.email)}</strong></div>`:''}
    ${c.organization?`<div><small>Organisation</small><strong>${esc(c.organization)}</strong></div>`:''}
    ${c.address?`<div><small>Adresse</small><strong>${esc(c.address)}</strong></div>`:''}
    ${c.notes?`<div><small>Notes</small><strong>${esc(c.notes)}</strong></div>`:''}
   </div>
   ${events.length||tasks.length?`<div class="linked-section"><h3>Lié à NEXUS (${events.length+tasks.length})</h3>
    ${events.map(e=>`<button class="nx-contact-linked" data-action="event-detail" data-id="${esc(e.id)}">${icon('calendar')} ${esc(e.title)}</button>`).join('')}
    ${tasks.map(t=>`<button class="nx-contact-linked" data-action="task-detail" data-id="${esc(t.id)}">${icon('check')} ${esc(t.title)}</button>`).join('')}</div>`:''}
   <div class="form-actions">
    ${validatePhoto(c.photo)?`<button class="btn btn-ghost btn-small" data-action="contacts-remove-photo" data-id="${esc(id)}">Retirer la photo</button>`:''}
    <button class="btn btn-soft btn-small" data-action="edit-contact" data-id="${esc(id)}">${icon('edit')} Modifier</button>
    <button class="btn btn-danger btn-small" data-action="delete-contact" data-id="${esc(id)}">${icon('trash')} Supprimer</button>
   </div></div>`);
 }
 function onChange(el){
  if(el?.id==='nx-contact-sort'){state.sort=el.value;redrawResults();return true;}
  if(el?.id==='nx-contact-tag'){state.tag=el.value;redrawResults();return true;}
  return false;
 }
 function onInput(el){
  if(el?.id!=='nx-contact-query')return false;
  state.query=el.value.slice(0,150);redrawResults();return true;
 }
 async function act(action,el){
  if(action==='contacts-toggle-favorites'){
   state.onlyFavorites=!state.onlyFavorites;
   const b=document.querySelector('[data-action="contacts-toggle-favorites"]');
   b?.classList.toggle('active',state.onlyFavorites);
   b?.setAttribute('aria-pressed',String(state.onlyFavorites));
   redrawResults();return true;
  }
  if(action==='contacts-letter'){
   const l=el.dataset.letter;
   if(!['#',...LETTERS].includes(l))return true;
   const node=document.getElementById(`nx-letter-${l==='#'?'other':l}`);
   node?.scrollIntoView({behavior:'smooth',block:'start'});return true;
  }
  if(action==='contacts-toggle-star'){
   const c=contacts().find(x=>x.id===el.dataset.id);
   if(!c)return true;
   c.favorite=!c.favorite;c.updatedAt=new Date().toISOString();
   await adapter.persist();adapter.render();detail(c.id);return true;
  }
  if(action==='contacts-set-photo'){openPhotoPicker(el.dataset.id);return true;}
  if(action==='contacts-remove-photo'){
   const c=contacts().find(x=>x.id===el.dataset.id);if(!c)return true;
   if(!window.confirm('Retirer la photo de ce contact ?'))return true;
   delete c.photo;c.updatedAt=new Date().toISOString();
   await adapter.persist();adapter.render();detail(c.id);return true;
  }
  return false;
 }
 function unescapeVcard(s){
  return String(s||'').replace(/\\n/gi,'\n').replace(/\\([\\;,])/g,'$1').trim();
 }
 function splitVcard(s,delimiter=';'){
  const items=[];let b='',escape=false;
  for(const ch of String(s||'')){
   if(escape){b+='\\'+ch;escape=false;continue;}
   if(ch==='\\'){escape=true;continue;}
   if(ch===delimiter){items.push(unescapeVcard(b));b='';}
   else b+=ch;
  }
  if(escape)b+='\\';items.push(unescapeVcard(b));return items;
 }
 function photoData(value,type){
  const v=String(value||'').trim();
  if(/^data:image\/(?:jpeg|png|webp|heic|heif);base64,/i.test(v)&&v.length<MAX_IMAGE_BYTES*1.4)return v;
  if(!/^[A-Za-z0-9+/\s=]+$/.test(v)||v.length>MAX_IMAGE_BYTES*1.4)return '';
  const mime=/PNG/i.test(type)?'image/png':/WEBP/i.test(type)?'image/webp':/HEIC/i.test(type)?'image/heic':/HEIF/i.test(type)?'image/heif':'image/jpeg';
  return `data:${mime};base64,${v.replace(/\s/g,'')}`;
 }
 function parseVcards(source){
  const lines=[];
  for(const line of String(source||'').replace(/\r\n?/g,'\n').split('\n')){
   if(/^[ \t]/.test(line)&&lines.length)lines[lines.length-1]+=line.slice(1);
   else lines.push(line);
  }
  const cards=[];let block=null;
  function finish(){
   if(!block)return;
   const raw=k=>block[k]?.[0]?.value||'';
   const first=k=>unescapeVcard(raw(k));
   const n=splitVcard(raw('N'));
   const name=(first('FN')||[n[1],n[0],n[2]].filter(Boolean).join(' ')).trim().slice(0,130);
   if(name){
    const p=block.PHOTO?.[0];
    const tags=splitVcard(raw('CATEGORIES'),',').filter(Boolean).slice(0,10).map(v=>v.slice(0,35));
    cards.push({
     name,phone:first('TEL').replace(/^tel:/i,'').slice(0,45),
     email:first('EMAIL').replace(/^mailto:/i,'').slice(0,160),
     role:(first('TITLE')||first('ROLE')).slice(0,120),
     organization:splitVcard(raw('ORG'))[0].slice(0,160),
     address:splitVcard(raw('ADR')).filter(Boolean).join(', ').slice(0,300),
     notes:first('NOTE').slice(0,2000),tags,
     photoRaw:p?photoData(p.value,p.meta):''
    });
   }
   block=null;
  }
  for(const line of lines){
   const trimmed=line.trim();
   if(/^BEGIN:VCARD$/i.test(trimmed)){block={};continue;}
   if(/^END:VCARD$/i.test(trimmed)){finish();continue;}
   if(!block)continue;
   const idx=line.indexOf(':');if(idx<1)continue;
   const meta=line.slice(0,idx),key=meta.split(';')[0].split('.').pop().toUpperCase();
   if(!['FN','N','TEL','EMAIL','TITLE','ROLE','ORG','ADR','NOTE','PHOTO','CATEGORIES'].includes(key))continue;
   (block[key]??=[]).push({value:line.slice(idx+1),meta});
  }
  if(!/BEGIN:VCARD/i.test(source))throw Error('Ce fichier ne contient pas de vCard.');
  return cards.slice(0,MAX_CONTACTS);
 }
 function findDuplicate(item,previous){
  const aPhone=digits(item.phone),aEmail=normalize(item.email);
  return previous.find(c=>{
   const bPhone=digits(c.phone),bEmail=normalize(c.email);
   if(aEmail&&bEmail&&aEmail===bEmail)return true;
   if(aPhone.length>=7&&bPhone===aPhone)return true;
   return !aEmail&&!aPhone&&!bEmail&&!bPhone&&normalize(item.name)===normalize(c.name);
  });
 }
 function resizePhoto(raw){
  return new Promise(resolve=>{
   if(!raw||raw.length>MAX_IMAGE_BYTES*1.4||!/^data:image\/(?:jpeg|png|webp|heic|heif);base64,/i.test(raw)){resolve('');return;}
   if(typeof Image==='undefined'||typeof document==='undefined'){resolve('');return;}
   const img=new Image();
   img.onload=()=>{
    try{
     const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
     const ctx=canvas.getContext('2d');if(!ctx){resolve('');return;}
     const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
     const side=Math.min(w,h);ctx.drawImage(img,(w-side)/2,(h-side)/2,side,side,0,0,96,96);
     const image=canvas.toDataURL('image/jpeg',.68);
     resolve(validatePhoto(image)?image:'');
    }catch{resolve('');}
   };
   img.onerror=()=>resolve('');
   img.src=raw;
  });
 }
 function photoUsage(){return contacts().reduce((n,c)=>n+(validatePhoto(c.photo)?c.photo.length:0),0);}
 function openPhotoPicker(id){
  if(!adapter||!contacts().some(c=>c.id===id))return;
  photoTarget=id;
  if(!photoPicker){
   photoPicker=document.createElement('input');
   photoPicker.type='file';photoPicker.accept='image/*,.heic,.heif';photoPicker.hidden=true;
   document.body.appendChild(photoPicker);
   photoPicker.addEventListener('change',async()=>{
    const f=photoPicker.files?.[0];photoPicker.value='';const id=photoTarget;
    if(!f||!id)return;
    if(f.size>MAX_IMAGE_BYTES){adapter.toast('Image trop lourde (5 Mo maximum).');return;}
    if(!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type)){adapter.toast('Format non pris en charge : JPEG, PNG, WebP ou HEIC.');return;}
    try{
     const raw=await new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(f);
     });
     const photo=await resizePhoto(raw);
     if(!photo)throw Error('Impossible de compresser cette photo.');
     const c=contacts().find(x=>x.id===id);if(!c)return;
     if(photoUsage()-(validatePhoto(c.photo)?c.photo.length:0)+photo.length>MAX_TOTAL_PHOTO_CHARS)throw Error('Limite des photos atteinte : allège le carnet ou retire une photo.');
     c.photo=photo;c.updatedAt=new Date().toISOString();
     await adapter.persist();adapter.render();detail(id);
     adapter.toast('Photo enregistrée.');
    }catch(e){adapter.toast(e.message||'Photo illisible.');}
   });
  }
  photoPicker.click();
 }
 function openImport(){
  if(!adapter)return;
  if(!picker){
   picker=document.createElement('input');picker.type='file';picker.accept='.vcf,text/vcard,text/x-vcard';
   picker.hidden=true;document.body.appendChild(picker);
   picker.addEventListener('change',async()=>{
    const f=picker.files?.[0];picker.value='';pending=null;
    if(!f)return;
    try{
     if(f.size>MAX_BYTES)throw Error('Fichier trop volumineux : 20 Mo maximum.');
     const parsed=parseVcards(await f.text());
     if(!parsed.length)throw Error('Aucune fiche reconnue dans ce fichier.');
     const newOnes=[],photoUpdates=[],seen=[];
     let duplicates=0;
     for(const c of parsed){
      const existing=findDuplicate(c,contacts()),batch=findDuplicate(c,seen);
      if(existing){
       if(c.photoRaw&&!validatePhoto(existing.photo))photoUpdates.push({id:existing.id,photoRaw:c.photoRaw,name:existing.name});
       else duplicates++;
      }else if(batch)duplicates++;
      else {newOnes.push(c);seen.push(c);}
     }
     pending={newOnes,photoUpdates};
     adapter.modal('Importer les contacts',`<div class="contacts-import-review">
      <p><strong>${parsed.length} fiches détectées</strong> · ${newOnes.length} nouvelles · ${photoUpdates.length} photos à ajouter · ${duplicates} déjà présentes</p>
      <p class="muted-note">Les contacts existants sont conservés. Si le fichier contient leurs photos, NEXUS peut les ajouter sans écraser les autres champs. Les images sont compressées avant sauvegarde.</p>
      <div class="contacts-import-preview">${newOnes.slice(0,6).map(c=>`<div><strong>${esc(c.name)}</strong><small>${esc(c.phone||c.email||'Nouveau contact')}</small></div>`).join('')}${photoUpdates.slice(0,4).map(c=>`<div><strong>${esc(c.name)}</strong><small>Photo à récupérer</small></div>`).join('')}</div>
      <div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Annuler</button>
       ${newOnes.length||photoUpdates.length?`<button type="button" class="btn" data-action="contacts-import-confirm">Confirmer l’import</button>`:''}
      </div></div>`);
    }catch(e){adapter.toast(e.message||'Fichier vCard illisible.');}
   });
  }
  picker.click();
 }
 async function confirmImport(){
  if(!adapter||!pending)return;
  const job=pending;pending=null;
  const button=document.querySelector('[data-action="contacts-import-confirm"]');
  if(button){button.disabled=true;button.textContent='Import en cours…';}
  let usage=photoUsage(),photoCount=0,added=0,enriched=0;
  const now=new Date().toISOString(),toSave=[];
  for(const c of job.newOnes){
   if(findDuplicate(c,contacts())||findDuplicate(c,toSave))continue;
   const {photoRaw,...fields}=c;
   const record={...fields,id:adapter.uid(),createdAt:now,updatedAt:now,favorite:false};
   if(photoRaw&&photoCount<MAX_PHOTO_IMPORT){
    const photo=await resizePhoto(photoRaw);
    if(photo&&usage+photo.length<=MAX_TOTAL_PHOTO_CHARS){
     record.photo=photo;usage+=photo.length;photoCount++;
    }
   }
   toSave.push(record);
  }
  for(const item of job.photoUpdates){
   if(photoCount>=MAX_PHOTO_IMPORT)break;
   const c=contacts().find(x=>x.id===item.id);
   if(!c||validatePhoto(c.photo))continue;
   const photo=await resizePhoto(item.photoRaw);
   if(!photo||usage+photo.length>MAX_TOTAL_PHOTO_CHARS)continue;
   c.photo=photo;c.updatedAt=now;usage+=photo.length;photoCount++;enriched++;
  }
  if(toSave.length){adapter.state().contacts.push(...toSave);added=toSave.length;}
  if(added||enriched){await adapter.persist();adapter.render();}
  adapter.closeModal();adapter.toast(`${added} contact(s) ajouté(s), ${enriched} photo(s) récupérée(s).`);
 }
 window.NexusContacts={attach(v){adapter=v;},view,redrawResults,detail,onChange,onInput,act,
  openImport,confirmImport,parseVcards,visibleContacts,tagCatalog};
})();
