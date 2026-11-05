/* A short perspective tunnel, rendered locally without external dependencies. */
(() => {
  const overlay = document.querySelector('.portal-intro');
  if (!overlay) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const navigation = performance.getEntriesByType('navigation')[0];
  // Preserve deep links and browser Back position; replay on each fresh home visit.
  if (motion.matches || location.hash || navigation?.type === 'back_forward') {
    overlay.remove();
    return;
  }
  const canvas = overlay.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) { overlay.remove(); return; }
  const content = [...document.body.children].filter(el => el !== overlay && /^(A|HEADER|MAIN|FOOTER)$/.test(el.tagName));
  const previousInert = content.map(el => el.inert);
  content.forEach(el => { el.inert = true; });
  let width, height, frame, ambient, tint, finished = false;
  const duration = 1.45;
  const points = new Float64Array(32);
  const start = performance.now();
  const clamp = x => Math.max(0, Math.min(1, x));
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ambient = ctx.createRadialGradient(width * .5, height * .47, 0, width * .5, height * .47, Math.max(width, height) * .7);
    ambient.addColorStop(0, '#ffffff'); ambient.addColorStop(.4, '#ecfaff'); ambient.addColorStop(.72, '#daefff'); ambient.addColorStop(1, '#f8fdff');
    tint = ctx.createLinearGradient(-.5, -.5, .5, .5);
    tint.addColorStop(0, '#ffffff'); tint.addColorStop(.24, '#b9f4ff'); tint.addColorStop(.52, '#58bcff'); tint.addColorStop(.76, '#d5eaff'); tint.addColorStop(1, '#ffffff');
  }
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    clearTimeout(watchdog);
    content.forEach((el, i) => { el.inert = previousInert[i]; });
    if (overlay.contains(document.activeElement)) document.activeElement.blur();
    overlay.classList.add('is-leaving');
    removeEventListener('resize', resize);
    removeEventListener('keydown', onKey);
    removeEventListener('pagehide', finish);
    document.removeEventListener('visibilitychange', onVisibility);
    motion.removeEventListener('change', finish);
    setTimeout(() => overlay.remove(), 340);
  }
  function onKey(event) { if (event.key === 'Escape') finish(); }
  function onVisibility() { if (document.hidden) finish(); }
  function render(now) {
    try {
      const t = (now - start) / 1000;
      if (t >= duration) { finish(); return; }
      ctx.fillStyle = '#f3fbff'; ctx.fillRect(0, 0, width, height);
      const cx = width * .5, cy = height * .47;
      ctx.fillStyle = ambient; ctx.fillRect(0, 0, width, height);
      const entry = clamp(t / .22);
      // Increasing travel speed makes the nested frames rush past the viewer.
      const progress = t / duration;
      const travel = progress * 1.332 + progress * progress * 1.574;
      const unit = Math.min(width * .68, height * .79);
      // One smoothly closed contour shared by every depth layer each frame.
      for (let j = 0; j < 16; j++) {
        const angle = j / 16 * Math.PI * 2;
        const radius = .5 * (1 + .10 * Math.sin(3 * angle + t * 1.3) + .055 * Math.cos(2 * angle - t * .8));
        points[j * 2] = Math.cos(angle) * radius;
        points[j * 2 + 1] = Math.sin(angle) * radius;
      }
      const contour = new Path2D(); contour.moveTo(points[0], points[1]);
      for (let j = 0; j < 16; j++) {
        const a = ((j + 15) % 16) * 2, b = j * 2;
        const c = ((j + 1) % 16) * 2, d = ((j + 2) % 16) * 2;
        contour.bezierCurveTo(points[b] + (points[c] - points[a]) / 6, points[b+1] + (points[c+1] - points[a+1]) / 6,
          points[c] - (points[d] - points[b]) / 6, points[c+1] - (points[d+1] - points[b+1]) / 6, points[c], points[c+1]);
      }
      contour.closePath();
      for (let i = 23; i >= 0; i--) {
        const depth = ((i / 24 - travel % 1 + 1) % 1);
        const scale = .09 / (depth + .023);
        const size = unit * scale;
        const alpha = clamp((1 - depth) * 1.3) * clamp(depth * 22) * entry;
        if (size > Math.max(width, height) * 2.5) continue;
        ctx.save(); ctx.translate(cx, cy);
        ctx.rotate(Math.sin(t * .9) * .035 * (1 - depth));
        ctx.scale(size, size);
        ctx.strokeStyle = tint;
        ctx.globalAlpha = alpha * .14;
        ctx.lineWidth = Math.max(2, scale * 11) / size;
        ctx.stroke(contour);
        ctx.globalAlpha = alpha * .9;
        ctx.lineWidth = Math.max(.7, scale * 1.8) / size;
        ctx.stroke(contour);
        ctx.restore();
      }
      // A soft white wash resolves into the page, avoiding a hard scene cut.
      ctx.fillStyle = `rgba(255,255,255,${clamp((t - 1.12) / .33)})`;
      ctx.fillRect(0, 0, width, height);
      frame = requestAnimationFrame(render);
    } catch { finish(); }
  }
  const watchdog = setTimeout(finish, 2100);
  overlay.querySelector('button').addEventListener('click', finish);
  addEventListener('keydown', onKey);
  addEventListener('resize', resize);
  addEventListener('pagehide', finish);
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', finish);
  resize();
  frame = requestAnimationFrame(render);
})();
