const track = document.querySelector('#campaign-films');
const slides = [...track.querySelectorAll('.film-slide')];
const videos = slides.map(slide => slide.querySelector('video'));
const controls = document.querySelector('.film-controls');
const [previous, next] = controls.querySelectorAll('button');
const count = controls.querySelector('.film-count');
let active = -1;
let scrollTimer;
let drag;
let suppressClick = false;

function updateActiveFilm() {
  const index = slides.reduce((nearest, slide, candidate) => {
    const distance = Math.abs(slide.offsetLeft - track.scrollLeft);
    return distance < Math.abs(slides[nearest].offsetLeft - track.scrollLeft) ? candidate : nearest;
  }, 0);
  if (index === active) return;
  active = index;
  videos.forEach((video, position) => {
    if (position !== active) video.pause();
  });
  previous.disabled = active === 0;
  next.disabled = active === slides.length - 1;
  count.textContent = `${active + 1} / ${slides.length}`;
}

function move(direction) {
  const target = slides[active + direction];
  if (target) track.scrollTo({ left: target.offsetLeft });
}

previous.addEventListener('click', () => move(-1));
next.addEventListener('click', () => move(1));
track.addEventListener('keydown', event => {
  if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  move(event.key === 'ArrowLeft' ? -1 : 1);
});
track.addEventListener('scroll', () => {
  clearTimeout(scrollTimer);
  if (drag?.started) return;
  scrollTimer = setTimeout(updateActiveFilm, 120);
}, { passive: true });

track.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  suppressClick = false;
  const video = event.target.closest('video');
  // Leave the native timeline and playback buttons available.
  if (video && event.clientY >= video.getBoundingClientRect().bottom - 64) return;
  drag = {
    id: event.pointerId,
    startX: event.clientX,
    startScroll: track.scrollLeft,
    startedAt: event.timeStamp,
    started: false,
  };
});

track.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId) return;
  const distance = event.clientX - drag.startX;
  if (!drag.started) {
    if (Math.abs(distance) < 8) return;
    drag.started = true;
    clearTimeout(scrollTimer);
    track.setPointerCapture(event.pointerId);
    track.classList.add('is-dragging');
  }
  event.preventDefault();
  track.scrollLeft = drag.startScroll - distance;
});

function finishDrag(event) {
  if (drag?.id !== event.pointerId) return;
  const gesture = drag;
  drag = undefined;
  if (!gesture.started) return;
  suppressClick = true;
  const distance = event.clientX - gesture.startX;
  const threshold = event.timeStamp - gesture.startedAt < 300 ? 28 : Math.min(90, track.clientWidth * .16);
  const direction = event.type === 'pointerup' && Math.abs(distance) >= threshold ? -Math.sign(distance) : 0;
  track.classList.remove('is-dragging');
  const destination = slides[active + direction] || slides[active];
  track.scrollTo({ left: destination.offsetLeft });
}

track.addEventListener('pointerup', finishDrag);
track.addEventListener('pointercancel', finishDrag);
track.addEventListener('lostpointercapture', finishDrag);
track.addEventListener('pointerleave', () => {
  if (drag && !drag.started) drag = undefined;
});
track.addEventListener('click', event => {
  if (!suppressClick || event.detail === 0) return;
  suppressClick = false;
  event.preventDefault();
  event.stopPropagation();
}, { capture: true });

videos.forEach(video => {
  video.addEventListener('play', () => {
    videos.forEach(other => {
      if (other !== video) other.pause();
    });
  });
});
updateActiveFilm();
controls.hidden = false;
