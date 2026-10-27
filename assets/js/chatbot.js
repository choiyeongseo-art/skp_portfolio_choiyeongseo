(() => {
  'use strict';
  if (document.getElementById('dashboard-chatbot')) return;
  const KEY = 'dashboard-chatbot:v1';
  const script = document.currentScript;
  const previewMode = script.dataset.preview === 'true';
  const previewId = new URLSearchParams(location.search).get('token');
  const dataUrl = new URL(previewMode ? '../../api/admin/preview?token=' + encodeURIComponent(previewId || '') : '../../data/chatbot.json', script.src);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const button = (label, action) => {
    const node = el('button', '', label); node.type = 'button';
    node.addEventListener('click', action); return node;
  };
  const launcher = button('챗봇 안내', () => setOpen(panel.hidden));
  launcher.className = 'chat-launcher';
  launcher.setAttribute('aria-controls', 'dashboard-chatbot');
  launcher.setAttribute('aria-expanded', 'false');
  const panel = el('section', 'chat-panel'); panel.id = 'dashboard-chatbot';
  panel.hidden = true; panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', '포트폴리오 안내 챗봇');
  const header = el('header', 'chat-header');
  const heading = el('div');
  const title = el('h2', '', '포트폴리오 안내');
  const subtitle = el('p', '', '안내를 준비 중입니다.');
  heading.append(title, subtitle);
  const close = button('닫기 ×', () => setOpen(false));
  header.append(heading, close);
  const log = el('div', 'chat-log');
  log.setAttribute('role', 'log'); log.setAttribute('aria-label', '대화 내용'); log.setAttribute('aria-live', 'polite');
  const options = el('div', 'chat-options');
  options.setAttribute('aria-label', '다음 선택지');
  const navigation = el('nav', 'chat-navigation');
  navigation.setAttribute('aria-label', '대화 이동');
  const inputForm = el('form', 'chat-input');
  const input = el('input'); input.type = 'text'; input.maxLength = 300;
  input.placeholder = '프로젝트, 콘텐츠, 성과 등을 입력';
  input.setAttribute('aria-label', '질문 입력');
  const send = el('button', '', '전송'); send.type = 'submit'; send.disabled = true;
  inputForm.append(input, send);
  const note = el('p', 'chat-note', '등록된 안내만 제공 · 대화는 현재 탭에서 유지됩니다.');
  panel.append(header, log, options, navigation, inputForm, note);
  document.body.append(launcher, panel);
  let data, state, inquiry, refreshing = false;
  const HINT_KEY = 'portfolio-chatbot:hint-seen';
  const hint = el('aside', 'chat-hint'); hint.hidden = true;
  hint.setAttribute('aria-label', '챗봇 이용 안내');
  const hintOpen = button('궁금한 점을 물어보세요!', () => setOpen(true));
  hintOpen.className = 'chat-hint-open';
  hintOpen.append(el('span', '', '포트폴리오와 콘텐츠를 안내해 드립니다.'));
  const hintClose = button('×', dismissHint); hintClose.className = 'chat-hint-close';
  hintClose.setAttribute('aria-label', '안내 말풍선 닫기'); hint.append(hintOpen,hintClose);
  if (!previewMode) document.body.append(hint);
  function dismissHint() {
    hint.hidden = true;
    try { sessionStorage.setItem(HINT_KEY,'1'); } catch { /* Hint remains optional. */ }
  }
  if (!previewMode) setTimeout(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(HINT_KEY) === '1'; } catch { /* Still allow an optional hint. */ }
    if (!seen && panel.hidden) {
      hint.hidden = false;
      try { sessionStorage.setItem(HINT_KEY,'1'); } catch { /* No persistence available. */ }
      setTimeout(() => { hint.hidden = true; },12000);
    }
  },1400);
  function save() {
    if (previewMode) return;
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); }
    catch { note.textContent = '브라우저 저장소를 사용할 수 없어 새로고침 시 대화 유지가 제한됩니다.'; }
  }
  function setOpen(open) {
    if (open && !previewMode) dismissHint();
    panel.hidden = !open; launcher.setAttribute('aria-expanded', String(open));
    if (state) { state.open = open; save(); }
    if (open) { input.focus(); log.scrollTop = log.scrollHeight; } else launcher.focus();
    if (open && data && !previewMode) refreshData();
  }
  function fresh() { return {version:data.version, node:'home', history:[], messages:[{role:'bot', text:data.nodes.home.answer}], open:!panel.hidden}; }
  function restore() {
    if (previewMode) return fresh();
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY));
      if (s?.version === data.version && Object.hasOwn(data.nodes,s.node) && typeof s.open === 'boolean' &&
          Array.isArray(s.history) && s.history.length <= 100 && s.history.every(id => Object.hasOwn(data.nodes,id)) &&
          Array.isArray(s.messages) && s.messages.length <= 100 && s.messages.every(m => ['bot','user'].includes(m.role) && typeof m.text === 'string' && m.text.length <= 3000)) return s;
    } catch { /* Missing, corrupt or unavailable session: start at the menu. */ }
    return fresh();
  }
  function add(role, text) { state.messages.push({role,text}); state.messages = state.messages.slice(-100); }
  function visit(id, label, remember = true) {
    if (inquiry?.isBusy?.() || !Object.hasOwn(data.nodes, id)) return;
    if (label) add('user', label);
    if (remember && state.node !== id) state.history = [...state.history, state.node].slice(-100);
    state.node = id; add('bot', data.nodes[id].answer); save(); render();
  }
  function render() {
    log.replaceChildren(...state.messages.map(m => el('p', 'chat-message chat-message--' + m.role, m.text)));
    options.replaceChildren();
    inquiry = null;
    const node = data.nodes[state.node];
    const file = location.pathname.split('/').pop() || 'index.html';
    const query = new URLSearchParams(location.search);
    const projectGuide = 'site_' + query.get('collection') + '_' + query.get('project');
    const guide = file === 'project.html' && Object.hasOwn(data.nodes,projectGuide) ? projectGuide : data.pageGuides?.[file];
    if (!previewMode && guide && Object.hasOwn(data.nodes,guide)) {
      const context = button('현재 페이지 안내 ↗', () => visit(guide,'현재 페이지 안내'));
      context.className = 'chat-context'; options.append(context);
    }
    if (node.form === 'inquiry' && window.DashboardInquiry) {
      const host = el('div', 'chat-inquiry'); options.append(host);
      inquiry = window.DashboardInquiry.mount(host, data, {preview:previewMode,onSuccess:() => {
        add('bot','문의 접수가 완료되었습니다. 관리자 확인을 기다리는 상태입니다.'); save();
        log.append(el('p','chat-message chat-message--bot',state.messages.at(-1).text));log.scrollTop=log.scrollHeight;
      }});
    }
    const choices = el('div', 'chat-choices');
    node.buttons.forEach(b => choices.append(button(b.label, () => visit(b.next, b.label))));
    options.append(choices);
    if (node.links?.length) {
      const links = el('div','chat-page-links');
      links.setAttribute('aria-label','관련 페이지');
      node.links.forEach(link => {
        const target = new URL(link.href, new URL('../../',script.src));
        if (target.origin !== location.origin || !/\.html$/.test(target.pathname)) return;
        const a=el('a','chat-page-link',link.label+' ↗');a.href=target.href;links.append(a);
      });
      options.append(links);
    }
    navigation.replaceChildren();
    const back = button(data.controls.back, () => {
      if (!inquiry?.isBusy?.() && state.history.length) visit(state.history.pop(), data.controls.back, false);
    }); back.disabled = !state.history.length;
    navigation.append(back, button(data.controls.home, () => visit('home', data.controls.home)), button(data.controls.reset, () => {
      if (inquiry?.isBusy?.()) return;
      try { if (!previewMode) sessionStorage.removeItem(KEY); } catch { /* Storage may be disabled. */ }
      state = fresh(); input.value = ''; render();
    }));
    log.scrollTop = log.scrollHeight;
  }
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]/gu, '');
  inputForm.addEventListener('submit', event => {
    event.preventDefault();
    const question = input.value.trim(); if (!data || !question || inquiry?.isBusy?.()) return;
    input.value = '';
    // Longest matching phrase wins. Ties use the stable order in the JSON.
    const normalized = normalize(question);
    const matches = Object.entries(data.nodes).map(([id,n]) => ({id,score:Math.max(0,...n.keywords.map(k => normalized.includes(normalize(k)) ? normalize(k).length : 0))})).filter(m => m.score > 0).sort((a,b) => b.score-a.score);
    if (matches.length) visit(matches[0].id, question);
    else {
      add('user',question); state.history = [...state.history,state.node].slice(-100); state.node = 'home';
      add('bot',data.fallback); save(); render();
    }
  });
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); } });
  async function refreshData() {
    if (refreshing || inquiry?.isBusy?.() || inquiry?.isDirty?.()) return;
    refreshing = true;
    try {
    const response = await fetch(dataUrl, {cache:'no-store'});
    if (!response.ok) throw new Error();
    const json = await response.json();
    // Refuse incomplete branching data so an edit cannot silently lead to a missing answer.
    if (!json.nodes?.home || !json.controls || !json.fallback) throw new Error();
    Object.values(json.nodes).forEach(n => {
      if (typeof n.answer !== 'string' || !Array.isArray(n.keywords) || !n.keywords.every(k => typeof k === 'string' && normalize(k)) ||
        !Array.isArray(n.buttons) || !n.buttons.every(b => typeof b.label === 'string' && Object.hasOwn(json.nodes,b.next))) throw new Error();
    });
    if (data?.version === json.version) return;
    const updated = !!data;
    data = json; title.textContent = data.title; subtitle.textContent = data.subtitle;
    state = updated ? fresh() : restore();
    if (previewMode) state.open = true;
    panel.hidden = !state.open; launcher.setAttribute('aria-expanded', String(state.open));
    if (updated) {save();note.textContent='새 게시 버전으로 안내가 갱신되었습니다. 대화는 처음부터 시작됩니다.';}
    send.disabled = false; render();
    if (previewMode && window.parent !== window) window.parent.postMessage({type:'chatbot-preview-ready',previewId},location.origin);
    } catch {
      if (!data) subtitle.textContent = '안내 데이터를 불러오지 못했습니다. 새로고침 후 다시 이용해 주시기 바랍니다.';
    } finally {refreshing=false;}
  }
  refreshData();
  if (!previewMode) {
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshData();});
    setInterval(()=>{if(!document.hidden&&!panel.hidden)refreshData();},30000);
  }
})();
