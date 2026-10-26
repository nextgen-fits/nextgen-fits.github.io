const fs=require('fs'),path=require('path');
const notices=[/\bAI[\s_\-\u2010-\u2015]*(?:generated|edited|created|written|authored|assisted)\b/i,/\b(?:generated|created|written|made|produced|assisted)\s+(?:by|with|using)\s+(?:an?\s+)?AI\b/i,/\bAI\s+(?:editorial\s+)?(?:scene|illustration|imagery|assistance)\b/i,/(?:AI|人工智能)\s*(?:生成|创作|撰写|绘制|辅助创作)/i,/\bgenerated\s+(?:(?:editorial|generic|lifestyle|desk|wardrobe|wearing|wrist|Gear)\s+)*(?:illustration|scene|image|photograph|background|proportions|close-up)/i,/\b(?:built-in\s+imagegen\s+tool|editorial\s+composite|not\s+been\s+redrawn)\b/i];
// Keep process records private; preserve model credits and the distinction from firsthand tests.
function normalizePublicCopy(text){return text
.replace(/All ten new lifestyle images in this five-article series were generated with the built-in imagegen tool using model references\. They are labeled editorial illustrations\./g,'Lifestyle scenes illustrate everyday settings and styling.')
.replace(/The opening visual displays that original product photograph over a generated desk background; the watch itself has not been redrawn\. This is an editorial composite, not a scene we photographed\./g,'The opening scene provides desk context; the original manufacturer product photograph below identifies the model.')
.replace(/The opening visual displays the original product photograph over a generated desk background\. The watch itself has not been redrawn, and the composite is not a record of a watch we handled\. Select it to inspect the original photograph\./g,'The opening scene provides desk context. Select the original product photograph below to inspect the model details.')
.replace(/Generated photographs are editorial illustrations, not actual product photographs or evidence of a test\./g,'Workspace and wearing scenes provide context; use model documentation for specifications and fit.')
.replace(/The illustration is generated and is not product photography\./g,'The illustration provides context for the guide.')
.replace(/generated editorial illustration/g,'editorial illustration').replace(/Generated editorial illustration/g,'Editorial illustration')
.replace(/Generated editorial scene/g,'Everyday scene').replace(/Generated generic /g,'Illustrative ')
.replace(/Generated desk planning scene/g,'Desk planning scene').replace(/Generated close-up/g,'Illustrative close-up')
.replace(/generated lifestyle images/g,'lifestyle illustrations').replace(/generated lifestyle image/g,'lifestyle illustration')
.replace(/generated lifestyle scenes/g,'lifestyle scenes').replace(/Generated lifestyle scenes/g,'Lifestyle scenes')
.replace(/generated desk photograph/g,'desk illustration').replace(/generated wardrobe scene/g,'wardrobe illustration')
.replace(/generated wearing scene/g,'wearing illustration').replace(/generated wrist scene/g,'wrist illustration')
.replace(/generated Gear scenes/g,'Gear illustrations').replace(/generated proportions/g,'pictured proportions')
.replace(/generated scenes/g,'illustrative scenes').replace(/generated scene/g,'illustrative scene').replace(/generated illustrations/g,'illustrations');}
function findNotice(text){text=text.replace(/<!--[\s\S]*?-->/g,'').replace(/\/\*[\s\S]*?\*\//g,'');for(const pattern of notices){const match=text.match(pattern);if(match)return match[0];}return null;}
function checkPublicCopy(dist){let checked=0,changed=0;function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory()){visit(f);continue;}if(!/\.(?:html|js|json)$/i.test(e.name))continue;const original=fs.readFileSync(f,'utf8'),next=normalizePublicCopy(original);if(next!==original){fs.writeFileSync(f,next,'utf8');changed++;}const hit=findNotice(next);if(hit)throw new Error('Remove the production notice from '+path.relative(dist,f)+': '+hit);checked++;}}visit(dist);console.log('[copy] Checked '+checked+' public page and data files; refreshed descriptions in '+changed+' files.');}
module.exports=checkPublicCopy;module.exports.findNotice=findNotice;module.exports.normalizePublicCopy=normalizePublicCopy;
