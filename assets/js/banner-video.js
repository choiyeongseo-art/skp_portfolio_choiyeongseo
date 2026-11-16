(() => {
  const banner = document.querySelector('.banner');
  const videos = [...(banner?.querySelectorAll('.banner-video') || [])];
  const button = banner?.querySelector('.banner-control');
  if (!videos.length || !button) return;

  const fadeSeconds = .8;
  let current = 0;
  let paused = false;
  let frame = 0;
  videos.forEach(video => { video.muted = true; video.defaultMuted = true; });

  function updateButton() {
    button.textContent = paused ? 'PLAY ▷' : 'PAUSE Ⅱ';
    button.setAttribute('aria-label', paused ? '배너 영상 재생' : '배너 영상 일시정지');
  }

  // Fade the footage into the black banner, then back to black before switching.
  function paint() {
    const video = videos[current];
    const fadeIn = video.currentTime / fadeSeconds;
    const fadeOut = Number.isFinite(video.duration)
      ? (video.duration - video.currentTime) / fadeSeconds : 1;
    video.style.opacity = String(Math.max(0, Math.min(1, fadeIn, fadeOut)));
    frame = paused ? 0 : requestAnimationFrame(paint);
  }

  function play() {
    paused = false;
    updateButton();
    if (!frame) paint();
    videos[current].play().catch(() => {
      paused = true;
      cancelAnimationFrame(frame);
      frame = 0;
      updateButton();
    });
  }

  videos.forEach((video, index) => {
    video.addEventListener('ended', () => {
      if (index !== current) return;
      video.style.opacity = '0';
      video.setAttribute('aria-hidden', 'true');
      current = (current + 1) % videos.length;
      videos[current].currentTime = 0;
      videos[current].removeAttribute('aria-hidden');
      if (!paused) play();
    });
  });

  button.addEventListener('click', () => {
    if (paused) { play(); return; }
    paused = true;
    videos[current].pause();
    cancelAnimationFrame(frame);
    frame = 0;
    updateButton();
  });
  play();
})();
