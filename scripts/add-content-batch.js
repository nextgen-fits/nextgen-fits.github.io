const fs = require('fs');
const path = require('path');
const articles = require('./content-batch-data');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://nxgenpicks.com';
const ISO_DATE = '2026-09-25';
const DISPLAY_DATE = 'SEPTEMBER 25, 2026';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function words(value) {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function articleText(article) {
  return [
    article.title,
    article.description,
    article.direct,
    ...article.table.headers,
    ...article.table.rows.flat(),
    ...article.sections.flatMap(section => [section.heading, ...section.paragraphs]),
    ...article.decisions.flat(),
    ...article.faqs.flat(),
    ...article.sources.flatMap(source => [source[0]]),
  ].join(' ');
}

function articleSchema(article) {
  const url = `${SITE}/${article.category}/${article.slug}.html`;
  const image = `${SITE}${article.hero}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: article.title,
        description: article.description,
        image: [image],
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        datePublished: ISO_DATE,
        dateModified: ISO_DATE,
        isAccessibleForFree: true,
        author: { '@type': 'Organization', name: 'NextGen Editorial Desk', url: `${SITE}/about.html` },
        publisher: { '@type': 'Organization', name: 'NextGen Essentials', url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}/images/web-app-manifest-512x512.png` } },
        articleSection: article.categoryLabel,
        wordCount: words(articleText(article))
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: article.categoryLabel, item: `${SITE}/${article.category}.html` },
          { '@type': 'ListItem', position: 3, name: article.shortTitle, item: url }
        ]
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: article.faqs.map(([question, answer]) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer }
        }))
      }
    ]
  };
}

function nav(article) {
  const links = [['/', 'Home'], ['/watches.html', 'Watches'], ['/apparel.html', 'Apparel'], ['/gear.html', 'Gear'], ['/about.html', 'About'], ['/subscribe.html', 'Subscribe']];
  return `<nav><div class="nav-container"><a href="/" class="nav-logo">NextGen <span>Essentials</span></a><div class="nav-links">${links.map(([href, label]) => `<a href="${href}"${href === `/${article.category}.html` ? ' class="active"' : ''}>${label}</a>`).join('')}</div></div></nav>`;
}

function renderArticle(article) {
  const url = `/${article.category}/${article.slug}.html`;
  const toc = article.sections.map((section, index) => `<li><a href="#section-${index + 1}">${esc(section.heading)}</a></li>`).join('');
  const sections = article.sections.map((section, index) => {
    const paragraphs = section.paragraphs.map(p => `<p>${esc(p)}</p>`).join('\n');
    const figure = index === 2 ? `<figure class="guide-figure"><img src="${esc(article.product.img)}" alt="${esc(article.product.name)} shown as a relevant example for this guide" loading="lazy"><figcaption>A relevant product example from our current editorial catalog. Product availability and specifications can change.</figcaption></figure>` : '';
    return `<section aria-labelledby="section-${index + 1}"><h2 id="section-${index + 1}">${esc(section.heading)}</h2>${paragraphs}${figure}</section>`;
  }).join('\n');
  const rows = article.table.rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
  const decisions = article.decisions.map(([label, explanation]) => `<li><strong>${esc(label)}:</strong> ${esc(explanation)}</li>`).join('');
  const faqs = article.faqs.map(([question, answer]) => `<div class="faq-item"><h3>${esc(question)}</h3><p>${esc(answer)}</p></div>`).join('');
  const sources = article.sources.map(([label, href]) => `<li><a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a></li>`).join('');
  const related = article.related.map(([href, label, title]) => `<a class="related-link" href="${esc(href)}"><span>${esc(label)}</span>${esc(title)}</a>`).join('');
  const schema = JSON.stringify(articleSchema(article), null, 2).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-13W21TZ6CL"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-13W21TZ6CL');</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" type="image/png" sizes="96x96" href="/images/favicon-96x96.png">
  <title>${esc(article.seoTitle || article.title)}</title>
  <meta name="description" content="${esc(article.description)}">
  <link rel="canonical" href="${SITE}${url}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="NextGen Essentials">
  <meta property="og:title" content="${esc(article.title)}">
  <meta property="og:description" content="${esc(article.description)}">
  <meta property="og:url" content="${SITE}${url}">
  <meta property="og:image" content="${SITE}${article.hero}">
  <meta property="article:published_time" content="${ISO_DATE}">
  <meta property="article:modified_time" content="${ISO_DATE}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/assets/longform.css">
  <script type="application/ld+json">${schema}</script>
  <style>:root{--ink:#0a0a0b;--gold:#c9a961;--steel:#6b6d70;--line:#d1cfc5;--card:#eeece4}*{box-sizing:border-box}body{margin:0;background:#f4f2eb;color:#20231f;font-family:Arial,sans-serif}a{color:inherit}.disclosure-bar{text-align:center;padding:9px 20px;font-size:.72rem;border-bottom:1px solid #d1cfc5;color:#66685f}nav{border-bottom:1px solid #d1cfc5}.nav-container{max-width:1180px;margin:0 auto;height:64px;padding:0 24px;display:flex;align-items:center;justify-content:space-between}.nav-logo{text-decoration:none;font-family:Georgia,serif;font-weight:700}.nav-links{display:flex;gap:24px}.nav-links a{font-size:.78rem;text-decoration:none}.nav-links .active{color:#a83e28}footer{border-top:1px solid #d1cfc5;text-align:center;padding:40px 24px;color:#66685f;font-size:.72rem}@media(max-width:680px){.nav-links a:not(.active){display:none}}</style>
</head>
<body>
  <div class="disclosure-bar">As an Amazon Associate, we earn from qualifying purchases. <a href="/affiliate-disclosure.html">Learn more</a></div>
  ${nav(article)}
  <article class="guide-shell">
    <div class="guide-breadcrumb"><a href="/">Home</a> / <a href="/${article.category}.html">${esc(article.categoryLabel)}</a> / ${esc(article.shortTitle)}</div>
    <header class="guide-head">
      <span class="guide-kicker">${esc(article.kicker)}</span>
      <h1>${esc(article.title)}</h1>
      <p class="guide-dek">${esc(article.summary)}</p>
      <p class="guide-byline">By NextGen Editorial Desk · Published ${DISPLAY_DATE} · Research-based guide</p>
    </header>
    <figure class="guide-hero"><img src="${esc(article.hero)}" alt="${esc(article.heroAlt)}" width="1536" height="1024" loading="eager" fetchpriority="high"><figcaption>Editorial placeholder image for this guide. It can be replaced later with original product photography using the same filename.</figcaption></figure>
    <div class="guide-grid">
      <div class="guide-content">
        <div class="answer-box"><strong>Direct answer</strong><p>${esc(article.direct)}</p></div>
        <table class="guide-table"><thead><tr>${article.table.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
        ${sections}
        <section aria-labelledby="decision"><h2 id="decision">The decision in one minute</h2><ul class="decision-list">${decisions}</ul></section>
        <section aria-labelledby="faq"><h2 id="faq">Frequently asked questions</h2>${faqs}</section>
        <section aria-labelledby="method"><h2 id="method">How this guide was built</h2><p>This is a research-based editorial guide, not a claim of laboratory testing or long-term ownership of every product mentioned. We compared manufacturer documentation, standards and workplace guidance where relevant, then translated those details into practical buying questions. We avoid inventing test results, and we link the primary references below so readers can verify specifications and model-specific limits.</p><ul class="source-list">${sources}</ul></section>
        <section aria-labelledby="related"><h2 id="related">Continue reading</h2><div class="related-grid">${related}</div></section>
        <div class="author-note"><strong>Editorial standard</strong><p>NextGen Essentials covers watches, wardrobe and workspace gear through fit, function, maintainability and total ownership. Affiliate links may earn us a commission, but they do not change the price you pay or the practical criteria used in this guide.</p></div>
      </div>
      <aside class="guide-aside" aria-label="Article notes">
        <div class="aside-card"><span class="aside-label">In this guide</span><ul>${toc}</ul></div>
        <div class="aside-card"><span class="aside-label">Relevant example</span><img src="${esc(article.product.img)}" alt="${esc(article.product.name)}" loading="lazy" style="width:100%;aspect-ratio:1/1;object-fit:cover;margin-bottom:14px"><h2>${esc(article.product.name)}</h2><p>Use the linked listing to confirm the current specification, price, seller and return terms.</p><a class="guide-cta" href="${esc(article.product.url)}" target="_blank" rel="nofollow sponsored noopener">View current listing →</a></div>
      </aside>
    </div>
  </article>
  <footer><p>© 2026 NextGen Essentials. All rights reserved.</p><p><a href="/affiliate-disclosure.html">Affiliate Disclosure</a> · <a href="/about.html">About</a></p></footer>
</body>
</html>`;
}

function databaseEntry(article, index) {
  return {
    id: `${article.category}-20260925-${String(index + 1).padStart(2, '0')}`,
    date: DISPLAY_DATE,
    category: article.kicker.toUpperCase(),
    title: article.title,
    summary: article.summary,
    cover_img: article.hero,
    page_url: `/${article.category}/${article.slug}.html`,
    ...(article.category === 'apparel'
      ? { breakdown: [{ piece: article.product.name, url: article.product.url, img: article.product.img }] }
      : { gear_list: [{ name: article.product.name, url: article.product.url, img: article.product.img }] })
  };
}

function categoryCard(article) {
  return `<a href="/${article.category}/${article.slug}.html" class="article-card">
  <div class="card-thumb"><img src="${article.hero}" alt="${esc(article.heroAlt)}" loading="lazy"></div>
  <div class="card-body"><span class="card-meta">${DISPLAY_DATE} — ${esc(article.kicker)} <span class="card-badge">NEW</span></span><h2 class="card-title">${esc(article.title)}</h2><p class="card-summary">${esc(article.summary)}</p><span class="card-read-more">Read full guide →</span></div>
</a>`;
}

const grouped = { gear: [], watches: [], apparel: [] };
articles.forEach((article, index) => {
  const count = words(articleText(article));
  if (count < 1000) throw new Error(`${article.slug} has only ${count} words`);
  if (!grouped[article.category]) throw new Error(`Unknown category: ${article.category}`);
  grouped[article.category].push({ article, index, count });
  const out = path.join(ROOT, article.category, `${article.slug}.html`);
  fs.writeFileSync(out, renderArticle(article), 'utf8');
});

for (const [category, items] of Object.entries(grouped)) {
  const dbPath = path.join(ROOT, 'database', `${category}.json`);
  const existing = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const batchUrls = new Set(items.map(({ article }) => `/${article.category}/${article.slug}.html`));
  const clean = existing.filter(item => !batchUrls.has(item.page_url));
  const additions = items.map(({ article, index }) => databaseEntry(article, index));
  fs.writeFileSync(dbPath, JSON.stringify([...additions, ...clean], null, 2) + '\n', 'utf8');

  const pagePath = path.join(ROOT, `${category}.html`);
  let page = fs.readFileSync(pagePath, 'utf8');
  page = page.replace(/\s*<!-- CONTENT BATCH 2026 START -->[\s\S]*?<!-- CONTENT BATCH 2026 END -->\s*/g, '\n');
  const cards = items.map(({ article }) => categoryCard(article)).join('\n');
  const block = `\n<!-- CONTENT BATCH 2026 START -->\n${cards}\n<!-- CONTENT BATCH 2026 END -->\n`;
  page = page.replace('<div class="article-index">', `<div class="article-index">${block}`);
  fs.writeFileSync(pagePath, page, 'utf8');
}

console.log(JSON.stringify({
  created: articles.length,
  articles: articles.map(article => ({
    path: `${article.category}/${article.slug}.html`,
    words: words(articleText(article)),
    hero: article.hero
  }))
}, null, 2));
