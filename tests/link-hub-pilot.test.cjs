const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const src=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
test("Nexus LINK hub script is dormant until user operates existing LINK screen",()=>{
 let queries=0,requests=0;
 const globals={window:{},navigator:{},console,TextEncoder,TextDecoder,
  indexedDB:{open(){queries++;throw Error("UNEXPECTED_DB")}},
  fetch(){requests++;throw Error("UNEXPECTED_NETWORK")}};
 vm.runInNewContext(src("link-hub-adapter.js"),globals);
 assert.equal(queries,0);assert.equal(requests,0);
 assert.equal(typeof globals.window.LinkHubAdapter.receivePilot,"function");
 assert.match(src("link-hub-adapter.js"),/await openFromHub\(p,"gaming","nexus",item\)/);
 assert.match(src("link-hub-adapter.js"),/return \{durable:true,status:"persisted"\}/);
 assert.doesNotMatch(src("link-hub-adapter.js"),/setInterval\s*\(/);
});
test("Nexus hub route only integrates after verified local save and explicit user review",()=>{
 const importer=src("link-import.js"),html=src("index.html"),sw=src("sw.js");
 assert.match(importer,/async function ingestHubEnvelope\(/);
 assert.match(importer,/await persistVerified\(\)/);
 assert.match(importer,/HUB_REVISION_CONFLICT/);
 assert.match(importer,/status:'pending'/);
 assert.match(importer,/LinkHubAdapter\?\.mount/);
 assert.match(html,/link-hub-adapter\.js\?v=02122/);
 assert.match(sw,/nexus-v0\.21\.12\.8/);
 assert.match(sw,/link-hub-adapter\.js\?v=02122/);
 assert.match(html,/https:\/\/link-app\.q9pfwtztsc\.workers\.dev/);
});

test("Nexus accepts only Nexus-tagged invitations before contacting LINK",()=>{
 let io=0;
 const source=src("link-hub-adapter.js");
 const scope=vm.createContext({window:{},navigator:{},console,TextEncoder,TextDecoder,fetch(){io++;throw Error("NETWORK")},indexedDB:{}});
 vm.runInContext(source,scope);
 const value="e".repeat(64);
 assert.equal(vm.runInContext('readHubInvitation("LHI1.nexus.'+value+'")',scope),value);
 assert.throws(()=>vm.runInContext('readHubInvitation("LHI1.gaming.'+value+'")',scope),/CODE_DESTINÉ_À_GAMING/);
 assert.equal(io,0);
});
