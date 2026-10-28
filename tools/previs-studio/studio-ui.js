// Interface only: rendering and scene serialization remain in the existing engine.
function activateStudioTab(button,focus=false){
 const list=button.closest('[role=tablist]'),panel=list.closest('.panel');
 list.querySelectorAll('[role=tab]').forEach(tab=>{const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1});
 panel.querySelectorAll('[role=tabpanel]').forEach(pane=>pane.hidden=pane.id!==button.getAttribute('aria-controls'));
 panel.querySelector('.panel-scroll').scrollTop=0;if(focus)button.focus();
}
document.querySelectorAll('[role=tablist]').forEach(list=>{
 const tabs=[...list.querySelectorAll('[role=tab]')];tabs.forEach(button=>button.addEventListener('click',()=>activateStudioTab(button)));
 list.addEventListener('keydown',e=>{let index=tabs.indexOf(document.activeElement);if(index<0)return;if(e.key==='ArrowRight')index=(index+1)%tabs.length;else if(e.key==='ArrowLeft')index=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')index=0;else if(e.key==='End')index=tabs.length-1;else return;e.preventDefault();activateStudioTab(tabs[index],true)});
});
document.querySelectorAll('input[type=color]').forEach(input=>{const hex=document.createElement('span');hex.className='color-hex';hex.setAttribute('aria-hidden','true');input.after(hex)});
function refreshStudioUI(){ if($('fovOut'))$('fovOut').textContent=$('fov').value+'°';
 document.querySelectorAll('input[type=color]').forEach(input=>{if(input.nextElementSibling?.classList.contains('color-hex'))input.nextElementSibling.textContent=input.value.toUpperCase()});
 const r=+$('ratio').value,size=+$('resolution').value,w=Math.round(r>=1?size:size*r),h=Math.round(r>=1?size/r:size);$('outputSize').textContent=`${w} × ${h} px`;
}
const originalSync=sync;sync=function(){originalSync();refreshStudioUI()};
document.querySelectorAll('input,select').forEach(input=>input.addEventListener('input',refreshStudioUI));
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('is-active',b===button))}));
$('viewHome').onclick=()=>{stop();$('yaw').value='-12';$('pitch').value='8';$('distance').value=$('human').value==='palm'?'8.2':'7';$('offset').value='0';sync()};
$('helpButton').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
new MutationObserver(refreshStudioUI).observe($('status'),{childList:true,characterData:true,subtree:true});
// Ensure the canvas follows the actual available area, including narrow screens.
const originalResize=resize;resize=function(){const stage=canvas.parentElement,r=+$('ratio').value,w=Math.max(1,stage.clientWidth-56),h=Math.max(1,stage.clientHeight-94),fit=Math.max(1,Math.min(w,h*r));canvas.style.width=fit+'px';canvas.style.height=fit/r+'px';canvas.width=Math.max(1,Math.round(fit*Math.min(devicePixelRatio,2)));canvas.height=Math.max(1,Math.round(fit/r*Math.min(devicePixelRatio,2)))};
window.addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas.parentElement);refreshStudioUI();resize();
