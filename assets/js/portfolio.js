const projects = window.portfolioProjects || {};
const marketingProject = window.portfolioMarketing || {};

const toggle = document.querySelector('.nav-toggle');
const navigation = document.querySelector('#portfolio-nav');
function closeMenu() {
  navigation.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', '메뉴 열기');
}
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation?.classList.contains('is-open')) {
    closeMenu();
    toggle.focus();
  }
});
navigation?.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

const params = new URLSearchParams(location.search);
const collection = params.get('collection') === 'art' ? 'art' : 'drawing';
const rawNumber = Number(params.get('project'));
const projectCount = collection === 'art' ? Math.max(...Object.keys(projects).filter(key => key.startsWith('art-')).map(key => Number(key.split('-')[1]))) : 6;
const number = Number.isInteger(rawNumber) && rawNumber >= 1 && rawNumber <= projectCount ? rawNumber : 1;
const label = collection === 'art' ? 'PROJECT' : 'DRAWING';
const pad = value => String(value).padStart(2, '0');
const current = projects[`${collection}-${number}`];

// The same source controls gallery titles and thumbnails and detail image stacks.
document.querySelectorAll('.project-card').forEach(card => {
  const query = new URL(card.href).searchParams;
  const entry = card.dataset.project === 'marketing' ? marketingProject : projects[`${query.get('collection')}-${query.get('project')}`];
  if (!entry) return;
  if (entry.title) {
    card.querySelector('h2').textContent = entry.title;
    card.setAttribute('aria-label', `${entry.title} 열기`);
  }
  if (entry.imageNotice || entry.textCover) {
    const cover = document.createElement('div');
    cover.className = 'project-text-cover';
    const category = document.createElement('span');
    category.textContent = entry.coverLabel || (entry.genre ? `LIVE SERVICE GAME / ${entry.genre}` : 'LIVE SERVICE GAME');
    const name = document.createElement('strong');
    name.textContent = entry.title;
    const caption = document.createElement('span');
    caption.textContent = '참여 내역 보기 ↗';
    cover.append(category, name, caption);
    card.querySelector('.square').replaceChildren(cover);
  }
  if (entry.thumbnail || entry.images?.length) {
    const image = document.createElement('img');
    window.setSiteImage(image, entry.thumbnail || entry.images[0].src, '(max-width:540px) 44vw, 30vw');
    image.alt = entry.thumbnailAlt || entry.images?.[0]?.alt || entry.title || '프로젝트 썸네일';
    image.loading = 'lazy';
    image.style.cssText = `width:100%;height:100%;object-fit:${entry.thumbnailFit || 'cover'};background:#100c05`;
    card.querySelector('.square').replaceChildren(image);
  }
});
// Year filters apply only to the project archive; every visit starts with all work.
const archiveGrid = document.querySelector('.project-grid');
if (archiveGrid && document.querySelector('#portfolio-nav a[aria-current="page"][href="art.html"]')) {
  const cards = [...archiveGrid.querySelectorAll('.project-card')];
  const yearsFor = card => {
    const id = new URL(card.href).searchParams.get('project');
    const period = card.dataset.project === 'marketing' ? marketingProject.period : projects[`art-${id}`]?.period;
    const years = period?.match(/\d{4}/g)?.map(Number);
    return years?.length === 1 ? [years[0], years[0]] : years?.length === 2 ? years : null;
  };
  const matchesYear = (card, year) => {
    const range = yearsFor(card);
    return year === 'all' || Boolean(range && Number(year) >= range[0] && Number(year) <= range[1]);
  };
  const toolbar = document.createElement('div');
  toolbar.className = 'project-filter-bar';
  const filters = document.createElement('div');
  filters.className = 'project-year-filters';
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', '프로젝트 연도 선택');
  const status = document.createElement('p');
  status.className = 'project-filter-status micro';
  status.setAttribute('role', 'status');
  const buttons = [];
  for (const [value, label] of [['all', '전체'], ['2026', '2026'], ['2025', '2025'], ['2024', '2024'], ['2023', '2023']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.year = value;
    button.setAttribute('aria-pressed', String(value === 'all'));
    const text = document.createElement('span');
    text.textContent = label;
    const count = document.createElement('span');
    count.className = 'project-filter-count';
    count.textContent = String(cards.filter(card => matchesYear(card, value)).length).padStart(2, '0');
    count.setAttribute('aria-hidden', 'true');
    button.append(text, count);
    button.addEventListener('click', () => selectYear(value));
    filters.append(button);
    buttons.push(button);
  }
  toolbar.append(filters, status);
  archiveGrid.before(toolbar);
  const empty = document.createElement('p');
  empty.className = 'project-filter-empty';
  empty.textContent = '해당 연도에 등록된 프로젝트가 없습니다.';
  archiveGrid.append(empty);
  function selectYear(year) {
    let count = 0;
    cards.forEach(card => {
      card.hidden = !matchesYear(card, year);
      if (!card.hidden) count++;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.year === year)));
    status.textContent = `${year === 'all' ? 'ALL PROJECTS' : year + ' PROJECTS'} / ${String(count).padStart(2, '0')}`;
    empty.hidden = count > 0;
  }
  const index = document.querySelector('.gallery-heading-bottom .micro');
  if (index) index.textContent = '진행 기간 기준 · 연도별 프로젝트';
  selectYear('all');
}

if (document.querySelector('#project-title')) {
  const title = current?.title || `PROJECT ${pad(number)}`;
  document.title = `${title} · ${label} · YEONGSEO CHOI`;
  document.querySelector('#project-title').textContent = title;
  if (current?.description) {
    const description = document.createElement('p');
    description.className = 'description';
    description.textContent = current.description;
    document.querySelector('#project-title').after(description);
  }
  if (current?.period || current?.role) {
    const credits = document.createElement('dl');
    credits.className = 'project-credits';
    for (const [label, value] of [['진행 기간', current.period], ['참여 분야', current.role]]) {
      if (!value) continue;
      const row = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = label;
      const detail = document.createElement('dd');
      detail.textContent = value;
      row.append(term, detail);
      credits.append(row);
    }
    document.querySelector('.detail-heading').append(credits);
  }
  document.querySelector('#collection-label').textContent = `${label} / PROJECT ${pad(number)}`;
  const back = document.querySelector('#collection-back');
  back.href = `${collection}.html`;
  back.textContent = `← BACK TO ${label}`;
  document.querySelectorAll('#portfolio-nav a').forEach(link => {
    if (link.getAttribute('href') === `${collection}.html`) link.setAttribute('aria-current', 'page');
  });
  document.querySelector('#previous-project').href = `project.html?collection=${collection}&project=${number === 1 ? projectCount : number - 1}`;
  document.querySelector('#next-project').href = `project.html?collection=${collection}&project=${number === projectCount ? 1 : number + 1}`;
  if (current?.achievements) {
    const section = document.createElement('section');
    section.className = 'project-achievements';
    section.setAttribute('aria-label', `${title} 주요 실적`);
    const heading = document.createElement('h2');
    heading.textContent = '주요 실적';
    const layout = document.createElement('div');
    layout.className = 'achievement-layout';
    const funding = document.createElement('div');
    funding.className = 'achievement-funding';
    const caption = document.createElement('span');
    caption.className = 'micro';
    caption.textContent = '텀블벅 펀딩 달성률';
    const number = document.createElement('strong');
    number.textContent = current.funding;
    funding.append(caption, number);
    const list = document.createElement('ul');
    current.achievements.forEach(text => {
      const item = document.createElement('li');
      item.textContent = text;
      list.append(item);
    });
    if (current.funding) {
      layout.append(funding);
    } else {
      layout.classList.add('achievement-layout--list');
    }
    layout.append(list);
    const links = document.createElement('div');
    links.className = 'project-external-links';
    current.links.forEach(item => {
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `${item.label} ↗`;
      link.setAttribute('aria-label', `${item.label} (새 탭)`);
      links.append(link);
    });
    section.append(heading, layout, links);
    document.querySelector('#project-images').replaceChildren(section);
    document.querySelector('#project-images').setAttribute('aria-label', `${title} 주요 실적 및 프로젝트 링크`);
    if (current.trailer) {
      const trailer = document.createElement('section');
      trailer.className = 'project-trailer';
      const heading = document.createElement('h2');
      heading.textContent = 'PV / 게임 소개 영상';
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.preload = 'none';
      video.poster = current.trailer.poster;
      video.setAttribute('aria-label', `${title} Steam 소개 영상`);
      const fallback = document.createElement('a');
      fallback.href = current.links.find(link => link.url.includes('steampowered.com')).url;
      fallback.target = '_blank';
      fallback.rel = 'noopener noreferrer';
      fallback.className = 'description';
      fallback.textContent = 'Steam에서 영상 보기 ↗';
      trailer.append(heading, video, fallback);
      document.querySelector('#project-images').append(trailer);
      const connect = () => {
        if (window.Hls?.isSupported()) {
          const player = new window.Hls();
          player.loadSource(current.trailer.src);
          player.attachMedia(video);
          player.on(window.Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              fallback.textContent = '영상 연결이 원활하지 않습니다. Steam에서 보기 ↗';
              player.destroy();
            }
          });
        } else {
          fallback.textContent = '이 브라우저에서는 Steam에서 영상을 확인해 주세요 ↗';
        }
      };
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = current.trailer.src;
      } else if (window.Hls) {
        connect();
      } else {
        const script = document.createElement('script');
        script.src = 'assets/js/vendor/hls.min.js';
        script.onload = connect;
        script.onerror = () => { fallback.textContent = 'Steam에서 소개 영상 보기 ↗'; };
        document.head.append(script);
      }
    }

  } else if (current?.imageNotice || current?.tasks?.length) {
    const panel = document.createElement('section');
    panel.className = 'project-work-summary';
    const heading = document.createElement('h2');
    heading.textContent = '참여 작업';
    const tasks = document.createElement('ul');
    for (const task of current.tasks || []) {
      const item = document.createElement('li');
      item.textContent = task;
      tasks.append(item);
    }
    const notice = document.createElement('p');
    notice.className = 'description project-disclosure';
    notice.textContent = current.imageNotice;
    panel.append(heading, tasks);
    if (current.imageNotice) panel.append(notice);
    document.querySelector('#project-images').replaceChildren(panel);
    document.querySelector('#project-images').setAttribute('aria-label', `${title} 참여 작업 내역`);
  } else if (current?.video) {
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'none';
    video.poster = current.video.poster || current.thumbnail || '';
    video.setAttribute('aria-label', `${title} 영상`);
    const source = document.createElement('source');
    source.src = current.video.src;
    source.type = 'video/mp4';
    video.append(source);
    document.querySelector('#project-images').replaceChildren(video);
    document.querySelector('#project-images').setAttribute('aria-label', `${title} 영상`);
    document.querySelector('#collection-label').textContent = label;
    document.querySelector('.project-pagination')?.remove();
  } else if (current?.images?.length) {
    const images = current.images.map(item => {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      window.setSiteImage(image, item.src);
      image.alt = item.alt || title;
      image.loading = 'lazy';
      image.decoding = 'async';
      figure.append(image);
      return figure;
    });
    document.querySelector('#project-images').replaceChildren(...images);
  }
}
