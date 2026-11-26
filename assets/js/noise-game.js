(() => {
  const frame = document.querySelector('[data-game-frame]');
  if (!frame) return;
  const cover = document.querySelector('[data-game-cover]');
  const status = document.querySelector('[data-game-status]');
  let loadTimer;
  const loadGame = () => {
    document.querySelector('[data-noise-audio]')?.pause();
    clearTimeout(loadTimer);
    status.textContent = '게임을 불러오는 중입니다.';
    cover.hidden = true;
    frame.hidden = false;
    frame.src = frame.dataset.src;
    frame.focus();
    loadTimer = setTimeout(() => {
      status.textContent = '로딩이 오래 걸리면 페이지를 새로고침해 주세요.';
    }, 20000);
  };
  frame.addEventListener('load', () => {
    if (!frame.getAttribute('src')) return;
    clearTimeout(loadTimer);
    // Cross-origin load events cannot prove that the remote game rendered.
    status.textContent = '';
  });
  frame.addEventListener('error', () => {
    clearTimeout(loadTimer);
    status.textContent = '게임을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
  });
  document.querySelector('[data-game-start]').addEventListener('click', loadGame);
})();
