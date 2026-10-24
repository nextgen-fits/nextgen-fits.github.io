// Primary navigation and the native details menu work without JavaScript.
function initEditorialNavigation() {
  const menu = document.querySelector('.site-navigation .mobile-menu');
  if (menu) {
    const summary = menu.querySelector('summary');
    const close = () => { menu.open = false; };
    menu.addEventListener('click', event => {
      if (event.target.closest('a')) close();
    });
    document.addEventListener('click', event => {
      if (!menu.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) { close(); summary.focus(); }
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', close);
  }
  if (window.matchMedia('(max-width:900px)').matches) {
    document.querySelectorAll('.qg-toc details').forEach(details => { details.open = false; });
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditorialNavigation, { once: true });
} else initEditorialNavigation();
