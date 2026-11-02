(() => {
  const overlay = document.querySelector('.seaside-intro');
  if (!overlay) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const tabs = ['marketing.html','brand.html','report.html','contents.html','sns.html'];
  let internal = false;
  try { const ref = new URL(document.referrer); internal = ref.origin === location.origin && tabs.includes(ref.pathname.split('/').pop()); } catch {}
  if (internal || reduced.matches || location.hash || performance.getEntriesByType('navigation')[0]?.type === 'back_forward') { overlay.remove(); return; }
  const canvas = overlay.querySelector('canvas'), ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) { overlay.remove(); return; }
  const siblings = [...document.body.children].filter(el => el !== overlay && /^(A|HEADER|MAIN|FOOTER)$/.test(el.tagName));
  const inert = siblings.map(el => el.inert);
  siblings.forEach(el => { el.inert = true; });
  let width, height, frame = 0, done = false;
  const start = performance.now();
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function finish() {
    if (done) return;
    done = true; cancelAnimationFrame(frame); clearTimeout(timer);
    siblings.forEach((el,i) => { el.inert = inert[i]; });
    if (overlay.contains(document.activeElement)) document.activeElement.blur();
    overlay.classList.add('is-leaving');
    removeEventListener('resize',resize); removeEventListener('pagehide',finish); removeEventListener('keydown',key);
    document.removeEventListener('visibilitychange',visibility);
    reduced.removeEventListener('change',finish);
    setTimeout(() => overlay.remove(),360);
  }
  function key(e) { if(e.key === 'Escape') finish(); }
  function visibility() { if(document.hidden) finish(); }
  function render(now) {
    try {
      const t = (now-start)/1000;
      if(t >= 1.55) { finish(); return; }
      ctx.fillStyle = '#a9d8f3'; ctx.fillRect(0,0,width,height);
      // Broad sea swells with a fine foam edge, rather than glowing ribbons.
      const progress = Math.min(1,t/1.55);
      const colors = ['#087cc1','#63b3df','#eaf6fc','#f7fcff'];
      colors.forEach((color,i) => {
        const base = height*(1.26-progress*1.85) + i*height*.17;
        ctx.beginPath();
        for(let x=0;x<=width+12;x+=12) {
          const y=base+Math.sin(x/width*Math.PI*2+t*3.2+i*.65)*height*.06+Math.sin(x/width*7-t*2)*height*.015;
          if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.lineTo(width,height+2); ctx.lineTo(0,height+2); ctx.closePath();
        ctx.fillStyle=color; ctx.fill();
        ctx.beginPath();
        for(let x=0;x<=width+12;x+=12) {
          const y=base+Math.sin(x/width*Math.PI*2+t*3.2+i*.65)*height*.06+Math.sin(x/width*7-t*2)*height*.015;
          if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.strokeStyle='#ffffff99';ctx.lineWidth=i===2?5:1.5;ctx.stroke();
      });
      overlay.querySelector('.seaside-intro-copy').style.opacity=String(Math.min(1,t/.18)*Math.max(0,1-(t-.9)/.35));
      frame=requestAnimationFrame(render);
    } catch { finish(); }
  }
  const timer=setTimeout(finish,2100);
  overlay.querySelector('button').addEventListener('click',finish);
  addEventListener('keydown',key); addEventListener('resize',resize); addEventListener('pagehide',finish);
  document.addEventListener('visibilitychange',visibility); reduced.addEventListener('change',finish);
  resize();frame=requestAnimationFrame(render);
})();
