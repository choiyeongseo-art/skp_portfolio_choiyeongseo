(() => {
  if (!('IntersectionObserver' in window)) return;

  function reveal(entries, observer) {
    const [threshold] = observer.thresholds;
    entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
      if (!isIntersecting || intersectionRatio < threshold) return;
      target.classList.add('motion-visible');
      observer.unobserve(target);
    });
  }

  function observe(selector, options) {
    const observer = new IntersectionObserver(reveal, options);
    document.querySelectorAll(selector).forEach((target) => {
      target.classList.add('motion-ready');
      target.addEventListener('focusin', () => {
        target.classList.add('motion-visible');
        observer.unobserve(target);
      }, { once: true });
      observer.observe(target);
    });
  }

  observe('.screen-list > .screen, .steps', { rootMargin: '0px 0px -7% 0px' });
  observe('.ia-map', { threshold: .25 });
  observe('.cover-title', { threshold: .65 });
  observe('.problem-statement', { rootMargin: '0px 0px -25% 0px', threshold: .9 });
  observe('.evidence-chart', { threshold: .7 });
})();
