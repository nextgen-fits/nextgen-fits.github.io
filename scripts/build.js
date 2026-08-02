// scripts/build.js
// 在 GitHub Actions 里跑：把 JSON 数据预渲染进静态 HTML，
// 输出到 dist/，交给 GitHub Pages 部署。
// 不需要任何 npm 依赖，纯 Node 内置模块。
 
const fs = require('fs');
const path = require('path');
 
const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
 
// 构建时不需要复制进 dist 的东西
const EXCLUDE = new Set(['.git', '.github', 'dist', 'scripts', 'node_modules', '.gitignore']);
 
// ---------- 1. 把仓库整体复制到 dist ----------
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}
 
// ---------- 2. 读取数据 ----------
function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.warn(`[build] 跳过 ${p}：${e.message}`);
    return [];
  }
}
 
const products = readJsonSafe(path.join(ROOT, 'products.json'));
 
const gearPosts = readJsonSafe(path.join(ROOT, 'database', 'gear.json'))
  .map(p => ({ ...p, metaTag: 'WORKSPACE', clean_img: p.cover_img || '/images/gear-deal.jpg' }));
const watchPosts = readJsonSafe(path.join(ROOT, 'database', 'watches.json'))
  .map(p => ({ ...p, metaTag: 'HOROLOGY', clean_img: p.cover_img || '/images/watch-deal.jpg' }));
const apparelPosts = readJsonSafe(path.join(ROOT, 'database', 'apparel.json'))
  .map(p => ({ ...p, metaTag: 'WARDROBE', clean_img: p.cover_img || '/images/apparel-deal.jpg' }));
 
const allArticles = [...gearPosts, ...watchPosts, ...apparelPosts]
  .sort((a, b) => new Date(b.date) - new Date(a.date));
 
// ---------- 3. 渲染函数（与前端 JS 保持一致的输出结构） ----------
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
 
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23111113%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%236B6D70%22 font-family=%22sans-serif%22 font-size=%2214%22%3ENo Image%3C/text%3E%3C/svg%3E";
 
function renderProductCard(item) {
  return `
    <div class="product-card">
        <div class="product-img"><img src="${esc(item.img)}" alt="${esc(item.title)}" loading="lazy" width="300" height="300" onerror="this.src='${PLACEHOLDER}';"></div>
        <div class="product-body">
            <span class="product-type">${esc(item.type)}</span>
            <h4>${esc(item.title)}</h4>
            <p>${esc(item.desc)}</p>
            <div class="product-price-row"><span class="product-price">${esc(item.price || '')}</span></div>
            <a href="${esc(item.url)}" class="buy-btn" target="_blank" rel="nofollow sponsored noopener">View on Amazon →</a>
        </div>
    </div>`;
}
 
function renderArticleItem(post) {
  let linkedItems = [];
  if (post.gear_list && post.gear_list.length) linkedItems = post.gear_list;
  else if (post.breakdown && post.breakdown.length) linkedItems = post.breakdown;
  else if (post.url) linkedItems = [{ name: post.title, url: post.url, img: post.clean_img }];
 
  let miniBuyHTML = '';
  if (linkedItems.length > 0) {
    miniBuyHTML = '<div class="article-buy-stack">';
    for (const item of linkedItems) {
      const itemName = item.name || item.piece || '';
      const itemUrl = item.url || '#';
      const itemImg = item.img || '/images/fallback.jpg';
      miniBuyHTML += `
            <div class="article-buy-mini">
                <img src="${esc(itemImg)}" alt="${esc(itemName)}" width="44" height="44" onerror="this.src='${PLACEHOLDER}';">
                <div class="mini-info">
                    <span class="mini-label">Featured in this post</span>
                    <span class="mini-name">${esc(itemName)}</span>
                </div>
                <a href="${esc(itemUrl)}" class="mini-btn" target="_blank" rel="nofollow sponsored noopener">Buy →</a>
            </div>`;
    }
    miniBuyHTML += '</div>';
  }
 
  const displayDate = post.date || '';
  const metaTag = post.metaTag || post.category || 'FEATURED';
  const pageUrl = post.page_url || '#';
  const title = post.title || '';
  const summary = post.summary || post.desc || '';
  const cleanImg = post.clean_img || post.cover_img || '/images/fallback.jpg';
 
  return `
        <li class="article-item">
            <div class="article-thumb-wrapper">
                <img src="${esc(cleanImg)}" alt="${esc(title)}" loading="lazy" width="300" height="200" onerror="this.src='${PLACEHOLDER}';">
            </div>
            <div>
                <span class="article-meta">${esc(displayDate)} — ${esc(metaTag)}</span>
                <h3><a href="${esc(pageUrl)}">${esc(title)}</a></h3>
                <p class="article-excerpt">${esc(summary)}</p>
                ${miniBuyHTML}
            </div>
        </li>`;
}
 
// ---------- 4. 把渲染结果注入 HTML 模板 ----------
// 依赖模板里这些"空容器"的精确写法，和现有 index.html 源码一致。
function injectHomepage(html) {
  const byType = { Watches: [], Apparel: [], Gear: [] };
  for (const p of products) {
    if (byType[p.type]) byType[p.type].push(p);
  }
 
  html = html.replace(
    '<div class="product-grid" id="shelf-watches"></div>',
    `<div class="product-grid" id="shelf-watches">${byType.Watches.map(renderProductCard).join('')}</div>`
  );
  html = html.replace(
    '<div class="product-grid" id="shelf-apparel"></div>',
    `<div class="product-grid" id="shelf-apparel">${byType.Apparel.map(renderProductCard).join('')}</div>`
  );
  html = html.replace(
    '<div class="product-grid" id="shelf-gear"></div>',
    `<div class="product-grid" id="shelf-gear">${byType.Gear.map(renderProductCard).join('')}</div>`
  );
 
  // 首页展示最新 6 篇（原来前端 JS 是 4 篇，这里改成 6）
  const homepageArticles = allArticles.slice(0, 6);
  html = html.replace(
    '<ul class="article-list" id="auto-news-feed" style="list-style:none;"></ul>',
    `<ul class="article-list" id="auto-news-feed" style="list-style:none;">${homepageArticles.map(renderArticleItem).join('')}</ul>`
  );
 
  return html;
}
 
// ---------- 5. 生成 /articles.html（全量文章列表） ----------
function buildArticlesPage(indexHtmlRaw) {
  // 用 index.html 的 <head> + nav + footer 作为骨架，正文换成全量文章列表
  const headMatch = indexHtmlRaw.match(/<head>[\s\S]*?<\/head>/);
  const navMatch = indexHtmlRaw.match(/<nav>[\s\S]*?<\/nav>/);
  const footerMatch = indexHtmlRaw.match(/<footer>[\s\S]*?<\/footer>/);
  const disclosureMatch = indexHtmlRaw.match(/<div class="disclosure-bar">[\s\S]*?<\/div>/);
 
  const head = headMatch ? headMatch[0]
    .replace(/<title>[\s\S]*?<\/title>/, '<title>All Reviews & Guides — NextGen Essentials</title>')
    .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Every watch, apparel, and gear review from NextGen Essentials, sorted by newest first.">')
    .replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="https://nxgenpicks.com/articles.html" />')
    : '';
  const nav = navMatch ? navMatch[0] : '';
  const footer = footerMatch ? footerMatch[0] : '';
  const disclosure = disclosureMatch ? disclosureMatch[0] : '';
 
  const articlesHtml = allArticles.map(renderArticleItem).join('');
 
  return `<!DOCTYPE html>
<html lang="en">
${head}
<body>
${disclosure}
${nav}
<div class="section">
    <div class="section-head">
        <h2>All Reviews &amp; Guides</h2>
        <span class="index-label">${allArticles.length} articles</span>
    </div>
    <ul class="article-list" id="all-articles-feed" style="list-style:none;">${articlesHtml}</ul>
</div>
${footer}
</body>
</html>`;
}
 
// ---------- 主流程 ----------
console.log('[build] 复制静态文件到 dist/ ...');
copyDir(ROOT, DIST);
 
console.log(`[build] 加载到 ${products.length} 个商品, ${allArticles.length} 篇文章`);
 
const indexPath = path.join(DIST, 'index.html');
const indexRaw = fs.readFileSync(indexPath, 'utf8');
 
fs.writeFileSync(indexPath, injectHomepage(indexRaw), 'utf8');
console.log('[build] 已写入预渲染后的 index.html');
 
fs.writeFileSync(path.join(DIST, 'articles.html'), buildArticlesPage(indexRaw), 'utf8');
console.log('[build] 已生成 articles.html');
 
console.log('[build] 完成。');
