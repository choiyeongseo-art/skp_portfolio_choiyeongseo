(() => {
  'use strict';
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

  // Fixed storage: no particle creation, filtering or layout reads in the frame loop.
  const count = 32;
  const trailX = new Float64Array(count);
  const trailY = new Float64Array(count);
  const color = getComputedStyle(root).getPropertyValue('--pf-accent').trim() || '#00dfff';
  // Sixteen pre-rendered organic silhouettes: glow is never recalculated per frame.
  const variants = 16, tile = 64;
  const glow = document.createElement('canvas');
  glow.width = tile * variants; glow.height = tile;
  const glowCtx = glow.getContext('2d');
  if (!glowCtx) return;
  const points = new Float64Array(24);
  for (let f = 0; f < variants; f++) {
    const phase = f / variants * Math.PI * 2;
    for (let j = 0; j < 12; j++) {
      const angle = j / 12 * Math.PI * 2;
      const radius = 10 * (1 + .12 * Math.sin(angle * 3 + phase) + .06 * Math.cos(angle * 2 - phase));
      points[j * 2] = 32 + Math.cos(angle) * radius;
      points[j * 2 + 1] = 32 + Math.sin(angle) * radius;
    }
    glowCtx.save(); glowCtx.translate(f * tile, 0);
    glowCtx.beginPath(); glowCtx.moveTo(points[0], points[1]);
    for (let j = 0; j < 12; j++) {
      const a = ((j + 11) % 12) * 2, b = j * 2;
      const c = ((j + 1) % 12) * 2, d = ((j + 2) % 12) * 2;
      glowCtx.bezierCurveTo(points[b] + (points[c] - points[a]) / 6, points[b+1] + (points[c+1] - points[a+1]) / 6,
        points[c] - (points[d] - points[b]) / 6, points[c+1] - (points[d+1] - points[b+1]) / 6, points[c], points[c+1]);
    }
    glowCtx.closePath();
    glowCtx.fillStyle = color; glowCtx.shadowColor = color; glowCtx.shadowBlur = 10;
    glowCtx.fill();
    glowCtx.shadowBlur = 0; glowCtx.strokeStyle = '#c7fbff'; glowCtx.lineWidth = .7; glowCtx.stroke();
    glowCtx.restore();
  }
  let morph = 0;
  function stamp(px, py, size, alpha, offset) {
    const phase = (morph + offset) % variants;
    const first = Math.floor(phase), mix = phase - first;
    ctx.globalAlpha = alpha * (1 - mix);
    ctx.drawImage(glow, first * tile, 0, tile, tile, px - size * 1.6, py - size * 1.6, size * 3.2, size * 3.2);
    ctx.globalAlpha = alpha * mix;
    ctx.drawImage(glow, ((first + 1) % variants) * tile, 0, tile, tile, px - size * 1.6, py - size * 1.6, size * 3.2, size * 3.2);
  }
  const interactive = 'a[href],button,input,select,textarea,summary,label[for],[role="button"],[role="link"],[tabindex]:not([tabindex="-1"]),video[controls],audio[controls]';
  const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false"])';
  let x = 0, y = 0, frame = 0, lastTime = 0, visible = false;
  let previousX = 0, previousY = 0, energy = 0;
  let width = innerWidth, height = innerHeight;

  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function hide() {
    visible = false; energy = 0; lastTime = 0;
    cursor.classList.remove('is-visible', 'is-pressed');
    root.classList.remove('has-square-cursor');
    cancelAnimationFrame(frame); frame = 0;
    ctx.clearRect(0, 0, width, height);
  }
  function state(target) {
    if (!target || !target.closest || target.closest(editable) || target.closest('iframe')) {
      hide(); return false;
    }
    const link = target.closest(interactive);
    cursor.classList.toggle('is-link', !!link && !link.matches(':disabled,[aria-disabled="true"]') && !link.closest('[inert]'));
    return true;
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    if (!visible) return;
    const dt = Math.min(lastTime ? (now - lastTime) / 1000 : 1 / 60, .048);
    lastTime = now;
    // The cursor itself stays on the exact hit point; only its tail has inertia.
    cursor.style.transform = `translate3d(${x}px,${y}px,0)`;
    ctx.clearRect(0, 0, width, height);
    if (reduced.matches) { lastTime = 0; return; }

    const speed = Math.hypot(x - previousX, y - previousY) / Math.max(dt, .001);
    previousX = x; previousY = y;
    const targetEnergy = Math.min(1, speed / 300);
    energy += (targetEnergy - energy) * (1 - Math.exp(-dt / (targetEnergy > energy ? .045 : .19)));
    // Cascaded damped followers form a curved path even during abrupt turns.
    // Small integration steps keep this consistent at 30, 60 and 144 Hz.
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const follow = 1 - Math.exp(-dt / steps / .014);
    for (let step = 0; step < steps; step++) {
      for (let i = 0; i < count; i++) {
        trailX[i] += ((i ? trailX[i - 1] : x) - trailX[i]) * follow;
        trailY[i] += ((i ? trailY[i - 1] : y) - trailY[i]) * follow;
      }
    }
    morph = (now / 7000 * variants) % variants;
    for (let i = count - 1; i >= 0; i--) {
      const taper = 1 - i / count;
      const alpha = energy * taper * taper;
      const size = 3 + 7 * taper + 2 * energy * taper;
      const px = trailX[i], py = trailY[i];
      stamp(px, py, size, alpha * .72, i * .22);
      // Sparse organic droplets widen the trail without extra simulation.
      if (i % 2 === 0) {
        const dx = (i ? trailX[i - 1] : x) - px;
        const dy = (i ? trailY[i - 1] : y) - py;
        const distance = Math.hypot(dx, dy);
        if (distance > .4) {
          const spread = (8 + 10 * taper) * energy;
          const nx = -dy / distance * spread, ny = dx / distance * spread;
          const wing = size * .43;
          stamp(px + nx, py + ny, wing, alpha * .32, i * .22 + 3);
          stamp(px - nx, py - ny, wing, alpha * .32, i * .22 + 7);
        }
      }
    }
    ctx.globalAlpha = 1;
    const unsettled = Math.hypot(trailX[count - 1] - x, trailY[count - 1] - y) > .1;
    if (unsettled || energy > .005) schedule();
    else { ctx.clearRect(0, 0, width, height); lastTime = 0; }
  }
  document.addEventListener('pointermove', event => {
    if (!fine.matches || forced.matches || event.pointerType === 'touch') { hide(); return; }
    x = event.clientX; y = event.clientY;
    if (!state(event.target)) return;
    if (!visible) {
      trailX.fill(x); trailY.fill(y);
      previousX = x; previousY = y; lastTime = 0;
      // Position before revealing, avoiding a flash at the previous location.
      cursor.style.transform = `translate3d(${x}px,${y}px,0)`;
      visible = true;
      root.classList.add('has-square-cursor');
      cursor.classList.add('is-visible');
    }
    schedule();
  }, { passive: true });
  document.addEventListener('pointerover', event => { if (visible) state(event.target); }, { passive: true });
  document.addEventListener('pointerdown', () => { if (visible) cursor.classList.add('is-pressed'); });
  document.addEventListener('pointerup', () => cursor.classList.remove('is-pressed'));
  document.addEventListener('pointercancel', hide);
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) hide(); });
  document.addEventListener('keydown', event => { if (event.key === 'Tab') hide(); });
  document.addEventListener('visibilitychange', hide);
  addEventListener('blur', hide);
  addEventListener('pagehide', hide);
  addEventListener('scroll', () => { if (visible) state(document.elementFromPoint(x,y)); }, { passive:true });
  addEventListener('resize', () => { hide(); resize(); }, { passive:true });
  fine.addEventListener('change', hide);
  forced.addEventListener('change', hide);
  reduced.addEventListener('change', hide);
  resize();
})();
