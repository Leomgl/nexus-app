/* NEXUS Passkeys V0.5 — verified optional UI lock, NOT encryption of IndexedDB. */
'use strict';
(() => {
 const API='https://nexus-app-api.q9pfwtztsc.workers.dev';
 const LOCK_FLAG='nexus_passkey_ui_lock_v1';
 const encoder=new TextEncoder();
 const b64u=bytes=>{let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
 const b64bytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
 const lockedByPreference=()=>{try{return localStorage.getItem(LOCK_FLAG)==='1';}catch{return false;}};
 let unlocked=false;
 const available=()=>!!(window.PublicKeyCredential&&navigator.credentials?.create&&navigator.credentials?.get);
 async function call(path,method='GET',body) {
  const sess=await window.NexusCloud?.session?.();
  if(!sess?.token)throw new Error('Active le coffre cloud pour enregistrer une passkey.');
  const headers={'Authorization':'Bearer '+sess.token};
  if(body!==undefined)headers['Content-Type']='application/json';
  let res;try{res=await fetch(API+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});}
  catch{throw new Error('Connexion Cloudflare indisponible. Utilise ta clé de récupération hors ligne.');}
  let data;try{data=await res.json();}catch{throw new Error('Réponse passkey illisible.');}
  if(!res.ok)throw new Error(({CHALLENGE_EXPIRED:'Défi expiré. Réessaie.',UNKNOWN_CREDENTIAL:'Cette passkey n’est pas enregistrée.',INVALID_SIGNATURE:'La signature Face ID / passkey a été refusée.',USER_VERIFICATION_REQUIRED:'Vérification biométrique ou code iPhone nécessaire.',CREDENTIAL_EXISTS:'Cette passkey est déjà enregistrée.',INVALID_RP_ID:'Erreur de domaine de sécurité.'})[data.error]||'Erreur WebAuthn : '+(data.error||res.status));
  return data;
 }
 const safe=async f=>{try{await f();}catch(e){alert(e.message||'La vérification Face ID est indisponible.');}};
 function unlockUI(){
  unlocked=true;
  document.documentElement.classList.remove('nexus-lock-pending');
  document.getElementById('nexus-lock-overlay')?.remove();
 }
 async function register(){
  if(!available())throw new Error('Les passkeys ne sont pas prises en charge par ce navigateur.');
  const sess=await window.NexusCloud?.session?.();
  if(!sess)throw new Error('Tu dois d’abord connecter ton coffre chiffré.');
  const opts=await call('/api/v1/passkey/options','POST',{kind:'register'});
  const userId=await crypto.subtle.digest('SHA-256',encoder.encode(sess.token));
  const cred=await navigator.credentials.create({publicKey:{
   challenge:b64bytes(opts.challenge),
   rp:{id:opts.rpId,name:'NEXUS'},
   user:{id:new Uint8Array(userId),name:'nexus-personal',displayName:'NEXUS personnel'},
   pubKeyCredParams:[{type:'public-key',alg:-7}],
   timeout:120000,
   attestation:'none',
   authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'preferred',userVerification:'required'},
   excludeCredentials:opts.credentialIds.map(id=>({type:'public-key',id:b64bytes(id)}))
  }});
  if(!cred)throw new Error('Création annulée.');
  const spki=cred.response.getPublicKey?.();
  const auth=cred.response.getAuthenticatorData?.();
  const alg=cred.response.getPublicKeyAlgorithm?.();
  if(!spki||!auth||alg!==-7)throw new Error('Cette passkey n’expose pas la clé ES256 requise par NEXUS.');
  await call('/api/v1/passkey/register','POST',{
   challengeId:opts.challengeId,credentialId:b64u(cred.rawId),
   clientDataJSON:b64u(cred.response.clientDataJSON),authenticatorData:b64u(auth),
   publicKey:b64u(spki),alg,label:'Passkey iPhone'
  });
  localStorage.setItem(LOCK_FLAG,'1');
  unlocked=false;
  closeModal();renderLock();
 }
 async function verify(){
  const opts=await call('/api/v1/passkey/options','POST',{kind:'verify'});
  if(!opts.credentialIds?.length)throw new Error('Aucune passkey enregistrée. Utilise ta clé de récupération.');
  const assertion=await navigator.credentials.get({publicKey:{
    challenge:b64bytes(opts.challenge),rpId:opts.rpId,timeout:120000,
    userVerification:'required',
    allowCredentials:opts.credentialIds.map(id=>({type:'public-key',id:b64bytes(id)}))
  }});
  if(!assertion)throw new Error('Vérification annulée.');
  await call('/api/v1/passkey/verify','POST',{
   challengeId:opts.challengeId,credentialId:b64u(assertion.rawId),
   clientDataJSON:b64u(assertion.response.clientDataJSON),
   authenticatorData:b64u(assertion.response.authenticatorData),
   signature:b64u(assertion.response.signature)
  });
  unlockUI();toast('NEXUS déverrouillé.');
 }
 function renderLock(){
  if(!lockedByPreference()||unlocked){unlockUI();return;}
  document.documentElement.classList.add('nexus-lock-pending');
  let host=document.getElementById('nexus-lock-overlay');
  if(!host){host=document.createElement('div');host.id='nexus-lock-overlay';document.body.appendChild(host);}
  host.innerHTML=`<div class="nx-lock-card">
   <div class="nx-lock-mark">N</div>
   <h1>NEXUS verrouillé</h1>
   <p>Vérifie ton identité avec la passkey de l'iPhone (Face ID ou code).</p>
   <button class="btn" id="nx-unlock-passkey">Déverrouiller avec Face ID / passkey</button>
   <details><summary>Utiliser ma clé de récupération</summary>
    <p>Cette solution fonctionne hors ligne si le coffre est déjà sur cet appareil.</p>
    <label for="nx-recovery-unlock">Clé de récupération</label>
    <input type="password" id="nx-recovery-unlock" autocomplete="off" autocapitalize="off" spellcheck="false">
    <button class="btn btn-soft" id="nx-unlock-recovery">Déverrouiller avec la clé</button>
   </details>
   <small>Verrouillage de confort : les données locales ne sont pas chiffrées par cette option.</small>
  </div>`;
  host.querySelector('#nx-unlock-passkey').addEventListener('click',()=>safe(verify));
  host.querySelector('#nx-unlock-recovery').addEventListener('click',()=>safe(async()=>{
    const key=document.getElementById('nx-recovery-unlock').value.trim();
    if(!await window.NexusCloud?.validateRecoveryKey?.(key))throw new Error('Clé de récupération incorrecte.');
    unlockUI();toast('Déverrouillé avec la clé de récupération.');
  }));
 }
 async function openPanel(){
  if(!available())throw new Error('WebAuthn n’est pas disponible ici. Essaie dans Safari iPhone.');
  const supported=await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(()=>false);
  const list=await call('/api/v1/passkey/list');
  modal('Face ID / Passkeys',`
   <div class="info-strip">${svg('shield')} Cette option fait vérifier une signature WebAuthn par Cloudflare. Elle verrouille l’interface NEXUS, mais ne chiffre pas les données locales ni la clé de récupération.</div>
   <p class="muted-note">Authentificateur iPhone : ${supported?'Disponible':'Non confirmé'} · Verrouillage : ${lockedByPreference()?'activé':'inactif'} · Passkeys enregistrées : ${list.credentials.length}</p>
   <div class="vault-actions">
     <button class="btn" id="nx-passkey-enroll">${svg('shield')} ${lockedByPreference()?'Ajouter une passkey':'Activer Face ID / passkey'}</button>
     ${lockedByPreference()?'<button class="btn btn-soft" id="nx-passkey-lock">Verrouiller maintenant</button><button class="btn btn-neutral" id="nx-passkey-disable">Désactiver le verrouillage local</button>':''}
   </div>
   <p class="muted-note">La clé de récupération du coffre reste indispensable sur un nouvel appareil. Face ID ou le code iPhone peuvent être utilisés selon iOS. En cas de refus, la clé permet un accès de secours.</p>
  `);
  document.getElementById('nx-passkey-enroll').addEventListener('click',()=>safe(register));
  document.getElementById('nx-passkey-lock')?.addEventListener('click',()=>{closeModal();unlocked=false;renderLock();});
  document.getElementById('nx-passkey-disable')?.addEventListener('click',()=>{
    if(!confirm('Désactiver le verrouillage de cet appareil ? Les passkeys restent enregistrées sur le serveur pour une utilisation future.'))return;
    localStorage.removeItem(LOCK_FLAG);unlockUI();closeModal();toast('Verrouillage désactivé.');
  });
 }
 window.NexusFace={openPanel:()=>safe(openPanel),init:renderLock,isLocked:()=>lockedByPreference()&&!unlocked};
})();
