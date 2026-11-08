// HTML supplies editorial edits; the shared generators still own page layout.
// Baseline fingerprints keep untouched legacy files from replacing newer copy.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {execFileSync} = require('child_process');
const ORIGIN = 'https://nxgenpicks.com';
const DATA = 'database/magazine-articles-20261028.json';
const POLICY = 'database/html-content-baseline.json';
const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const decode = value => String(value ?? '').replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp|ndash|mdash|hellip|rsquo|lsquo|rdquo|ldquo|times|copy);/gi, (all,key) => {
  if (key[0] === '#') return String.fromCodePoint(key[1].toLowerCase() === 'x' ? parseInt(key.slice(2),16) : parseInt(key.slice(1),10));
  return {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',ndash:'–',mdash:'—',hellip:'…',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',times:'×',copy:'©'}[key.toLowerCase()] || all;
});
const plain = value => decode(String(value ?? '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const normalized = value => (typeof value === 'string' ? value : JSON.stringify(value)).replace(/\r\n?/g,'\n').replace(/>\s+</g,'><').replace(/\s+/g,' ').trim();
const fingerprint = value => crypto.createHash('sha256').update(normalized(value)).digest('hex');
const hasClass = (node,name) => (node.attrs.class || '').split(/\s+/).includes(name);

// Balanced source ranges preserve nested product cards, images and links intact.
// No browser execution and no external packages are needed during deployment.
function parse(html) {
  const nodes=[], stack=[];
  const token=/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][\w:-]*(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
  let match;
  while ((match=token.exec(html))) {
    const raw=match[0];
    if (/^<!/.test(raw)) continue;
    const tag=raw.match(/^<\/?([\w:-]+)/)[1].toLowerCase();
    if (raw.startsWith('</')) {
      const at=stack.map(n=>n.tag).lastIndexOf(tag);
      if (at<0) continue;
      for (const node of stack.splice(at)) {node.close=match.index;node.end=token.lastIndex;node.closed=true;}
      continue;
    }
    const attrs={};
    const source=raw.slice(tag.length+1,-1);
    const attr=/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let item;
    while ((item=attr.exec(source))) attrs[item[1].toLowerCase()]=decode(item[2] ?? item[3] ?? item[4] ?? '');
    const parent=stack.at(-1),node={tag,attrs,start:match.index,open:token.lastIndex,close:token.lastIndex,end:token.lastIndex,parent,children:[],closed:voidTags.has(tag)||/\/>$/.test(raw)};
    if (parent) parent.children.push(node);
    nodes.push(node);
    if (node.closed) continue;
    if (tag==='script'||tag==='style'||tag==='textarea') {
      const closing=new RegExp('</'+tag+'\\s*>','gi');closing.lastIndex=token.lastIndex;
      const end=closing.exec(html);
      if (end) {node.close=end.index;node.end=closing.lastIndex;node.closed=true;token.lastIndex=node.end;}
      continue;
    }
    stack.push(node);
  }
  const inside=(node,ancestor)=>!!ancestor && node.start>=ancestor.open && node.end<=ancestor.close;
  return {html,nodes,inside,inner:node=>node?html.slice(node.open,node.close):'',outer:node=>node?html.slice(node.start,node.end):'',first:predicate=>nodes.find(predicate)};
}
const firstClass=(doc,...names)=>names.map(name=>doc.first(n=>hasClass(n,name))).find(Boolean);
function localUrl(value) {return value?.startsWith(ORIGIN) ? value.slice(ORIGIN.length) : value;}
function meta(doc,key) {return doc.first(n=>n.tag==='meta' && (n.attrs.name||n.attrs.property||'').toLowerCase()===key)?.attrs.content;}
function paragraphs(doc,node) {return doc.nodes.filter(n=>n.tag==='p'&&doc.inside(n,node)).map(n=>plain(doc.inner(n))).filter(Boolean);}
function schemaNodes(doc) {
  const out=[];
  for (const script of doc.nodes.filter(n=>n.tag==='script'&&n.attrs.type==='application/ld+json')) {
    try {const data=JSON.parse(doc.inner(script));for (const item of Array.isArray(data)?data:[data]) out.push(...(item['@graph']||[item]));} catch {}
  }
  return out;
}
function faqs(doc,body) {
  const result=[];
  for (const node of doc.nodes) {
    if (!doc.inside(node,body)) continue;
    if (node.tag==='details') {
      const summary=node.children.find(n=>n.tag==='summary');
      const question=plain(doc.inner(summary));
      if (question.endsWith('?')) {const answer=paragraphs(doc,node).join(' ');if(answer)result.push([question,answer]);}
    }
    if (node.tag==='h3' && plain(doc.inner(node)).endsWith('?')) {
      const next=doc.nodes.find(n=>n.start>=node.end&&n.tag==='p'&&doc.inside(n,body));
      if (next) result.push([plain(doc.inner(node)),plain(doc.inner(next))]);
    }
  }
  return result.filter(([q],i)=>result.findIndex(x=>x[0]===q)===i);
}

function extract(html) {
  const doc=parse(html),h1=doc.first(n=>n.tag==='h1');
  const result={};
  const title=doc.first(n=>n.tag==='title');
  if(title)result.seoTitle=plain(doc.inner(title)).replace(/\s*\|\s*NextGen(?:\s+Essentials)?\s*$/i,'');
  if(h1)result.title=plain(doc.inner(h1));
  for(const [key,name] of [['description','description'],['keywords','keywords']]) {const value=meta(doc,name);if(value!==undefined)result[key]=value;}
  const deck=firstClass(doc,'mag-deck','rf-deck','bg-deck','pg-deck','guide-deck','post-subtitle','article-lede','lede','lead');
  if(deck)result.deck=plain(doc.inner(deck));
  else {
    const header=firstClass(doc,'mag-feature-copy','rf-intro-copy','guide-head','pg-heading','dg-hero','article-hero','guide-header','post-header');
    const candidate=doc.nodes.find(n=>n.tag==='p'&&doc.inside(n,header)&&h1&&n.start>h1.end&&!/meta|byline|kicker|eyebrow|affiliate|date|credit/.test(n.attrs.class||''));
    if(candidate)result.deck=plain(doc.inner(candidate));
  }
  const hero=firstClass(doc,'mag-feature-photo','rf-hero','bg-hero','pg-photo','guide-hero','hero-image','post-hero-img','hero-img','qg-hero');
  const image=doc.nodes.find(n=>n.tag==='img'&&doc.inside(n,hero));
  if(image?.attrs.src) {result.hero=localUrl(image.attrs.src);result.alt=image.attrs.alt||'';}
  else if(meta(doc,'og:image'))result.hero=localUrl(meta(doc,'og:image'));
  const quick=firstClass(doc,'mag-summary','rf-answer','bg-answer','pg-answer','answer-box','rg-answer','qg-answer','quick-answer');
  if(quick) {const p=paragraphs(doc,quick).filter(x=>!/^(?:Start here|Quick answer|The useful answer)$/i.test(x));result.quick=p.sort((a,b)=>b.length-a.length)[0]||plain(doc.inner(quick));}
  let body=firstClass(doc,'mag-prose','rf-reading','bg-reading','pg-content','guide-content','rg-content','qg-content','post-content','article-content','article-body');
  if(!body)body=doc.first(n=>Object.hasOwn(n.attrs,'data-editorial-body'));
  if(!body)body=doc.first(n=>n.tag==='main')||doc.first(n=>n.tag==='article')||firstClass(doc,'wrap','container');
  if(body) {
    if(!body.closed)throw new Error('The article content container is not closed. Please check its HTML.');
    let content=doc.inner(body);
    if(!['mag-prose','rf-reading','bg-reading','pg-content','guide-content','rg-content','qg-content','post-content','article-content','article-body'].some(c=>hasClass(body,c))&&!Object.hasOwn(body.attrs,'data-editorial-body')) {
      const omit=doc.nodes.filter(n=>doc.inside(n,body)&&(n.tag==='header'||n.tag==='nav'||n.tag==='footer'||n.tag==='h1'||/^(?:article-hero|hero-image|disclosure|crumb|breadcrumb|topline)$/.test(n.attrs.class||''))).filter(n=>!doc.nodes.some(p=>p!==n&&doc.inside(n,p)&&(p.tag==='header'||p.tag==='nav'||p.tag==='footer'||/^(?:article-hero|hero-image|disclosure|crumb|breadcrumb|topline)$/.test(p.attrs.class||''))));
      for(const node of omit.sort((a,b)=>b.start-a.start))content=content.slice(0,node.start-body.open)+content.slice(node.end-body.open);
    }
    result.body=content.trim();result.faqs=faqs(doc,body);
  }
  const article=schemaNodes(doc).find(n=>['Article','BlogPosting','Review'].includes(n['@type']));
  if(article?.datePublished)result.published=String(article.datePublished).slice(0,10);
  if(article?.dateModified)result.modified=String(article.dateModified).slice(0,10);
  if(article?.citation)result.citations=Array.isArray(article.citation)?article.citation:[article.citation];
  return result;
}

function readPolicy(root) {const file=path.join(root,POLICY);return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{pages:{}};}
function changes(root,url,fields) {
  const entry=readPolicy(root).pages[url];
  if(!entry)return [];
  const keys=new Set([...Object.keys(entry.fields),...Object.keys(fields)]);
  return [...keys].filter(k=>k in fields&&fingerprint(fields[k])!==entry.fields[k]);
}
function gitDate(root,url,fallback) {
  try {const date=execFileSync('git',['log','-1','--format=%cs','--',url.slice(1)],{cwd:root,stdio:['ignore','pipe','ignore']}).toString().trim();if(/^\d{4}-\d{2}-\d{2}$/.test(date))return date;}catch{}
  return fallback;
}

function loadRecords(root) {
  const records=JSON.parse(fs.readFileSync(path.join(root,DATA),'utf8'));
  const policy=readPolicy(root),report=[];
  for(const article of records) {
    if(article.slug==='pc-accessories-that-solve-desk-problems-2026')article.styles=[...new Set([...(article.styles||[]),'/assets/pc-accessory-images-20261107.css'])];
    const file=path.join(root,article.url.slice(1));
    if(!fs.existsSync(file))continue;
    const html=fs.readFileSync(file,'utf8'),fields=extract(html),changed=changes(root,article.url,fields);
    if(!changed.length)continue;
    for(const key of ['title','seoTitle','description','deck','hero','alt','quick','body','keywords']) {
      if(changed.includes(key))article[key]=fields[key];
    }
    if(changed.includes('body')) {
      if(!fields.body||plain(fields.body).split(/\s+/).length<50)throw new Error(article.url+': HTML article body is unexpectedly empty; publication stopped to preserve the existing page.');
      article.faqs=fields.faqs||[];
    }
    if(changed.includes('citations'))article.sources=(fields.citations||[]).filter(value=>typeof value==='string'&&/^https?:\/\//.test(value)).map(value=>[new URL(value).hostname,value]);
    if(changed.includes('hero')) {delete article.heroSmall;delete article.heroLarge;delete article.heroSmallWidth;delete article.heroWidth;}
    if(changed.includes('modified')&&/^\d{4}-\d{2}-\d{2}$/.test(fields.modified))article.modified=fields.modified;
    else article.modified=gitDate(root,article.url,policy.cutoverDate||article.modified);
    article.htmlEditedFields=changed;
    report.push({url:article.url,fields:changed});
  }
  // A complete self-canonical article added as HTML joins navigation and search.
  // Redirect shims and root aliases remain outside the article collection.
  for(const category of ['watches','gear','apparel'])for(const filename of fs.readdirSync(path.join(root,category)).filter(n=>n.endsWith('.html'))) {
    const url='/'+category+'/'+filename;
    if(records.some(a=>a.url===url))continue;
    const html=fs.readFileSync(path.join(root,category,filename),'utf8'),doc=parse(html);
    if(/http-equiv\s*=\s*["']refresh/i.test(html)||/noindex/i.test(meta(doc,'robots')||''))continue;
    const canonical=doc.first(n=>n.tag==='link'&&n.attrs.rel==='canonical')?.attrs.href;
    if(canonical&&localUrl(canonical)!==url)continue;
    const fields=extract(html);
    if(!fields.title||!fields.body||plain(fields.body).split(/\s+/).length<200)continue;
    const slug=filename.slice(0,-5),modified=gitDate(root,url,fields.modified||policy.cutoverDate||'2026-11-07');
    records.push({...fields,url,slug,category,deck:fields.deck||fields.description||fields.title,quick:fields.quick||fields.deck||fields.description,hero:fields.hero||'',alt:fields.alt||fields.title,published:fields.published||modified,modified,sources:(fields.citations||[]).filter(x=>typeof x==='string').map(x=>[new URL(x).hostname,x]),legacyClass:doc.first(n=>n.tag==='article')?.attrs.class?.replace(/\bmag-story\b/g,'').trim()||'',legacyScripts:[],faqs:fields.faqs||[],htmlEditedFields:['new-html-article']});
    report.push({url,fields:['new-html-article']});
  }
  if(process.env.NEXTGEN_HTML_AUDIT)fs.writeFileSync(process.env.NEXTGEN_HTML_AUDIT,JSON.stringify(report,null,2));
  return records;
}

function indexCopy(root,url,defaults,generatedHtml) {
  const file=path.join(root,url.slice(1));
  const html=fs.existsSync(file)?fs.readFileSync(file,'utf8'):generatedHtml;
  if(!html)return defaults;
  const fields=extract(html),changed=generatedHtml&&!fs.existsSync(file)?Object.keys(fields):changes(root,url,fields);
  const doc=parse(html),h1=doc.first(n=>n.tag==='h1');
  const box=firstClass(doc,'mag-index-header','category-header','category-hero','page-header');
  const paragraph=doc.nodes.find(n=>n.tag==='p'&&doc.inside(n,box)&&h1&&n.start>h1.end&&!hasClass(n,'mag-kicker'));
  const copy={...defaults};
  if(changed.includes('title')&&h1)copy.title=doc.inner(h1);
  if(changed.includes('seoTitle'))copy.seoTitle=fields.seoTitle;
  if(changed.includes('description'))copy.description=fields.description;
  if(paragraph&&(changed.includes('body')||changed.includes('description')||changed.includes('title')))copy.intro=doc.inner(paragraph);
  return copy;
}

// Home has its own newer layout. Only supported content slots are transferred.
function applyHomeCopy(template,root) {
  const source=fs.readFileSync(path.join(root,'index.html'),'utf8'),fields=extract(source),changed=changes(root,'/',fields);
  const replaceInner=(html,predicate,value)=>{const doc=parse(html),node=doc.first(predicate);return node?html.slice(0,node.open)+value+html.slice(node.close):html;};
  const esc=value=>String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if(changed.includes('seoTitle'))template=replaceInner(template,n=>n.tag==='title',esc(fields.seoTitle)+' | NextGen');
  if(changed.includes('description'))template=template.replace(/(<meta\b[^>]*(?:name="description"|property="og:description")[^>]*content=")[^"]*/g,'$1'+esc(fields.description));
  if(changed.includes('title')) {const doc=parse(source),h1=doc.first(n=>n.tag==='h1');if(h1)template=replaceInner(template,n=>n.tag==='h1',doc.inner(h1));}
  // Transfer changed copy shared by the old and new home without importing CSS.
  const doc=parse(source),base=readPolicy(root).pages['/'];
  const intro=firstClass(doc,'intro-note'),introParagraph=doc.nodes.find(n=>n.tag==='p'&&doc.inside(n,intro));
  if(introParagraph&&base?.homeIntro!==fingerprint(doc.inner(introParagraph)))template=replaceInner(template,n=>n.tag==='p'&&hasClass(n,'hero-deck'),doc.inner(introParagraph));
  const result=parse(template),description=meta(result,'description'),pageTitle=plain(result.inner(result.first(n=>n.tag==='title')));
  template=template.replace(/(<meta\b[^>]*property="og:title"[^>]*content=")[^"]*/g,'$1'+esc(pageTitle));
  template=template.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(all,raw)=>{try {const data=JSON.parse(raw);for(const node of data['@graph']||[])if(node['@type']==='WebPage'){node.name=pageTitle;node.description=description;}return '<script type="application/ld+json">'+JSON.stringify(data).replace(/</g,'\\u003c')+'</script>';}catch{return all;}});
  return template;
}
module.exports={parse,extract,plain,hasClass,firstClass,fingerprint,loadRecords,indexCopy,applyHomeCopy};
