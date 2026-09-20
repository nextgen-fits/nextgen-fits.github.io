// Apply the shared design to every built page, including newly added articles.
// Article text, URLs, metadata, forms and affiliate destinations remain intact.
const fs = require('fs');
const path = require('path');
const links = [['/', 'Home'], ['/watches.html', 'Watches'], ['/apparel.html', 'Apparel'], ['/gear.html', 'Gear'], ['/about.html', 'About'], ['/subscribe.html', 'The newsletter ↗']];
function nav(url) {
  return `<nav aria-label="Primary navigation"><div class="nav-container"><a href="/" class="nav-logo" aria-label="NextGen Essentials home"><span class="brand-word">NextGen<span class="brand-dot">.</span></span><span class="brand-sub">Everyday<br>Essentials</span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-links">Menu +</button><div class="nav-links" id="primary-links">${links.map(([href, text]) => `<a href="${href}"${href === '/subscribe.html' ? ' class="nav-subscribe"' : ''}${url === href || (href !== '/' && url.startsWith(href.replace('.html', '/'))) ? ' aria-current="page"' : ''}>${text}</a>`).join('')}</div></div></nav>`;
}
const footer = `<footer class="site-footer"><div class="footer-top"><div><a href="/" class="footer-brand">NextGen Essentials.</a><p class="footer-tagline">Watches. Wardrobe. Workspace. Well considered.</p></div><div class="footer-links"><a href="/articles.html">The journal ↗</a><a href="/about.html">About us ↗</a><a href="/subscribe.html">Stay in the loop ↗</a></div></div><div class="footer-bottom"><p>© 2026 NextGen Essentials. All rights reserved.</p><p>As an Amazon Associate, we earn from qualifying purchases. <a href="/affiliate-disclosure.html">Affiliate Disclosure</a></p></div></footer>`;
function palette(css) {
  css = css.replace(/rgba?\(\s*201\s*,\s*169\s*,\s*97/gi, 'rgba(168,62,40');
  return css.replace(/#([\da-f]{6}|[\da-f]{3})(?![\da-f])/gi, (all, hex) => {
    if (hex.length === 3) hex = [...hex].map(c => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    if (/c9a961|d9b971|d4af37|b8974f/i.test(hex)) return '#a83e28';
    if (Math.max(r,g,b) - Math.min(r,g,b) < 40) {
      const light = (r+g+b)/3;
      if (light < 20) return '#f4f2eb';
      if (light < 35) return '#eae8df';
      if (light < 60) return '#d3d3c8';
      if (light < 100) return '#77796e';
      if (light < 190) return '#66685f';
      return '#20231f';
    }
    return all;
  });
}
module.exports = function applyEditorial(dist) {
  const imageMap = JSON.parse(fs.readFileSync(path.join(dist,'assets/image-map.json'),'utf8'));
  let count = 0;
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { visit(file); continue; }
      if (!entry.name.endsWith('.html')) continue;
      let html = fs.readFileSync(file,'utf8');
      const rel = path.relative(dist,file).replace(/\\/g,'/');
      const url = rel === 'index.html' ? '/' : '/' + rel;
      const type = rel === 'index.html' ? 'home' : /^(watches|apparel|gear)\.html$/.test(rel) ? 'category' : rel.startsWith('subscribe') ? 'form' : rel.includes('/') ? 'article' : 'info';
      html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_,css)=>`<style>${palette(css)}</style>`)
        .replace(/style="([^"]*)"/gi, (_,css)=>`style="${palette(css)}"`);
      // System fonts make typography immediate and avoid a blocking remote dependency.
      html = html.replace(/<link[^>]*href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/g,'');
      html = html.replace('</head>', '<link rel="stylesheet" href="/assets/editorial.css">\n<script defer src="/assets/editorial.js"></script>\n</head>');
      html = html.replace(/<body[^>]*>/i,`<body class="page-${type}"><a href="#main-content" class="skip-link">Skip to content</a>`);
      if (/<nav[\s>]/.test(html)) html = html.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/, nav(url));
      else html = html.replace(/(<body[^>]*>[\s\S]*?<\/a>)/,`$1${nav(url)}`);
      if (/<footer[\s>]/.test(html)) html = html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/,footer);
      else html = html.replace('</body>',footer+'\n</body>');
      html = html.replace('</nav>', '</nav><main id="main-content">').replace('<footer class="site-footer">','</main><footer class="site-footer">');
      // Keep comparison tables readable without forcing the whole mobile page wider.
      html = html.replace(/<table\b[\s\S]*?<\/table>/gi, table => `<div class="editorial-table-scroll" tabindex="0" role="region" aria-label="Comparison table; scroll horizontally to see all columns">${table}</div>`);
      html = html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi, (_,before,src,after) => before + (imageMap[src] || src) + after);
      if (rel === 'articles.html') html = html.replace('<h2>All Reviews &amp; Guides</h2>','<h1>All Reviews &amp; Guides</h1>');
      fs.writeFileSync(file,html,'utf8');
      count++;
    }
  }
  visit(dist);
  console.log(`[editorial] Applied shared design to ${count} pages.`);
};
