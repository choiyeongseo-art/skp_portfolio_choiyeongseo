(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const makeButton = (label, action) => {
    const b = node('button', 'secondary', label); b.type = 'button';
    b.addEventListener('click', () => run(action)); return b;
  };
  const date = value => value ? new Date(value).toLocaleString('ko-KR', {timeZone:'Asia/Seoul', hour12:false}) + ' KST' : '—';
  let csrf, content, selected = 'home', draftRevision, publishedVersion;
  let dirty = false, busy = false, previewId = null, previewReady = false, inquiries = [];
  function status(text, error = false) {
    $('admin-status').textContent = text;
    $('admin-status').classList.toggle('error', error);
  }
  async function api(path, body) {
    const response = await fetch(path, {
      method:body === undefined ? 'GET' : 'POST', cache:'no-store',
      headers:body === undefined ? {} : {'Content-Type':'application/json', 'X-CSRF-Token':csrf},
      body:body === undefined ? undefined : JSON.stringify(body)
    });
    let result;
    try { result = await response.json(); } catch { throw new Error('관리 서버에 연결하지 못했습니다. 서버 실행 상태를 확인해 주시기 바랍니다.'); }
    if (response.status === 401) { location.replace('/admin/login'); throw new Error('관리자 로그인이 필요합니다.'); }
    if (!response.ok) throw new Error(result.error || '처리하지 못했습니다.');
    return result;
  }
  async function run(action) {
    if (busy) return;
    busy = true;
    const disabled = new Map([...document.querySelectorAll('button,input,textarea,select')].map(el => [el,el.disabled]));
    disabled.forEach((_,el) => { el.disabled = true; });
    try { await action(); }
    catch (error) { status(error.message, true); }
    finally {
      disabled.forEach((wasDisabled,el) => { if (el.isConnected) el.disabled = wasDisabled; });
      busy = false; updateState();
    }
  }
  function updateState() {
    $('edit-state').textContent = dirty ? '저장 전 변경' : '초안 저장됨';
    $('preview-state').textContent = previewReady ? '최신 미리보기 확인 가능' : '미리보기 후 게시할 수 있습니다.';
    $('publish').disabled = busy || !previewReady || !previewId || dirty;
    $('publish-help').textContent = previewReady && !dirty ? '아래 버튼을 누르면 현재 미리보기 내용이 공개됩니다.' : '최신 초안 미리보기가 필요합니다.';
    $('delete-node').disabled = busy || selected === 'home';
  }
  function changed() {
    dirty = true; previewId = null; previewReady = false;
    $('preview-tag').textContent = $('preview-frame').hidden ? '미게시' : '이전 미리보기';
    updateState();
  }
  function collectNode() {
    const target = content.nodes[selected];
    target.answer = $('node-answer').value;
    target.keywords = $('node-keywords').value.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
    target.buttons = [...$('choice-list').children].map(row => ({label:row.querySelector('input').value, next:row.querySelector('select').value}));
    target.links = [...$('page-link-list').children].map(row => ({label:row.querySelector('[data-link-label]').value,href:row.querySelector('[data-link-href]').value}));
    if ($('node-form').value) target.form = $('node-form').value; else delete target.form;
  }
  function collect() {
    collectNode();
    content.title = $('content-title').value;
    content.subtitle = $('content-subtitle').value;
    content.fallback = $('content-fallback').value;
    for (const k of ['back','home','reset']) content.controls[k] = $('control-' + k).value;
    content.inquiry = {controller:$('inquiry-controller').value, purpose:$('inquiry-purpose').value, retentionDays:Number($('inquiry-retention').value)};
    content.pageGuides = Object.fromEntries([...document.querySelectorAll('#page-guide-list select')].map(select=>[select.dataset.page,select.value]).filter(([,target])=>target));
    return structuredClone(content);
  }
  function addChoiceRow(choice) {
    const row = node('div', 'choice-row');
    const label = node('input'); label.value = choice.label; label.maxLength = 80; label.setAttribute('aria-label','선택지 버튼명');
    const next = node('select'); next.setAttribute('aria-label','이동할 다음 단계');
    for (const id of Object.keys(content.nodes)) {
      const option = node('option','',id); option.value = id; next.append(option);
    }
    next.value = choice.next;
    const remove = node('button','','×'); remove.type = 'button'; remove.setAttribute('aria-label','선택지 삭제');
    remove.addEventListener('click', () => { row.remove(); changed(); });
    row.append(label,next,remove); $('choice-list').append(row);
  }
  function renderNode() {
    const n = content.nodes[selected];
    $('node-answer').value = n.answer;
    $('node-keywords').value = n.keywords.join(', ');
    $('node-form').value = n.form || '';
    $('choice-list').replaceChildren(); n.buttons.forEach(addChoiceRow);
    $('page-link-list').replaceChildren(); (n.links || []).forEach(addLinkRow);
    $('delete-node').disabled = selected === 'home';
  }
  function refreshNodeList() {
    $('node-select').replaceChildren();
    for (const [id,n] of Object.entries(content.nodes)) {
      const option = node('option','',id + ' · ' + n.answer.slice(0,28)); option.value = id;
      $('node-select').append(option);
    }
    $('node-select').value = selected;
    $('node-count').textContent = Object.keys(content.nodes).length + ' STEPS';
    renderPageGuides();
  }
  function addLinkRow(link) {
    const row=node('div','choice-row');
    const label=node('input');label.value=link.label;label.maxLength=80;label.dataset.linkLabel='';label.setAttribute('aria-label','페이지 링크명');
    const href=node('input');href.value=link.href;href.dataset.linkHref='';href.setAttribute('aria-label','페이지 링크 경로');
    const remove=node('button','','×');remove.type='button';remove.setAttribute('aria-label','페이지 링크 삭제');remove.addEventListener('click',()=>{row.remove();changed();});
    row.append(label,href,remove);$('page-link-list').append(row);
  }
  function renderPageGuides() {
    const pages=['index.html','about.html','art.html','drawing.html','project.html','marketing.html','brand.html','contents.html','report.html','sns.html','spoton.html','noise.html','inquiry.html'];
    $('page-guide-list').replaceChildren();
    pages.forEach(page=>{
      const label=node('label','',page);const select=node('select');select.dataset.page=page;
      const empty=node('option','','연결 안 함');empty.value='';select.append(empty);
      Object.keys(content.nodes).forEach(id=>{const opt=node('option','',id);opt.value=id;select.append(opt);});
      select.value=content.pageGuides?.[page] || '';select.addEventListener('input',changed);
      label.append(select);$('page-guide-list').append(label);
    });
  }
  function setContent(value) {
    content = structuredClone(value); selected = 'home';
    for (const key of ['title','subtitle','fallback']) $('content-' + key).value = content[key];
    for (const key of ['back','home','reset']) $('control-' + key).value = content.controls[key];
    $('inquiry-controller').value = content.inquiry?.controller || '';
    $('inquiry-purpose').value = content.inquiry?.purpose || '';
    $('inquiry-retention').value = content.inquiry?.retentionDays || 30;
    refreshNodeList(); renderNode();
  }
  async function loadState() {
    const result = await api('/api/admin/state');
    draftRevision = result.draftRevision; publishedVersion = result.publishedVersion;
    setContent(result.content); dirty = false; previewId = null; previewReady = false;
    $('current-version').textContent = 'v' + publishedVersion;
    $('published-at').textContent = date(result.publishedAt);
    $('draft-revision').textContent = '#' + draftRevision;
    $('draft-at').textContent = date(result.draftUpdatedAt);
    $('preview-frame').hidden = true; $('preview-frame').removeAttribute('src');
    $('preview-empty').hidden = false; $('preview-tag').textContent = '미게시';
    updateState();
  }
  async function save(preview) {
    const result = await api('/api/admin/' + (preview ? 'preview' : 'draft'), {content:collect(), draftRevision, publishedVersion});
    draftRevision = result.draftRevision; dirty = false; previewReady = false; previewId = result.previewId || null;
    $('draft-revision').textContent = '#' + draftRevision;
    $('draft-at').textContent = date(result.savedAt);
    if (preview) {
      $('preview-tag').textContent = '불러오는 중'; $('preview-frame').hidden = false; $('preview-empty').hidden = true;
      $('preview-frame').src = result.url;
      status('미리보기를 준비했습니다. 답변과 버튼 분기를 확인한 후 최종 게시해 주시기 바랍니다.');
    } else {
      $('preview-tag').textContent = $('preview-frame').hidden ? '미게시' : '이전 미리보기';
      status('초안을 저장했습니다. 공개 사이트에는 아직 반영되지 않았습니다.');
    }
  }
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === $('preview-frame').contentWindow && event.data?.type === 'chatbot-preview-ready' && event.data.previewId === previewId) {
      previewReady = true; $('preview-tag').textContent = '미게시 초안'; updateState();
    }
  });
  async function versions() {
    const result = await api('/api/admin/versions');
    $('version-list').replaceChildren();
    result.versions.forEach(v => {
      const card = node('article','record');
      const top = node('div','record-top'); top.append(node('h2','','v' + v.id),node('span','tag',v.id === result.currentVersion ? '현재 공개' : '보관 버전'));
      card.append(top,node('p','record-meta',date(v.created_at) + ' · ' + v.author),node('p','',v.note));
      const actions = node('div','record-actions');
      actions.append(makeButton('내용 보기',async () => {
        const detail = await api('/api/admin/versions/' + v.id);
        $('version-detail').hidden = false; $('version-detail-title').textContent = 'v' + detail.version + ' 등록 데이터';
        $('version-json').textContent = JSON.stringify(detail.content,null,2);
        $('version-detail').scrollIntoView({block:'start'});
      }),makeButton('초안으로 불러오기',async () => {
        if (dirty && !confirm('현재 저장하지 않은 편집 내용을 버리고 이 버전을 불러오시겠습니까?')) return;
        const detail = await api('/api/admin/versions/' + v.id);
        setContent(detail.content); changed(); await showTab('editor');
        status('v' + v.id + ' 내용을 편집기에 불러왔습니다. 미리보기와 최종 게시 후 새 버전으로 공개됩니다.');
      }),makeButton('JSON 내보내기',async () => {
        const detail = await api('/api/admin/versions/' + v.id);
        const url = URL.createObjectURL(new Blob([JSON.stringify(detail.content,null,2)], {type:'application/json'}));
        const link = node('a'); link.href=url;link.download='chatbot-v'+v.id+'.json';document.body.append(link);link.click();link.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      })); card.append(actions); $('version-list').append(card);
    });
  }
  const statusLabels = {new:'새 문의',read:'확인',done:'처리 완료'};
  function renderInquiries(total) {
    const filter = $('inquiry-filter').value;
    const visible = inquiries.filter(i => filter === 'all' || i.status === filter);
    $('inquiry-count').textContent = '총 ' + (total ?? inquiries.length) + '건 · 최근 최대 500건 중 ' + visible.length + '건 표시';
    $('inquiry-badge').textContent = inquiries.filter(i => i.status === 'new').length;
    $('inquiry-list').replaceChildren();
    if (!visible.length) $('inquiry-list').append(node('p','empty-record','표시할 문의가 없습니다. 새 문의가 접수되면 이곳에 표시됩니다.'));
    visible.forEach(i => {
      const card = node('article','record');
      const top = node('div','record-top');top.append(node('h2','','#' + i.id + ' · ' + i.name),node('span','tag',statusLabels[i.status]));
      card.append(top,node('p','record-meta',date(i.created_at) + ' · ' + i.email),node('p','record-content',i.message),node('p','field-note','개인정보 동의 일시: ' + date(i.consented_at)));
      const actions = node('div','record-actions');
      const select = node('select'); select.setAttribute('aria-label','문의 #' + i.id + ' 처리 상태');
      Object.entries(statusLabels).forEach(([value,label]) => { const option=node('option','',label); option.value=value; select.append(option); }); select.value=i.status;
      actions.append(select,makeButton('상태 저장',async () => {
        await api('/api/admin/inquiries/' + i.id,{status:select.value});
        await loadInquiries();status('문의 #' + i.id + ' 상태를 저장했습니다.');
      }));card.append(actions);$('inquiry-list').append(card);
    });
  }
  async function loadInquiries() {
    const result = await api('/api/admin/inquiries'); inquiries = result.inquiries;
    renderInquiries(result.total);
  }
  async function showTab(tab) {
    document.querySelectorAll('.tab-section').forEach(s => {s.hidden = s.id !== 'tab-' + tab;});
    document.querySelectorAll('[data-tab]').forEach(b => { if (b.dataset.tab === tab) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
    if (tab === 'versions') await versions();
    if (tab === 'inquiries') await loadInquiries();
  }
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => run(() => showTab(b.dataset.tab))));
  $('node-select').addEventListener('change', () => { collectNode(); selected = $('node-select').value; renderNode(); updateState(); });
  // Selecting another step only changes the editor view, not the content itself.
  document.querySelectorAll('#tab-editor input,#tab-editor textarea,#tab-editor select').forEach(field => {
    if (!['node-select','new-node-id','publish-note'].includes(field.id)) field.addEventListener('input',changed);
  });
  $('choice-list').addEventListener('input',changed);
  $('page-link-list').addEventListener('input',changed);
  $('add-link').addEventListener('click',()=>{
    if($('page-link-list').children.length>=12){status('페이지 링크는 최대 12개입니다.',true);return;}
    addLinkRow({label:'페이지 보기',href:'index.html'});changed();
  });
  $('add-choice').addEventListener('click', () => {
    if ($('choice-list').children.length >= 12) {status('선택지는 최대 12개입니다.',true);return;}
    addChoiceRow({label:'새 선택지',next:'home'}); changed();
  });
  $('add-node').addEventListener('click', () => {
    const id = $('new-node-id').value.trim();
    if (!/^[a-z][a-z0-9_-]{0,39}$/.test(id) || ['constructor','prototype','__proto__'].includes(id) || Object.hasOwn(content.nodes,id)) {status('중복되지 않는 영문 소문자로 시작하는 단계 ID를 입력해 주시기 바랍니다.',true);return;}
    collect(); content.nodes[id] = {answer:'새 안내입니다.',keywords:[],buttons:[{label:'처음으로',next:'home'}]};
    selected=id;$('new-node-id').value='';refreshNodeList();renderNode();changed();
  });
  $('delete-node').addEventListener('click', () => {
    if (selected === 'home') return;
    collect();
    const refs = Object.entries(content.nodes).filter(([id,n]) => id !== selected && n.buttons.some(b => b.next === selected));
    if (refs.length) {status('먼저 연결된 선택지를 수정해 주시기 바랍니다: ' + refs.map(([id])=>id).join(', '),true);return;}
    const pages=Object.entries(content.pageGuides || {}).filter(([,target])=>target===selected).map(([page])=>page);
    if(pages.length){status('먼저 페이지별 안내 연결을 수정해 주시기 바랍니다: '+pages.join(', '),true);return;}
    delete content.nodes[selected]; selected='home';refreshNodeList();renderNode();changed();
  });
  $('reload').addEventListener('click', () => run(async () => {
    if (dirty && !confirm('저장하지 않은 변경을 버리고 서버 초안을 불러오시겠습니까?')) return;
    await loadState();status('서버 초안을 불러왔습니다.');
  }));
  $('save-draft').addEventListener('click', () => run(() => save(false)));
  $('preview').addEventListener('click', () => run(() => save(true)));
  $('publish').addEventListener('click', () => run(async () => {
    if (!previewReady || dirty || !previewId) throw new Error('최신 미리보기가 필요합니다.');
    const result = await api('/api/admin/publish',{previewId,note:$('publish-note').value});
    await loadState(); $('publish-note').value='';
    status('v' + result.version + ' 게시를 완료했습니다. 공개 챗봇에 반영되었습니다.');
  }));
  $('refresh-versions').addEventListener('click', () => run(versions));
  $('refresh-inquiries').addEventListener('click', () => run(loadInquiries));
  $('inquiry-filter').addEventListener('change', () => renderInquiries());
  function logout() {run(async () => {
    if (dirty && !confirm('저장하지 않은 편집 내용이 있습니다. 로그아웃하시겠습니까?')) return;
    await api('/api/admin/logout',{});location.replace('/admin/login');
  });}
  $('logout').addEventListener('click',logout);
  $('logout-mobile').addEventListener('click',logout);
  $('password-form').addEventListener('submit', event => {
    event.preventDefault(); const form=event.currentTarget;
    run(async () => {
      if (form.elements.newPassword.value !== form.elements.confirmPassword.value) throw new Error('새 비밀번호 확인이 일치하지 않습니다.');
      await api('/api/admin/password',{currentPassword:form.elements.currentPassword.value,newPassword:form.elements.newPassword.value});
      location.replace('/admin/login');
    });
  });
  window.addEventListener('beforeunload', event => { if (dirty) {event.preventDefault();event.returnValue='';} });
  run(async () => {
    const session=await api('/api/admin/session');csrf=session.csrf;$('admin-name').textContent=session.username;
    await loadState();await loadInquiries();status('현재 공개 버전과 편집 초안을 불러왔습니다.');
  });
})();
