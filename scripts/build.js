// Publish the owner's HTML exactly as saved. No templates or content database.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const SITE = 'https://nxgenpicks.com';
const OMIT = new Set(['.git','.github','dist','scripts','node_modules','.gitignore','AGENTS.md','HTML-EDITING.md']);
function text(s) {return String(s || '').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();}
function attrs(s) {const a={};for(const m of s.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))a[m[1].toLowerCase()]=m[2]??m[3]??m[4];return a;}
function metadata(html) {
 const tags=[...html.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(m=>attrs(m[0]));
 const meta=n=>tags.find(a=>(a.name||a.property||'').toLowerCase()===n)?.content||'';
 return {title:text(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]),description:text(meta('description')),canonical:tags.find(a=>a.rel==='canonical')?.href||'',robots:meta('robots'),modified:meta('article:modified_time')||html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})/)?.[1]||'',redirect:tags.some(a=>(a['http-equiv']||'').toLowerCase()==='refresh')};
}
function build(root=process.cwd()) {
 root=fs.realpathSync(root);const dist=path.resolve(root,'dist');
 if(path.dirname(dist)!==root||path.basename(dist)!=='dist')throw new Error('Invalid output directory');
 // Only replace this build's output directory; tracked files are never written.
 fs.rmSync(dist,{recursive:true,force:true});
 const files=[];
 function copy(from,to,rel='') {
  fs.mkdirSync(to,{recursive:true});
  for(const e of fs.readdirSync(from,{withFileTypes:true})) {
   if((!rel&&OMIT.has(e.name))||e.name==='html-content-baseline.json'||e.isSymbolicLink())continue;
   const r=rel?rel+'/'+e.name:e.name,s=path.join(from,e.name),d=path.join(to,e.name);
   if(e.isDirectory())copy(s,d,r);else {fs.copyFileSync(s,d);files.push(r);}
  }
 }
 copy(root,dist);
 const guides=[],urls=[],today=new Date().toISOString().slice(0,10);
 for(const rel of files.filter(f=>f.endsWith('.html')).sort()) {
  const html=fs.readFileSync(path.join(root,rel),'utf8'),m=metadata(html),url=rel==='index.html'?'/':'/'+rel;
  if(m.redirect||/\bnoindex\b/i.test(m.robots)||(m.canonical&&m.canonical!==SITE+url))continue;
  let modified='';try {modified=execFileSync('git',['log','-1','--format=%cs','--',rel],{cwd:root,stdio:['ignore','pipe','ignore']}).toString().trim();} catch {}
  const dates=[modified,m.modified.slice(0,10)].filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<=today).sort();
  urls.push({url,modified:dates.at(-1)||''});
  const category=rel.split('/')[0];if(['watches','gear','apparel'].includes(category)&&rel.includes('/')&&m.title)guides.push({url,title:m.title.replace(/\s*\|\s*NextGen(?: Essentials)?$/i,''),description:m.description,category});
 }
 const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 fs.writeFileSync(path.join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(e=>'  <url><loc>'+SITE+esc(e.url)+'</loc>'+(e.modified?'<lastmod>'+e.modified+'</lastmod>':'')+'</url>').join('\n')+'\n</urlset>\n');
 fs.mkdirSync(path.join(dist,'assets'),{recursive:true});
 fs.writeFileSync(path.join(dist,'assets/modern-search-20261030.js'),'window.NX_GUIDES='+JSON.stringify(guides).replace(/</g,'\\u003c')+';\n');
 console.log('[publish] Copied '+files.filter(f=>f.endsWith('.html')).length+' HTML files without changing their bytes.');
 console.log('[publish] Refreshed sitemap and search index only; no HTML extraction, rewriting or templates.');
 return {html:files.filter(f=>f.endsWith('.html')).length,guides:guides.length,urls:urls.length};
}
if(require.main===module)build();
module.exports={build,metadata};
