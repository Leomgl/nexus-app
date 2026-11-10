/* NEXUS 0.3 — encrypted manual cloud backups; no automatic sync. */
'use strict';
(() => {
  const API = 'https://nexus-app-api.q9pfwtztsc.workers.dev';
  const KEY_ID = 'cloud_vault_v1';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const base64url = bytes => {
    let str=''; for (const x of bytes) str+=String.fromCharCode(x);
    return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  };
  const unbase64url = str => {
    if(!/^[A-Za-z0-9_-]+$/.test(str))throw new Error('Clé de récupération incorrecte.');
    const raw=atob(str.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-str.length%4)%4));
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  };
  const hex = bytes => [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
  const cryptoHash = async value => new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value)));
  async function keys(secret) {
    const raw=unbase64url(secret.trim());
    if(raw.byteLength!==32 || base64url(raw)!==secret.trim())throw new Error('La clé de récupération doit contenir 32 octets.');
    const master=await crypto.subtle.importKey('raw',raw,'HKDF',false,['deriveBits','deriveKey']);
    const salt=enc.encode('NEXUS-vault-v1');
    const authBits=await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info:enc.encode('nexus-auth-token-v1')},master,256);
    const aes=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt,info:enc.encode('nexus-aes-key-v1')},master,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    return {token:base64url(new Uint8Array(authBits)),aes};
  }
  async function api(path,method='GET',value,token) {
    const headers={'accept':'application/json'};
    if(value!==undefined)headers['content-type']='application/json';
    if(token)headers.authorization='Bearer '+token;
    let res;
    try{res=await fetch(API+path,{method,headers,body:value===undefined?undefined:JSON.stringify(value),cache:'no-store'});}
    catch{throw new Error('Connexion Cloudflare impossible. Réessaie avec Internet.');}
    let body;try{body=await res.json();}catch{throw new Error('Réponse Cloudflare invalide.');}
    if(!res.ok){
      const errors={INVITATION_INVALID:'Code d’invitation invalide ou déjà utilisé.',
        UNAUTHORIZED:'Clé de récupération inconnue.',
        VERSION_CONFLICT:'Conflit : une autre sauvegarde cloud est plus récente. Restaure-la avant tout nouvel envoi.',
        TOO_LARGE:'Sauvegarde trop volumineuse (maximum 4 Mo).',
        INVALID_PAYLOAD:'Format de sauvegarde refusé par le serveur.',
        DATABASE_UNAVAILABLE:'La base Cloudflare est temporairement indisponible.'};
      throw new Error(errors[body?.error]||('Le serveur a répondu : '+(body?.error||res.status)));
    }
    return body;
  }
  const db = () => {if(!dbHandle)throw new Error('Le stockage sécurisé IndexedDB est indisponible sur cet appareil.');return dbHandle;};
  const readState = () => new Promise((resolve,reject)=>{
    const req=db().transaction(DB_STORE,'readonly').objectStore(DB_STORE).get(KEY_ID);
    req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
  });
  const writeState = value => new Promise((resolve,reject)=>{
    const tx=db().transaction(DB_STORE,'readwrite');
    if(value===null)tx.objectStore(DB_STORE).delete(KEY_ID);
    else tx.objectStore(DB_STORE).put(value,KEY_ID);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });
  const validSnapshot = x => !!x && x.app==='NEXUS'&&x.schemaVersion===2&&
    !!x.data&&typeof x.data==='object'&&
    ['notes','events','tasks','contacts','projects','purchases','transactions','limits']
      .every(k=>Array.isArray(x.data[k]));
  function localSnapshot(){
    return {app:'NEXUS',schemaVersion:2,exportedAt:new Date().toISOString(),
      data:JSON.parse(JSON.stringify(data))};
  }
  async function encrypt(obj,aes) {
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const plain=enc.encode(JSON.stringify(obj));
    if(plain.length>3_900_000)throw new Error('Sauvegarde trop volumineuse : exporte ton JSON local.');
    const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,plain));
    return {alg:'AES-256-GCM',iv:base64url(iv),ciphertext:base64url(ciphertext)};
  }
  async function decrypt(payload,aes){
    if(payload?.alg!=='AES-256-GCM')throw new Error('Format de coffre inconnu.');
    try{
      const iv=unbase64url(payload.iv),ct=unbase64url(payload.ciphertext);
      if(iv.length!==12)throw new Error('Invalid nonce');
      const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},aes,ct);
      const obj=JSON.parse(dec.decode(plain));
      if(!validSnapshot(obj))throw new Error('Sauvegarde incompatible.');
      return obj;
    }catch{
      throw new Error('Impossible de déchiffrer : mauvaise clé ou sauvegarde corrompue.');
    }
  }
  const busy = async (func) => {
    try{await func();}catch(err){alert(err.message||'Opération cloud impossible.');}
  };

  // Guarded opt-in continuous backup. No silent destructive merges.
  const fingerprint=async obj=>hex(await cryptoHash(JSON.stringify(obj.data)));
  let autoTimer=null,autoRunning=false;
  function queueAuto(delay=3500){
    if(autoTimer)clearTimeout(autoTimer);
    autoTimer=setTimeout(()=>autoStep().catch(err=>console.warn('NEXUS auto sync paused',err?.message)),delay);
  }
  async function autoStep(){
    if(autoRunning||!navigator.onLine)return;
    const st=await readState();
    if(!st?.autoBackup||!st.canUpload||st.conflict||!st.lastSyncedDigest)return;
    autoRunning=true;
    try{
      const key=await keys(st.secret),remote=await api('/api/v1/snapshot','GET',undefined,key.token);
      const snapshot=localSnapshot(),localDigest=await fingerprint(snapshot);
      if(remote.version!==st.version){
        if(localDigest===st.lastSyncedDigest&&remote.payload){
          const restored=await decrypt(remote.payload,key.aes);
          const newDigest=await fingerprint(restored);
          // Keep a separate local rollback copy of the previous snapshot.
          const tx=db().transaction(DB_STORE,'readwrite');
          tx.objectStore(DB_STORE).put(snapshot,'cloud_last_autosync_backup_v1');
          await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
          // Check for edits made while the remote version was downloading.
          if(await fingerprint(localSnapshot())!==localDigest){
            await writeState({...st,autoBackup:false,conflict:true,canUpload:false});
            toast('Conflit local : synchronisation suspendue.');return;
          }
          assignData(restored.data);await persist();render();
          await writeState({...st,version:remote.version,lastSyncedDigest:newDigest,conflict:false});
          toast('NEXUS actualisé depuis ton coffre.');
        }else{
          await writeState({...st,autoBackup:false,conflict:true,canUpload:false});
          toast('Conflit détecté : synchronisation suspendue.');
        }
        return;
      }
      if(localDigest===st.lastSyncedDigest)return;
      const payload=await encrypt(snapshot,key.aes);
      const result=await api('/api/v1/snapshot','PUT',{expectedVersion:st.version,payload},key.token);
      const latest=await readState();
      await writeState({...latest,version:result.version,lastSyncedDigest:localDigest,conflict:false});
      const fresh=await fingerprint(localSnapshot());
      if(fresh!==localDigest)queueAuto(2000);
    }catch(err){
      if(/conflit|VERSION_CONFLICT|409/i.test(String(err.message))){
        const cur=await readState();await writeState({...cur,autoBackup:false,conflict:true,canUpload:false});
        toast('Conflit cloud : synchro suspendue.');
      }else{
        console.warn('Cloud autosync retry on next online check',err?.message);
      }
    }finally{autoRunning=false;}
  }
  function toggleAuto(){
    return busy(async()=>{
      const st=await readState();
      if(!st)throw new Error('Connecte ton coffre auparavant.');
      if(st.autoBackup){
        await writeState({...st,autoBackup:false});toast('Synchro automatique désactivée.');viewPanel();return;
      }
      if(st.conflict||!st.canUpload||!st.lastSyncedDigest){
        throw new Error('Fais d’abord une sauvegarde cloud manuelle depuis cet appareil, ou résous le conflit.');
      }
      if(!confirm('Activer la sauvegarde automatique chiffrée et la réception des changements lorsque cet appareil est à jour ? En cas de modifications concurrentes, NEXUS suspendra la synchro.'))return;
      await writeState({...st,autoBackup:true});
      toast('Synchronisation prudente activée.');viewPanel();queueAuto(500);
    });
  }
  window.addEventListener('online',()=>queueAuto(750));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueAuto(750);});
  setInterval(()=>{if(!document.hidden)queueAuto(1000);},60000);

  async function viewPanel(){
    try{
      const state=await readState();
      if(!state){
        modal('Coffre cloud · V0.3',`
          <div class="info-strip">${svg('shield')} Tes données sont chiffrées sur l'iPhone avant d'être envoyées. Pas de synchronisation automatique.</div>
          <form id="vault-create-form" class="vault-form">
            <h3>Créer mon coffre</h3>
            <p>Une seule fois : utilise le code d'invitation fourni pour activer ton coffre personnel.</p>
            <label for="vault-invite">Code d'invitation</label>
            <input id="vault-invite" name="invite" autocomplete="off" spellcheck="false" required maxlength="80" placeholder="Ton code personnel">
            <button type="submit" class="btn">Créer un coffre chiffré</button>
          </form>
          <form id="vault-connect-form" class="vault-form">
            <h3>Me connecter à mon coffre</h3>
            <p>Pour un autre iPhone ou après une réinstallation, utilise ta clé de récupération.</p>
            <label for="vault-secret">Clé de récupération</label>
            <input id="vault-secret" name="secret" type="password" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Clé de 43 caractères">
            <button type="submit" class="btn btn-soft">Retrouver mon coffre</button>
          </form>
          <small class="muted-note">Ta clé de récupération ne peut pas être recréée par Cloudflare. Conserve-la dans un gestionnaire de mots de passe.</small>
        `);
        document.getElementById('vault-create-form').addEventListener('submit',event=>{
          event.preventDefault();busy(async()=>{
            const button=event.currentTarget.querySelector('button');button.disabled=true;
            try {
              const invite=event.currentTarget.elements.invite.value.trim();
              const secret=base64url(crypto.getRandomValues(new Uint8Array(32)));
              const k=await keys(secret);
              const verifier=hex(await cryptoHash(k.token));
              await api('/api/v1/register','POST',{invite,verifier});
              await writeState({secret,version:0,canUpload:true,autoBackup:false,conflict:false});
              showRecovery(secret);
            } finally{button.disabled=false;}
          });
        });
        document.getElementById('vault-connect-form').addEventListener('submit',event=>{
          event.preventDefault();busy(async()=>{
            const secret=event.currentTarget.elements.secret.value.trim();
            const k=await keys(secret),remote=await api('/api/v1/snapshot','GET',undefined,k.token);
            await writeState({secret,version:remote.version,canUpload:!remote.payload,autoBackup:false,conflict:false});
            toast('Coffre connecté. Aucune donnée locale modifiée.');
            viewPanel();
          });
        });
        return;
      }
      modal('Coffre cloud · V0.3',`
        <div class="info-strip">${svg('shield')} Coffre connecté. Les données sont chiffrées avant envoi ; la synchronisation est manuelle.</div>
        <div class="vault-metric"><span>Dernière version cloud connue</span><strong>V${Number(state.version)||0}</strong></div>
        <p class="muted-note">${state.canUpload?'Tu peux envoyer une sauvegarde chiffrée.':'Pour éviter d’écraser une sauvegarde distante, restaure d’abord la version cloud sur cet appareil.'}</p>
        <div class="vault-actions">
          <button class="btn btn-neutral" id="vault-toggle-auto" type="button">${state.autoBackup?'Désactiver':'Activer'} la synchro automatique</button>
          ${state.conflict?'<p class="muted-note">⚠️ Deux appareils ont divergé. Synchronisation arrêtée ; conserve tes sauvegardes locales et résous le conflit manuellement.</p>':''}
          <button class="btn" data-vault="send" ${state.canUpload?'':'disabled'}>${svg('upload')} Sauvegarder vers le cloud</button>
          <button class="btn btn-soft" data-vault="receive">${svg('download')} Restaurer depuis le cloud</button>
          <button class="btn btn-neutral" data-vault="key">${svg('shield')} Voir ma clé de récupération</button>
          <button class="btn btn-neutral" data-vault="disconnect">${svg('x')} Déconnecter cet appareil</button>
        </div>
        <small class="muted-note">La restauration remplace l'espace local uniquement après ton accord. Une sauvegarde JSON locale est conseillée avant.</small>
      `);
      document.getElementById('vault-toggle-auto')?.addEventListener('click',toggleAuto);
      document.querySelectorAll('[data-vault]').forEach(el=>el.addEventListener('click',()=>busy(async()=>{
        const action=el.dataset.vault;
        if(action==='key'){if(confirm('Afficher ta clé privée à l’écran ? Ne la partage jamais.'))showRecovery(state.secret);return;}
        if(action==='disconnect'){
          if(!confirm('Déconnecter ce téléphone du coffre ? Tes notes locales resteront intactes. Tu auras besoin de la clé de récupération pour te reconnecter.'))return;
          await writeState(null);toast('Appareil déconnecté ; notes locales conservées.');viewPanel();return;
        }
        const k=await keys(state.secret);
        if(action==='send'){
          if(!state.canUpload)throw new Error('Restaure d’abord la sauvegarde cloud pour protéger la version distante.');
          if(!confirm('Envoyer maintenant une copie chiffrée de tes données locales dans le coffre cloud ?'))return;
          const remote=await api('/api/v1/snapshot','GET',undefined,k.token);
          if(remote.version!==state.version)throw new Error('Le coffre a changé depuis ta dernière sauvegarde. Télécharge la nouvelle version avant tout envoi.');
          const sentSnapshot=localSnapshot();
          const payload=await encrypt(sentSnapshot,k.aes);
          const result=await api('/api/v1/snapshot','PUT',{expectedVersion:state.version,payload},k.token);
          await writeState({...state,version:result.version,canUpload:true,conflict:false,lastSyncedDigest:await fingerprint(sentSnapshot)});
          queueAuto(3000);
          toast('Sauvegarde cloud chiffrée enregistrée.');viewPanel();return;
        }
        if(action==='receive'){
          const remote=await api('/api/v1/snapshot','GET',undefined,k.token);
          if(!remote.payload)throw new Error('Le coffre est encore vide : aucune sauvegarde à restaurer.');
          const snapshot=await decrypt(remote.payload,k.aes);
          const count=Object.values(data).reduce((n,items)=>n+items.length,0);
          if(!confirm(`Restaurer la version cloud V${remote.version} ? Cela REMPLACERA ${count} éléments locaux. Tu peux d’abord exporter un JSON dans Réglages.`))return;
          if(!confirm('Dernière confirmation : as-tu sauvegardé les données locales que tu souhaites conserver ?'))return;
          assignData(snapshot.data);await persist();
          await writeState({...state,version:remote.version,canUpload:true,conflict:false,lastSyncedDigest:await fingerprint(localSnapshot())});
          closeModal();render();toast('Sauvegarde cloud restaurée.');return;
        }
      })));
    }catch(err){alert(err.message||'Stockage indisponible');}
  }
  function showRecovery(secret) {
    modal('Clé de récupération NEXUS',`
      <div class="info-strip">${svg('shield')} Cette clé est la SEULE manière de rouvrir ton coffre sur un autre appareil. Sauvegarde-la maintenant dans ton gestionnaire de mots de passe.</div>
      <label for="vault-recovery">Ta clé personnelle — ne la partage jamais</label>
      <textarea id="vault-recovery" class="vault-secret" readonly spellcheck="false">${escapeHtml(secret)}</textarea>
      <div class="vault-actions">
        <button class="btn" id="vault-copy-key">${svg('download')} Copier la clé</button>
        <button class="btn btn-neutral" id="vault-back">J'ai conservé la clé</button>
      </div>
    `);
    document.getElementById('vault-copy-key').addEventListener('click',async()=>{
      const el=document.getElementById('vault-recovery');
      try{await navigator.clipboard.writeText(el.value);toast('Clé copiée : conserve-la en lieu sûr.');}
      catch{el.select();toast('Sélectionne la clé et copie-la manuellement.');}
    });
    document.getElementById('vault-back').addEventListener('click',viewPanel);
  }
  async function session(){const state=await readState();if(!state?.secret)return null;const k=await keys(state.secret);return {token:k.token,version:state.version};}
  window.NexusCloud={openPanel:viewPanel,session,onLocalChange:queueAuto};
  queueAuto(12000);
})();
