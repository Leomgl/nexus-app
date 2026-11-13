import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import api from '../backend/src/index.js';
test('L’API Nexus refuse les anciens endpoints sans binding de relais',async()=>{
 const file=readFileSync(new URL('../backend/wrangler.toml',import.meta.url),'utf8');
 const source=readFileSync(new URL('../backend/src/index.js',import.meta.url),'utf8');
 assert.doesNotMatch(file,/LINK_RELAY|nexus-link-api/);
 assert.doesNotMatch(file,/^crons\s*=/m,'les crons push restent désactivés');
 assert.doesNotMatch(source,/env\.LINK_RELAY/);
 const req=new Request('https://nexus-app-api.invalid/api/v1/link/events',{
  headers:{origin:'https://leomgl.github.io'}
 });
 const r=await api.fetch(req,{});
 assert.equal(r.status,410);
 assert.match((await r.json()).error,/LEGACY_RELAY_RETIRED/);
});
