/* Blur Fade inspired reveal; native observers and CSS, without animation libraries. */
(() => {
  const deferredImages = [...document.querySelectorAll('img[data-src]')];
  const loadImage = image => {
    image.loading = 'eager';
    if (image.dataset.srcset) { image.srcset = image.dataset.srcset; delete image.dataset.srcset; }
    image.src = image.dataset.src; delete image.dataset.src;
  };
  if ('IntersectionObserver' in window) {
    const images = new IntersectionObserver(entries => {
      entries.forEach(({target, isIntersecting}) => {
        if (isIntersecting) { loadImage(target); images.unobserve(target); }
      });
    }, {rootMargin: '400px'});
    deferredImages.forEach(image => images.observe(image));
  } else deferredImages.forEach(loadImage);
  const features = [...document.querySelectorAll('#selected > .feature')];
  if (!features.length || !('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const inView = new Set();
  const sync = () => features.forEach(feature => {
    feature.classList.toggle('is-floating', inView.has(feature) && !document.hidden && !reduced.matches);
  });
  const copyObserver = new IntersectionObserver(entries => {
    entries.forEach(({target, isIntersecting}) => {
      if (!isIntersecting) return;
      target.classList.add('is-revealed');
      // Already-visible content can settle before a transition event is emitted.
      setTimeout(() => target.classList.add('reveal-complete'), 1000);
      copyObserver.unobserve(target);
    });
  }, {threshold: .12, rootMargin: '0px 0px -24px 0px'});
  const visibility = new IntersectionObserver(entries => {
    entries.forEach(({target, isIntersecting}) => {
      if (isIntersecting) inView.add(target); else inView.delete(target);
    });
    sync();
  });
  features.forEach(feature => {
    const copy = feature.querySelector('.feature-copy');
    if (copy) {
      copy.classList.add('motion-copy');
      copyObserver.observe(copy);
      copy.addEventListener('focusin', () => copy.classList.add('is-revealed'));
    }
    feature.addEventListener('transitionend', event => {
      if (event.target === copy && event.propertyName === 'filter' && copy.classList.contains('is-revealed')) {
        copy.classList.add('reveal-complete');
      }
    });
    visibility.observe(feature);
  });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => {
    if (reduced.matches) features.forEach(feature => feature.querySelector('.feature-copy')?.classList.add('is-revealed', 'reveal-complete'));
    sync();
  });
})();
