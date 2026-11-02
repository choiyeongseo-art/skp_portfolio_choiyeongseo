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
  let width, height, frame, finished = false;
  const start = performance.now();
  const clamp = x => Math.max(0, Math.min(1, x));
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    setTimeout(() => overlay.remove(), 500);
  }
  function onKey(event) { if (event.key === 'Escape') finish(); }
  function onVisibility() { if (document.hidden) finish(); }
  function render(now) {
    try {
      const t = (now - start) / 1000;
      if (t >= 1.85) { finish(); return; }
      ctx.fillStyle = '#f3fbff'; ctx.fillRect(0, 0, width, height);
      const cx = width * .5, cy = height * .47;
      const ambient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * .7);
      ambient.addColorStop(0, '#ffffff'); ambient.addColorStop(.4, '#ecfaff'); ambient.addColorStop(.72, '#daefff'); ambient.addColorStop(1, '#f8fdff');
      ctx.fillStyle = ambient; ctx.fillRect(0, 0, width, height);
      const entry = clamp(t / .22);
      // Increasing travel speed makes the nested frames rush past the viewer.
      const travel = t * .72 + t * t * .46;
      const unit = Math.min(width * .68, height * .79);
      for (let i = 29; i >= 0; i--) {
        const depth = ((i / 30 - travel % 1 + 1) % 1);
        const scale = .09 / (depth + .023);
        const size = unit * scale;
        const alpha = clamp((1 - depth) * 1.3) * clamp(depth * 22) * entry;
        if (size > Math.max(width, height) * 2.5) continue;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(t * .9) * .016 * (1 - depth));
        const gradient = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
        gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.24, '#b9f4ff');
        gradient.addColorStop(.52, '#58bcff'); gradient.addColorStop(.76, '#d5eaff'); gradient.addColorStop(1, '#ffffff');
        ctx.strokeStyle = gradient;
        ctx.globalAlpha = alpha * .32;
        ctx.lineWidth = Math.max(2, scale * 11);
        ctx.shadowColor = '#65c8ff'; ctx.shadowBlur = Math.min(24, 9 * scale);
        ctx.strokeRect(-size / 2, -size / 2, size, size);
        ctx.shadowBlur = 0; ctx.globalAlpha = alpha * .95;
        ctx.lineWidth = Math.max(.7, scale * 1.8);
        ctx.strokeRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      }
      // A soft white wash resolves into the page, avoiding a hard scene cut.
      ctx.fillStyle = `rgba(255,255,255,${clamp((t - 1.42) / .43)})`;
      ctx.fillRect(0, 0, width, height);
      frame = requestAnimationFrame(render);
    } catch { finish(); }
  }
  const watchdog = setTimeout(finish, 2600);
  overlay.querySelector('button').addEventListener('click', finish);
  addEventListener('keydown', onKey);
  addEventListener('resize', resize);
  addEventListener('pagehide', finish);
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', finish);
  resize();
  frame = requestAnimationFrame(render);
})();
