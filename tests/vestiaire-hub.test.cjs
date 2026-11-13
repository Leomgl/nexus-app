const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
test('Nexus accepts authenticated encrypted Vestiaire pages only after validated persistence',()=>{
 const s=source('vestiaire-v021.js');
 assert.match(s,/async function receiveHub\(/);
 assert.match(s,/await receivePage\(msg,page,p,true\)/);
 assert.match(s,/await api\.verify\('page'/);
 assert.match(s,/await activateTransfer\(next\)/);
 assert.match(s,/if\(!skipAck\)await CORE\(\)\.acknowledge/);
 assert.match(s,/contractId:"vestiaire-nexus"/);
 assert.match(s,/vestiaire-hub-receive/);
 assert.match(source('sw.js'),/nexus-v0\.21\.15\.0/);
 assert.match(source('index.html'),/vestiaire-v021\.js\?v=0215/);
});