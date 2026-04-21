"use strict";(()=>{var U=()=>{let t=document.getElementsByTagName("script");for(let e=t.length-1;e>=0;e--){let o=t[e].src;if(o?.includes("/embed/popup.js"))try{return new URL(o).origin}catch{}}return window.location.origin},g=(t,e)=>{let o=U(),n=new URLSearchParams;if(n.set("popup","1"),n.set("originPage",window.location.pathname),e.hideTitle&&n.set("hideTitle","1"),e.alignLeft&&n.set("alignLeft","1"),n.set("transparent","1"),e.hiddenFields)for(let[a,r]of Object.entries(e.hiddenFields))n.set(a,r);return new URLSearchParams(window.location.search).forEach((a,r)=>{n.has(r)||n.set(r,a)}),`${o}/forms/${t}?${n.toString()}`},w=(t,e,o)=>{let n=document.createElement("iframe");n.className="bf-iframe",n.setAttribute("title","Reform"),n.setAttribute("frameborder","0"),n.setAttribute("allow","fullscreen"),n.setAttribute("data-bf-form-id",t),n.style.height="400px";let i=g(t,e);return n.src=i,o.appendChild(n),n};var E=(t,e)=>{let o=Math.min(600,window.innerHeight-40),n=Math.min(e+2,o);t.style.height=`${n}px`},L=t=>{t.remove()};var y=(t,e,o)=>{if(document.head.querySelector(`link[rel="${t}"][href="${e}"]`))return;let i=document.createElement("link");i.rel=t,i.href=e,o!==void 0&&(i.crossOrigin=o),document.head.appendChild(i)},C=t=>{t!==window.location.origin&&(y("preconnect",t,"anonymous"),y("dns-prefetch",t))},D=t=>{let e=window.requestIdleCallback;if(typeof e=="function"){e(t);return}setTimeout(t,1500)},T=t=>{D(()=>{y("prefetch",t,"anonymous")})},k=(t,e)=>{let o=!1,n=()=>{o||(o=!0,e())},i={once:!0,passive:!0};t.addEventListener("pointerenter",n,i),t.addEventListener("focus",n,i),t.addEventListener("touchstart",n,i)};var z=/^[a-zA-Z0-9_-]{1,128}$/,G=new Set(["formId","position","width","darkOverlay","overlay","hideTitle","alignLeft","autoClose"]),V=/^(?:\p{Extended_Pictographic}\uFE0F?){1,3}$/u,W=()=>{let t=document.getElementsByTagName("script");for(let e=t.length-1;e>=0;e--)if((t[e].src||"").includes("/embed/popup.js"))return t[e];return null},Y=t=>{if(t?.src)try{return new URL(t.src).origin}catch{}return window.location.origin},X=t=>{let e=t.dataset||{},o=e.formId&&z.test(e.formId)?e.formId:"";if(!o)return null;let n=Object.create(null);for(let[r,s]of Object.entries(e))!G.has(r)&&typeof s=="string"&&(n[r]=s);let i=e.position;return{formId:o,position:i==="bottom-left"||i==="center"?i:"bottom-right",width:e.width?parseInt(e.width,10):376,darkOverlay:e.darkOverlay==="1"||e.overlay==="1",hideTitle:e.hideTitle==="1",alignLeft:e.alignLeft==="1",autoClose:e.autoClose?parseInt(e.autoClose,10):0,hiddenFields:n}},q=async(t,e)=>{try{let o=await fetch(`${t}/api/forms/${encodeURIComponent(e)}/meta`,{method:"GET",credentials:"omit"});return o.ok?await o.json():null}catch{return null}},x="http://www.w3.org/2000/svg",I=()=>{let t=document.createElementNS(x,"svg");t.setAttribute("class","bf-bubble__icon"),t.setAttribute("viewBox","0 0 24 24"),t.setAttribute("fill","none"),t.setAttribute("stroke","currentColor"),t.setAttribute("stroke-width","2"),t.setAttribute("stroke-linecap","round"),t.setAttribute("stroke-linejoin","round");let e=document.createElementNS(x,"path");e.setAttribute("d","M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"),t.appendChild(e);let o=document.createElementNS(x,"polyline");return o.setAttribute("points","14 2 14 8 20 8"),t.appendChild(o),t},m=(t,e)=>{for(;t.firstChild;)t.removeChild(t.firstChild);t.appendChild(e)},O=(t,e,o)=>{if(o&&/^(https?:\/\/|\/)/.test(o)){let i=document.createElement("img");i.className="bf-bubble__icon",i.src=o,i.alt="",m(t,i);return}if(o&&V.test(o)){let i=document.createElement("span");i.className="bf-bubble__emoji",i.textContent=o,m(t,i);return}if(!(o&&/^[a-z0-9-]+$/i.test(o))){m(t,I());return}m(t,I()),fetch(`${e}/api/icons/${o}.svg`).then(i=>i.ok?i.text():null).then(i=>{if(!i)return;let r=new DOMParser().parseFromString(i,"image/svg+xml").documentElement;!r||r.tagName.toLowerCase()!=="svg"||(r.setAttribute("class","bf-bubble__icon"),m(t,document.importNode(r,!0)))}).catch(()=>{})},K=(t,e,o)=>{let n=document.createElement("button");return n.type="button",n.className=`bf-bubble bf-bubble--${t.position}`,n.setAttribute("aria-label",e?.title||"Open form"),O(n,o,e?.icon),document.body.appendChild(n),n},j=t=>{let e=W();if(!e)return;let o=X(e);if(!o)return;let n=Y(e);C(n);let i=K(o,null,n),a={position:o.position,width:o.width,hideTitle:o.hideTitle,alignLeft:o.alignLeft,overlay:o.darkOverlay,autoClose:o.autoClose,hiddenFields:o.hiddenFields},r=g(o.formId,a);k(i,()=>T(r)),q(n,o.formId).then(s=>{s&&(s.title&&i.setAttribute("aria-label",s.title),s.icon&&O(i,n,s.icon))}),i.addEventListener("click",()=>{i.classList.add("bf-bubble--hidden"),t(o.formId,{position:o.position,width:o.width,hideTitle:o.hideTitle,alignLeft:o.alignLeft,overlay:o.darkOverlay,autoClose:o.autoClose,hiddenFields:o.hiddenFields,onClose:()=>{i.classList.remove("bf-bubble--hidden")}})})};var J='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Close popup</title><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';var H=(t,e,o)=>{let n=e.layout==="modal"||e.position==="center",i=e.overlay!==!1||n,a=e.position||"bottom-right",r=e.width||376,s=document.createElement("div");s.className=`bf-overlay ${i?"":"bf-overlay--no-bg"}`,s.setAttribute("data-bf-form-id",t),i&&s.addEventListener("click",$=>{$.target===s&&o()});let l=document.createElement("div");l.className=`bf-popup bf-popup--${n?"center":a}`,Object.assign(l.style,{width:`${r}px`,maxHeight:"600px"});let c=document.createElement("button");c.className="bf-close-btn",c.innerHTML=J,c.setAttribute("aria-label","Close form"),c.addEventListener("click",o);let d=document.createElement("div");d.className="bf-iframe-container";let f=document.createElement("div");f.className="bf-loading",f.innerHTML='<div class="bf-loading-spinner"></div>';let p;return e.emoji?.text&&(p=document.createElement("div"),p.className=`bf-emoji ${Z(e.emoji.animation)}`,p.textContent=e.emoji.text),l.appendChild(c),l.appendChild(f),l.appendChild(d),p&&l.appendChild(p),s.appendChild(l),i&&(document.body.style.overflow="hidden"),document.body.appendChild(s),{overlay:s,popup:l,iframeContainer:d,closeBtn:c,loadingEl:f,emojiEl:p}},M=t=>{document.body.style.overflow="",t.style.opacity="0",t.style.transition="opacity 0.15s ease",setTimeout(()=>{t.remove()},150)},P=(t,e)=>{let o=Math.min(600,window.innerHeight-40),n=Math.min(e,o);t.style.height=`${n}px`,t.style.maxHeight=`${n}px`},A=t=>{t.style.display="none"},Z=t=>{switch(t){case"wave":return"bf-emoji--wave";case"bounce":return"bf-emoji--bounce";case"pulse":return"bf-emoji--pulse";default:return""}},F=t=>{t&&(t.style.display="none")};var Q=`
/* Keyframe Animations */
@keyframes bf-wave {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(20deg); }
  75% { transform: rotate(-10deg); }
}

@keyframes bf-bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-20px); }
  60% { transform: translateY(-10px); }
}

@keyframes bf-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes bf-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes bf-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes bf-slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bf-scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Overlay */
.bf-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  animation: bf-fadeIn 0.2s ease-out;
}

.bf-overlay--no-bg {
  background-color: transparent;
  pointer-events: none;
}

/* Popup Container - Base */
.bf-popup {
  position: fixed;
  z-index: 2147483001;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: bf-slideUp 0.3s ease-out;
  pointer-events: auto;
}

/* Position Variants */
.bf-popup--bottom-right {
  bottom: 20px;
  right: 20px;
}

.bf-popup--bottom-left {
  bottom: 20px;
  left: 20px;
}

.bf-popup--center {
  position: relative;
  animation: bf-scaleIn 0.3s ease-out;
}

/* Iframe Container */
.bf-iframe-container {
  flex: 1;
  overflow: hidden;
  border-radius: 12px;
}

.bf-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* Close Button */
.bf-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease, transform 0.15s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.bf-close-btn:hover {
  background-color: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}

.bf-close-btn svg {
  width: 16px;
  height: 16px;
  color: #6b7280;
}

/* Loading Indicator */
.bf-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bf-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: bf-spin 0.8s linear infinite;
}

/* Auto-mounted floating Bubble \u2014 script-tag trigger */
.bf-bubble {
  position: fixed;
  z-index: 2147483000;
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  background-color: #111827;
  color: #ffffff;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25), 0 8px 10px -6px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  animation: bf-fadeIn 0.2s ease-out;
}
.bf-bubble:hover { transform: scale(1.06); }
.bf-bubble--bottom-right { bottom: 20px; right: 20px; }
.bf-bubble--bottom-left { bottom: 20px; left: 20px; }
.bf-bubble--center { bottom: 20px; right: 20px; }
.bf-bubble__icon {
  width: 28px;
  height: 28px;
  display: block;
  object-fit: contain;
}
.bf-bubble__emoji { font-size: 28px; line-height: 1; }
.bf-bubble--hidden { opacity: 0; pointer-events: none; transform: scale(0.6); }

/* Emoji Bubble */
.bf-emoji {
  position: absolute;
  top: -16px;
  left: -16px;
  font-size: 32px;
  line-height: 1;
  z-index: 5;
}

.bf-emoji--wave {
  animation: bf-wave 1s ease-in-out infinite;
}

.bf-emoji--bounce {
  animation: bf-bounce 1.5s ease infinite;
}

.bf-emoji--pulse {
  animation: bf-pulse 1.5s ease-in-out infinite;
}

/* Responsive Adjustments */
@media (max-width: 640px) {
  .bf-popup--bottom-right,
  .bf-popup--bottom-left {
    left: 10px;
    right: 10px;
    bottom: 10px;
    width: auto !important;
  }

  .bf-popup--center {
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 40px);
  }

  .bf-emoji {
    top: -12px;
    left: -12px;
    font-size: 24px;
  }
}

/* Hide scrollbar but allow scrolling */
.bf-iframe-container::-webkit-scrollbar {
  display: none;
}

.bf-iframe-container {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`,_=()=>{if(document.getElementById("bf-popup-styles"))return;let t=document.createElement("style");t.id="bf-popup-styles",t.textContent=Q,document.head.appendChild(t)};var ee=t=>{let e={},o=t.dataset.layout;(o==="modal"||o==="default")&&(e.layout=o);let n=t.dataset.position;(n==="bottom-right"||n==="bottom-left"||n==="center")&&(e.position=n);let i=t.dataset.width;i&&(e.width=parseInt(i,10)),t.dataset.alignLeft==="1"&&(e.alignLeft=!0),t.dataset.hideTitle==="1"&&(e.hideTitle=!0),t.dataset.overlay==="1"&&(e.overlay=!0);let a=t.dataset.emojiText,r=t.dataset.emojiAnimation;a&&(e.emoji={text:a,animation:r||"none"});let s=t.dataset.autoClose;s&&(e.autoClose=parseInt(s,10));let l={};for(let[c,d]of Object.entries(t.dataset))["formId","layout","position","width","alignLeft","hideTitle","overlay","emojiText","emojiAnimation","autoClose"].includes(c)||d!==void 0&&(l[c]=d);return Object.keys(l).length>0&&(e.hiddenFields=l),e},v=t=>{let e=new URLSearchParams(t.replace(/^#/,"")),o=e.get("form-open"),n={},i=e.get("position");(i==="bottom-right"||i==="bottom-left"||i==="center")&&(n.position=i),e.get("align-left")==="1"&&(n.alignLeft=!0),e.get("hide-title")==="1"&&(n.hideTitle=!0),e.get("overlay")==="1"&&(n.overlay=!0);let a=e.get("width");a&&(n.width=parseInt(a,10));let r=e.get("emoji-text"),s=e.get("emoji-animation");r&&(n.emoji={text:r,animation:s||"none"});let l=e.get("auto-close");l&&(n.autoClose=parseInt(l,10));let c={},d=new Set(["form-open","position","align-left","hide-title","overlay","width","emoji-text","emoji-animation","auto-close"]);return e.forEach((f,p)=>{d.has(p)||(c[p]=f)}),Object.keys(c).length>0&&(n.hiddenFields=c),{formId:o,options:n}},R=t=>{document.addEventListener("click",e=>{let o=e.target,n=o.closest("[data-form-id]");if(n){e.preventDefault();let a=n.dataset.formId;if(a){let r=ee(n);t(a,r)}return}let i=o.closest("a");if(i?.href?.includes("form-open=")){e.preventDefault();let a=i.href.indexOf("#");if(a!==-1){let r=i.href.substring(a),{formId:s,options:l}=v(r);s&&t(s,l)}}})},S=t=>{let{hash:e}=window.location;if(e?.includes("form-open=")){let{formId:o,options:n}=v(e);o&&setTimeout(()=>{t(o,n)},100)}},N=t=>{window.addEventListener("hashchange",()=>{let{hash:e}=window.location;if(e?.includes("form-open=")){let{formId:o,options:n}=v(e);o&&t(o,n)}})};var b=new Map,u=(t,e={})=>{if(b.has(t)){console.warn(`[Reform] Popup for form ${t} is already open`);return}let o=H(t,e,()=>h(t)),n=w(t,e,o.iframeContainer),i={formId:t,options:e,container:o.popup,iframe:n,overlay:o.overlay};if(b.set(t,i),n.addEventListener("load",()=>{A(o.loadingEl)}),e.onOpen)try{e.onOpen()}catch(a){console.error("[Reform] onOpen callback error:",a)}},h=t=>{let e=b.get(t);if(e&&(L(e.iframe),e.overlay&&M(e.overlay),b.delete(t),e.options.onClose))try{e.options.onClose()}catch(o){console.error("[Reform] onClose callback error:",o)}},te=t=>{let e;try{e=typeof t.data=="string"?JSON.parse(t.data):t.data}catch{return}if(!e?.event?.startsWith("Reform."))return;let o;for(let n of b.values())if(n.iframe.contentWindow===t.source){o=n;break}if(o)switch(e.event){case"Reform.FormLoaded":break;case"Reform.Resize":typeof e.height=="number"&&(E(o.iframe,e.height),P(o.container,e.height));break;case"Reform.FormSubmitted":if(o.options.onSubmit)try{o.options.onSubmit(e.payload)}catch(n){console.error("[Reform] onSubmit callback error:",n)}o.options.autoClose&&o.options.autoClose>0&&setTimeout(()=>{h(o?.formId)},o.options.autoClose);break;case"Reform.PageView":if(o.options.onPageView&&"page"in e)try{o.options.onPageView(e.page)}catch(n){console.error("[Reform] onPageView callback error:",n)}if("page"in e&&e.page>1){let n=o.overlay;if(n){let i=n.querySelector(".bf-emoji");i&&F(i)}}break;case"Reform.Close":h(o.formId);break}},B=()=>{_(),R(u),S(u),N(u),window.addEventListener("message",te),j(u)};window.Reform={openPopup:u,closePopup:h};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",B):B();})();
