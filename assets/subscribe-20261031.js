(()=>{'use strict';
const form=document.querySelector('[data-subscribe-form]');
if(form){
 const modes=[...form.querySelectorAll('input[name="Request type"]')],planFields=form.querySelector('[data-plan-fields]'),optIn=form.querySelector('[data-plan-opt-in]'),heading=form.querySelector('[data-form-title]'),deck=form.querySelector('[data-form-deck]'),eyebrow=form.querySelector('[data-form-kicker]'),submit=form.querySelector('[type="submit"]'),submitText=submit.querySelector('[data-submit-text]'),status=form.querySelector('[role="status"]'),subject=form.querySelector('[name="_subject"]'),next=form.querySelector('[name="_next"]'),category=form.querySelector('[name="Product category"]'),message=form.querySelector('[name="Product brief"]'),hint=form.querySelector('[data-brief-hint]');
 let busy=false;
 const isPlan=()=>modes.find(x=>x.checked)?.value==='Free product plan';
 function update(){
  const plan=isPlan();planFields.hidden=!plan;optIn.hidden=!plan;
  for(const field of planFields.querySelectorAll('input,select,textarea'))field.disabled=!plan;
  optIn.querySelector('input').disabled=!plan;
  category.required=plan;message.required=plan;
  eyebrow.textContent=plan?'A shortlist, built around you':'The occasional good email';
  heading.textContent=plan?'Tell us what you need.':'Stay in the know.';
  deck.textContent=plan?'Share your budget and everyday needs. We can help put together a suitable product plan, free of charge.':'Practical guides, useful comparisons and buying notes for everyday choices.';
  submitText.textContent=plan?'Request my free product plan':'Join the newsletter';
  subject.value=plan?'NextGen | Free product plan request':'NextGen | Newsletter subscription';
  next.value='https://nxgenpicks.com/subscribe-success.html?request='+(plan?'plan':'newsletter');
  submit.disabled=false;submit.removeAttribute('aria-busy');busy=false;status.textContent='';
 }
 function updateHint(){
  const hints={Watches:'For watches, wrist size, daily activities and the styles you like are especially useful.','Desk & tech':'For desk gear, include your laptop model, display needs, desk size and the problem you want to solve.','Clothing & everyday style':'For clothing, tell us your usual fit, climate, work dress code and preferred colors.','A whole setup':'Tell us what you already own, what needs to work together and your total budget.'};
  hint.textContent=hints[category.value]||'Include what you already own, what matters most and anything that has not worked for you.';
 }
 for(const radio of modes)radio.addEventListener('change',update);
 category.addEventListener('change',updateHint);
 for(const link of document.querySelectorAll('[data-open-plan]'))link.addEventListener('click',e=>{
  e.preventDefault();modes.find(x=>x.value==='Free product plan').checked=true;update();
  form.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
  form.querySelector('[name="email"]').focus({preventScroll:true});
 });
 form.addEventListener('submit',e=>{
  if(busy){e.preventDefault();return;}
  if(!form.checkValidity())return;
  busy=true;submit.disabled=true;submit.setAttribute('aria-busy','true');status.textContent='Sending your request…';
  if(typeof window.gtag==='function')window.gtag('event','generate_lead',{form_name:'newsletter_and_product_plan',request_type:isPlan()?'product_plan':'newsletter'});
 });
 // Restore the native form after returning from the submission service or back/forward cache.
 window.addEventListener('pageshow',update);
 if(new URLSearchParams(location.search).get('request')==='plan'||location.hash==='#free-plan')modes.find(x=>x.value==='Free product plan').checked=true;
 update();updateHint();
}
const receipt=document.querySelector('[data-subscribe-receipt]');
if(receipt){
 const kind=new URLSearchParams(location.search).get('request');
 const title=receipt.querySelector('[data-receipt-title]'),copy=receipt.querySelector('[data-receipt-copy]'),next=receipt.querySelector('[data-receipt-next]');
 if(kind==='plan'){
  title.textContent='Your next choice starts here.';
  copy.textContent='Thank you for sending your product brief. The NextGen team will use your budget, needs and preferences to help narrow the options.';
  next.textContent='Any follow-up will go to the email address you provided. If an exact model or a measurement would help, we can ask you there. Newsletter updates are separate and only requested if you chose them.';
 }else if(kind==='newsletter'){
  title.textContent='Thanks for subscribing.';
  copy.textContent='You have asked for occasional NextGen guides, comparisons and buying notes. We look forward to helping with your next good choice.';
  next.textContent='Look out for NextGen in your inbox. There is no fixed mailing schedule, and you can ask to stop future updates at any time.';
 }
}
})();
