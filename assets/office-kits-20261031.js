(()=>{'use strict';
const result=(kind,v)=>{
 if(kind==='usb-c-laptop-kit'){
  if(v.video==='no')return 'The Anker 555 cannot add native HDMI video to a USB-C port that lacks the required video support. Check a supported connection route before buying this hub.';
  if(v.power==='above')return 'The Anker 555 provides up to 85 W to the laptop with a suitable input supply. Keep an appropriate separate laptop charger or evaluate another connection plan for a higher power requirement.';
  if(v.video==='unknown'||v.power==='unknown')return 'Check the computer’s video-capable port and original power-adapter requirement first. The USB-C connector shape alone does not settle either question.';
  return 'These answers fit the kit’s starting conditions. Also match the monitor mode, suitable charger and cable, short hub-cable reach, and the stand and mat footprints before ordering.';
 }
 if(kind==='dual-monitor-kit'){
  if(v.display==='above')return 'The UD-3900Z is specified for two HDMI screens up to 1920 × 1200 at 60 Hz. Choose a different verified dock for a higher-resolution or high-refresh requirement.';
  if(v.software==='no')return 'Do not assume the required DisplayLink setup can be bypassed. Check the supported OS and workplace policy, or evaluate a native display connection that meets the computer’s limits.';
  if(v.display==='unknown'||v.software==='unknown')return 'Confirm both monitor modes and the current operating-system setup requirements. The dock also needs the laptop’s own separate charging arrangement.';
  return 'The stated display and setup requirements are a plausible fit. Confirm the exact UD-3900Z, HDMI inputs, current driver support and separate laptop power; test the actual applications and sleep/wake behavior.';
 }
 if(kind==='video-call-kit'){
  if(v.bluetooth==='no')return 'Zone Vibe 100 depends on a suitable Bluetooth connection. A USB data hub does not add that connection. Evaluate a supported wired or receiver-based headset arrangement if needed.';
  if(v.priority==='noise')return 'Zone Vibe 100 has no listening ANC. Evaluate an ANC option such as Space One for that need, and assess microphone performance separately for calls.';
  if(v.priority==='mobile')return 'A pocketable earbud option such as P40i may suit frequent movement better. Check ear-tip fit and your actual meeting app before choosing the audio format.';
  if(v.bluetooth==='unknown')return 'Confirm the computer’s Bluetooth support first. Then choose the headset microphone and C920x camera explicitly in the meeting app and check light and framing.';
  return 'The call-first arrangement is worth evaluating. Test boom mute, microphone selection, Bluetooth switching, camera placement and front lighting in your actual meeting app.';
 }
 const audio=v.audio==='overear'?'Start by evaluating Space One for seated over-ear use.':v.audio==='earbuds'?'Start by evaluating P40i for a pocketable routine.':'Try the two audio shapes before paying for both; comfort and seal decide the useful format.';
 const charging=v.qi2==='yes'?' Match the exact Belkin bundle and its required power supply.':v.qi2==='no'?' Leave the Qi2 stand out of this kit and use a charging arrangement supported by the phone.':' Verify the exact phone, case and Qi2 support before adding the magnetic stand.';
 return audio+charging;
};
for(const form of document.querySelectorAll('[data-office-check]'))form.addEventListener('submit',e=>{e.preventDefault();const values=Object.fromEntries(new FormData(form));form.querySelector('output').textContent=result(form.dataset.officeCheck,values);if(typeof window.gtag==='function')window.gtag('event','office_kit_check',{kit:form.dataset.officeCheck,...values});});
for(const photo of document.querySelectorAll('[data-kit-photo]')){
 let pinned=false,wanted=false;const button=photo.querySelector('button'),second=photo.querySelector('.wk-scene'),primary=photo.querySelector('.wk-cover'),primaryAlt=primary.alt,link=photo.querySelector('a'),label=photo.querySelector('.wk-photo-label'),caption=photo.closest('figure').querySelector('figcaption'),originalCaption=caption.textContent,originalLabel=link.getAttribute('aria-label');
 const show=on=>{wanted=on;if(on&&(!second.complete||!second.naturalWidth)){second.loading='eager';return;}photo.classList.toggle('wk-show-scene',on);primary.alt=on?second.alt:primaryAlt;primary.setAttribute('aria-hidden',String(on));second.setAttribute('aria-hidden',String(!on));button.setAttribute('aria-pressed',String(on));button.firstChild.textContent=(on?'Product view':button.dataset.sceneLabel)+' ';label.textContent=on?button.dataset.sceneLabel:'Product view';link.href=on?photo.dataset.kitScene:photo.dataset.kitCover;caption.textContent=on?button.dataset.sceneLabel+' · Match the exact model in the product view':originalCaption;link.setAttribute('aria-label',on?originalLabel.replace(/product view$/,button.dataset.sceneLabel.toLowerCase()):originalLabel);};
 second.addEventListener('load',()=>{if(wanted)show(true)});
 second.addEventListener('error',()=>{show(false);button.hidden=true});
 button.addEventListener('click',()=>{pinned=!pinned;show(pinned)});
 photo.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&matchMedia('(hover:hover) and (pointer:fine)').matches)show(true)});
 photo.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')show(pinned)});
}
document.addEventListener('click',e=>{const a=e.target.closest('a[data-affiliate]');if(a&&typeof window.gtag==='function')window.gtag('event','affiliate_click',{product_id:a.dataset.affiliate,category:'gear',location:'office-kit',transport_type:'beacon'});});
})();
