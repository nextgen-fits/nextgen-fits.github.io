(() => {
  const article = document.querySelector('[data-article-slug]');
  if (!article) return;
  article.querySelectorAll('[data-choice]').forEach(box => {
    const select = box.querySelector('select');
    const result = box.querySelector('[role="status"]');
    if (!select || !result) return;
    const update = () => {
      const option = select.selectedOptions[0];
      const p = document.createElement('p');
      p.textContent = option.dataset.answer;
      const link = document.createElement('a');
      link.href = '#' + option.value;
      link.textContent = 'Read this recommendation ↓';
      result.replaceChildren(p, link);
    };
    update();
    select.addEventListener('change', update);
    box.hidden = false;
  });
  const track = event => {
    if (event.type === 'auxclick' && event.button !== 1) return;
    const target = event.target instanceof Element ? event.target.closest('a[data-affiliate-product]') : null;
    if (!target || !article.contains(target) || typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', 'affiliate_click', {
        product_name: target.dataset.affiliateProduct,
        link_placement: target.dataset.placement || 'recommendation',
        article_slug: article.dataset.articleSlug,
        link_url: target.href,
        transport_type: 'beacon'
      });
    } catch (_) { /* Analytics must never interrupt the buying link. */ }
  };
  article.addEventListener('click', track);
  article.addEventListener('auxclick', track);
})();
