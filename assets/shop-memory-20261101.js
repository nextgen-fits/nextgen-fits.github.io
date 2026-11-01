(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.NextGenShopMemory = api; api.start(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'nextgen.shop.browsing.v1';
  const DAY = 86400000, TTL = 30 * DAY, LIMIT = 20;
  const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function create(items, options = {}) {
    const byId = new Map(items.map(p => [p.id, p]));
    const categories = new Set(items.map(p => p.category));
    const needs = new Set(items.map(p => p.need));
    const now = options.now || Date.now;
    const storage = options.storage || (() => window.localStorage);
    const fresh = () => ({ v: 1, updated: now(), views: [], category: null, need: null });
    let state = fresh(), persistent = true;

    function clean(raw) {
      const time = now();
      if (!raw || raw.v !== 1 || !Number.isFinite(raw.updated) || raw.updated < time - TTL || raw.updated > time + 300000) return fresh();
      const validTime = at => Number.isFinite(at) && at >= time - TTL && at <= time + 300000;
      const rows = Array.isArray(raw.views) ? raw.views.slice(0, 100) : [];
      const unique = new Map();
      for (const row of rows) {
        if (!row || !byId.has(row.id) || !validTime(row.at)) continue;
        const weight = Number.isFinite(row.weight) ? Math.max(1, Math.min(4, row.weight)) : 1;
        if (!unique.has(row.id) || unique.get(row.id).at < row.at) unique.set(row.id, { id: row.id, at: row.at, weight });
      }
      const preference = (value, allowed) => value && allowed.has(value.key) && validTime(value.at) ? { key: value.key, at: value.at } : null;
      return { v: 1, updated: raw.updated, views: [...unique.values()].sort((a,b) => b.at-a.at).slice(0,LIMIT), category: preference(raw.category,categories), need: preference(raw.need,needs) };
    }
    function load() {
      try {
        const raw = storage().getItem(KEY);
        state = clean(raw && raw.length < 50000 ? JSON.parse(raw) : null);
        if (raw && !state.views.length && !state.category && !state.need) storage().removeItem(KEY);
        persistent = true;
      } catch (_) { state = fresh(); persistent = false; }
      return state;
    }
    function save() {
      state.updated = now();
      try { storage().setItem(KEY, JSON.stringify(state)); persistent = true; }
      catch (_) { persistent = false; }
    }
    function record(id, weight = 1) {
      if (!byId.has(id)) return false;
      state = clean(state);
      const old = state.views.find(row => row.id === id), time = now();
      const strength = Number.isFinite(weight) ? Math.max(1,Math.min(4,weight)) : 1;
      if (old && time - old.at < 60000 && strength <= old.weight) return false;
      state.views = [{ id, at:time, weight:Math.max(strength,old ? old.weight : 1) }, ...state.views.filter(row=>row.id!==id)].slice(0,LIMIT);
      save(); return true;
    }
    function prefer(kind, key) {
      const allowed = kind === 'category' ? categories : kind === 'need' ? needs : null;
      if (!allowed || !allowed.has(key)) return false;
      state = clean(state);
      if (state[kind] && state[kind].key === key && now() - state[kind].at < 60000) return false;
      state[kind] = { key, at: now() }; save(); return true;
    }
    const decay = at => Math.pow(0.5, Math.max(0,now()-at)/(7*DAY));
    function score(product) {
      state = clean(state);
      let result = 0;
      for (const row of state.views) {
        const seen = byId.get(row.id), weight = row.weight * decay(row.at);
        if (seen.category === product.category) result += 2 * weight;
        if (seen.need === product.need) result += 6 * weight;
      }
      if (state.category && state.category.key === product.category) result += 3 * decay(state.category.at);
      if (state.need && state.need.key === product.need) result += 8 * decay(state.need.at);
      return result;
    }
    function queryScore(product, query) {
      const q = normalize(query).trim();
      if (!q) return 0;
      const name = normalize(product.name), reference = normalize(product.reference);
      let points = name === q ? 300 : name.startsWith(q) ? 180 : name.includes(q) ? 120 : 0;
      if (reference === q) points += 250;
      else if (reference.includes(q)) points += 90;
      for (const token of q.split(/\s+/).filter(Boolean)) {
        if (name.includes(token)) points += 12;
        if (reference.includes(token)) points += 8;
      }
      return points;
    }
    function ranked(products, query = '') {
      const original = new Map(items.map((p,i)=>[p.id,i]));
      return [...products].sort((a,b)=>queryScore(b,query)-queryScore(a,query) || score(b)-score(a) || original.get(a.id)-original.get(b.id));
    }
    function recent(count = 4) { state=clean(state); return state.views.slice(0,count).map(row=>byId.get(row.id)); }
    function recommendations(count = 4) {
      const seen = new Set(recent(LIMIT).map(p=>p.id));
      return ranked(items.filter(p=>!seen.has(p.id))).filter(p=>score(p)>0).slice(0,count);
    }
    load();
    return { record, prefer, score, queryScore, ranked, recent, recommendations, reload:load,
      hasInterest:()=>recent(1).length>0 || !!state.category || !!state.need,
      snapshot:()=>JSON.parse(JSON.stringify(clean(state))), persistent:()=>persistent };
  }

  function start() {
    const data = document.getElementById('picks-data'), shop = document.querySelector('.shop');
    if (!data || !shop) return;
    let items;
    try { items = JSON.parse(data.textContent); if (!Array.isArray(items)) return; }
    catch (_) { return; }
    const byId = new Map(items.map(p=>[p.id,p]));
    const memory = create(items);
    const cards = [...shop.querySelectorAll('.pick-card[data-product]')];
    const cardById = new Map(cards.map(card=>[card.dataset.product,card]));
    const originalPosition = new Map(cards.map((card,index)=>[card.dataset.product,index]));
    const grids = [...shop.querySelectorAll('.shop-category .shop-grid')];
    const search = shop.querySelector('#pick-search');
    const need = shop.querySelector('#pick-need');
    const results = shop.querySelector('#pick-results');
    const filters = shop.querySelector('[data-tools]');
    if (!search || !need || !filters || !results) return;

    // Build the return-visit shelf only once. Logging new views never inserts a
    // shelf above a reader who is already scrolling through the collection.
    const previous = memory.recent(), related = memory.recommendations();
    const labels = { watches:'Watches', gear:'Desk & tech', apparel:'Style' };
    const smallCard = p => `<a class="shop-revisit-pick" href="#${escape(p.id)}" data-revisit="${escape(p.id)}"><span class="shop-revisit-photo"><img src="${escape(p.image_small || p.image)}" alt="" width="80" height="96" loading="lazy" decoding="async"></span><span class="shop-revisit-copy"><small>${escape(labels[p.category] || p.category)}</small><strong>${escape(p.name)}</strong><span>See this pick <b aria-hidden="true">↗</b></span></span></a>`;
    const shelf = (title, picks) => picks.length ? `<div class="shop-revisit-shelf"><h3>${title}</h3><div class="shop-revisit-row">${picks.map(smallCard).join('')}</div></div>` : '';
    if (previous.length || related.length) {
      const region = document.createElement('section');
      region.className = 'shop-revisit';
      region.setAttribute('aria-label','Picks from your recent browsing');
      region.innerHTML = `<div class="shop-revisit-heading"><p class="shop-kicker">A little more you.</p><h2>Pick up where you left off.</h2><p>Based on recent product browsing in this browser.</p></div>${shelf('Recently viewed',previous)}${shelf('You might also like',related)}`;
      filters.before(region);
    }

    function rankCollection() {
      const personal = memory.hasInterest();
      const query = search.value.trim();
      for (const grid of grids) {
        const products = [...grid.querySelectorAll('.pick-card[data-product]')].map(c=>byId.get(c.dataset.product)).filter(Boolean);
        const ordered = (personal ? memory.ranked(products,query) : products.sort((a,b)=>originalPosition.get(a.id)-originalPosition.get(b.id))).map(p=>cardById.get(p.id));
        // Keep DOM order and keyboard order together, and retain all card nodes.
        grid.append(...ordered);
      }
      const count = cards.filter(c=>!c.hidden).length;
      results.textContent = count+' '+(count===1?'pick':'picks')+' shown · '+(personal ? query?'Search matches first, then your recent interests':'Ordered with your recent interests in mind' : 'Editor’s collection order');
    }
    rankCollection();
    search.addEventListener('input',rankCollection);
    need.addEventListener('change',()=>{ memory.prefer('need',need.value); rankCollection(); });
    shop.addEventListener('click',event=>{
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const revisit = target.closest('[data-revisit]');
      if (revisit && byId.has(revisit.dataset.revisit)) {
        event.preventDefault();
        const id = revisit.dataset.revisit;
        shop.querySelector('[data-reset]').click();
        memory.record(id,2);
        if (location.hash === '#'+id) cardById.get(id).scrollIntoView({block:'start'});
        else location.hash=id;
        return;
      }
      const filter = target.closest('[data-filter]');
      if (filter) { memory.prefer('category',filter.dataset.filter); rankCollection(); }
      if (target.closest('[data-reset],[data-collection]')) rankCollection();
      const link = target.closest('[data-affiliate],[data-guide],[data-image],[data-swap],[data-compare]');
      if (link) {
        const id = link.dataset.affiliate || link.dataset.guide || link.dataset.image || link.dataset.swap || link.dataset.compare;
        memory.record(id,link.hasAttribute('data-affiliate') ? 4 : link.hasAttribute('data-guide') || link.hasAttribute('data-compare') ? 3 : 2);
      }
    });
    for (const card of cards) {
      const details = card.querySelector('.pick-detail');
      if (details) details.addEventListener('toggle',()=>{ if(details.open) memory.record(card.dataset.product,3); });
    }
    // Ignore a transient pass while scrolling. Only a sustained visible card
    // counts, and no view is recorded while the document is in the background.
    if ('IntersectionObserver' in window) {
      const visible = new Set(), timers = new Map();
      const cancel = id => { clearTimeout(timers.get(id)); timers.delete(id); };
      const schedule = id => {
        cancel(id);
        if (document.visibilityState !== 'visible') return;
        timers.set(id,setTimeout(()=>{
          timers.delete(id);
          if (visible.has(id) && document.visibilityState==='visible' && !shop.querySelector('dialog[open]')) memory.record(id,1);
        },3500));
      };
      const observer = new IntersectionObserver(entries=>{
        for (const entry of entries) {
          const id = entry.target.dataset.product;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) { visible.add(id); schedule(id); }
          else { visible.delete(id); cancel(id); }
        }
      },{threshold:[0,0.35]});
      cards.forEach(card=>observer.observe(card));
      document.addEventListener('visibilitychange',()=>{
        for (const id of visible) { if (document.visibilityState==='visible') schedule(id); else cancel(id); }
      });
      window.addEventListener('pagehide',()=>{ for(const id of timers.keys()) cancel(id); });
    }
    window.addEventListener('hashchange',rankCollection);
    window.addEventListener('storage',event=>{ if(event.key===KEY || event.key===null) { memory.reload(); rankCollection(); } });
  }
  return { KEY, TTL, LIMIT, create, start };
});
