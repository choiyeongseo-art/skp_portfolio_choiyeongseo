const presentationCover = document.querySelector('.presentation-cover');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

if (!reducedMotion.matches) {
  presentationCover.play().catch(() => {
    // Keep the poster visible if autoplay is blocked.
  });
}

const slides = document.querySelector('.presentation-slides');
const toolbar = document.querySelector('.presentation-toolbar');
const modes = [...toolbar.querySelectorAll('[data-mode]')];
const controls = toolbar.querySelector('.presentation-controls');
const position = controls.querySelector('output');
const [previous, next] = controls.querySelectorAll('[data-step]');
const total = slides.children.length;
let current = 0;

function showPosition() {
  position.value = `${String(current + 1).padStart(2, '0')} / ${total}`;
  previous.setAttribute('aria-disabled', current === 0);
  next.setAttribute('aria-disabled', current === total - 1);
}

function move(step) {
  const target = Math.max(0, Math.min(total - 1, current + step));
  if (target === current) return;
  slides.scrollTo({
    left: target * slides.getBoundingClientRect().width,
    behavior: reducedMotion.matches ? 'instant' : 'smooth'
  });
}

for (const mode of modes) {
  mode.addEventListener('click', () => {
    if (mode.getAttribute('aria-pressed') === 'true') return;
    const horizontal = mode.dataset.mode === 'horizontal';
    slides.dataset.mode = mode.dataset.mode;
    controls.hidden = !horizontal;
    for (const button of modes) button.setAttribute('aria-pressed', button === mode);

    if (horizontal) {
      slides.tabIndex = 0;
      slides.scrollLeft = current * slides.getBoundingClientRect().width;
      showPosition();
    } else {
      slides.removeAttribute('tabindex');
    }
  });
}

slides.addEventListener('scroll', () => {
  if (slides.dataset.mode !== 'horizontal') return;
  const index = Math.round(slides.scrollLeft / slides.getBoundingClientRect().width);
  if (index === current) return;
  current = index;
  showPosition();
}, { passive: true });

slides.addEventListener('keydown', (event) => {
  if (event.target !== slides || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  move(event.key === 'ArrowRight' ? 1 : -1);
});

for (const button of [previous, next]) {
  button.addEventListener('click', () => move(Number(button.dataset.step)));
}

toolbar.hidden = false;
