// NEXUS V0.5 -- Authenticated WebAuthn passkey verification.
// The recovery-key bearer is still required: passkeys add an optional verified
// UI unlock, but cannot decrypt local/cloud snapshots by themselves.
const RP_ID='leomgl.github.io';
const APP_ORIGIN='https://leomgl.github.io';
const enc=new TextEncoder();
const b64u=bytes=>{let str='';for(const v of bytes)str+=String.fromCharCode(v);return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
function un64(s,max=10000){
  if(typeof s!=='string'||!s||s.length>max||!/^[A-Za-z0-9_-]+$/.test(s))throw new Error('INVALID_ENCODING');
  const bin=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));
  return Uint8Array.from(bin,c=>c.charCodeAt(0));
}
const equals=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
async function sha(data){return new Uint8Array(await crypto.subtle.digest('SHA-256',data));}
function derToRaw(der){
  if(der.length===64)return der; // Some authenticators return IEEE P1363.
  let pos=0;
  function length(){
    if(pos>=der.length)throw new Error('BAD_SIGNATURE');
    const head=der[pos++];
    if(head<128)return head;
    const n=head&127;
    if(n<1||n>2||pos+n>der.length)throw new Error('BAD_SIGNATURE');
    let size=0;for(let i=0;i<n;i++)size=(size<<8)|der[pos++];
    return size;
  }
  if(der[pos++]!==0x30)throw new Error('BAD_SIGNATURE');
  const total=length();
  if(total!==der.length-pos)throw new Error('BAD_SIGNATURE');
  function integer(){
    if(der[pos++]!==0x02)throw new Error('BAD_SIGNATURE');
    const len=length();
    if(len<1||len>33||pos+len>der.length)throw new Error('BAD_SIGNATURE');
    let bytes=der.slice(pos,pos+len);pos+=len;
    if(bytes.length===33&&bytes[0]===0)bytes=bytes.slice(1);
    if(bytes.length>32)throw new Error('BAD_SIGNATURE');
    const out=new Uint8Array(32);out.set(bytes,32-bytes.length);return out;
  }
  const r=integer(),s=integer();
  if(pos!==der.length)throw new Error('BAD_SIGNATURE');
  const result=new Uint8Array(64);result.set(r);result.set(s,32);return result;
}
async function validateAuthData(bytes,requireAttested){
  if(bytes.length<37)throw new Error('INVALID_AUTHENTICATOR');
  if(!equals(bytes.slice(0,32),await sha(enc.encode(RP_ID))))throw new Error('INVALID_RP_ID');
  const flags=bytes[32];
  if(!(flags&1)||!(flags&4)||(requireAttested&&!(flags&64)))throw new Error('USER_VERIFICATION_REQUIRED');
  const counter=new DataView(bytes.buffer,bytes.byteOffset+33,4).getUint32(0,false);
  return {counter,flags};
}
async function readBody(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('INVALID_BODY');
  if(Number(request.headers.get('content-length')||0)>30000)throw new Error('TOO_LARGE');
  const txt=await request.text();
  if(txt.length>30000)throw new Error('TOO_LARGE');
  const obj=JSON.parse(txt);
  if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('INVALID_BODY');
  return obj;
}
async function consumeChallenge(env,vault,id,kind,clientData){
  if(typeof id!=='string'||id.length>100)throw new Error('INVALID_CHALLENGE');
  const row=await env.DB.prepare('SELECT challenge FROM passkey_challenges WHERE id=? AND vault_id=? AND kind=? AND used_at IS NULL AND expires_at>unixepoch()').bind(id,vault.id,kind).first();
  if(!row)throw new Error('CHALLENGE_EXPIRED');
  if(clientData?.type!==(kind==='register'?'webauthn.create':'webauthn.get')||
     clientData.origin!==APP_ORIGIN||clientData.crossOrigin===true||
     clientData.challenge!==row.challenge)throw new Error('CHALLENGE_MISMATCH');
  const updated=await env.DB.prepare('UPDATE passkey_challenges SET used_at=unixepoch() WHERE id=? AND used_at IS NULL AND expires_at>unixepoch()').bind(id).run();
  if(updated.meta?.changes!==1)throw new Error('CHALLENGE_USED');
}
export async function passkeyAction(request,env,vault,path,respond){
  try{
    if(request.method==='GET'&&path==='/api/v1/passkey/list'){
      const all=await env.DB.prepare('SELECT credential_id,label,created_at,last_used_at FROM passkey_credentials WHERE vault_id=? ORDER BY created_at DESC LIMIT 20').bind(vault.id).all();
      return respond({ok:true,credentials:all.results||[]});
    }
    if(request.method!=='POST')return respond({ok:false,error:'METHOD_NOT_ALLOWED'},405);
    const input=await readBody(request);
    if(path==='/api/v1/passkey/options'){
      if(!['register','verify'].includes(input.kind))return respond({ok:false,error:'INVALID_KIND'},400);
      const bytes=crypto.getRandomValues(new Uint8Array(32));
      const id=crypto.randomUUID(),challenge=b64u(bytes);
      const now=Math.floor(Date.now()/1000);
      await env.DB.prepare('INSERT INTO passkey_challenges(id,vault_id,kind,challenge,created_at,expires_at) VALUES(?,?,?,?,?,?)').bind(id,vault.id,input.kind,challenge,now,now+180).run();
      const creds=await env.DB.prepare('SELECT credential_id FROM passkey_credentials WHERE vault_id=? LIMIT 20').bind(vault.id).all();
      return respond({ok:true,rpId:RP_ID,challenge,challengeId:id,credentialIds:(creds.results||[]).map(r=>r.credential_id)});
    }
    if(path==='/api/v1/passkey/register'){
      const clientDataBytes=un64(input.clientDataJSON,5000),clientData=JSON.parse(new TextDecoder().decode(clientDataBytes));
      await consumeChallenge(env,vault,input.challengeId,'register',clientData);
      const auth=un64(input.authenticatorData,10000),info=await validateAuthData(auth,true);
      if(input.alg!==-7)throw new Error('UNSUPPORTED_ALGORITHM');
      const publicKeyBytes=un64(input.publicKey,2000);
      if(publicKeyBytes.length>150||publicKeyBytes.length<60)throw new Error('INVALID_PUBLIC_KEY');
      await crypto.subtle.importKey('spki',publicKeyBytes,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
      const credId=un64(input.credentialId,1000);
      if(auth.length<55)throw new Error('INVALID_AUTHENTICATOR');
      const l=(auth[53]<<8)|auth[54];
      if(!l||auth.length<55+l||!equals(auth.slice(55,55+l),credId))throw new Error('INVALID_CREDENTIAL');
      if(credId.length<12||credId.length>250)throw new Error('INVALID_CREDENTIAL');
      const label=String(input.label||'Appareil personnel').slice(0,65);
      const existing=await env.DB.prepare('SELECT vault_id FROM passkey_credentials WHERE credential_id=?').bind(input.credentialId).first();
      if(existing)return respond({ok:false,error:'CREDENTIAL_EXISTS'},409);
      await env.DB.prepare('INSERT INTO passkey_credentials(credential_id,vault_id,public_key_spki,sign_count,label) VALUES(?,?,?,?,?)')
        .bind(input.credentialId,vault.id,input.publicKey,info.counter,label).run();
      return respond({ok:true});
    }
    if(path==='/api/v1/passkey/verify'){
      const credential=await env.DB.prepare('SELECT * FROM passkey_credentials WHERE credential_id=? AND vault_id=?')
        .bind(input.credentialId,vault.id).first();
      if(!credential)return respond({ok:false,error:'UNKNOWN_CREDENTIAL'},404);
      const clientBytes=un64(input.clientDataJSON,5000);
      const clientData=JSON.parse(new TextDecoder().decode(clientBytes));
      await consumeChallenge(env,vault,input.challengeId,'verify',clientData);
      const auth=un64(input.authenticatorData,5000),info=await validateAuthData(auth,false);
      const signature=derToRaw(un64(input.signature,1000));
      const key=await crypto.subtle.importKey('spki',un64(credential.public_key_spki,2000),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
      const hash=await sha(clientBytes),signing=new Uint8Array(auth.length+hash.length);
      signing.set(auth);signing.set(hash,auth.length);
      const good=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,signature,signing);
      if(!good)return respond({ok:false,error:'INVALID_SIGNATURE'},401);
      if(info.counter>0&&credential.sign_count>0&&info.counter<=credential.sign_count)return respond({ok:false,error:'INVALID_SIGN_COUNT'},401);
      await env.DB.prepare('UPDATE passkey_credentials SET sign_count=?,last_used_at=CURRENT_TIMESTAMP WHERE credential_id=? AND vault_id=?')
        .bind(Math.max(info.counter,credential.sign_count),input.credentialId,vault.id).run();
      return respond({ok:true,verified:true});
    }
    if(path==='/api/v1/passkey/remove'){
      if(typeof input.credentialId!=='string')return respond({ok:false,error:'INVALID_CREDENTIAL'},400);
      const removed=await env.DB.prepare('DELETE FROM passkey_credentials WHERE credential_id=? AND vault_id=?').bind(input.credentialId,vault.id).run();
      return respond({ok:!!removed.meta?.changes});
    }
    return respond({ok:false,error:'NOT_FOUND'},404);
  }catch(e){
    const error=String(e.message||'INVALID_REQUEST');
    const allowed=['INVALID_BODY','TOO_LARGE','CHALLENGE_EXPIRED','CHALLENGE_MISMATCH','CHALLENGE_USED','INVALID_ENCODING','INVALID_AUTHENTICATOR','INVALID_RP_ID','USER_VERIFICATION_REQUIRED','UNSUPPORTED_ALGORITHM','INVALID_PUBLIC_KEY','INVALID_CREDENTIAL','UNKNOWN_CREDENTIAL','INVALID_SIGNATURE','INVALID_SIGN_COUNT'];
    return respond({ok:false,error:allowed.includes(error)?error:'INVALID_PASSKEY_REQUEST'},400);
  }
}
