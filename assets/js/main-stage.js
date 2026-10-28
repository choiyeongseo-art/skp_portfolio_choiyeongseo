// Cards remain semantic HTML links; WebGL adds only the ambient depth layer.
const stage = document.querySelector('.main-stage');
const carousel = stage?.querySelector('.work-carousel');
if (stage && carousel) {
  const slides = [...stage.querySelectorAll('.work-slide')];
  const dots = [...stage.querySelectorAll('[data-work-select]')];
  const count = stage.querySelector('.work-count');
  const names = ['한술', 'NOX', 'Spready'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, drag = null, suppressClickUntil = 0;
  function draw(offset = 0) {
    const width = slides[0].offsetWidth;
    const height = Math.max(...slides.map(slide => slide.offsetHeight)) + 62;
    if (carousel.style.height !== `${height}px`) carousel.style.height = `${height}px`;
    const mobile = innerWidth <= 540;
    slides.forEach((slide, i) => {
      let relative = (i - current + slides.length) % slides.length;
      if (relative > 1) relative -= slides.length;
      const x = relative * width * (mobile ? .91 : .84) + offset * .45;
      const active = relative === 0;
      slide.style.transform = `translateX(calc(-50% + ${x}px)) translateZ(${active ? 0 : -190}px) rotateY(${-relative * 13}deg)`;
      slide.style.zIndex = active ? '3' : '1';
      slide.classList.toggle('is-active', active);
      slide.querySelector('a').setAttribute('aria-label', `${names[i]} 제작 과정 보기${active ? '' : ' — 먼저 카드 선택'}`);
      if (active) slide.setAttribute('aria-current', 'true'); else slide.removeAttribute('aria-current');
    });
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
    count.textContent = `0${current + 1} / 03 — ${names[current]}`;
  }
  function select(index) {
    current = (index + slides.length) % slides.length;
    stage.dataset.activeWork = String(current);
    draw();
    stage.dispatchEvent(new CustomEvent('workchange', { detail: current }));
  }
  stage.querySelectorAll('[data-work-step]').forEach(button => button.addEventListener('click', () => select(current + Number(button.dataset.workStep))));
  dots.forEach(dot => dot.addEventListener('click', () => select(Number(dot.dataset.workSelect))));
  slides.forEach((slide, i) => slide.querySelector('a').addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); return; }
    if (i !== current) { event.preventDefault(); select(i); }
  }));
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); select(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  carousel.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    drag = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false, horizontal: false };
  });
  carousel.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && (Math.abs(dx) > 9 || Math.abs(dy) > 9)) {
      drag.moved = true; drag.horizontal = Math.abs(dx) > Math.abs(dy);
      if (drag.horizontal) { carousel.setPointerCapture(event.pointerId); carousel.classList.add('is-dragging'); }
    }
    if (drag.horizontal) { event.preventDefault(); draw(dx); }
  });
  function release(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    if (drag.horizontal) {
      suppressClickUntil = performance.now() + 450;
      if (Math.abs(dx) > 45) select(current + (dx < 0 ? 1 : -1)); else draw();
    }
    carousel.classList.remove('is-dragging');
    if (carousel.hasPointerCapture(event.pointerId)) carousel.releasePointerCapture(event.pointerId);
    drag = null;
  }
  carousel.addEventListener('pointerup', release);
  carousel.addEventListener('pointercancel', event => {
    if (drag?.id === event.pointerId) { drag = null; carousel.classList.remove('is-dragging'); draw(); }
  });
  carousel.addEventListener('dragstart', event => event.preventDefault());
  new ResizeObserver(() => draw()).observe(carousel);
  stage.classList.add('carousel-ready'); select(0);
  // Keep the original helper on the original home, clear of the new gallery.
  document.body.classList.add('main-is-visible');
  new IntersectionObserver(entries => {
    document.body.classList.toggle('main-is-visible', entries[0].isIntersecting);
  }, { threshold: .05 }).observe(stage);

  // Load Three.js from the local pinned distribution. No CDN or WebGL dependency for navigation.
  async function addAtmosphere() {
    if (reduced.matches || navigator.connection?.saveData) return;
    try {
      const THREE = await import('./vendor/three.module.min.js');
      const canvas = document.querySelector('#main-atmosphere');
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setClearColor(0x050505, 0);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, .1, 40); camera.position.z = 11;
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array(180 * 3);
      for (let i = 0; i < 180; i++) {
        const theta = i * 2.39996;
        const r = Math.sqrt(i / 180) * 6.2;
        vertices[i * 3] = Math.cos(theta) * r;
        vertices[i * 3 + 1] = Math.sin(theta) * r * .56;
        vertices[i * 3 + 2] = Math.sin(theta * 1.7) * 1.1 - 2;
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const material = new THREE.PointsMaterial({ color: 0x00dfff, size: .014, transparent: true, opacity: .35, depthWrite: false });
      const field = new THREE.Points(geometry, material); scene.add(field);
      let target = 0, visible = true, raf = 0, previous = 0;
      const resize = () => {
        renderer.setSize(stage.clientWidth, stage.clientHeight, false);
        camera.aspect = stage.clientWidth / stage.clientHeight; camera.updateProjectionMatrix();
      };
      new ResizeObserver(resize).observe(stage); resize();
      stage.addEventListener('workchange', event => { target = event.detail * .34; });
      function frame(now) {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden || now - previous < 32) return;
        previous = now;
        field.rotation.y += (target - field.rotation.y) * .025;
        field.rotation.z = Math.sin(now * .00007) * .06;
        renderer.render(scene, camera);
      }
      const observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
        if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
      });
      observer.observe(stage);
      canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault(); cancelAnimationFrame(raf); raf = 0; canvas.hidden = true;
      });
      reduced.addEventListener('change', event => {
        if (event.matches) { cancelAnimationFrame(raf); raf = 0; observer.disconnect(); renderer.dispose(); geometry.dispose(); material.dispose(); canvas.hidden = true; }
      }, { once: true });
      stage.dataset.webgl = 'ready';
    } catch {
      // Semantic carousel, blur and CSS perspective remain fully usable.
      stage.dataset.webgl = 'fallback';
    }
  }
  if ('requestIdleCallback' in window) requestIdleCallback(addAtmosphere, { timeout: 1000 }); else addAtmosphere();

  // Pause the original banner while it is below the new MAIN to avoid decoding off screen.
  const banner = document.querySelector('#banner-video');
  if (banner) new IntersectionObserver(entries => {
    if (reduced.matches || document.hidden || !entries[0].isIntersecting) banner.pause();
    else if (!banner.dataset.userPaused) banner.play().catch(() => {});
  }, { threshold: .08 }).observe(banner);
  document.querySelector('.banner-control')?.addEventListener('click', () => {
    if (banner) banner.dataset.userPaused = banner.paused ? 'true' : '';
  });
}
