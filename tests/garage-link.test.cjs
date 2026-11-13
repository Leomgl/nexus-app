'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Garage relay migration keeps existing pairs and encrypted events',()=>{
 const m=read('bridge/migrations/0003_garage.sql'),w=read('bridge/worker.js');
 assert.match(m,/source_app TEXT NOT NULL CHECK\(source_app IN \('gaming','rituel','vestiaire','garage'\)\)/);
 assert.match(m,/INSERT INTO connections_v3/);
 assert.match(m,/INSERT INTO encrypted_events_v3/);
 assert.ok(m.indexOf('DROP TABLE encrypted_events;')>m.indexOf('INSERT INTO encrypted_events_v3'));
 assert.ok(m.indexOf('DROP TABLE connections;')>m.indexOf('DROP TABLE encrypted_events;'));
 assert.match(m,/CREATE INDEX idx_events_inbox/);
 assert.match(w,/garage:new Set\(\['rituel_catalog','rituel_location_request','garage_locations','trip_context'\]\)/);
 assert.match(w,/garage-app\.q9pfwtztsc\.workers\.dev/);
 assert.match(read('backend/src/index.js'),/garage-app\.q9pfwtztsc\.workers\.dev/);
});
test('Nexus sends Garage trips independently of Rituel',()=>{
 const s=read('nexus-travel.js'),app=read('app.js');
 assert.match(s,/createPair\('garage',\['trip_context'\]\)/);
 assert.match(s,/destination:'garage'/);
 assert.match(s,/destination:'rituel'/);
 assert.match(s,/data-action="nexus-trip-hub-garage"/);
 assert.match(s,/garageOutbox/);
 assert.match(app,/travelGarageOutbox:\[\]/);
 assert.match(read('link-core.js'),/'garage'/);
});
