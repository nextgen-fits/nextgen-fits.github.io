const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {build}=require('./build');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'nextgen-direct-'));t.after(()=>{const resolved=fs.realpathSync(root);assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('nextgen-direct-'));fs.rmSync(resolved,{recursive:true,force:true});});return root;}
function put(root,name,data){fs.mkdirSync(path.dirname(path.join(root,name)),{recursive:true});fs.writeFileSync(path.join(root,name),data);}
test('all HTML edits publish exactly, including home, shop and unrecognized article wrappers',t=>{
 const root=fixture(t);const names=['index.html','shop.html','articles.html','subscribe.html','gear/new-guide.html'];
 for(const name of names)put(root,name,'<!doctype html>\r\n<title>Owner copy &amp; '+name+'</title><main class="anything-owner-chooses">Changed purchase link and content. 中文</main>\r\n');
 put(root,'database/picks.json',JSON.stringify([{title:'Stale database copy'}]));build(root);
 for(const name of names)assert.deepEqual(fs.readFileSync(path.join(root,'dist',name)),fs.readFileSync(path.join(root,name)));
 put(root,'shop.html','second owner edit\r\n');build(root);assert.equal(fs.readFileSync(path.join(root,'dist/shop.html'),'utf8'),'second owner edit\r\n');
});
test('a truncated article does not prevent other HTML from publishing and is never silently replaced',t=>{
 const root=fixture(t);put(root,'index.html','<h1>Still publish</h1>');put(root,'gear/truncated.html','<title>Owner draft</title><div class="mag-prose"><a href="');
 build(root);assert.equal(fs.readFileSync(path.join(root,'dist/index.html'),'utf8'),'<h1>Still publish</h1>');assert.deepEqual(fs.readFileSync(path.join(root,'dist/gear/truncated.html')),fs.readFileSync(path.join(root,'gear/truncated.html')));
});
test('search and sitemap use current HTML while excluding redirects and noindex pages',t=>{
 const root=fixture(t);put(root,'gear/new.html','<title>New &amp; Useful | NextGen Essentials</title><meta name="description" content="Fresh description"><link rel="canonical" href="https://nxgenpicks.com/gear/new.html">');
 put(root,'gear/old.html','<meta http-equiv="refresh" content="0;url=/gear/new.html"><title>Old</title>');put(root,'subscribe-success.html','<meta name="robots" content="noindex,follow">');build(root);
 const search=fs.readFileSync(path.join(root,'dist/assets/modern-search-20261030.js'),'utf8');assert.match(search,/New & Useful/);assert.doesNotMatch(search,/Old/);
 const map=fs.readFileSync(path.join(root,'dist/sitemap.xml'),'utf8');assert.match(map,/gear\/new.html/);assert.doesNotMatch(map,/old.html|subscribe-success/);
});
test('old generators are not executed and source assets and source HTML remain untouched',t=>{
 const root=fixture(t);put(root,'index.html','owner source');put(root,'assets/design.css','body{color:blue}');put(root,'scripts/modern.js','throw new Error("Old pipeline must not run")');put(root,'AGENTS.md','private process notes');build(root);
 assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),'owner source');assert.equal(fs.readFileSync(path.join(root,'dist/assets/design.css'),'utf8'),'body{color:blue}');assert.equal(fs.existsSync(path.join(root,'dist/scripts')),false);assert.equal(fs.existsSync(path.join(root,'dist/AGENTS.md')),false);
});
