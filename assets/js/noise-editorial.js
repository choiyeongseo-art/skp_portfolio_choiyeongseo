const noiseDialogs = document.querySelectorAll('.noise-dialog');
let noiseTrigger;
function openNoiseDialog(dialog, trigger) { noiseTrigger = trigger; dialog.showModal(); }
document.querySelectorAll('[data-noise-dialog]').forEach(button => button.addEventListener('click', () => openNoiseDialog(document.getElementById(button.dataset.noiseDialog), button)));
document.querySelectorAll('[data-noise-photo]').forEach(button => button.addEventListener('click', () => { const dialog = document.getElementById('noise-image-dialog'); const image = dialog.querySelector('img'); image.src = button.dataset.noisePhoto; image.alt = button.querySelector('img').alt; openNoiseDialog(dialog, button); }));
noiseDialogs.forEach(dialog => { dialog.querySelector('[data-noise-close]').addEventListener('click', () => dialog.close()); dialog.addEventListener('close', () => noiseTrigger?.focus()); dialog.addEventListener('click', event => { if(event.target === dialog){ const box = dialog.getBoundingClientRect(); if(event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } }); });

// A single audio element owns playback across the album, feature and floating player.
const trackAudio = document.querySelector('[data-noise-audio]');
const trackButton = document.querySelector('[data-track-play]');
const albumButtons = [...document.querySelectorAll('[data-album-play]')];
const titleTrack = albumButtons.find(button => button.dataset.trackTitle === 'BUS 1003');
const trackTime = value => Number.isFinite(value) ? Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0') : '—:—';
if (trackAudio && titleTrack) {
 const select = selector => document.querySelector(selector);
 let activeTrack = titleTrack;
 let titleDuration = NaN;
 let playRequest = 0;
 trackAudio.volume = 0.72;
 const reportStatus = message => {
  select('[data-album-status]').textContent = message;
  select('[data-track-status]').textContent = activeTrack === titleTrack ? message : '';
 };
 const syncPlayback = () => {
  const playing = !trackAudio.paused;
  const title = activeTrack.dataset.trackTitle;
  const isTitle = activeTrack === titleTrack;
  if (isTitle && Number.isFinite(trackAudio.duration)) titleDuration = trackAudio.duration;
  albumButtons.forEach(button => {
   const selected = button === activeTrack;
   button.setAttribute('aria-pressed', String(selected && playing));
   button.classList.toggle('is-current', selected);
   const number = button.querySelector('.noise-track-number').textContent;
   button.setAttribute('aria-label', `${number}번 ${button === titleTrack ? '타이틀곡 ' : ''}${button.dataset.trackTitle} ${selected && playing ? '일시정지' : '재생'}`);
   button.querySelector('[data-album-play-icon]').textContent = selected && playing ? 'Ⅱ' : '▶';
  });
  const toggle = select('[data-audio-toggle]');
  toggle.classList.toggle('is-on', playing);
  toggle.setAttribute('aria-pressed', String(playing));
  toggle.setAttribute('aria-label', `${title} ${playing ? '일시정지' : '재생'}`);
  select('[data-audio-title]').textContent = title;
  select('[data-audio-label]').textContent = playing ? '재생 중' : '재생';
  select('[data-album-current-title]').textContent = title;
  select('[data-album-current]').textContent = trackTime(trackAudio.currentTime);
  select('[data-album-duration]').textContent = trackTime(trackAudio.duration);
  const albumSeek = select('[data-album-seek]');
  albumSeek.setAttribute('aria-label', `${title} 재생 위치`);
  albumSeek.value = Number.isFinite(trackAudio.duration) && trackAudio.duration > 0 ? trackAudio.currentTime / trackAudio.duration * 100 : 0;
  trackButton.setAttribute('aria-pressed', String(isTitle && playing));
  select('[data-track-label]').textContent = isTitle && playing ? 'PAUSE TRACK' : 'PLAY TRACK';
  select('[data-track-current]').textContent = trackTime(isTitle ? trackAudio.currentTime : 0);
  select('[data-track-duration]').textContent = trackTime(titleDuration);
  select('[data-track-seek]').value = isTitle ? albumSeek.value : 0;
 };
 const toggleTrack = async button => {
  const request = ++playRequest;
  reportStatus('');
  if (activeTrack === button && !trackAudio.paused) { trackAudio.pause(); syncPlayback(); return; }
  if (activeTrack !== button) {
   trackAudio.pause();
   activeTrack = button;
   trackAudio.src = button.dataset.trackSrc;
   trackAudio.load();
  }
  syncPlayback();
  try { await trackAudio.play(); }
  catch { if (request === playRequest) reportStatus('음원을 재생할 수 없습니다. 다시 시도해 주세요.'); }
  syncPlayback();
 };
 albumButtons.forEach(button => button.addEventListener('click', () => toggleTrack(button)));
 trackButton.addEventListener('click', () => toggleTrack(titleTrack));
 select('[data-audio-toggle]').addEventListener('click', () => toggleTrack(activeTrack));
 select('[data-album-seek]').addEventListener('input', event => {
  if (Number.isFinite(trackAudio.duration)) trackAudio.currentTime = Number(event.target.value) / 100 * trackAudio.duration;
 });
 select('[data-track-seek]').addEventListener('input', event => {
  if (activeTrack === titleTrack && Number.isFinite(trackAudio.duration)) trackAudio.currentTime = Number(event.target.value) / 100 * trackAudio.duration;
 });
 ['loadedmetadata', 'timeupdate', 'play', 'pause', 'ended', 'emptied', 'durationchange'].forEach(event => trackAudio.addEventListener(event, syncPlayback));
 trackAudio.addEventListener('error', () => reportStatus('음원을 재생할 수 없습니다. 다시 시도해 주세요.'));
 syncPlayback();
}
