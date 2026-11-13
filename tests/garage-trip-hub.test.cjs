const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');

test('Nexus automatise les voyages autorisés vers Garage via LINK sans perdre le fallback manuel',()=>{
 const s=src('nexus-travel.js'),app=src('app.js');
 assert.match(s,/async function publishHubGarage\(/);
 assert.match(s,/function scheduleAutoGarage\(/);
 assert.match(s,/function initAutoGarage\(/);
 assert.match(s,/if\(interactive&&!confirm\(\(deleted\?/);
 assert.match(s,/deleted:true\}:hubGaragePayload/);
 assert.match(s,/prev\?\.cancelledAt\|\|prev\?\.sentAt/);
 assert.match(s,/travelGarageHubOutbox\|\|\[\]\)\.map\(x=>x\.eventId\)/);
 assert.match(src("recycle.js"),/NexusTravel\?\.scheduleAutoGarage\?\.\(id\)/);
 assert.match(s,/window\.addEventListener\("online"/);
 assert.match(s,/document\.addEventListener\("visibilitychange"/);
 assert.match(s,/contractId:"nexus-garage"/);
 assert.match(s,/scope:"trip_context"/);
 assert.match(s,/destination:"garage"/);
 assert.match(s,/travelGarageHubOutbox/);
 assert.match(s,/nexus-trip-hub-garage/);
 assert.match(app,/scheduleAutoGarage\?\.\(base\.id\)/);
 assert.match(app,/initAutoGarage\?\.\(\)/);
 assert.match(app,/La préparation d’un ensemble reste manuelle/);
 assert.match(src('index.html'),/nexus-travel\.js\?v=02124/);
 assert.match(src('index.html'),/app\.js\?v=02114/);
 assert.match(src('sw.js'),/nexus-v0\.21\.24-cutover-rc1/);
});
