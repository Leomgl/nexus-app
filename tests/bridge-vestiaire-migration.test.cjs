'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const migration=fs.readFileSync(path.join(root,'bridge/migrations/0002_vestiaire.sql'),'utf8');
const source=fs.readFileSync(path.join(root,'bridge/worker.js'),'utf8');

test('Vestiaire D1 migration includes the source and keeps encrypted events on table rebuild',()=>{
 assert.match(migration,/source_app TEXT NOT NULL CHECK\(source_app IN \('gaming','rituel','vestiaire'\)\)/);
 assert.match(migration,/INSERT INTO connections_v2\s*\(/);
 assert.match(migration,/INSERT INTO encrypted_events_v2\s*\(/);
 assert.ok(migration.indexOf('DROP TABLE encrypted_events;')>migration.indexOf('INSERT INTO encrypted_events_v2'));
 assert.ok(migration.indexOf('DROP TABLE connections;')>migration.indexOf('DROP TABLE encrypted_events;'),'child table must be dropped before parent to avoid foreign-key cascade');
 assert.ok(migration.indexOf('ALTER TABLE connections_v2 RENAME TO connections')>migration.indexOf('DROP TABLE connections;'));
 assert.match(migration,/CREATE INDEX idx_connections_source/);
 assert.match(migration,/CREATE INDEX idx_events_inbox/);
 assert.match(source,/vestiaire:new Set\(\['outfit_catalog'\]\)/);
});

test('LINK pairing returns an accurate error for schema failures, not a false duplicate',async()=>{
 const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
 function envFor(error){
  return {LINK_PEPPER:'test-only',
   DB:{prepare(sql){
    if(sql.includes('INSERT INTO pairing_rate'))return {bind(){return {first:async()=>({count:1})}}};
    if(sql.includes('SELECT COUNT(*) AS n FROM connections'))return {first:async()=>({n:3})};
    if(sql.includes('INSERT INTO connections'))return {bind(){return {run:async()=>{throw new Error(error)}}}};
    throw new Error('UNEXPECTED_SQL');
   }}};
 }
 const body={id:'123e4567-e89b-42d3-a456-426614174000',sourceApp:'vestiaire',scopes:['outfit_catalog'],writerVerifier:'a'.repeat(64),readerVerifier:'b'.repeat(64)};
 async function check(message){
  const req=new Request('https://nexus-link-api.example/api/v1/link/pair',{method:'POST',headers:{origin:'https://leomgl.github.io','content-type':'application/json'},body:JSON.stringify(body)});
  return worker.fetch(req,envFor(message));
 }
 const oldErr=console.error;console.error=()=>{};
 try{
  const schema=await check('D1_ERROR: CHECK constraint failed: source_app');
  assert.equal(schema.status,503);
  assert.equal((await schema.json()).error,'PAIR_SAVE_FAILED');
  const dup=await check('D1_ERROR: UNIQUE constraint failed: connections.id');
  assert.equal(dup.status,409);
  assert.equal((await dup.json()).error,'PAIR_ALREADY_EXISTS');
 }finally{console.error=oldErr;}
});
