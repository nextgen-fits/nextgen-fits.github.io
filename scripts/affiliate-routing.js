// Commercial links use this publication's Amazon tracking. Documentary sources
// retain their original names and provenance without outbound purchase paths.
const fs=require('fs'),path=require('path');
const decode=s=>String(s).replace(/&amp;/gi,'&').replace(/&#0*39;/g,"'").replace(/&quot;/gi,'"');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const attr=(s,key)=>s.match(new RegExp('\\b'+key+'\\s*=\\s*(["\'])([\\s\\S]*?)\\1','i'))?.[2]||'';
const social=u=>/^(?:www\.)?(?:facebook\.com|twitter\.com|x\.com|pinterest\.com|linkedin\.com)$/.test(u.hostname);
const text=s=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
module.exports=function routeAffiliateLinks(dist,root){
 const config=JSON.parse(fs.readFileSync(path.join(root,'database/affiliate-routing.json'),'utf8'));
 const blocked=new Set(config.blockedShortLinks),report={pages:0,changedPages:0,replaced:[],sourceOnly:[],functional:[],retainedAffiliate:0};
 const isAffiliate=u=>u.hostname==='amzn.to'&&!blocked.has(u.href)||/^(?:www\.)?amazon\.com$/.test(u.hostname)&&u.searchParams.get('tag')===config.tag;
 const fixedAnchor=(attrs,body,target,label,product)=>{
  let next=attrs.replace(/\bhref\s*=\s*(["'])[\s\S]*?\1/i,'href="'+esc(target)+'"').replace(/\s(?:rel|data-affiliate|data-category)\s*=\s*(["'])[\s\S]*?\1/gi,'');
  return '<a'+next+' rel="sponsored nofollow noopener" data-affiliate="'+esc(product||'article-product')+'" data-category="'+(product&&/Casio|Citizen|Seiko|Orient|Tissot|TIME100/.test(product)?'watches':'product')+'">'+(label?esc(label):body)+'</a>';
 };
 function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);if(entry.isDirectory()){visit(file);continue;}if(!entry.name.endsWith('.html'))continue;
  const page='/'+path.relative(dist,file).replace(/\\/g,'/'),original=fs.readFileSync(file,'utf8');report.pages++;
  let html=original.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi,(whole,attrs,body)=>{
   const href=decode(attr(attrs,'href'));if(!/^https?:\/\//i.test(href))return whole;
   let u;try{u=new URL(href);}catch{return whole;}
   if(/^(?:www\.)?nxgenpicks\.com$/.test(u.hostname))return whole;
   const label=text(body),override=config.overrides[href];
   const commercial=/\b(?:cta-btn|mini-btn|buy-btn|pick-buy|rf-button|qg-button)\b/.test(attr(attrs,'class'))||/\b(?:buy|find on amazon|check current offer|check price)\b/i.test(label);
   if(override&&(u.hostname==='amzn.to'||commercial)){report.replaced.push({page,old:href,target:override.target,text:label,product:override.product,reason:'Verified model-specific replacement'});return fixedAnchor(attrs,body,override.target,override.label,override.product);}
   if(isAffiliate(u)){report.retainedAffiliate++;return whole;}
   if(/^(?:www\.)?amazon\.com$/.test(u.hostname)&&/^\/(?:dp\/|gp\/product\/|s(?:\/|$))/.test(u.pathname)){
    u.searchParams.set('tag',config.tag);const target=u.href;
    report.replaced.push({page,old:href,target,text:label,reason:'Amazon product reference received owner tracking'});
    return fixedAnchor(attrs,body,target,/Model information|Selected listing|configuration/i.test(label)?'Amazon listing & model details ↗':null,'amazon-product-reference');
   }
   if(social(u)&&(/share|intent|sharer|pin\/create/.test(u.pathname+u.search)||/share|facebook|twitter|pinterest|linkedin|X\s*\/\s*Twitter/i.test(label))){report.functional.push({page,url:href,text:label});return whole;}
   if(/(?:youtube\.com|youtu\.be)$/.test(u.hostname)&&!href.includes('YourChannel')){report.functional.push({page,url:href,text:label});return whole;}
   if(href.includes('youtube.com/@YourChannel')){report.replaced.push({page,old:href,target:'/subscribe.html',text:label,reason:'Removed placeholder channel destination'});return '<a href="/subscribe.html" class="cta-btn">Get NextGen updates →</a>';}
   // Do not relabel an Amazon offer as an official manual or reference source.
   // Credits and names stay visible, while the non-commission outbound link goes.
   const classes=attr(attrs,'class').split(/\s+/).filter(x=>x&&!/^(?:cta-btn|buy-btn|btn-primary|btn-amazon|pick-buy|rf-button|qg-button|btn|shop-button|buy-btn-cart|mini-btn)$/.test(x));
   let content=body.replace(/\s*[↗→]\s*(?=<|$)/g,'');
   if(/^(?:View|Read|See|Open) (?:official |the )?(?:manufacturer |brand )?(?:specifications|details|model information)/i.test(label))content='Published model specifications';
   report.sourceOnly.push({page,old:href,text:label,reason:'Source attribution retained without outbound link'});
   return '<span class="source-reference'+(classes.length?' '+classes.join(' '):'')+'">'+content+'</span>';
  });
  html=html.replace(/using linked manufacturer information/g,'using identified manufacturer information').replace(/sources to verify/g,'source information to verify')
   .replace(/Product details and image sources link to the relevant brand page\./g,'Model references and image credits identify the relevant brand.')
   .replace(/model information is linked to the named brand\./g,'model references and image credits identify the named brand.')
   .replace(/If another retailer is named on a button, verify the exact model on that merchant’s page before ordering\./g,'Match the selected model, seller and current terms on Amazon before ordering.')
   .replace(/linked source document/g,'identified source document')
   .replace(/identified and linked/g,'identified by source')
   .replace(/linked model information/g,'published model information')
   .replace(/linked (manufacturer|brand) (information|page|reference|specifications)/g,'published $1 $2')
   .replace(/the linked manual/g,"the manufacturer's manual")
   .replace(/we link the primary references below/g,'we identify the primary references below')
   .replace(/The product links open the manufacturer pages; check local sellers separately for price, availability, delivery and return terms\./g,'Product offer links open Amazon; match the exact reference, selected seller, price, delivery and return terms.')
   .replace('/assets/editorial.css?v=20261024','/assets/editorial.css?v=20261024-affiliate');
  if(html!==original){fs.writeFileSync(file,html);report.changedPages++;}
 }}
 visit(dist);
 if(process.env.NEXTGEN_AFFILIATE_AUDIT)fs.writeFileSync(process.env.NEXTGEN_AFFILIATE_AUDIT,JSON.stringify(report,null,2));
 console.log(`[affiliate] Reviewed ${report.pages} pages; corrected ${report.replaced.length} routes and removed ${report.sourceOnly.length} untracked outbound source links.`);
 return report;
};
