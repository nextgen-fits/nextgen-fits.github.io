(()=>{
'use strict';
const send=(name,data)=>{if(typeof window.gtag==='function')window.gtag('event',name,{...data,transport_type:'beacon'});};
document.addEventListener('click',e=>{const a=e.target.closest('a[data-affiliate]');if(a)send('affiliate_click',{product_id:a.dataset.affiliate,category:a.dataset.category,location:/\/(?:shop|picks)\.html$/.test(location.pathname)?'collection':'guide',link_type:a.href.includes('/s?')?'search':'product'});const g=e.target.closest('a[data-guide]');if(g)send('pick_guide_click',{product_id:g.dataset.guide});});
const data=document.getElementById('picks-data');if(!data)return;
const items=JSON.parse(data.textContent),byId=new Map(items.map(p=>[p.id,p])),shop=document.querySelector('.shop'),cards=[...shop.querySelectorAll('.pick-card')];
const tools=shop.querySelector('[data-tools]');tools.hidden=false;
let category='all',query='',need='all';const search=shop.querySelector('#pick-search'),needSelect=shop.querySelector('#pick-need');
const result=shop.querySelector('#pick-results');
function filter(){let n=0;for(const c of cards){const ok=(category==='all'||(category==='new'?c.dataset.new==='true':c.dataset.category===category))&&(need==='all'||c.dataset.need===need)&&c.dataset.search.includes(query);c.hidden=!ok;if(ok)n++;}for(const s of shop.querySelectorAll('[data-section]'))s.hidden=![...s.querySelectorAll('.pick-card')].some(c=>!c.hidden);for(const b of shop.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter===category));result.textContent=n+' '+(n===1?'pick':'picks')+' shown · Editor’s collection order';shop.querySelector('.shop-empty').hidden=n!==0;}
shop.addEventListener('click',e=>{const f=e.target.closest('[data-filter]');if(f){category=f.dataset.filter;filter();send('pick_filter',{category,need});}const c=e.target.closest('[data-collection]');if(c){category='all';need='all';query='';search.value='';needSelect.value='all';filter();}if(e.target.closest('[data-reset]')){category='all';need='all';query='';search.value='';needSelect.value='all';filter();}});
search.addEventListener('input',()=>{query=search.value.trim().toLowerCase();filter();});needSelect.addEventListener('change',()=>{need=needSelect.value;filter();send('pick_filter',{category,need});});
const initial=new URLSearchParams(location.search).get('category');if(['new','watches','gear','apparel'].includes(initial)){category=initial;filter();}
function setPhotoView(photo,second){
 const b=photo.querySelector('[data-swap]'),p=byId.get(b.dataset.swap),image=photo.querySelector('.pick-second');
 photo.dataset.wantedView=String(second);
 if(second&&(!image.complete||!image.naturalWidth)){image.loading='eager';return;}
 photo.classList.toggle('is-second',second);b.setAttribute('aria-pressed',String(second));
 b.firstChild.textContent=(second?(p.cover_label||'Product photo'):(p.scene_label||'Another view'))+' ';
 b.setAttribute('aria-label','Show '+(second?'product view':(p.scene_label||'another view').toLowerCase())+' for '+p.name);
 photo.querySelector('.pick-photo-type').textContent=second?p.scene_label:(p.cover_label||'Product photo');
 photo.closest('figure').querySelector('[data-photo-caption]').textContent=second?p.scene_label+' · Check product details':(p.cover_caption||'Product photo · '+p.image_credit);
 photo.querySelector('[data-image]').setAttribute('aria-label','Enlarge '+p.name+' '+(second?(p.scene_label||'another view').toLowerCase():'product view'));
}
shop.querySelectorAll('[data-photo]').forEach(photo=>{
 let selectedSecond=false;
 const image=photo.querySelector('.pick-second'),button=photo.querySelector('[data-swap]');
 image.addEventListener('load',()=>{if(photo.dataset.wantedView==='true')setPhotoView(photo,true);});
 image.addEventListener('error',()=>{setPhotoView(photo,false);button.hidden=true;});
 photo.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&matchMedia('(min-width:601px) and (hover:hover) and (pointer:fine)').matches)setPhotoView(photo,true);});
 photo.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')setPhotoView(photo,selectedSecond);});
 button.addEventListener('click',()=>{selectedSecond=!photo.classList.contains('is-second');setPhotoView(photo,selectedSecond);});
});
const selected=new Set(),bar=shop.querySelector('.shop-compare-bar'),dialog=shop.querySelector('#compare-dialog');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function compareUI(){bar.hidden=selected.size===0;shop.querySelector('#compare-count').textContent=selected.size;for(const b of shop.querySelectorAll('[data-compare]')){const on=selected.has(b.dataset.compare);b.setAttribute('aria-pressed',String(on));b.textContent=on?'Selected ✓':'Compare +';}if(dialog.open)renderCompare();}
function renderCompare(){shop.querySelector('#compare-content').innerHTML='<div class="shop-compare-grid">'+[...selected].map(id=>{const p=byId.get(id);return `<article><img src="${esc(p.image_small)}" alt="${esc(p.image_alt)}"><h3>${esc(p.name)}</h3><p>${esc(p.reference)}</p><p><strong>Fits this need</strong>${esc(p.fit)}</p><p><strong>The tradeoff</strong>${esc(p.tradeoff)}</p><p><strong>Check before buying</strong>${esc(p.check)}</p><a class="pick-buy" href="${esc(p.affiliate_url)}" rel="sponsored nofollow noopener" target="_blank" data-affiliate="${p.id}" data-category="${p.category}">${esc(p.link_kind==='search'?'Find on '+(p.merchant||'Amazon'):'Check price at '+(p.merchant||'Amazon'))} ↗</a></article>`;}).join('')+'</div>';}
shop.querySelectorAll('[data-compare]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.compare;if(selected.has(id))selected.delete(id);else if(selected.size<3)selected.add(id);else{result.textContent='You can compare up to 3 picks. Remove a selected pick to add another.';return;}compareUI();}));
shop.querySelector('[data-open-compare]').addEventListener('click',()=>{renderCompare();dialog.showModal();send('pick_compare',{products:[...selected].join(',')});});shop.querySelector('[data-clear-compare]').addEventListener('click',()=>{selected.clear();compareUI();});
for(const d of shop.querySelectorAll('dialog')){d.querySelector('[data-close]').addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});}
const imageDialog=shop.querySelector('#image-dialog');let currentImage=null;
function largeView(second){const p=currentImage;if(!p)return;shop.querySelector('[data-large-view=second]').textContent=p.scene_label||'Another view';const image=shop.querySelector('#image-large');image.src=second?p.scene:p.image;image.alt=second?p.scene_alt:p.image_alt;shop.querySelector('#image-title').textContent=p.name;shop.querySelector('#image-caption').textContent=second?p.scene_label+' · Check the exact model in the linked product information.':(p.cover_caption||'Product photo · '+p.image_credit);for(const b of shop.querySelectorAll('[data-large-view]'))b.setAttribute('aria-pressed',String((b.dataset.largeView==='second')===second));}
shop.querySelectorAll('[data-image]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();currentImage=byId.get(a.dataset.image);const photo=a.closest('[data-photo]'),second=photo.classList.contains('is-second');largeView(second);imageDialog.showModal();send('pick_image_view',{product_id:currentImage.id,view:second?'second':'cover'});}));
shop.querySelectorAll('[data-large-view]').forEach(b=>b.addEventListener('click',()=>largeView(b.dataset.largeView==='second')));
// A shared product anchor must reveal its card even after a category filter.
function revealHash(){const id=location.hash.slice(1);if(byId.has(id)){category='all';need='all';query='';search.value='';needSelect.value='all';filter();requestAnimationFrame(()=>document.getElementById(id).scrollIntoView({block:'start'}));}}
addEventListener('hashchange',revealHash);revealHash();
})();
