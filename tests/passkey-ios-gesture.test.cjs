const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('passkey-client.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const serviceWorker=fs.readFileSync('sw.js','utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness({lock=true,session=true,backendError=false}={}){
 const ids=new Map(),notices=[],requests=[],credsCalls=[],flags=new Map();
 if(lock)flags.set('nexus_passkey_ui_lock_v1','1');
 let gesture=false;
 const element=id=>{
  if(!ids.has(id))ids.set(id,{
   id,isConnected:true,disabled:false,textContent:'',innerHTML:'',value:'',
   listeners:{},
   addEventListener(type,fn){this.listeners[type]=fn;},
   select(){},
   remove(){this.isConnected=false;ids.delete(this.id);},
  });
  return ids.get(id);
 };
 const doc={
  documentElement:{classList:{add(){},remove(){}}},
  body:{appendChild(value){ids.set(value.id,value);}},
  getElementById:id=>id==='nexus-lock-overlay'?(ids.get(id)||null):element(id),
  createElement(tag){
   if(tag!=='div')throw Error('unexpected element '+tag);
   return {
    id:'',innerHTML:'',
    querySelector(selector){return element(selector.slice(1));},
    remove(){ids.delete(this.id);}
   };
  }
 };
 const makeResponse=(response,status=200)=>({ok:status>=200&&status<300,status,json:async()=>response});
 const creds={
  create({publicKey}){
   credsCalls.push({kind:'create',gesture,publicKey});
   return Promise.resolve({
    rawId:new Uint8Array([5,6,7,8]).buffer,
    response:{
     clientDataJSON:new Uint8Array([1,2,3]).buffer,
     getPublicKey(){return new Uint8Array(80).buffer},
     getAuthenticatorData(){return new Uint8Array(70).buffer},
     getPublicKeyAlgorithm(){return -7}
    }
   });
  },
  get({publicKey}){
   credsCalls.push({kind:'get',gesture,publicKey});
   return Promise.resolve({
    rawId:new Uint8Array([5,6,7,8]).buffer,
    response:{
     clientDataJSON:new Uint8Array([1,2,3]).buffer,
     authenticatorData:new Uint8Array([4,5,6]).buffer,
     signature:new Uint8Array([7,8,9]).buffer
    }
   });
  }
 };
 const fetchMock=async (url,init)=>{
  const path=new URL(url).pathname;
  requests.push({path,method:init?.method||'GET',body:init?.body});
  if(backendError&&path.includes('options'))return makeResponse({error:'CHALLENGE_EXPIRED'},408);
  if(path.endsWith('/list'))return makeResponse({credentials:[]});
  if(path.endsWith('/options'))return makeResponse({
   challenge:'AQIDBA',credentialIds:['BQYHCA'],rpId:'leomgl.github.io',challengeId:'challenge-1'
  });
  return makeResponse({ok:true,verified:true});
 };
 const ctx={
  window:{
   PublicKeyCredential:function(){},
   NexusCloud:{session:async()=>session?{token:'safe-token'}:null,
    validateRecoveryKey:async()=>true},
  },
  navigator:{credentials:creds},
  PublicKeyCredential:{
   isUserVerifyingPlatformAuthenticatorAvailable:async()=>true
  },
  document:doc,
  fetch:fetchMock,
  crypto:require('node:crypto').webcrypto,
  TextEncoder,TextDecoder,Uint8Array,Date,URL,atob,btoa,
  localStorage:{
   getItem:k=>flags.get(k)||null,
   setItem:(k,v)=>flags.set(k,v),
   removeItem:k=>flags.delete(k)
  },
  closeModal(){},
  modal(){},
  svg:()=>'<svg/>',
  toast:x=>notices.push(x),
  alert:x=>notices.push(x),
  confirm:()=>false,
  console
 };
 vm.runInNewContext(source,ctx,{filename:'passkey-client.js'});
 return {
  api:ctx.window.NexusFace,requests,credsCalls,notices,element,flags,
  tap(id){
   const fn=element(id).listeners.click;
   assert.equal(typeof fn,'function','click handler available for '+id);
   gesture=true;const ret=fn();gesture=false;return ret;
  }
 };
}

test('Face ID challenge preloads before enabling button and get starts INSIDE tap',async()=>{
 const h=harness();
 h.api.init();
 const unlock=h.element('nx-unlock-passkey');
 assert.equal(unlock.disabled,true);
 await flush();await flush();await flush();
 assert.equal(unlock.disabled,false);
 assert.match(unlock.textContent,/Déverrouiller/);
 assert.equal(h.credsCalls.length,0);
 h.tap('nx-unlock-passkey');
 assert.equal(h.credsCalls.length,1);
 assert.equal(h.credsCalls[0].kind,'get');
 assert.equal(h.credsCalls[0].gesture,true,'must retain iOS user gesture');
 await flush();await flush();
 assert.ok(h.requests.some(x=>x.path.endsWith('/passkey/verify')));
 assert.equal(h.api.isLocked(),false);
 assert.ok(h.notices.some(x=>x.includes('déverrouillé')));
});
test('Face ID registration starts INSIDE tap after server challenge is ready',async()=>{
 const h=harness({lock:false});
 await h.api.openPanel();
 await flush();await flush();
 const btn=h.element('nx-passkey-enroll');
 assert.equal(btn.disabled,false);
 h.tap('nx-passkey-enroll');
 assert.equal(h.credsCalls.length,1);
 assert.equal(h.credsCalls[0].kind,'create');
 assert.equal(h.credsCalls[0].gesture,true,'must retain iOS user gesture');
 await flush();await flush();
 assert.ok(h.requests.some(x=>x.path.endsWith('/passkey/register')));
 assert.equal(h.flags.get('nexus_passkey_ui_lock_v1'),'1');
});
test('auth service failure keeps recovery option and retries rather than bypassing lock',async()=>{
 const h=harness({backendError:true});
 h.api.init();
 await flush();await flush();await flush();
 const status=h.element('nx-passkey-status');
 const unlock=h.element('nx-unlock-passkey');
 assert.equal(unlock.disabled,false);
 assert.match(unlock.textContent,/Réessayer/);
 assert.match(status.textContent,/Défi expiré/);
 assert.equal(h.api.isLocked(),true);
 assert.equal(h.credsCalls.length,0);
 h.tap('nx-unlock-passkey');
 await flush();
 assert.equal(h.api.isLocked(),true);
});
test('missing cloud session cannot silently unlock or leak recovery key',async()=>{
 const h=harness({session:false});
 h.api.init();await flush();await flush();
 assert.equal(h.api.isLocked(),true);
 assert.match(h.element('nx-passkey-status').textContent,/coffre cloud/i);
 assert.equal(h.requests.length,0);
});
test('Face ID script must be cache-versioned in HTML and offline shell',()=>{
 assert.match(index,/passkey-client\.js\?v=02114/);
 assert.match(serviceWorker,/passkey-client\.js\?v=02114/);
 assert.match(serviceWorker,/nexus-v0\.21\.14\.6/);
 assert.match(source,/const assertionPromise=navigator\.credentials\.get/);
 assert.match(source,/const credentialPromise=navigator\.credentials\.create/);
});
