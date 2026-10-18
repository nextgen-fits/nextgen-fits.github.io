document.documentElement.classList.add('has-js');
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('#primary-links');
  if (!toggle || !links) return;
  const close = () => { links.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menu +'; };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close −' : 'Menu +';
    links.classList.toggle('is-open', open);
  });
  links.addEventListener('click', e => { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { close(); toggle.focus(); } });
  document.addEventListener('click', e => { if (!e.target.closest('nav')) close(); });
});

// Long article contents remain available; collapse the new sidebar on small screens.
document.addEventListener('DOMContentLoaded',()=>{if(window.matchMedia('(max-width:900px)').matches){document.querySelectorAll('.qg-toc details').forEach(d=>{d.open=false;});}});
