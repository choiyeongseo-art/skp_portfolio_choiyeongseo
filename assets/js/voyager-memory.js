(() => {
  const stage = document.getElementById('memory-stage');
  if (!stage) return;

  const symbol = stage.querySelector('.memory-symbol');
  const orbs = Array.from(stage.querySelectorAll('.memory-orb'));
  const strokes = Array.from(symbol.querySelectorAll('.memory-stroke'));
  const status = document.getElementById('memory-status');
  const reset = document.getElementById('memory-reset');
  const transition = document.getElementById('memory');
  const launch = transition.querySelector('.memory-launch');
  const game = document.getElementById('memory-game');
  const title = document.getElementById('memory-title');
  const open = document.getElementById('memory-open');
  const back = document.getElementById('memory-back');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let collected = 0;
  let restored = 0;

  function showGame(playing) {
    transition.classList.toggle('is-playing', playing);
    transition.classList.toggle('is-returning', !playing);
    game.hidden = !playing;
    launch.inert = playing;
    open.setAttribute('aria-expanded', String(playing));
    (playing ? title : open).focus({ preventScroll: true });
    transition.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  open.addEventListener('click', () => showGame(true));
  back.addEventListener('click', () => showGame(false));

  async function sendLight(orb, stroke) {
    if (reducedMotion.matches) return;

    const origin = orb.querySelector('span').getBoundingClientRect();
    const area = stage.getBoundingClientRect();
    const emblem = symbol.getBoundingClientRect();
    const [x, y] = stroke.dataset.target.split(' ').map(Number);
    const dx = emblem.left + emblem.width * x / 100 - (origin.left + origin.width / 2);
    const dy = emblem.top + emblem.height * y / 100 - (origin.top + origin.height / 2);
    const light = document.createElement('span');
    light.className = 'memory-flight';
    light.setAttribute('aria-hidden', 'true');
    light.style.left = `${origin.left + origin.width / 2 - area.left - stage.clientLeft - 10.5}px`;
    light.style.top = `${origin.top + origin.height / 2 - area.top - stage.clientTop - 10.5}px`;
    const trajectory = [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * .46}px, ${dy * .46 - 20}px) scale(.8)`, opacity: 1, offset: .55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.18)`, opacity: .15 },
    ];
    const timing = { duration: 540, easing: 'cubic-bezier(.3,.1,.25,1)' };
    const trail = [36, 72, 108].map((delay, index) => {
      const mote = light.cloneNode();
      mote.classList.add('memory-trail');
      mote.style.setProperty('--mote-size', `${8 - index * 2}px`);
      stage.append(mote);
      const animation = mote.animate(trajectory, { ...timing, delay });
      animation.finished.then(() => mote.remove(), () => mote.remove());
      return mote;
    });
    stage.append(light);
    await light.animate(trajectory, timing).finished.catch(() => {});
    light.remove();
    if (game.hidden) {
      trail.forEach(mote => mote.remove());
      return;
    }

    const flare = document.createElement('span');
    flare.className = 'memory-impact';
    flare.setAttribute('aria-hidden', 'true');
    flare.style.left = `${emblem.left - area.left - stage.clientLeft + emblem.width * x / 100}px`;
    flare.style.top = `${emblem.top - area.top - stage.clientTop + emblem.height * y / 100}px`;
    stage.append(flare);
    const burst = flare.animate([
      { transform: 'translate(-50%, -50%) scale(.3)', opacity: .85 },
      { transform: 'translate(-50%, -50%) scale(2.8)', opacity: 0 },
    ], { duration: 460, easing: 'ease-out' });
    burst.finished.then(() => flare.remove(), () => flare.remove());
  }

  orbs.forEach((orb) => orb.addEventListener('click', async () => {
    if (orb.hidden) return;
    const stroke = strokes[collected++];
    const moveFocus = document.activeElement === orb && orb.matches(':focus-visible');
    const flight = sendLight(orb, stroke);
    orb.hidden = true;
    if (moveFocus) orbs.find((remaining) => !remaining.hidden)?.focus({ preventScroll: true });

    await flight;
    stroke.classList.add('is-restored');
    restored += 1;
    if (restored === orbs.length) {
      stage.classList.add('is-complete');
      status.textContent = '다섯 획이 이어져 잃어버린 기억이 돌아왔습니다.';
      reset.hidden = false;
      if (!game.hidden && document.activeElement === document.body) {
        reset.focus({ preventScroll: true });
      }
      return;
    }
    status.textContent = `${restored}개의 획을 복원했습니다.`;
  }));

  reset.addEventListener('click', () => {
    collected = 0;
    restored = 0;
    stage.classList.remove('is-complete');
    stage.querySelectorAll('.memory-trail, .memory-impact').forEach(effect => effect.remove());
    strokes.forEach((stroke) => stroke.classList.remove('is-restored'));
    orbs.forEach((orb) => { orb.hidden = false; });
    status.textContent = '';
    reset.hidden = true;
    orbs[0].focus({ preventScroll: true });
  });
})();
