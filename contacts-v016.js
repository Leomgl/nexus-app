(function nexusContactsModule(){
 'use strict';
 let adapter=null,pending=null,picker=null;
 const MAX_BYTES=8*1024*1024,MAX_CONTACTS=5000;
 function unescapeVcard(s){
  return String(s||'').replace(/\\n/gi,'\n').replace(/\\([\\;,])/g,'$1').trim();
 }
 function splitVcard(s,delimiter=';'){
  const items=[];let buffer='',escaping=false;
  for(const char of String(s||'')){
   if(escaping){buffer+='\\'+char;escaping=false;continue;}
   if(char==='\\'){escaping=true;continue;}
   if(char===delimiter){items.push(unescapeVcard(buffer));buffer='';}
   else buffer+=char;
  }
  if(escaping)buffer+='\\';
  items.push(unescapeVcard(buffer));
  return items;
 }
 function parseVcards(source){
  const clean=String(source||'').replace(/\r\n?/g,'\n');
  const physical=clean.split('\n'),lines=[];
  for(const line of physical){
   if((line.startsWith(' ')||line.startsWith('\t'))&&lines.length)lines[lines.length-1]+=line.slice(1);
   else lines.push(line);
  }
  const cards=[];let block=null;
  const finish=()=>{
   if(!block)return;
   const raw=key=>block[key]?.find(x=>x.trim())||'';
   const first=key=>unescapeVcard(raw(key));
   const n=splitVcard(raw('N'));
   const name=(first('FN')||[n[1],n[0],n[2]].filter(Boolean).join(' ')).trim().slice(0,130);
   if(name){
    const address=splitVcard(raw('ADR')).filter(Boolean).join(', ').slice(0,300);
    cards.push({name,phone:first('TEL').replace(/^tel:/i,'').slice(0,45),email:first('EMAIL').replace(/^mailto:/i,'').slice(0,160),
     role:(first('TITLE')||first('ROLE')).slice(0,120),
     organization:splitVcard(raw('ORG'))[0].slice(0,160),
     address,notes:first('NOTE').slice(0,2000)});
   }
   block=null;
  };
  for(const line of lines){
   const entry=line.trim();
   if(entry.toUpperCase()==='BEGIN:VCARD'){block={};continue;}
   if(entry.toUpperCase()==='END:VCARD'){finish();continue;}
   if(!block)continue;
   const at=line.indexOf(':');if(at<1)continue;
   const key=line.slice(0,at).split(';')[0].split('.').pop().toUpperCase();
   if(!['FN','N','TEL','EMAIL','TITLE','ROLE','ORG','ADR','NOTE'].includes(key))continue;
   const value=line.slice(at+1);
   (block[key]??=[]).push(value);
  }
  if(!/BEGIN:VCARD/i.test(clean))throw Error('Ce fichier ne contient aucune vCard.');
  return cards.slice(0,MAX_CONTACTS);
 }
 const norm=s=>String(s||'').trim().toLocaleLowerCase('fr-FR');
 const digits=s=>String(s||'').replace(/\D/g,'');
 function isDuplicate(item,existing){
  return existing.some(c=>{
   const sameEmail=item.email&&c.email&&norm(item.email)===norm(c.email);
   const itemPhone=digits(item.phone),otherPhone=digits(c.phone);
   const samePhone=itemPhone.length>=7&&otherPhone.length>=7&&itemPhone===otherPhone;
   const neitherHasContact=!(item.email||itemPhone)&&!(c.email||otherPhone);
   const sameBareName=neitherHasContact&&norm(item.name)===norm(c.name);
   return Boolean(sameEmail||samePhone||sameBareName);
  });
 }
 function openImport(){
  if(!adapter)return;
  if(!picker){
   picker=document.createElement('input');
   picker.type='file';picker.accept='.vcf,text/vcard,text/x-vcard';
   picker.hidden=true;document.body.appendChild(picker);
   picker.addEventListener('change',async()=>{
    const file=picker.files?.[0];picker.value='';
    if(!file)return;
    pending=null;
    try{
     if(file.size>MAX_BYTES)throw Error('Fichier trop volumineux (8 Mo maximum).');
     const parsed=parseVcards(await file.text());
     if(!parsed.length)throw Error('Aucun contact exploitable dans ce fichier.');
     const previous=adapter.state().contacts,accepted=[];let duplicates=0;
     for(const c of parsed){
      if(isDuplicate(c,previous)||isDuplicate(c,accepted)){duplicates++;continue;}
      accepted.push(c);
     }
     pending=accepted;
     const html=adapter.escape;
     adapter.modal('Importer les contacts',`<div class="contacts-import-review">
      <p><strong>${parsed.length} contacts reconnus</strong> · ${accepted.length} à importer · ${duplicates} doublon(s) ignoré(s)</p>
      <p class="muted-note">Lecture locale du fichier : aucun téléversement pour l'import. Après confirmation, les fiches suivent les mêmes sauvegardes et synchronisations chiffrées facultatives que tes autres données NEXUS.</p>
      <div class="contacts-import-preview">${accepted.slice(0,10).map(c=>`<div><strong>${html(c.name)}</strong><small>${html(c.phone||c.email||c.organization||'Sans coordonnées')}</small></div>`).join('')||'<p>Aucun nouveau contact à ajouter.</p>'}</div>
      <div class="form-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Annuler</button>
      ${accepted.length?`<button type="button" class="btn" data-action="contacts-import-confirm">Importer ${accepted.length} contact(s)</button>`:''}</div></div>`);
    }catch(err){adapter.toast(err.message||'Impossible de lire ce fichier vCard.');}
   });
  }
  picker.click();
 }
 async function confirmImport(){
  if(!adapter||!pending?.length)return;
  const toSave=pending.filter(c=>!isDuplicate(c,adapter.state().contacts));
  pending=null;
  if(!toSave.length){adapter.closeModal();adapter.toast('Ces contacts existent déjà.');return;}
  const now=new Date().toISOString();
  adapter.state().contacts.push(...toSave.map(c=>({...c,id:adapter.uid(),createdAt:now,updatedAt:now})));
  await adapter.persist();
  adapter.closeModal();adapter.render();
  adapter.toast(`${toSave.length} contact(s) importé(s).`);
 }
 window.NexusContacts={attach(value){adapter=value;},openImport,confirmImport,parseVcards};
})();
