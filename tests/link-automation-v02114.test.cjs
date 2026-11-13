const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');

test('LINK automation uses foreground/network triggers without interval polling',()=>{
 const gaming=src('link-import.js'),rituel=src('rituel-import.js'),vest=src('vestiaire-v021.js'),sante=src('nexus-sante.js');
 for(const s of [gaming,rituel]){
  assert.match(s,/function scheduleHubReceive\(/);
  assert.match(s,/window\.addEventListener\("online"/);
  assert.match(s,/window\.addEventListener\("focus"/);
  assert.match(s,/visibilitychange/);
  assert.doesNotMatch(s,/setInterval\(/);
 }
 assert.match(gaming,/contractId:"gaming-nexus"/);
 assert.match(rituel,/contractId:"rituel-nexus"/);
 assert.match(vest,/async function autoReceive\(/);
 assert.match(vest,/receiveHub\(true\)/);
 assert.doesNotMatch(vest,/setInterval\(/);
 assert.match(sante,/function scheduleHubSync\(/);
 assert.match(sante,/sendHubCalendar\(\{interactive:false,quiet:true\}\)/);
 assert.match(sante,/receiveHub\(\{quiet:true\}\)/);
});

test('Nexus automation assets are cache-versioned together',()=>{
 const html=src('index.html'),sw=src('sw.js'),app=src('app.js');
 assert.match(app,/NEXUS_VERSION='0\.21\.14'/);
 assert.match(html,/app\.js\?v=02114/);
 assert.match(html,/link-import\.js\?v=02121/);
 assert.match(html,/rituel-import\.js\?v=0194/);
 assert.match(html,/vestiaire-v021\.js\?v=0214/);
 assert.match(html,/nexus-sante\.js\?v=02113/);
 assert.match(sw,/nexus-v0\.21\.14\.1/);
 for(const asset of ['app.js?v=02114','link-import.js?v=02121','rituel-import.js?v=0194','vestiaire-v021.js?v=0214','nexus-sante.js?v=02113'])
  assert.ok(sw.includes(asset),asset);
});
