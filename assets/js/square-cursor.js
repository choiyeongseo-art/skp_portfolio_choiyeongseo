(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const root = document.documentElement;
  const canvas = document.createElement('canvas');
  canvas.className = 'square-cursor-trail';
  canvas.setAttribute('aria-hidden', 'true');
  const cursor = document.createElement('div');
  cursor.className = 'square-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  document.body.append(canvas, cursor);
  let x = 0, y = 0, lastX = null, lastY = null, frame = 0, visible = false;
  let particles = [];
  let color = getComputedStyle(root).getPropertyValue('--pf-accent').trim() || '#00dfff';
  const interactive = 'a[href],button,input,select,textarea,summary,label[for],[role="button"],[role="link"],[tabindex]:not([tabindex="-1"]),video[controls],audio[controls]';
  const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false"])';
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function hide() {
    visible = false; lastX = lastY = null; particles = [];
    cursor.classList.remove('is-visible', 'is-pressed');
    root.classList.remove('has-square-cursor');
    cancelAnimationFrame(frame); frame = 0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
  function state(target) {
    if (!target || target.closest(editable) || target.closest('iframe')) { hide(); return false; }
    const link = target.closest(interactive);
    cursor.classList.toggle('is-link', !!link && !link.matches(':disabled,[aria-disabled="true"]') && !link.closest('[inert]'));
    return true;
  }
  function draw(now) {
    frame = 0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    particles = particles.filter(p => now - p.time < 460);
    ctx.fillStyle = color;
    for (const p of particles) {
      const life = Math.max(0, 1 - (now - p.time) / 460);
      const size = p.size * (.35 + life * .65);
      ctx.globalAlpha = life * life * p.alpha;
      ctx.shadowColor = color; ctx.shadowBlur = 5 * life;
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    if (visible) state(document.elementFromPoint(x, y));
    if (particles.length) frame = requestAnimationFrame(draw);
  }
  document.addEventListener('pointermove', event => {
    if (!fine.matches || forced.matches || event.pointerType === 'touch') { hide(); return; }
    x = event.clientX; y = event.clientY;
    if (!state(event.target)) return;
    visible = true;
    root.classList.add('has-square-cursor');
    cursor.classList.add('is-visible');
    cursor.style.transform = `translate3d(${x}px,${y}px,0)`;
    if (!reduced.matches && lastX !== null) {
      const dx = x - lastX, dy = y - lastY, distance = Math.hypot(dx, dy);
      const steps = Math.min(12, Math.floor(distance / 9));
      const nx = distance ? -dy / distance : 0, ny = distance ? dx / distance : 0;
      for (let i = 1; i <= steps; i++) {
        const px = lastX + dx * i / steps, py = lastY + dy * i / steps;
        for (let row = -1; row <= 1; row++) particles.push({x:px + nx * row * 8,y:py + ny * row * 8,size:row ? 3 : 5,time:performance.now(),alpha:row ? .18 : .42});
      }
      particles = particles.slice(-180);
      if (steps) { lastX = x; lastY = y; }
    } else { lastX = x; lastY = y; }
    if (!frame) frame = requestAnimationFrame(draw);
  }, { passive: true });
  document.addEventListener('pointerdown', () => { if (visible) cursor.classList.add('is-pressed'); });
  document.addEventListener('pointerup', () => cursor.classList.remove('is-pressed'));
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) hide(); });
  document.addEventListener('keydown', event => { if (event.key === 'Tab') hide(); });
  document.addEventListener('visibilitychange', hide);
  addEventListener('blur', hide);
  addEventListener('pagehide', hide);
  addEventListener('scroll', () => { if (visible) state(document.elementFromPoint(x,y)); }, { passive:true });
  addEventListener('resize', resize);
  fine.addEventListener('change', hide);
  forced.addEventListener('change', hide);
  reduced.addEventListener('change', hide);
  resize();
})();
