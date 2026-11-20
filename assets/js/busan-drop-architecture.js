(() => {
  const map = document.querySelector('.ia-map');
  const frame = map.parentElement;
  const hint = document.querySelector('#ia-swipe-hint');
  let drag;

  function updateEdges() {
    const max = map.scrollWidth - map.clientWidth;
    frame.toggleAttribute('data-more-left', map.scrollLeft > 1);
    frame.toggleAttribute('data-more-right', map.scrollLeft < max - 1);
    hint.hidden = max <= 1;
  }

  map.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || hint.hidden) return;
    event.preventDefault();
    map.focus({ preventScroll: true });
    drag = { id: event.pointerId, x: event.clientX, scroll: map.scrollLeft };
    map.setPointerCapture(event.pointerId);
    map.classList.add('is-dragging');
  });

  map.addEventListener('pointermove', (event) => {
    if (drag?.id !== event.pointerId) return;
    map.scrollLeft = drag.scroll + drag.x - event.clientX;
  });

  function endDrag(event) {
    if (drag?.id !== event.pointerId) return;
    drag = undefined;
    map.classList.remove('is-dragging');
  }

  map.addEventListener('pointerup', endDrag);
  map.addEventListener('pointercancel', endDrag);
  map.addEventListener('lostpointercapture', endDrag);
  map.addEventListener('scroll', updateEdges, { passive: true });

  const resize = new ResizeObserver(updateEdges);
  resize.observe(map);
  resize.observe(map.querySelector('.ia-branches'));
  frame.setAttribute('data-swipe', '');
  updateEdges();
})();
