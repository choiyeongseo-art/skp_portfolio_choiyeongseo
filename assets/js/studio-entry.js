(() => {
  const status = document.querySelector('[data-studio-status]');
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
  const endpoints = [new URL('api/studio/status', location.href)];
  if (local && location.origin !== 'http://127.0.0.1:8000') {
    endpoints.push(new URL('http://127.0.0.1:8000/api/studio/status'));
  }
  if (local) document.querySelector('[data-studio-local]').hidden = false;
  async function connect() {
    for (const endpoint of endpoints) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch(endpoint, {cache: 'no-store', credentials: 'omit', signal: controller.signal});
        if (!response.ok) continue;
        const data = await response.json();
        if (data.service !== 'chatbot-studio' || data.loginPath !== '/admin/login') continue;
        location.replace(new URL('/admin/login', endpoint).href);
        return;
      } catch {
        // Static hosting has no server API; keep the connection guidance visible.
      } finally {
        clearTimeout(timer);
      }
    }
    status.textContent = local
      ? '관리 서버에 연결하지 못했습니다. 아래 실행 안내를 확인해 주세요.'
      : '현재 공개 사이트에는 관리 서버가 연결되어 있지 않습니다. 로그인·게시 기능은 서버 배포 후 이용할 수 있습니다.';
  }
  connect();
})();
