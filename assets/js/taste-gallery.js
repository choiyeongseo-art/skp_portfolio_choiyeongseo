(() => {
  const gallery = document.querySelector('.taste-site-screens');
  if (!gallery) return;
  const slides = [...gallery.querySelectorAll('.taste-site-screen')];
  if (!slides.length) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let frame = 0;
  let drag;
  let suppressClick = false;
  let width = 0;
  let clickReset;
  gallery.classList.add('is-enhanced');
  gallery.setAttribute('role', 'region');
  gallery.setAttribute('aria-label', 'My favorite room 화면 갤러리');
  gallery.setAttribute('aria-roledescription', '캐러셀');
  gallery.tabIndex = 0;
  const controls = document.createElement('div');
  controls.className = 'taste-gallery-controls';
  controls.innerHTML = '<button type="button" aria-label="이전 화면">←</button><span aria-live="polite" aria-atomic="true"></span><button type="button" aria-label="다음 화면">→</button>';
  gallery.after(controls);
  const [previous, next] = controls.querySelectorAll('button');
  const counter = controls.querySelector('span');
  const center = slide => {
    const container = gallery.getBoundingClientRect();
    const bounds = slide.getBoundingClientRect();
    return gallery.scrollLeft + bounds.left + bounds.width / 2 - container.left - gallery.clientWidth / 2;
  };
  const update = () => {
    frame = 0;
    if (!gallery.clientWidth) return;
    active = slides.reduce((best, slide, index) =>
      Math.abs(center(slide) - gallery.scrollLeft) < Math.abs(center(slides[best]) - gallery.scrollLeft) ? index : best, 0);
    slides.forEach((slide, index) => {
      slide.classList.toggle('is-centered', index === active);
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', '슬라이드');
      slide.setAttribute('aria-label', `${index + 1} / ${slides.length}`);
    });
    counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    previous.disabled = active === 0;
    next.disabled = active === slides.length - 1;
  };
  const move = index => {
    const slide = slides[Math.max(0, Math.min(index, slides.length - 1))];
    gallery.scrollTo({ left: center(slide), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  };
  gallery.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
  previous.addEventListener('click', () => move(active - 1));
  next.addEventListener('click', () => move(active + 1));
  gallery.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : active + (event.key === 'ArrowRight' ? 1 : -1));
  });
  gallery.addEventListener('focusin', event => {
    const slide = event.target.closest('.taste-site-screen');
    if (slide && !drag) move(slides.indexOf(slide));
  });
  gallery.addEventListener('dragstart', event => event.preventDefault());
  // Touch uses native scrolling and momentum. Mouse/pen use a drag threshold
  // so a normal click still reaches the existing image lightbox.
  gallery.addEventListener('pointerdown', event => {
    clearTimeout(clickReset);
    suppressClick = false;
    if (event.pointerType === 'touch' || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, left: gallery.scrollLeft, moved: false };
  });
  gallery.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const delta = event.clientX - drag.x;
    if (!drag.moved && Math.abs(delta) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      gallery.setPointerCapture(event.pointerId);
      gallery.classList.add('is-dragging');
    }
    event.preventDefault();
    gallery.scrollLeft = drag.left - delta;
  });
  const finish = event => {
    if (!drag || drag.id !== event.pointerId) return;
    const moved = drag.moved;
    drag = null;
    gallery.classList.remove('is-dragging');
    if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
    if (moved) {
      suppressClick = true;
      clickReset = setTimeout(() => { suppressClick = false; }, 0);
      update();
      move(active);
    }
  };
  gallery.addEventListener('pointerup', finish);
  gallery.addEventListener('pointercancel', finish);
  gallery.addEventListener('lostpointercapture', finish);
  gallery.addEventListener('pointerleave', event => { if (drag && !drag.moved) drag = null; });
  gallery.addEventListener('click', event => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  const resize = () => {
    const nextWidth = gallery.clientWidth;
    if (!nextWidth || nextWidth === width) return;
    width = nextWidth;
    // Size cards from the gallery itself, including inside narrow project panels.
    gallery.style.setProperty('--screen-width', `${Math.min(width * .74, 680)}px`);
    requestAnimationFrame(() => {
      gallery.scrollTo({ left: center(slides[active]), behavior: 'instant' });
      update();
    });
  };
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(gallery);
  else window.addEventListener('resize', resize);
  resize();
  update();
})();
