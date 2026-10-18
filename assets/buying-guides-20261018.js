/* Track useful routes without collecting form or personal data. */
document.addEventListener('DOMContentLoaded',()=>{
 if(matchMedia('(max-width:760px)').matches)document.querySelectorAll('.bg-toc details').forEach(d=>d.open=false);
});
document.addEventListener('click',event=>{
 const a=event.target.closest('a');if(!a||typeof window.gtag!=='function')return;
 if(a.dataset.affiliate&&!document.getElementById('picks-data'))window.gtag('event','affiliate_click',{product_id:a.dataset.affiliate,category:a.dataset.category,location:'buying_guide',link_type:a.href.includes('/s?')?'search':'product',transport_type:'beacon'});
 if(a.matches('.bg-guide-card,.shop-guide-feature,.shop-guide-start a'))window.gtag('event','buying_guide_open',{guide_path:new URL(a.href,location.href).pathname,source_page:location.pathname,transport_type:'beacon'});
 if(a.getAttribute('href')==='#shortlist')window.gtag('event','buying_guide_shortlist',{guide_path:location.pathname,transport_type:'beacon'});
});
