(() => {
  const palette = document.querySelector('#busan-palette');
  const controls = document.querySelector('.palette-controls');
  const play = controls.querySelector('[data-palette-play]');
  const next = controls.querySelector('[data-palette-next]');
  const status = controls.querySelector('.palette-status');
  const detail = palette.querySelector('.palette-feature p');
  const orbit = palette.querySelector('.palette-orbit');
  const swatches = Array.from(palette.children, (card) => ({
    card,
    style: Array.from(card.classList).find((name) => name.startsWith('swatch-')),
    label: card.querySelector('strong'),
    code: card.querySelector('code'),
    description: card.dataset.description,
  }));
  const colors = swatches.map(({ style, label, code, description }) => ({
    style, label: label.textContent, code: code.textContent, description,
  }));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !reducedMotion.matches;
  let visible = false;
  let timer;
  let step = 0;

  function advance() {
    const previous = step++;
    const index = step % colors.length;
    swatches.forEach(({ card, label, code }, position) => {
      const oldColor = colors[(previous + position) % colors.length];
      const color = colors[(index + position) % colors.length];
      card.classList.replace(oldColor.style, color.style);
      label.textContent = color.label;
      code.textContent = color.code;
    });
    orbit.style.setProperty('--orbit-angle', `${-37 + step * (360 / colors.length)}deg`);
    detail.textContent = colors[index].description;
    return colors[index];
  }

  function updatePlayback() {
    play.textContent = playing ? '일시정지' : '자동재생';
    window.clearInterval(timer);
    if (playing && visible && !document.hidden) {
      timer = window.setInterval(advance, 4000);
    }
  }

  play.addEventListener('click', () => {
    playing = !playing;
    updatePlayback();
  });
  next.addEventListener('click', () => {
    const color = advance();
    status.textContent = `${color.label} ${color.code}. ${color.description}`;
    updatePlayback();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) playing = false;
    updatePlayback();
  });
  document.addEventListener('visibilitychange', updatePlayback);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  }).observe(orbit);

  controls.hidden = false;
  updatePlayback();
})();
