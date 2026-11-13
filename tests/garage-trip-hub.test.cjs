const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
test('Nexus sends only user-confirmed trip context through LINK, not expenses or contacts',()=>{
 const s=src('nexus-travel.js');
 assert.match(s,/async function sendHubGarage\(/);
 assert.match(s,/confirm\("Transmettre ce séjour à Garage via LINK/);
 assert.match(s,/contractId:"nexus-garage"/);
 assert.match(s,/scope:"trip_context"/);
 assert.match(s,/destination:"garage"/);
 assert.match(s,/api\.persist\(\)/);
 assert.match(s,/nexus-trip-hub-garage/);
 assert.match(src('index.html'),/nexus-travel\.js\?v=02113/);
 assert.match(src('sw.js'),/nexus-v0\.21\.12\.11/);
});