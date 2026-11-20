(() => {
  const panels = [...document.querySelectorAll('.screen-list > .screen > .screen-comparison')]
    .map((details) => ({
      details,
      screen: details.parentElement,
      summary: details.querySelector('summary'),
    }));
  let active = null;
  let frame;
  function setOpen(panel, open, keepPosition) {
    if (panel.details.open === open) return;
    if (!keepPosition) {
      panel.details.open = open;
      return;
    }

    // Change the height and offset the viewport before the next paint.
    const { details } = panel;
    const root = document.documentElement;
    const previousHeight = details.getBoundingClientRect().height;
    root.classList.add('comparison-scroll-compensating');
    details.classList.add('comparison-snap');
    panel.details.open = open;
    const delta = details.getBoundingClientRect().height - previousHeight;
    if (delta) window.scrollBy({ top: delta, behavior: 'instant' });
    window.requestAnimationFrame(() => {
      details.classList.remove('comparison-snap');
      root.classList.remove('comparison-scroll-compensating');
    });
  }

  function update() {
    frame = undefined;
    const height = window.innerHeight;
    const next = panels.find(({ screen, summary }, index) => {
      const following = panels[index + 1];
      return summary.getBoundingClientRect().top <= height * .7
        && screen.getBoundingClientRect().bottom > height * .35
        && (!following || following.screen.getBoundingClientRect().top > height * .5);
    }) ?? null;

    if (next === active) return;
    const previous = active;
    active = next;
    if (previous) setOpen(previous, false, previous.summary.getBoundingClientRect().bottom <= height * .5);
    if (next) setOpen(next, true, next.summary.getBoundingClientRect().bottom <= 0);
  }

  function scheduleUpdate() {
    if (frame === undefined) frame = window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate, { once: true });
  scheduleUpdate();
})();
