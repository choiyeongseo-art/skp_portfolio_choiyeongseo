(() => {
  const frame = document.querySelector('[data-game-frame]');
  if (!frame) return;
  const phone = document.querySelector('[data-game-phone]');
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
      status.textContent = '로딩이 오래 걸리면 다시 불러오거나 새 창에서 플레이해 주세요.';
    }, 20000);
  };
  frame.addEventListener('load', () => {
    if (!frame.getAttribute('src')) return;
    clearTimeout(loadTimer);
    // Cross-origin load events cannot prove that the remote game rendered.
    status.textContent = '화면이 보이지 않으면 새 창에서 플레이해 주세요.';
  });
  frame.addEventListener('error', () => {
    clearTimeout(loadTimer);
    status.textContent = '게임을 불러오지 못했습니다. 다시 불러오거나 새 창에서 플레이해 주세요.';
  });
  document.querySelector('[data-game-start]').addEventListener('click', loadGame);
  document.querySelector('[data-game-reload]').addEventListener('click', loadGame);
  document.querySelector('[data-game-fullscreen]').addEventListener('click', async () => {
    if (!phone.requestFullscreen || !document.fullscreenEnabled) {
      status.textContent = '이 브라우저에서는 새 창에서 크게 플레이해 주세요.';
      return;
    }
    try {
      if (document.fullscreenElement === phone) await document.exitFullscreen();
      else await phone.requestFullscreen();
    } catch {
      status.textContent = '전체 화면을 열 수 없습니다. 새 창에서 플레이해 주세요.';
    }
  });
})();
