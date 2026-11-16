(() => {
  const player = document.querySelector('#featured-player');
  const memberDialog = document.querySelector('#member-dialog');
  const memberVideoDialog = document.querySelector('#member-video-dialog');
  const memberVideo = document.querySelector('#member-video');
  const memberPhoto = document.querySelector('#member-media-photo');
  const mediaChoices = [...document.querySelectorAll('[data-member-media]')];
  let activeMember = '';
  function selectMemberMedia(value) {
    const videoMode = value === 'video';
    memberVideo.hidden = !videoMode;
    memberPhoto.hidden = videoMode;
    mediaChoices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.memberMedia === value)));
    if (videoMode) {
      memberVideo.play().catch(() => {});
    } else {
      memberVideo.pause();
      memberPhoto.src = `assets/images/voyager/sheets/${activeMember}-${value}.png`;
      memberPhoto.alt = `${members[activeMember][2]} Costume ${value}`;
    }
  }
  mediaChoices.forEach(button => button.addEventListener('click', () => selectMemberMedia(button.dataset.memberMedia)));
  const films = {group: ['GROUP FILM', 'assets/videos/home/group-film.mp4'], logo: ['LOGO MOTION', 'assets/videos/home/logo-motion.mp4']};
  const members = {
    eunyu: ['001', 'EUNYU', '은유', 'ZERO GRAVITY / 무중력'],
    dokyung: ['002', 'DOKYUNG', '도경', 'FIRE / 불'],
    seowoo: ['003', 'SEOWOO', '서우', 'SHADOW / 그림자'],
    ihyuk: ['004', 'IHYUK', '이혁', 'WATER / 물'],
    jigyeom: ['005', 'JIGYEOM', '지겸', 'GUIDE / 길잡이']
  };
  let opener = null;
  const song = document.querySelector('#voyager-song');
  const songButton = document.querySelector('#song-toggle');
  const seek = document.querySelector('#song-seek');
  const songStatus = document.querySelector('#song-status');
  let songFileReady = false;
  const formatTime = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
  function syncSong() {
    const duration = Number.isFinite(song.duration) ? song.duration : 170.72;
    const progress = duration ? song.currentTime / duration * 100 : 0;
    seek.value = String(progress);
    seek.setAttribute('aria-valuetext', `${formatTime(song.currentTime)} / ${formatTime(duration)}`);
    document.querySelector('#wave-progress').setAttribute('width', String(progress * 3.2));
    document.querySelector('#song-current').textContent = formatTime(song.currentTime);
    document.querySelector('#song-duration').textContent = formatTime(Math.round(duration));
    songButton.classList.toggle('is-playing', !song.paused);
    songButton.setAttribute('aria-pressed', String(!song.paused));
    songButton.setAttribute('aria-label', song.paused ? 'Voyager 음악 재생' : 'Voyager 음악 일시정지');
  }
  songButton.addEventListener('click', async () => {
    if (!song.paused) { song.pause(); return; }
    player.pause();
    if (song.ended) song.currentTime = 0;
    songStatus.textContent = '';
    try {
      if (!songFileReady) {
        songButton.disabled = true;
        songStatus.textContent = '음악을 불러오는 중입니다…';
        // A local blob also supports seeking on static preview servers without byte ranges.
        const response = await fetch(song.getAttribute('src'));
        if (!response.ok) throw new Error('Audio download failed');
        song.src = URL.createObjectURL(await response.blob());
        songFileReady = true;
      }
      await song.play();
      songStatus.textContent = '';
    }
    catch { songStatus.textContent = '음악을 재생할 수 없습니다. 다시 시도해 주세요.'; syncSong(); }
    finally { songButton.disabled = false; }
  });
  seek.addEventListener('input', () => {
    if (Number.isFinite(song.duration)) song.currentTime = Number(seek.value) / 100 * song.duration;
    syncSong();
  });
  ['loadedmetadata', 'timeupdate', 'play', 'pause', 'ended'].forEach(event => song.addEventListener(event, syncSong));
  song.addEventListener('error', () => { songStatus.textContent = '음악을 불러오지 못했습니다. 페이지를 새로고침해 주세요.'; });
  syncSong();
  function open(dialog, trigger) { opener = trigger; dialog.showModal(); document.body.style.overflow = 'hidden'; }
  const videoCards = [...document.querySelectorAll('[data-film]')];
  const slot = document.querySelector('.music-video-slot');
  const track = document.querySelector('.more-track');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const featureTitles = {mv: ['Music Video', 'VOYAGER — Music Video'], group: ['Film', 'VOYAGER — Group Film'], logo: ['Motion', 'VOYAGER — Logo Motion']};
  videoCards.forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.film;
    player.pause();
    player.removeAttribute('src');
    player.load();
    const empty = key === 'mv';
    slot.hidden = !empty;
    player.hidden = empty;
    videoCards.forEach(card => card.setAttribute('aria-pressed', String(card === button)));
    const [category, title] = featureTitles[key];
    document.querySelector('#featured-category').textContent = category;
    document.querySelector('#featured-title').textContent = title;
    player.setAttribute('aria-label', title);
    if (!empty) {
      song.pause();
      player.src = films[key][1];
      player.poster = key === 'group' ? 'assets/images/voyager/film-poster.jpg' : 'assets/images/voyager/chrome-logo.svg?v=1';
      player.muted = true;
      player.play().catch(() => {});
    }
  }));
  player.addEventListener('play', () => song.pause());
  const arrows = [...document.querySelectorAll('[data-more-step]')];
  function syncArrows() {
    const end = track.scrollWidth - track.clientWidth;
    arrows[0].disabled = track.scrollLeft <= 1;
    arrows[1].disabled = track.scrollLeft >= end - 1;
  }
  arrows.forEach(button => button.addEventListener('click', () => {
    track.scrollBy({left: Number(button.dataset.moreStep) * (videoCards[0].getBoundingClientRect().width + 20), behavior: reduceMotion.matches ? 'instant' : 'smooth'});
  }));
  track.addEventListener('scroll', syncArrows, {passive: true});
  new ResizeObserver(syncArrows).observe(track);
  syncArrows();
  document.querySelectorAll('.member-grid [data-member]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.member;
    const [, name, korean] = members[key];
    activeMember = key;
    song.pause();
    player.pause();
    document.querySelector('#member-video-title').textContent = `${name} / ${korean}`;
    memberVideo.setAttribute('aria-label', `${korean} 프로필 영상`);
    memberVideo.src = `assets/videos/voyager/${key}.mp4`;
    memberVideo.muted = true;
    document.querySelector('#member-video-thumb').src = `assets/images/voyager/${key}.png`;
    document.querySelector('#member-video-thumb').alt = `${korean} 프로필 영상`;
    for (const sheet of [1, 2]) {
      const thumbnail = document.querySelector(`#member-sheet-${sheet}`);
      thumbnail.src = `assets/images/voyager/sheets/${key}-${sheet}.png`;
      thumbnail.alt = `${korean} Costume ${sheet}`;
    }
    memberVideo.hidden = false;
    memberPhoto.hidden = true;
    memberPhoto.removeAttribute('src');
    mediaChoices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.memberMedia === 'video')));
    open(memberVideoDialog, button);
    memberVideo.play().catch(() => {});
  }));
  document.querySelectorAll('.photo-wall [data-member]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.member;
    const [index, name, korean, element] = members[key];
    const portrait = document.querySelector('#member-portrait');
    portrait.src = `assets/images/voyager/${key}.png`;
    portrait.alt = `${korean} 프로필 원본`;
    document.querySelector('#member-index').textContent = `VOYAGER / MEMBER ${index}`;
    document.querySelector('#member-title').textContent = name;
    document.querySelector('#member-korean').textContent = korean;
    document.querySelector('#member-element').textContent = element;
    open(memberDialog, button);
  }));
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (dialog === memberVideoDialog) {
        memberVideo.pause();
        memberVideo.removeAttribute('src');
        memberVideo.load();
        memberPhoto.removeAttribute('src');
        memberPhoto.hidden = true;
      }
      document.body.style.overflow = '';
      opener?.focus({preventScroll: true});
    });
  });
})();
