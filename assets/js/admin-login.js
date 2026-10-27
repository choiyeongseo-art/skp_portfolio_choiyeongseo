(() => {
  'use strict';
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('button');
    const status = document.getElementById('login-status');
    submit.disabled = true; status.textContent = '로그인 중입니다.';
    try {
      const response = await fetch('/api/admin/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username:form.elements.username.value.trim(), password:form.elements.password.value})
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      location.replace('/admin');
    } catch (error) { status.textContent = error.message || '서버에 연결하지 못했습니다.'; }
    finally { submit.disabled = false; }
  });
})();
