const noiseDialogs = document.querySelectorAll('.noise-dialog');
let noiseTrigger;
function openNoiseDialog(dialog, trigger) { noiseTrigger = trigger; dialog.showModal(); }
document.querySelectorAll('[data-noise-dialog]').forEach(button => button.addEventListener('click', () => openNoiseDialog(document.getElementById(button.dataset.noiseDialog), button)));
document.querySelectorAll('[data-noise-photo]').forEach(button => button.addEventListener('click', () => { const dialog = document.getElementById('noise-image-dialog'); const image = dialog.querySelector('img'); image.src = button.dataset.noisePhoto; image.alt = button.querySelector('img').alt; openNoiseDialog(dialog, button); }));
noiseDialogs.forEach(dialog => { dialog.querySelector('[data-noise-close]').addEventListener('click', () => dialog.close()); dialog.addEventListener('close', () => noiseTrigger?.focus()); dialog.addEventListener('click', event => { if(event.target === dialog){ const box = dialog.getBoundingClientRect(); if(event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } }); });
const trackAudio = document.querySelector('[data-noise-audio]');
const trackButton = document.querySelector('[data-track-play]');
const trackSeek = document.querySelector('[data-track-seek]');
const trackTime = value => Number.isFinite(value) ? Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0') : '—:—';
if(trackAudio && trackButton){
 const syncTrack = () => { const playing = !trackAudio.paused; trackButton.setAttribute('aria-pressed', String(playing)); document.querySelector('[data-track-label]').textContent = playing ? 'PAUSE TRACK' : 'PLAY TRACK'; document.querySelector('[data-track-current]').textContent = trackTime(trackAudio.currentTime); document.querySelector('[data-track-duration]').textContent = trackTime(trackAudio.duration); trackSeek.value = trackAudio.duration ? trackAudio.currentTime / trackAudio.duration * 100 : 0; const toggle = document.querySelector('[data-audio-toggle]'); toggle.classList.toggle('is-on', playing); toggle.setAttribute('aria-pressed', String(playing)); toggle.setAttribute('aria-label',playing ? 'BUS 1003 일시정지' : 'BUS 1003 재생'); document.querySelector('[data-audio-label]').textContent = playing ? '재생 중' : '재생'; };
 trackButton.addEventListener('click', async () => { if(trackAudio.paused) { try { await trackAudio.play(); document.querySelector('[data-track-status]').textContent = ''; } catch { document.querySelector('[data-track-status]').textContent = '음원을 재생할 수 없습니다. 다시 시도해 주세요.'; } } else trackAudio.pause(); });
 ['loadedmetadata','timeupdate','play','pause','ended'].forEach(event => trackAudio.addEventListener(event,syncTrack));
 trackSeek.addEventListener('input', () => { if(Number.isFinite(trackAudio.duration)) trackAudio.currentTime = Number(trackSeek.value)/100*trackAudio.duration; });
 syncTrack();
}