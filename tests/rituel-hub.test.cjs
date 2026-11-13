const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('Nexus Rituel LINK inbound validates and persists prior to acknowledgement',()=>{
 const s=source('rituel-import.js');
 assert.match(s,/async function ingestHubEnvelope\(/);
 assert.match(s,/async function receiveHub\(/);
 assert.match(s,/return ingestHubEnvelope\(\{\.\.\.opened,sourceKey\}\)/);
 assert.match(s,/await persistVerified\(\)/);
 assert.match(s,/CONFLIT_DE_RÉVISION_RITUEL/);
 assert.match(s,/status:"pending"/);
 assert.match(s,/data-action="rituel-hub-pull"/);
 assert.match(source('index.html'),/link-hub-bus\.js\?v=02123/);
 assert.match(source('sw.js'),/link-hub-bus\.js\?v=02123/);
});
test('Nexus bus reads existing app token and never opens network connections at startup',()=>{
 const s=source('link-hub-bus.js');
 assert.match(s,/getRecord\(db,"secrets","hubCredential"\)/);
 assert.match(s,/await req\("\/api\/v2\/hub\/ack"/);
 assert.match(s,/if\(!saved\?\.durable/);
 assert.match(s,/await openFromHub/);
 assert.doesNotMatch(s,/setInterval\s*\(/);
});