// NEXUS LINK v1 — zero-knowledge encrypted relay. This Worker never receives source titles, prices or vault recovery keys.
const FRONTENDS=new Set([
 'https://leomgl.github.io',
 'https://gaming-app.q9pfwtztsc.workers.dev',
 'https://rituel-app.q9pfwtztsc.workers.dev',
 'https://rituel-web.q9pfwtztsc.workers.dev',
 'https://vestiaire-app.q9pfwtztsc.workers.dev',
 'https://garage-app.q9pfwtztsc.workers.dev'
]);
const SCOPES={
 gaming:new Set(['installed_summary','future_spending','pass_deadline','pass_paid','dlc_release','game_release','gaming_event']),
 rituel:new Set(['restock_purchase','restock_task','product_paid','routine_schedule','routine_summary','trip_context']),
 vestiaire:new Set(['outfit_catalog']),
 garage:new Set(['rituel_catalog','rituel_location_request','garage_locations','trip_context'])
};
const HEX64=/^[a-f0-9]{64}$/i, UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const BASE64=/^[A-Za-z0-9_-]+$/;
const response=(payload,status=200,origin='',method='GET')=>{
 const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','vary':'Origin'};
 if(FRONTENDS.has(origin)){headers['access-control-allow-origin']=origin;headers['access-control-allow-methods']='GET, POST, OPTIONS';headers['access-control-allow-headers']='Authorization,Content-Type';}
 return new Response(JSON.stringify(payload),{status,headers});
};
const sha256=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
const unauthorized=(o)=>response({ok:false,error:'UNAUTHORIZED'},401,o);
async function readBody(req,maxBytes=12000){
 const len=Number(req.headers.get('content-length')||0);
 if(len>maxBytes)throw new Error('TOO_LARGE');
 const body=await req.text();if(body.length>maxBytes)throw new Error('TOO_LARGE');
 try{return JSON.parse(body)}catch{throw new Error('INVALID_JSON')}
}
async function authorize(req,env,id,role){
 if(!UUID.test(id||''))return null;
 const raw=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.get('authorization')||'');
 if(!raw)return null;
 const hash=await sha256(raw[1]);
 const column=role==='write'?'writer_hash':role==='read'?'reader_hash':null;
 if(role==='either'){
  return env.DB.prepare('SELECT * FROM connections WHERE id=? AND revoked_at IS NULL AND (writer_hash=? OR reader_hash=?)').bind(id,hash,hash).first();
 }
 return env.DB.prepare('SELECT * FROM connections WHERE id=? AND revoked_at IS NULL AND '+column+'=?').bind(id,hash).first();
}
async function pair(req,env,o){
 if(!env.LINK_PEPPER)return response({ok:false,error:'NOT_CONFIGURED'},503,o);
 const body=await readBody(req,4000);
 const {id,sourceApp,writerVerifier,readerVerifier}=body||{};
 if(!UUID.test(id||'')||!SCOPES[sourceApp]||!HEX64.test(writerVerifier||'')||!HEX64.test(readerVerifier||'')||writerVerifier===readerVerifier)
  return response({ok:false,error:'INVALID_PAIR'},400,o);
 const scopes=body.scopes;
 if(!Array.isArray(scopes)||scopes.length===0||scopes.length>10||new Set(scopes).size!==scopes.length||scopes.some(s=>!SCOPES[sourceApp].has(s)))
  return response({ok:false,error:'INVALID_SCOPES'},400,o);
 const now=Date.now(),day=new Date(now).toISOString().slice(0,10);
 const ip=req.headers.get('CF-Connecting-IP')||'no-ip';
 const rateKey=await sha256(day+'|'+ip+'|'+env.LINK_PEPPER);
 const rate=await env.DB.prepare('INSERT INTO pairing_rate(day_key,count,updated_at) VALUES(?,1,?) ON CONFLICT(day_key) DO UPDATE SET count=count+1,updated_at=excluded.updated_at WHERE count<10 RETURNING count').bind(rateKey,now).first();
 if(!rate)return response({ok:false,error:'PAIR_LIMIT'},429,o);
 const total=await env.DB.prepare('SELECT COUNT(*) AS n FROM connections WHERE revoked_at IS NULL').first();
 if((total?.n||0)>5000)return response({ok:false,error:'CAPACITY_LIMIT'},503,o);
 try{
  await env.DB.prepare('INSERT INTO connections(id,source_app,writer_hash,reader_hash,scopes_json,created_at,last_activity) VALUES(?,?,?,?,?,?,?)')
   .bind(id,sourceApp,writerVerifier.toLowerCase(),readerVerifier.toLowerCase(),JSON.stringify(scopes),now,now).run();
 }catch(err){
  // Distinguish an actual duplicate UUID from schema/DB errors; never mislabel failures.
  const detail=String(err?.message||'');
  const alreadyExists=/UNIQUE constraint failed:\s*connections\.id/i.test(detail);
  if(!alreadyExists)console.error('NEXUS LINK: failed to save pair',/CHECK constraint failed/i.test(detail)?'SCHEMA_CHECK':'DB_WRITE');
  return response({ok:false,error:alreadyExists?'PAIR_ALREADY_EXISTS':'PAIR_SAVE_FAILED'},alreadyExists?409:503,o);
 }
 return response({ok:true,connectionId:id,sourceApp,scopes},201,o);
}
async function status(req,env,o){
 const id=new URL(req.url).searchParams.get('id');
 const conn=await authorize(req,env,id,'either');
 if(!conn)return unauthorized(o);
 return response({ok:true,connected:true,sourceApp:conn.source_app,scopes:JSON.parse(conn.scopes_json),createdAt:conn.created_at},200,o);
}
async function publish(req,env,o){
 const body=await readBody(req,12000),id=body?.connectionId;
 const conn=await authorize(req,env,id,'write');if(!conn)return unauthorized(o);
 const {sourceKey,revision,scope,nonce,ciphertext}=body;
 const scopes=JSON.parse(conn.scopes_json);
 if(!scopes.includes(scope))return response({ok:false,error:'SCOPE_DENIED'},403,o);
 if(!HEX64.test(sourceKey||'')||!Number.isSafeInteger(revision)||revision<1||revision>1e6||
    typeof nonce!=='string'||nonce.length!==16||!BASE64.test(nonce)||
    typeof ciphertext!=='string'||ciphertext.length<24||ciphertext.length>10400||!BASE64.test(ciphertext))
  return response({ok:false,error:'INVALID_EVENT'},400,o);
 const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM encrypted_events WHERE connection_id=? AND ack_at IS NULL').bind(id).first();
 if(count.n>=250)return response({ok:false,error:'INBOX_FULL'},429,o);
 const rowId=crypto.randomUUID(),now=Date.now();
 const result=await env.DB.prepare('INSERT INTO encrypted_events(id,connection_id,source_key,revision,scope,nonce,ciphertext,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(connection_id,source_key,revision) DO NOTHING')
  .bind(rowId,id,sourceKey.toLowerCase(),revision,scope,nonce,ciphertext,now).run();
 if(result.meta?.changes===0)return response({ok:true,deduplicated:true},200,o);
 return response({ok:true,id:rowId,deduplicated:false},201,o);
}
async function inbox(req,env,o){
 const id=new URL(req.url).searchParams.get('id');
 const conn=await authorize(req,env,id,'read');if(!conn)return unauthorized(o);
 const messages=await env.DB.prepare('SELECT id,source_key AS sourceKey,revision,scope,nonce,ciphertext,created_at AS createdAt FROM encrypted_events WHERE connection_id=? AND ack_at IS NULL AND created_at>=? ORDER BY created_at ASC LIMIT 50')
  .bind(id,Date.now()-30*86400000).all();
 return response({ok:true,messages:messages.results||[]},200,o);
}
async function ack(req,env,o){
 const {connectionId,messageId}=await readBody(req,2000);
 const conn=await authorize(req,env,connectionId,'read');if(!conn)return unauthorized(o);
 if(!UUID.test(messageId||''))return response({ok:false,error:'INVALID_ID'},400,o);
 const now=Date.now();
 const r=await env.DB.prepare('UPDATE encrypted_events SET ack_at=? WHERE connection_id=? AND id=? AND ack_at IS NULL').bind(now,connectionId,messageId).run();
 return response({ok:true,acknowledged:(r.meta?.changes||0)>0},200,o);
}
async function revoke(req,env,o){
 const {connectionId}=await readBody(req,2000);
 const conn=await authorize(req,env,connectionId,'read');if(!conn)return unauthorized(o);
 const now=Date.now();
 await env.DB.prepare('UPDATE connections SET revoked_at=? WHERE id=? AND revoked_at IS NULL').bind(now,connectionId).run();
 await env.DB.prepare('DELETE FROM encrypted_events WHERE connection_id=?').bind(connectionId).run();
 return response({ok:true,revoked:true},200,o);
}
export default {
 async fetch(request,env){
  const origin=request.headers.get('origin')||'';
  if(origin&&!FRONTENDS.has(origin))return response({ok:false,error:'ORIGIN_DENIED'},403,origin);
  if(request.method==='OPTIONS')return response({ok:true},200,origin);
  const path=new URL(request.url).pathname;
  if(path==='/api/health'&&request.method==='GET')return response({ok:true,protocol:'nexus-link-v1',encryptedRelay:true,liveUserData:false},200,origin);
  try{
   if(path==='/api/v1/link/pair'&&request.method==='POST')return await pair(request,env,origin);
   if(path==='/api/v1/link/status'&&request.method==='GET')return await status(request,env,origin);
   if(path==='/api/v1/link/events'&&request.method==='POST')return await publish(request,env,origin);
   if(path==='/api/v1/link/inbox'&&request.method==='GET')return await inbox(request,env,origin);
   if(path==='/api/v1/link/ack'&&request.method==='POST')return await ack(request,env,origin);
   if(path==='/api/v1/link/revoke'&&request.method==='POST')return await revoke(request,env,origin);
   return response({ok:false,error:'NOT_FOUND'},404,origin);
  }catch(e){
   if(e.message==='TOO_LARGE')return response({ok:false,error:'TOO_LARGE'},413,origin);
   if(e.message==='INVALID_JSON')return response({ok:false,error:'INVALID_JSON'},400,origin);
   return response({ok:false,error:'SERVER_ERROR'},500,origin);
  }
 }
};