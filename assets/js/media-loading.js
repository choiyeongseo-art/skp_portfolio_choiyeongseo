/* Native controls keep working without this optional autoplay enhancement. */
(() => {
  const videos = [...document.querySelectorAll('video[data-autoplay]')];
  if (!videos.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const inView = new Set();
  const sync = video => {
    if (document.hidden || reduced.matches || navigator.connection?.saveData || !inView.has(video)) video.pause();
    else video.play().catch(() => {});
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({target, isIntersecting}) => {
      if (isIntersecting) inView.add(target); else inView.delete(target);
      sync(target);
    });
  }, {threshold: .05});
  videos.forEach(video => observer.observe(video));
  document.addEventListener('visibilitychange', () => videos.forEach(sync));
  reduced.addEventListener('change', () => videos.forEach(sync));
  navigator.connection?.addEventListener('change', () => videos.forEach(sync));
})();
