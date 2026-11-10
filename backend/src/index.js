// NEXUS API — security-first bootstrap. No personal-data endpoints until auth is active.
const APP_ORIGIN = 'https://leomgl.github.io';
function json(payload, status=200, origin='') {
  const headers = {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Vary':'Origin'
  };
  if(origin===APP_ORIGIN) {
    headers['Access-Control-Allow-Origin']=APP_ORIGIN;
    headers['Access-Control-Allow-Methods']='GET, OPTIONS';
    headers['Access-Control-Allow-Headers']='Content-Type, Authorization';
  }
  return new Response(JSON.stringify(payload),{status,headers});
}
export default {
  async fetch(request, env) {
    const origin=request.headers.get('Origin')||'';
    if(origin && origin!==APP_ORIGIN) return json({ok:false,error:'Origin not allowed'},403);
    if(request.method==='OPTIONS') {
      if(origin!==APP_ORIGIN) return json({ok:false,error:'Origin not allowed'},403);
      return new Response(null,{status:204,headers:{
        'Access-Control-Allow-Origin':APP_ORIGIN,
        'Access-Control-Allow-Methods':'GET, OPTIONS',
        'Access-Control-Allow-Headers':'Content-Type, Authorization',
        'Access-Control-Max-Age':'600',
        'Vary':'Origin'
      }});
    }
    const path=new URL(request.url).pathname;
    if(request.method==='GET' && path==='/api/health') {
      try {
        if(!env.DB) throw new Error('Missing database binding');
        const result=await env.DB.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').first();
        return json({ok:true,service:'nexus-api',database:result?'ready':'uninitialized',schema:result?.version??null},200,origin);
      } catch {
        return json({ok:false,service:'nexus-api',database:'unavailable'},503,origin);
      }
    }
    if(request.method==='GET' && path==='/api/config') {
      return json({ok:true,cloudSync:false,authentication:false,notifications:false,requiresConsent:true},200,origin);
    }
    if(path.startsWith('/api/')) {
      return json({ok:false,error:'AUTH_NOT_CONFIGURED',message:'Synchronisation désactivée tant que l’authentification n’est pas disponible.'},503,origin);
    }
    return json({ok:false,error:'NOT_FOUND'},404,origin);
  }
};
