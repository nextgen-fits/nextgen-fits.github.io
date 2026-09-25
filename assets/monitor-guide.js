/* Optional guide controls. Ordinary links and all editorial content work without JS. */
(() => {
  'use strict';
  const root = document.querySelector('.mg');
  if (!root) return;
  const choices = {
    everyday: ['dell-4k', 'Dell S2725QS', 'Start here for 27-inch 4K and smoother 120Hz scrolling. Connect over HDMI or DisplayPort; it does not charge a laptop.'],
    laptop: ['asus-proart', 'ASUS ProArt PA279CRV', 'Start here if your laptop supports USB-C video and USB Power Delivery. It offers up to 96W charging, with a 60Hz screen.'],
    small: ['dell-24', 'Dell P2425H', 'Start here for a smaller 23.8-inch screen and an adjustable stand. Its USB-C port is for peripherals, not a laptop video input.'],
    entry: ['amazon-24', 'Amazon Basics 24-inch 100Hz', 'Compare the current offer if you need basic 1080p office work. Check the 23.8-inch / 100Hz variant and total cost with any stand upgrade.'],
    white: ['lg-4k', 'LG 27US500-W', 'Start here for a white 27-inch 4K setup. Allow for a tilt-only stand, 60Hz, and a separate laptop charger.']
  };
  const finder = root.querySelector('[data-guide-finder]');
  if (finder) {
    const select = finder.querySelector('select');
    const result = finder.querySelector('[data-guide-result]');
    function update() {
      const choice = choices[select.value] || choices.everyday;
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = choice[1] + '. ';
      p.append(strong, document.createTextNode(choice[2]));
      const link = document.createElement('a');
      link.href = '#' + choice[0];
      link.textContent = 'Read the recommendation and trade-offs →';
      result.replaceChildren(p, link);
    }
    update();
    finder.hidden = false;
    select.addEventListener('change', update);
  }
  // Measure intentional outbound clicks without delaying or altering navigation.
  // Amazon orders and commission remain available only in Associates reporting.
  root.addEventListener('click', event => {
    const link = event.target.closest('a[data-affiliate-product]');
    if (!link || event.defaultPrevented || typeof window.gtag !== 'function') return;
    window.gtag('event', 'affiliate_click', {
      product_name: link.dataset.affiliateProduct,
      link_placement: link.dataset.placement || 'article',
      article_slug: 'minimalist-monitor-setup',
      link_url: link.href,
      transport_type: 'beacon'
    });
  });
})();
