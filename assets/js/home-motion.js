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
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!features.length || !('IntersectionObserver' in window) || reduced.matches) return;

  const reveal = new IntersectionObserver(entries => {
    entries.forEach(({target, isIntersecting}) => {
      target.classList.toggle('feature-awaiting-reveal', !isIntersecting);
      target.classList.toggle('feature-revealing', isIntersecting);
    });
  });

  features.forEach(feature => {
    feature.classList.add('feature-awaiting-reveal');
    reveal.observe(feature);
  });
})();
