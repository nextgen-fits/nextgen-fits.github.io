// scripts/build.js
// 在 GitHub Actions 里跑：
// 1. 把 JSON 数据预渲染进静态 HTML（首页商品/文章、articles.html 全量现代杂志风列表）
// 2. 注入符合 Google 与 GEO 规范的结构化数据（JSON-LD）
// 3. 自动扫描 watches/apparel/gear 文件夹生成标准 sitemap.xml
//    lastmod 取 Git 真实最后提交日期或文章元数据中的 modified 日期
// 纯 Node.js 内置模块，零外部依赖

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const SITE_URL = 'https://nxgenpicks.com';

// ---------- 同步文章元数据到各分类 JSON ----------
// HTML edits supply content; the magazine/modern generators retain the design.
const magazineArticles = require('./html-content').loadRecords(ROOT);

const categoryEntries = {};
for (const category of ['watches', 'gear', 'apparel']) {
  const source = path.join(ROOT, 'database', `${category}.json`);
  if (!fs.existsSync(source)) continue;
  const entries = JSON.parse(fs.readFileSync(source, 'utf8'));
  for (const entry of entries) {
    const article = magazineArticles.find(a => a.url === entry.page_url);
    if (article) {
      entry.title = article.title;
      entry.summary = article.deck;
      entry.cover_img = article.hero;
      entry.updated = article.modified;
    }
  }
  categoryEntries[category] = entries;
}

const EXCLUDE = new Set(['.git', '.github', 'dist', 'scripts', 'node_modules', '.gitignore', 'AGENTS.md', 'HTML-EDITING.md', 'html-content-baseline.json']);

// ---------- 复制仓库到 dist ----------
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.warn(`[build] 跳过 ${p}：${e.message}`);
    return [];
  }
}

const products = readJsonSafe(path.join(ROOT, 'products.json'));
const gearPosts = (categoryEntries.gear || [])
  .map(p => ({ ...p, metaTag: 'Desk & tech', clean_img: p.cover_img || '/images/gear-deal.jpg' }));
const watchPosts = (categoryEntries.watches || [])
  .map(p => ({ ...p, metaTag: 'Watches', clean_img: p.cover_img || '/images/watch-deal.jpg' }));
const apparelPosts = (categoryEntries.apparel || [])
  .map(p => ({ ...p, metaTag: 'Style', clean_img: p.cover_img || '/images/apparel-deal.jpg' }));

const allArticles = [...gearPosts, ...watchPosts, ...apparelPosts]
  .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23111113%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%236B6D70%22 font-family=%22sans-serif%22 font-size=%2214%22%3ENo Image%3C/text%3E%3C/svg%3E";

function renderProductCard(item) {
  const candidate = item.img.replace(/-(?:small|768)\.webp$/, '-full.webp');
  const official = fs.existsSync(path.join(ROOT, candidate)) ? candidate : item.img;
  const scene = item.scene || item.img;
  const imageLink = item.scene_full || official;
  return `<article class="product-card ${item.scene ? 'product-card-scene' : 'product-card-official'}"><a class="product-img" href="${esc(imageLink)}" target="_blank" rel="noopener" aria-label="View the larger ${item.scene ? 'scene' : 'product photo'}"><img src="${esc(scene)}" alt="${esc(item.scene_alt || item.img_alt || item.title)}" loading="lazy" width="${item.scene_width || 500}" height="${item.scene_height || 625}" onerror="this.onerror=null;this.src='${PLACEHOLDER}';"></a><div class="product-body"><span class="product-type">${esc(item.type)}</span><h4>${esc(item.title)}</h4><p>${esc(item.desc)}</p><div class="product-price-row"><span class="product-reference">${esc(item.reference || '')}</span></div><a href="${esc(item.url)}" class="buy-btn" target="_blank" rel="nofollow sponsored noopener">Find on Amazon ↗</a><div class="product-image-links"><a class="product-photo-source" href="${esc(official)}" target="_blank" rel="noopener">Original product photo ↗</a><a class="product-brand-source" href="${esc(item.source_url)}" target="_blank" rel="noopener">Model details · ${esc(item.image_credit)}</a></div></div></article>`;
}

// 统一渲染符合现代杂志风（mag-card-grid）的文章卡片
function renderModernArticleCard(post) {
  const pageUrl = post.page_url || '#';
  const title = post.title || '';
  const summary = post.summary || post.desc || '';
  const cleanImg = post.clean_img || post.cover_img || '/images/fallback.jpg';
  const metaTag = post.metaTag || 'Desk & tech';
  const readTime = post.read_time || '10 min read';
  const searchKeywords = `${title} ${summary}`.toLowerCase();

  return `<a class="mag-story-card" href="${esc(pageUrl)}" data-topic="${esc(metaTag.toLowerCase())}" data-search="${esc(searchKeywords)}"><div class="mag-card-photo"><img src="${esc(cleanImg)}" alt="${esc(title)}" loading="lazy" decoding="async" width="720" height="900" onerror="this.onerror=null;this.src='${PLACEHOLDER}';"><span>Read the story ↗</span></div><div class="mag-card-meta">${esc(metaTag)} <span>${esc(readTime)}</span></div><h3>${esc(title)}</h3><p>${esc(summary)}</p></a>`;
}

function generateProductsSchema(productList) {
  if (!productList || !productList.length) return '';
  const collection = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "NextGen everyday product shortlist",
    "itemListElement": productList.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.title,
      "url": item.url
    }))
  };
  return '<script type="application/ld+json">' + JSON.stringify(collection).replace(/</g, '\\u003c') + '</script>';
}

function injectHomepage(html) {
  const byType = { Watches: [], Apparel: [], Gear: [] };
  for (const p of products) if (byType[p.type]) byType[p.type].push(p);

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

  const homepageArticles = allArticles.slice(0, 6);
  html = html.replace(
    '<ul class="article-list" id="auto-news-feed" style="list-style:none;"></ul>',
    `<div class="mag-card-grid">${homepageArticles.map(renderModernArticleCard).join('')}</div>`
  );

  const schemaScript = generateProductsSchema(products);
  if (schemaScript) {
    html = html.replace('</body>', `${schemaScript}\n</body>`);
  }

  return html;
}

// 统一生成现代杂志风格的 articles.html
function buildArticlesPage(baseHtml) {
  const journalUrl = SITE_URL + '/articles.html';
  const journalTitle = 'All Reviews & Guides: Watches, Desk Gear & Style | NextGen Journal';
  const journalDescription = 'Browse all practical guides, timepiece reviews, minimalist workspace setups, and capsule wardrobe articles by NextGen Essentials.';

  const journalSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': journalUrl + '#webpage',
    'url': journalUrl,
    'name': journalTitle,
    'description': journalDescription,
    'inLanguage': 'en-US',
    'publisher': {
      '@type': 'Organization',
      'name': 'NextGen Essentials',
      'url': SITE_URL + '/'
    },
    'mainEntity': {
      '@type': 'ItemList',
      'numberOfItems': allArticles.length,
      'itemListElement': allArticles.map((post, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': post.title,
        'url': SITE_URL + post.page_url
      }))
    }
  };

  const cardsHtml = allArticles.map(renderModernArticleCard).join('\n        ');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(journalTitle)}</title>
  <meta name="description" content="${esc(journalDescription)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${journalUrl}">
  <link rel="icon" href="/favicon.ico">

  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(journalTitle)}">
  <meta property="og:description" content="${esc(journalDescription)}">
  <meta property="og:url" content="${journalUrl}">
  <meta property="og:site_name" content="NextGen Essentials">
  <meta property="og:image" content="https://nxgenpicks.com/assets/media/208b2cdc2622.webp">
  <meta name="twitter:card" content="summary_large_image">

  <script type="application/ld+json">${JSON.stringify(journalSchema).replace(/</g, '\\u003c')}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-13W21TZ6CL"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-13W21TZ6CL');
  </script>

  <link rel="stylesheet" href="/assets/editorial.css?v=20261028">
  <script defer src="/assets/editorial.js?v=20261028"></script>
  <script defer src="/assets/magazine-20261028.js"></script>
  <link rel="stylesheet" href="/assets/modern-20261030.css">
  <script defer src="/assets/modern-search-20261030.js"></script>
  <script defer src="/assets/modern-ui-20261030.js"></script>
</head>
<body class="page-category magazine-site nx-site" data-nx-release="20261030">
  <a class="nx-skip" href="#main-content">Skip to content</a>

  <header class="nx-header">
    <div class="nx-nav-shell">
      <a class="nx-brand" href="/" aria-label="NextGen Essentials home">NextGen<span>.</span></a>
      <nav class="nx-desktop-nav" aria-label="Primary navigation">
        <a href="/shop.html">Shop</a>
        <a href="/watches.html">Watches</a>
        <a href="/gear.html">Desk & tech</a>
        <a href="/apparel.html">Style</a>
        <a href="/articles.html" aria-current="page">Journal</a>
      </nav>
      <div class="nx-nav-actions">
        <button type="button" class="nx-search-open" aria-label="Search guides">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
        </button>
        <a class="nx-nav-newsletter" href="/subscribe.html">Stay in the know <span aria-hidden="true">↗</span></a>
      </div>
    </div>
  </header>

  <main id="main-content" class="nx-main">
    <div class="mag-index">
      <header class="mag-index-header">
        <p class="mag-kicker">NextGen Essentials / The Complete Archive</p>
        <h1>All Stories &amp; Guides</h1>
        <p>A comprehensive collection of research, hands-on tests, and considered buying frameworks covering mechanical watches, functional desk setups, and everyday wardrobe essentials.</p>
      </header>

      <div class="mag-index-controls">
        <p class="mag-kicker">The complete library <span data-story-count>${allArticles.length} stories</span></p>
        <label class="mag-search">
          <span>Find a story</span>
          <input type="search" placeholder="Search a topic or model…" data-story-search>
        </label>
      </div>

      <div class="mag-card-grid" data-story-grid>
        ${cardsHtml}
      </div>

      <p class="mag-empty" hidden>No matching stories found. Try a different search term.</p>
    </div>
  </main>

  <footer class="nx-footer">
    <div class="nx-footer-inner">
      <div class="nx-footer-top">
        <a class="nx-brand" href="/">NextGen<span>.</span></a>
        <p>Watches. Workspace. Everyday essentials.</p>
        <a href="/about.html">About</a>
        <a href="/articles.html">Journal</a>
        <a href="/subscribe.html">Newsletter</a>
        <a href="/affiliate-disclosure.html">Affiliate disclosure</a>
      </div>
      <div class="nx-footer-bottom">
        <span>© 2026 NextGen Essentials.</span>
        <span>As an Amazon Associate, we earn from qualifying purchases.</span>
        <a href="#main-content">Back to top ↑</a>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

// ---------- sitemap 自动生成 ----------
const TODAY = new Date().toISOString().slice(0, 10);

function getLastCommitDate(relPath) {
  try {
    const out = execSync(`git log -1 --format=%cd --date=short -- "${relPath}"`, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    if (out) return out;
  } catch (e) {
    // git 不可用或新文件未提交
  }
  return TODAY;
}

function listHtmlFiles(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full)
    .filter(f => f.endsWith('.html')
      && !(dir === 'watches' && f === 'mens-workwear-capsule-wardrobe-2026.html')
      // Only exclude deprecated redirect pages, not self-canonical HTML articles.
      && !(dir === 'gear' && f === 'best-minimalist-desk-accessories-2026.html'))
    .map(f => `${dir}/${f}`);
}

function buildSitemap() {
  const entries = [];

  // 1. 核心栏目与枢纽页
  const hubs = ['/', '/watches.html', '/apparel.html', '/gear.html', '/articles.html', '/shop.html'];
  for (const loc of hubs) {
    entries.push({ loc, lastmod: TODAY });
  }

  // 2. 静态政策/关于页
  const staticPages = ['about.html', 'subscribe.html', 'affiliate-disclosure.html'];
  for (const p of staticPages) {
    if (!fs.existsSync(path.join(ROOT, p))) continue;
    entries.push({
      loc: `/${p}`,
      lastmod: getLastCommitDate(p)
    });
  }

  // 3. 扫描文章子目录 (watches, apparel, gear)
  for (const dir of ['watches', 'apparel', 'gear']) {
    for (const relPath of listHtmlFiles(dir)) {
      const match = magazineArticles.find(a => a.url === `/${relPath}`);
      entries.push({
        loc: `/${relPath}`,
        lastmod: match?.modified || getLastCommitDate(relPath)
      });
    }
  }

  // 按照 Google 最佳实践，只输出标准的 loc 与 lastmod
  const body = entries.map(e => `  <url>
    <loc>${SITE_URL}${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

// ---------- 主流程 ----------
console.log('[build] 复制静态文件到 dist/ ...');
copyDir(ROOT, DIST);
for (const [category, entries] of Object.entries(categoryEntries)) {
  fs.writeFileSync(path.join(DIST, 'database', category + '.json'), JSON.stringify(entries, null, 2) + '\n');
}
// Product modules may update generated files, never the owner's source HTML.
if (fs.existsSync(path.join(ROOT, 'scripts', 'picks.js'))) require('./picks')(DIST);
// Keep public catalogue data aligned with the actual HTML being published.
fs.writeFileSync(path.join(DIST, 'database/magazine-articles-20261028.json'), JSON.stringify(magazineArticles, null, 2) + '\n');

console.log(`[build] 加载到 ${products.length} 个商品, ${allArticles.length} 篇文章`);

const indexPath = path.join(DIST, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexRaw = fs.readFileSync(indexPath, 'utf8');
  fs.writeFileSync(indexPath, injectHomepage(indexRaw), 'utf8');
  console.log('[build] 已写入预渲染后的 index.html');
}

// 生成符合现代排版的 articles.html
fs.writeFileSync(path.join(DIST, 'articles.html'), buildArticlesPage(), 'utf8');
console.log('[build] 已生成现代杂志风 articles.html');

// 生成优化版 sitemap.xml
const sitemapXml = buildSitemap();
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemapXml, 'utf8');
console.log('[build] 已生成精简优化的 sitemap.xml');

// 执行后续后处理脚本（如果存在）
for (const sub of ['editorial', 'magazine', 'modern', 'affiliate-routing', 'public-copy-policy']) {
  const subPath = path.join(ROOT, 'scripts', `${sub}.js`);
  if (fs.existsSync(subPath)) {
    require(`./${sub}`)(DIST, ROOT);
    console.log(`[build] 已运行子脚本: ${sub}.js`);
  }
}

console.log('[build] 全部流程顺利完成！');
