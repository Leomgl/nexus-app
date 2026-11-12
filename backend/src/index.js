import { notificationAction, notificationsConfig, deliverDue } from './push.js';
import { passkeyAction } from './passkeys.js';
// NEXUS v0.3 encrypted vault API. Personal records are never accepted in plaintext.
// No cookies: a high-entropy recovery secret derives a bearer token and a separate
// AES-GCM encryption key on the CLIENT. The server only stores encrypted snapshots.
const ORIGIN = 'https://leomgl.github.io';
const LINK_ORIGINS = new Set([ORIGIN,'https://gaming-app.q9pfwtztsc.workers.dev','https://rituel-web.q9pfwtztsc.workers.dev','https://vestiaire-app.q9pfwtztsc.workers.dev','https://garage-app.q9pfwtztsc.workers.dev']);
const MAX_BODY = 5_600_000;
const encoder = new TextEncoder();
function response(payload, status=200, origin='') {
  const headers = {
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer',
    'vary':'Origin',
    'access-control-allow-methods':'GET, POST, PUT, OPTIONS',
    'access-control-allow-headers':'Authorization, Content-Type',
  };
  if(origin===ORIGIN) headers['access-control-allow-origin']=ORIGIN;
  return new Response(JSON.stringify(payload),{status,headers});
}
function deny(origin){return response({ok:false,error:'FORBIDDEN'},403,origin);}
function failure(origin){return response({ok:false,error:'INTERNAL_ERROR'},500,origin);}
async function digest(value) {
  const hash=await crypto.subtle.digest('SHA-256',encoder.encode(value));
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function bodyJson(request) {
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('INVALID_JSON');
  if(Number(request.headers.get('content-length')||0)>MAX_BODY) throw new Error('TOO_LARGE');
  const text=await request.text();
  if(text.length>MAX_BODY) throw new Error('TOO_LARGE');
  return JSON.parse(text);
}
const isHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const isToken=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{43}$/.test(x);
async function authorized(request, db) {
  const match=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get('authorization')||'');
  if(!match)return null;
  const verifier=await digest(match[1]);
  return db.prepare('SELECT id, version, payload, updated_at FROM vaults WHERE verifier=?').bind(verifier).first();
}
export default {
  async fetch(request,env) {
    const origin=request.headers.get('origin')||'';
    const path=new URL(request.url).pathname;
    // The LINK service binding uses the already-working NEXUS API HTTPS origin.
    // No Gaming Origin bypass for any existing NEXUS vault, passkey or push route.
    if(path.startsWith('/api/v1/link/')){
      if(origin&&!LINK_ORIGINS.has(origin))return deny(origin);
      if(request.method==='OPTIONS'){
        if(!LINK_ORIGINS.has(origin))return deny(origin);
        return new Response(null,{status:204,headers:{
          'access-control-allow-origin':origin,
          'access-control-allow-methods':'GET, POST, OPTIONS',
          'access-control-allow-headers':'Authorization, Content-Type',
          'access-control-max-age':'600','cache-control':'no-store','vary':'Origin'
        }});
      }
      if(!env.LINK_RELAY)return response({ok:false,error:'LINK_UNAVAILABLE'},503,origin);
      try{return await env.LINK_RELAY.fetch(request);}
      catch(err){
        console.error('NEXUS LINK relay unavailable',err?.name||'Error');
        const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'Origin'};
        if(LINK_ORIGINS.has(origin))headers['access-control-allow-origin']=origin;
        return new Response(JSON.stringify({ok:false,error:'LINK_UNAVAILABLE'}),{status:503,headers});
      }
    }
    if(origin && origin!==ORIGIN)return deny(origin);
    if(request.method==='OPTIONS'){
      if(origin!==ORIGIN)return deny(origin);
      return new Response(null,{status:204,headers:{
        'access-control-allow-origin':ORIGIN,'access-control-allow-methods':'GET, POST, PUT, OPTIONS',
        'access-control-allow-headers':'Authorization, Content-Type','access-control-max-age':'600',
        'cache-control':'no-store','vary':'Origin'
      }});
    }
    if(request.method==='GET'&&path==='/api/health'){
      try{
        const row=await env.DB.prepare('SELECT MAX(version) AS version FROM schema_migrations').first();
        return response({ok:true,service:'nexus-api',database:'ready',schema:row?.version??null},200,origin);
      }catch{return response({ok:false,database:'unavailable'},503,origin);}
    }
    if(request.method==='GET'&&path==='/api/config'){
      return response({ok:true,cloudVault:true,cloudSync:'manual',authentication:'recovery-key',endToEndEncryption:'AES-256-GCM',passkeys:true,notifications:notificationsConfig(env).ready},200,origin);
    }
    if(!env.DB)return response({ok:false,error:'DATABASE_UNAVAILABLE'},503,origin);
    try{
      if(path.startsWith('/api/v1/passkey/')){
        const vault=await authorized(request,env.DB);
        if(!vault)return response({ok:false,error:'UNAUTHORIZED'},401,origin);
        return await passkeyAction(request,env,vault,path,(body,status=200)=>response(body,status,origin));
      }
      if(path.startsWith('/api/v1/push/')){
        const vault=await authorized(request,env.DB);
        if(!vault)return response({ok:false,error:'UNAUTHORIZED'},401,origin);
        return await notificationAction(request,env,vault,path,(body,status=200)=>response(body,status,origin));
      }
      if(request.method==='POST'&&path==='/api/v1/register'){
        const input=await bodyJson(request);
        if(!isHash(input?.verifier)||typeof input?.invite!=='string'||!/^[-_A-Za-z0-9]{22,64}$/.test(input.invite))return response({ok:false,error:'INVALID_INPUT'},400,origin);
        const inviteHash=await digest(input.invite), now=new Date().toISOString(), id=crypto.randomUUID();
        // The UNIQUE invitation_hash constraint prevents using an invitation twice.
        const saved=await env.DB.prepare(`INSERT INTO vaults(id, verifier, invitation_hash, version, created_at, updated_at)
          SELECT ?, ?, ?, 0, ?, ? WHERE EXISTS(SELECT 1 FROM vault_invitations WHERE hash=? AND consumed_at IS NULL)`)
          .bind(id,input.verifier,inviteHash,now,now,inviteHash).run();
        if(saved.meta?.changes!==1)return response({ok:false,error:'INVITATION_INVALID'},403,origin);
        await env.DB.prepare('UPDATE vault_invitations SET consumed_at=? WHERE hash=? AND consumed_at IS NULL').bind(now,inviteHash).run();
        return response({ok:true,vaultId:id,version:0},201,origin);
      }
      if(path==='/api/v1/snapshot'&&(request.method==='GET'||request.method==='PUT')){
        const vault=await authorized(request,env.DB);
        if(!vault)return response({ok:false,error:'UNAUTHORIZED'},401,origin);
        if(request.method==='GET'){
          return response({ok:true,version:vault.version,updatedAt:vault.updated_at,payload:vault.payload?JSON.parse(vault.payload):null},200,origin);
        }
        const input=await bodyJson(request), p=input?.payload;
        if(!Number.isSafeInteger(input?.expectedVersion)||input.expectedVersion<0||
           p?.alg!=='AES-256-GCM'||typeof p?.iv!=='string'||!/^[A-Za-z0-9_-]{16}$/.test(p.iv)||
           typeof p?.ciphertext!=='string'||p.ciphertext.length>5_300_000||
           !/^[A-Za-z0-9_-]{20,5300000}$/.test(p.ciphertext)) {
          return response({ok:false,error:'INVALID_PAYLOAD'},400,origin);
        }
        const now=new Date().toISOString();
        const changed=await env.DB.prepare('UPDATE vaults SET payload=?, version=version+1, updated_at=? WHERE id=? AND version=?')
          .bind(JSON.stringify(p),now,vault.id,input.expectedVersion).run();
        if(changed.meta?.changes!==1)return response({ok:false,error:'VERSION_CONFLICT',message:'Une autre sauvegarde cloud existe. Recharge sa version avant de réessayer.'},409,origin);
        return response({ok:true,version:input.expectedVersion+1,updatedAt:now},200,origin);
      }
      if(path.startsWith('/api/'))return response({ok:false,error:'NOT_FOUND'},404,origin);
      return response({ok:false,error:'NOT_FOUND'},404,origin);
    }catch(err){
      if(err?.message==='INVALID_JSON'||err instanceof SyntaxError)return response({ok:false,error:'INVALID_JSON'},400,origin);
      if(err?.message==='TOO_LARGE')return response({ok:false,error:'TOO_LARGE'},413,origin);
      // Avoid exposing database, authentication, or stack trace details to browsers.
      console.error('NEXUS API request failed',err?.name||'Error');
      return failure(origin);
    }
  },
  async scheduled(_event,env,ctx) {
    ctx.waitUntil(deliverDue(env));
  }
};
