const fs=require('fs'),path=require('path');
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const destinations=[['/shop.html','Shop'],['/watches.html','Watches'],['/gear.html','Desk & tech'],['/apparel.html','Style'],['/articles.html','Journal']];
function header(url){
 const current=href=>url===href||url.startsWith(href.replace('.html','/'));
 const links=destinations.map(([href,name])=>`<a href="${href}"${current(href)?' aria-current="page"':''}>${name}</a>`).join('');
 return `<a class="nx-skip" href="#main-content">Skip to content</a><header class="nx-header"><div class="nx-nav-shell"><a class="nx-brand" href="/" aria-label="NextGen Essentials home">NextGen<span>.</span></a><nav class="nx-desktop-nav" aria-label="Primary navigation">${links}</nav><div class="nx-nav-actions"><button type="button" class="nx-search-open" aria-label="Search guides"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button><a class="nx-nav-newsletter" href="/subscribe.html">Stay in the know <span aria-hidden="true">↗</span></a><details class="nx-mobile-menu"><summary aria-label="Navigation menu"><span></span><span></span></summary><nav aria-label="Mobile navigation">${links}<a href="/subscribe.html">Newsletter</a><a href="/about.html">About NextGen</a></nav></details></div></div></header>`;
}
const footer=`<footer class="nx-footer"><div class="nx-footer-inner"><div class="nx-footer-top"><a class="nx-brand" href="/">NextGen<span>.</span></a><p>Watches. Workspace. Everyday essentials.</p><a href="/about.html">About</a><a href="/articles.html">Journal</a><a href="/subscribe.html">Newsletter</a><a href="/affiliate-disclosure.html">Affiliate disclosure</a></div><div class="nx-footer-bottom"><span>© 2026 NextGen Essentials.</span><span>As an Amazon Associate, we earn from qualifying purchases.</span><a href="#main-content">Back to top ↑</a></div></div></footer>`;
const search=`<dialog class="nx-search-dialog" aria-labelledby="nx-search-title"><div class="nx-search-heading"><h2 id="nx-search-title">Find a useful guide.</h2><button type="button" class="nx-search-close" aria-label="Close search">✕</button></div><label for="nx-guide-search">Search watches, monitors, desk gear and style</label><input id="nx-guide-search" type="search" placeholder="Try monitor or NH36" autocomplete="off"><p id="nx-search-count" role="status">Search our practical guides.</p><ul id="nx-search-results"></ul><a class="nx-search-all" href="/articles.html">Browse the complete journal →</a></dialog><noscript><style>.nx-search-open{display:none!important}</style></noscript>`;
module.exports=function modern(dist,root){
 const records=JSON.parse(fs.readFileSync(path.join(root,'database/magazine-articles-20261028.json'),'utf8'));
 const sizes=JSON.parse(fs.readFileSync(path.join(root,'database/modern-images-20261030.json'),'utf8'));
 const template=fs.readFileSync(path.join(root,'scripts/modern-home.html'),'utf8');
 const searchData=records.map(r=>({title:r.title,description:r.description,category:r.category,url:r.url}));
 fs.writeFileSync(path.join(dist,'assets/modern-search-20261030.js'),'window.NX_GUIDES='+JSON.stringify(searchData).replace(/</g,'\\u003c')+';');
 const report=[];
 function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);if(entry.isDirectory()){visit(file);continue;}if(!entry.name.endsWith('.html'))continue;
  const relative=path.relative(dist,file).replace(/\\/g,'/'),url=relative==='index.html'?'/':'/'+relative;
  let h=url==='/'?template:fs.readFileSync(file,'utf8');
  h=h.replace(/<link\b[^>]*href=["']\/assets\/magazine-20261028\.css[^"']*["'][^>]*>/gi,'');
  h=h.replace(/<div class="mag-topline">[\s\S]*?<\/div>/g,'');
  if(url==='/'){h=h.replace('__NX_HEADER__',header(url)).replace('__NX_FOOTER__',footer);}
  else{
   h=h.replace(/<a\b[^>]*class=["'][^"']*skip-link[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,'');
   h=h.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/i,header(url));
   if(!h.includes('class="nx-header"'))h=h.replace(/(<body\b[^>]*>)/i,'$1'+header(url));
   h=h.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/i,footer);
   if(!h.includes('class="nx-footer"'))h=h.replace('</body>',footer+'</body>');
  }
  h=h.replace(/<body\b([^>]*)>/i,(_,attrs)=>{if(/\bclass=/.test(attrs))attrs=attrs.replace(/\bclass="([^"]*)"/,(_,v)=>'class="'+[...new Set((v+' nx-site magazine-site').split(/\s+/))].join(' ')+'"');else attrs+=' class="nx-site magazine-site"';return '<body'+attrs+' data-nx-release="20261030">';});
  // Cloudflare email-protection routes are not served by GitHub Pages.
  h=h.replace(/href="\/cdn-cgi\/l\/email-protection#([a-f0-9]+)"/gi,(_,hex)=>{const key=parseInt(hex.slice(0,2),16);let email='';for(let i=2;i<hex.length;i+=2)email+=String.fromCharCode(parseInt(hex.slice(i,i+2),16)^key);return 'href="mailto:'+esc(email)+'"';});
  // Use one main landmark on old informational pages as well as the new home.
  const bodyStart=h.search(/<body\b/i);let before=h.slice(0,bodyStart),body=h.slice(bodyStart);
  body=body.replace(/<main\b[^>]*>|<\/main>/gi,'').replace('</header>','</header><main id="main-content" class="nx-main">').replace('<footer class="nx-footer">','</main><footer class="nx-footer">');
  h=before+body;
  h=h.replace(/<img\b([^>]*)>/gi,(whole,attrs)=>{
   const src=attrs.match(/\bsrc=["']([^"']+)["']/)?.[1];if(!src||!sizes[src])return whole;
   const [width,height]=sizes[src];attrs=attrs.replace(/\s(?:width|height)=["'][^"']*["']/gi,'');
   return '<img'+attrs+' width="'+width+'" height="'+height+'" data-nx-orientation="'+(height>width*1.12?'portrait':width>height*1.12?'landscape':'square')+'">';
  });
  h=h.replace('</head>','<link rel="stylesheet" href="/assets/modern-20261030.css"><script defer src="/assets/modern-search-20261030.js"></script><script defer src="/assets/modern-ui-20261030.js"></script></head>').replace('</body>',search+'</body>');
  fs.writeFileSync(file,h);report.push(url);
 }}
 visit(dist);
 if(process.env.NEXTGEN_DESIGN_AUDIT)fs.writeFileSync(process.env.NEXTGEN_DESIGN_AUDIT,JSON.stringify({release:'20261030',pages:report,articles:records.length},null,2));
 console.log('[modern] Unified '+report.length+' pages: system sans, white/gray/blue, shared navigation and search.');
};
