const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),os=require('os');
const content=require('./html-content');
const words=Array.from({length:75},(_,i)=>'detail'+i).join(' ');
const document=body=>`<!doctype html><html><head><title>Legacy source title</title><meta name="description" content="Legacy source description"></head><body><h1>Legacy heading</h1><div class="mag-prose"><section><h2 id="fit">Check the fit</h2><p>${body}</p><a href="https://www.amazon.com/dp/B123?tag=nextgenlabs04-20">Exact model</a><img src="/images/model.webp" alt="The exact model"></section></div></body></html>`;
function fixture(run){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nextgen-html-rule-'));
 try{
  for(const dir of ['database','watches','gear','apparel'])fs.mkdirSync(path.join(root,dir));
  const url='/gear/example.html',html=document(words),file=path.join(root,url.slice(1));fs.writeFileSync(file,html);
  const record={url,slug:'example',category:'gear',title:'Newer database title',description:'Newer database description',body:'Newer researched database copy',hero:'/images/newer.webp',heroSmall:'/images/newer-small.webp',heroWidth:1200,heroSmallWidth:650,alt:'Newer alt',deck:'Newer introduction',quick:'Newer answer',published:'2026-07-12',modified:'2026-11-04',faqs:[],sources:[]};
  fs.writeFileSync(path.join(root,'database/magazine-articles-20261028.json'),JSON.stringify([record]));
  fs.writeFileSync(path.join(root,'database/html-content-baseline.json'),JSON.stringify({cutoverDate:'2026-11-07',pages:{[url]:{fields:Object.fromEntries(Object.entries(content.extract(html)).map(([key,value])=>[key,content.fingerprint(value)]))}}}));
  run({root,file,html,record});
 }finally{
  const absolute=path.resolve(root),temp=path.resolve(os.tmpdir())+path.sep;
  assert.ok(absolute.startsWith(temp)&&path.basename(absolute).startsWith('nextgen-html-rule-'));
  fs.rmSync(absolute,{recursive:true,force:true});
 }
}
test('untouched legacy HTML cannot replace newer database content',()=>fixture(({root,record})=>assert.deepEqual(content.loadRecords(root)[0],record)));
test('a body edit retains the exact links and image while leaving unrelated metadata alone',()=>fixture(({root,file,html,record})=>{
 const changed=html.replace(words,'Owner edit: '+words);fs.writeFileSync(file,changed);
 const result=content.loadRecords(root)[0];
 assert.match(result.body,/Owner edit:/);assert.match(result.body,/nextgenlabs04-20/);assert.match(result.body,/\/images\/model.webp/);
 assert.equal(result.title,record.title);assert.equal(result.description,record.description);assert.equal(result.published,record.published);
 assert.equal(fs.readFileSync(file,'utf8'),changed,'reading source content must never rewrite it');
}));
test('HTML headline and SEO title have independent precedence',()=>fixture(({root,file,html})=>{
 fs.writeFileSync(file,html.replace('Legacy source title','The owner SEO title').replace('Legacy heading','The owner heading'));
 const result=content.loadRecords(root)[0];assert.equal(result.title,'The owner heading');assert.equal(result.seoTitle,'The owner SEO title');
}));
test('changing the hero also removes an obsolete responsive image set',()=>fixture(({root,file,html})=>{
 fs.writeFileSync(file,html.replace('<h1>','<figure class="mag-feature-photo"><img src="/images/replacement.webp" alt="Replacement model"></figure><h1>'));
 const result=content.loadRecords(root)[0];assert.equal(result.hero,'/images/replacement.webp');assert.equal(result.alt,'Replacement model');assert.equal(result.heroSmall,undefined);
}));
test('an incomplete HTML body stops publication rather than discarding edits',()=>fixture(({root,file,html})=>{
 fs.writeFileSync(file,html.slice(0,html.indexOf('</section>')));assert.throws(()=>content.loadRecords(root),/not closed/);
}));
test('balanced parsing preserves nested HTML and quoted angle brackets',()=>{
 const d=content.parse('<div class="mag-prose"><div data-label="A > B"><p>Use <strong>both</strong>.</p></div><p>Last paragraph.</p></div>');
 assert.equal(d.inner(d.first(n=>content.hasClass(n,'mag-prose'))),'<div data-label="A > B"><p>Use <strong>both</strong>.</p></div><p>Last paragraph.</p>');
});
test('legacy guide, practical guide and refined layouts retain their complete content regions',()=>{
 for(const cls of ['guide-content','pg-content','rf-reading']){
  const result=content.extract(`<article><h1>Guide</h1><div class="${cls}"><div><p>${words}</p></div><p>Last paragraph.</p></div></article>`);
  assert.match(result.body,/Last paragraph/);assert.match(result.body,/<div>/);
 }
});
test('a new self-canonical HTML article joins search while a redirect stays excluded',()=>fixture(({root})=>{
 const html=document(words+' '+words+' '+words).replace('</head>','<link rel="canonical" href="https://nxgenpicks.com/gear/new-guide.html"></head>');
 fs.writeFileSync(path.join(root,'gear/new-guide.html'),html);
 fs.writeFileSync(path.join(root,'gear/old-guide.html'),html.replace('</head>','<meta http-equiv="refresh" content="0;url=/gear/new-guide.html"></head>'));
 const result=content.loadRecords(root);assert.equal(result.length,2);assert.equal(result[1].url,'/gear/new-guide.html');
}));
