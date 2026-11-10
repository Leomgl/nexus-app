// NEXUS v0.4 - Web Push RFC 8291 / VAPID RFC 8292, WebCrypto only.
// No names, notes, contacts, descriptions, or private text is transmitted.
const te=new TextEncoder();
const b64=(buf)=>{let s='';for(const b of buf)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const un64=(s)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const concat=(...parts)=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;};
const sha=async(s)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',te.encode(s)))].map(n=>n.toString(16).padStart(2,'0')).join('');
const hkdf=async(ikm,salt,info,size)=>crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']),size*8).then(x=>new Uint8Array(x));
const JOB_ID=/^[a-f0-9]{64}$/;
function validSub(s){
  if(!s||typeof s.endpoint!=='string'||!s.keys)return false;
  let url;try{url=new URL(s.endpoint);}catch{return false;}
  if(url.protocol!=='https:'||url.username||url.password||url.port||s.endpoint.length>2500)return false;
  const h=url.hostname.toLowerCase();
  if(!['push.apple.com','fcm.googleapis.com','push.services.mozilla.com'].some(d=>h===d||h.endsWith('.'+d)))return false;
  try{return un64(s.keys.p256dh).length===65&&un64(s.keys.auth).length===16;}catch{return false;}
}
async function webPush(device,env,payload){
  if(!env.VAPID_PRIVATE_JWK||!env.VAPID_PUBLIC_KEY)throw new Error('VAPID is not configured');
  const p=un64(device.p256dh),auth=un64(device.auth);
  const ephemeral=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const sender=new Uint8Array(await crypto.subtle.exportKey('raw',ephemeral.publicKey));
  const receiver=await crypto.subtle.importKey('raw',p,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:receiver},ephemeral.privateKey,256));
  const ikm=await hkdf(shared,auth,concat(te.encode('WebPush: info\0'),p,sender),32);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const cek=await hkdf(ikm,salt,te.encode('Content-Encoding: aes128gcm\0'),16);
  const nonce=await hkdf(ikm,salt,te.encode('Content-Encoding: nonce\0'),12);
  const plaintext=concat(te.encode(JSON.stringify(payload)),new Uint8Array([2]));
  if(plaintext.length>3700)throw new Error('Payload too large');
  const aes=await crypto.subtle.importKey('raw',cek,{name:'AES-GCM'},false,['encrypt']);
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},aes,plaintext));
  const rs=new Uint8Array([0,0,16,0]); // 4096-byte single record
  const content=concat(salt,rs,new Uint8Array([sender.length]),sender,encrypted);
  const vapid=await crypto.subtle.importKey('jwk',JSON.parse(env.VAPID_PRIVATE_JWK),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const aud=new URL(device.endpoint).origin;
  const header=b64(te.encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const claims=b64(te.encode(JSON.stringify({aud,exp:Math.floor(Date.now()/1000)+3600,sub:'https://leomgl.github.io'})));
  const unsigned=header+'.'+claims;
  const sig=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},vapid,te.encode(unsigned)));
  const jwt=unsigned+'.'+b64(sig);
  const reply=await fetch(device.endpoint,{method:'POST',headers:{
    'Authorization':'vapid t='+jwt+', k='+env.VAPID_PUBLIC_KEY,
    'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream','TTL':'3600'
  },body:content});
  if(reply.status===404||reply.status===410)return 'gone';
  if(!reply.ok)throw new Error('Push endpoint '+reply.status);
  return 'sent';
}
export const notificationsConfig=(env)=>({ok:true,ready:!!(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_JWK),publicKey:env.VAPID_PUBLIC_KEY||null,intervalMinutes:5});
export async function notificationAction(request,env,vault,path,json){
  if(request.method==='GET'&&path==='/api/v1/push/config')return json(notificationsConfig(env));
  if(request.method!=='POST')return json({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  let payload;
  try{
    if(Number(request.headers.get('content-length')||0)>120_000)throw new Error('size');
    const raw=await request.text();if(raw.length>120_000)throw new Error('size');
    payload=JSON.parse(raw);
  }catch{return json({ok:false,error:'INVALID_JSON'},400);}
  if(path==='/api/v1/push/register'){
    if(!validSub(payload?.subscription))return json({ok:false,error:'INVALID_SUBSCRIPTION'},400);
    const sub=payload.subscription,deviceId=await sha(sub.endpoint),now=Math.floor(Date.now()/1000);
    const previous=await env.DB.prepare('SELECT vault_id FROM push_devices WHERE device_id=?').bind(deviceId).first();
    if(previous&&previous.vault_id!==vault.id)return json({ok:false,error:'FORBIDDEN'},403);
    await env.DB.prepare(`INSERT INTO push_devices(device_id,vault_id,endpoint,p256dh,auth,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?) ON CONFLICT(device_id) DO UPDATE SET endpoint=excluded.endpoint,p256dh=excluded.p256dh,auth=excluded.auth,updated_at=excluded.updated_at`)
      .bind(deviceId,vault.id,sub.endpoint,sub.keys.p256dh,sub.keys.auth,now,now).run();
    return json({ok:true,deviceId});
  }
  const deviceId=payload?.deviceId;
  if(typeof deviceId!=='string'||!JOB_ID.test(deviceId))return json({ok:false,error:'INVALID_DEVICE'},400);
  const device=await env.DB.prepare('SELECT * FROM push_devices WHERE vault_id=? AND device_id=?').bind(vault.id,deviceId).first();
  if(!device)return json({ok:false,error:'DEVICE_NOT_FOUND'},404);
  if(path==='/api/v1/push/unsubscribe'){
    await env.DB.prepare('DELETE FROM push_devices WHERE device_id=? AND vault_id=?').bind(deviceId,vault.id).run();
    return json({ok:true});
  }
  if(path==='/api/v1/push/test'){
    const now=Math.floor(Date.now()/1000);
    if(now-device.last_test<90)return json({ok:false,error:'RATE_LIMITED'},429);
    await env.DB.prepare('UPDATE push_devices SET last_test=? WHERE device_id=?').bind(now,deviceId).run();
    try{
      const result=await webPush(device,env,{title:'NEXUS · Notifications activées',body:'Ton iPhone reçoit les rappels NEXUS.',tag:'nexus-test'});
      if(result==='gone'){await env.DB.prepare('DELETE FROM push_devices WHERE device_id=?').bind(deviceId).run();return json({ok:false,error:'SUBSCRIPTION_EXPIRED'},410);}
      return json({ok:true});
    }catch(e){console.error('Push test failure',String(e).slice(0,120));return json({ok:false,error:'PUSH_DELIVERY_FAILED'},502);}
  }
  if(path==='/api/v1/push/schedule'){
    const items=payload?.jobs;
    if(!Array.isArray(items)||items.length>600)return json({ok:false,error:'INVALID_JOBS'},400);
    const now=Math.floor(Date.now()/1000);
    const jobs=[];
    for(const j of items){
      if(!JOB_ID.test(j?.id)||!['event','task'].includes(j.kind)||!Number.isInteger(j.fireAt)||
         j.fireAt<now-600||j.fireAt>now+366*86400)return json({ok:false,error:'INVALID_JOB'},400);
      jobs.push({id:j.id,kind:j.kind,at:j.fireAt});
    }
    const unique=new Map(jobs.map(j=>[j.id,j]));
    const commands=[env.DB.prepare('DELETE FROM push_jobs WHERE device_id=? AND delivered_at IS NULL').bind(deviceId)];
    for(const j of unique.values())commands.push(env.DB.prepare('INSERT OR IGNORE INTO push_jobs(device_id,job_id,kind,fire_at) VALUES(?,?,?,?)').bind(deviceId,j.id,j.kind,j.at));
    await env.DB.batch(commands);
    return json({ok:true,scheduled:unique.size});
  }
  return json({ok:false,error:'NOT_FOUND'},404);
}
export async function deliverDue(env){
  if(!env.VAPID_PRIVATE_JWK||!env.VAPID_PUBLIC_KEY)return;
  const now=Math.floor(Date.now()/1000);
  const due=await env.DB.prepare(`SELECT j.device_id,j.job_id,j.kind,j.fire_at,d.endpoint,d.p256dh,d.auth
    FROM push_jobs j JOIN push_devices d ON d.device_id=j.device_id
    WHERE j.delivered_at IS NULL AND j.fire_at<=? AND j.fire_at>? ORDER BY j.fire_at LIMIT 50`).bind(now,now-86400).all();
  for(const row of (due.results||[])){
    const reserved=await env.DB.prepare('UPDATE push_jobs SET delivered_at=? WHERE device_id=? AND job_id=? AND delivered_at IS NULL')
      .bind(now,row.device_id,row.job_id).run();
    if(!reserved.meta?.changes)continue;
    try{
      const result=await webPush(row,env,{title:'NEXUS · Rappel',body:row.kind==='event'?'Tu as un rendez-vous à venir. Ouvre NEXUS pour les détails.':'Une tâche arrive à échéance. Ouvre NEXUS pour les détails.',tag:'nexus-'+row.job_id.slice(0,16)});
      if(result==='gone')await env.DB.prepare('DELETE FROM push_devices WHERE device_id=?').bind(row.device_id).run();
    }catch(e){
      console.error('Scheduled push failed',String(e).slice(0,120));
      await env.DB.prepare('UPDATE push_jobs SET delivered_at=NULL WHERE device_id=? AND job_id=? AND delivered_at=?').bind(row.device_id,row.job_id,now).run();
    }
  }
  await env.DB.prepare('DELETE FROM push_jobs WHERE delivered_at IS NOT NULL AND delivered_at<?').bind(now-2592000).run();
  await env.DB.prepare('DELETE FROM push_jobs WHERE delivered_at IS NULL AND fire_at<?').bind(now-86400).run();
}
