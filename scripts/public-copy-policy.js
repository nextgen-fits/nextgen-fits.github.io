const fs = require('fs');
const path = require('path');

// Editorial production notes belong in private working records, not the published page.
const notices = [
  /\bAI[\s_\-\u2010-\u2015]*(?:generated|edited|created|written|authored|assisted)\b/i,
  /\b(?:generated|created|written|made|produced|assisted)\s+(?:by|with|using)\s+(?:an?\s+)?AI\b/i,
  /\bAI\s+(?:editorial\s+)?(?:scene|illustration|imagery|assistance)\b/i,
  /(?:AI|人工智能)\s*(?:生成|创作|撰写|绘制|辅助创作)/i,
];
function findNotice(text) {
  text = text.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const pattern of notices) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}
function checkPublicCopy(dist) {
  let checked = 0;
  function visit(dir) {
    for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
      const f = path.join(dir,e.name);
      if (e.isDirectory()) { visit(f); continue; }
      if (!/\.(?:html|js|json)$/i.test(e.name)) continue;
      const hit = findNotice(fs.readFileSync(f,'utf8'));
      if (hit) throw new Error('Remove the production notice from '+path.relative(dist,f)+': '+hit);
      checked++;
    }
  }
  visit(dist);
  console.log('[copy] Checked '+checked+' public page and data files.');
}
module.exports = checkPublicCopy;
module.exports.findNotice = findNotice;
