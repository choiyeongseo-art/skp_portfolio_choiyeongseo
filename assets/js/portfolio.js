/* Add real project content here. Each entry supports any number of images:
   'drawing-1': { title: 'Project title', images: [
     { src: 'assets/images/drawing/project-01/01.jpg', alt: '이미지 설명' }
   ] }
   Image paths are relative to the HTML page. No sample artwork is loaded.
*/
const projects = {
  "drawing-1": {
    "title": "PROJECT 01",
    "thumbnail": "assets/images/drawing/project-01/thumbnail.png",
    "images": [
      {
        "src": "assets/images/drawing/project-01/01.png",
        "alt": "01. 포트폴리오 표지"
      },
      {
        "src": "assets/images/drawing/project-01/02.png",
        "alt": "02. 캐릭터 디자인 모음"
      },
      {
        "src": "assets/images/drawing/project-01/03.png",
        "alt": "03. 로잔느 캐릭터 디자인"
      },
      {
        "src": "assets/images/drawing/project-01/04.png",
        "alt": "04. 미스페리 캐릭터 디자인"
      },
      {
        "src": "assets/images/drawing/project-01/05.png",
        "alt": "05. 시리우스 캐릭터 디자인"
      },
      {
        "src": "assets/images/drawing/project-01/06.png",
        "alt": "06. 월드 맵 디자인"
      },
      {
        "src": "assets/images/drawing/project-01/07.png",
        "alt": "07. 별모래 사막 게임 화면"
      },
      {
        "src": "assets/images/drawing/project-01/08.png",
        "alt": "08. 별모래 사막 소품 디자인"
      },
      {
        "src": "assets/images/drawing/project-01/09.png",
        "alt": "09. 바람 둥지 숲 배경"
      },
      {
        "src": "assets/images/drawing/project-01/10.png",
        "alt": "10. 마녀의 성 실내 디자인"
      },
      {
        "src": "assets/images/drawing/project-01/11.png",
        "alt": "11. 봄꽃 저택 인공물 소품"
      },
      {
        "src": "assets/images/drawing/project-01/12.png",
        "alt": "12. 봄꽃 저택 자연물 소품"
      },
      {
        "src": "assets/images/drawing/project-01/13.png",
        "alt": "13. 봄꽃 저택 배경"
      },
      {
        "src": "assets/images/drawing/project-01/14.png",
        "alt": "14. 캐릭터 아이디어 스케치"
      },
      {
        "src": "assets/images/drawing/project-01/15.png",
        "alt": "15. 월드 맵 제작 과정"
      },
      {
        "src": "assets/images/drawing/project-01/16.png",
        "alt": "16. 바람 둥지 숲 제작 과정"
      },
      {
        "src": "assets/images/drawing/project-01/17.png",
        "alt": "17. 봄꽃 저택 제작 과정"
      },
      {
        "src": "assets/images/drawing/project-01/closing.png",
        "alt": "18. 포트폴리오 마무리 — Thank you for watching 및 연락처"
      }
    ]
  },
  "drawing-2": {
    "title": "PROJECT 02",
    "thumbnail": "assets/images/drawing/project-02/thumbnail.png",
    "images": [
      {
        "src": "assets/images/drawing/project-02/01.png",
        "alt": "01. 인물과 캐릭터 크로키 모음"
      },
      {
        "src": "assets/images/drawing/project-02/02.png",
        "alt": "02. 정물, 인물 및 풍경 컬러 스터디"
      }
    ]
  },
  "art-1": {
    "title": "Hit Salon",
    "thumbnail": "assets/images/art/project-01/thumbnail.png",
    "video": {
      "src": "assets/videos/art/hit-salon.mp4",
      "poster": "assets/images/art/project-01/thumbnail.png"
    }
  }
};

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
const number = Number.isInteger(rawNumber) && rawNumber >= 1 && rawNumber <= 6 ? rawNumber : 1;
const label = collection === 'art' ? 'ART PROJECT' : 'DRAWING';
const pad = value => String(value).padStart(2, '0');
const current = projects[`${collection}-${number}`];

// The same source controls gallery titles and thumbnails and detail image stacks.
document.querySelectorAll('.project-card').forEach(card => {
  const query = new URL(card.href).searchParams;
  const entry = projects[`${query.get('collection')}-${query.get('project')}`];
  if (!entry) return;
  if (entry.title) {
    card.querySelector('h2').textContent = entry.title;
    card.setAttribute('aria-label', `${entry.title} 열기`);
  }
  if (entry.thumbnail || entry.images?.length) {
    const image = document.createElement('img');
    image.src = entry.thumbnail || entry.images[0].src;
    image.alt = entry.thumbnailAlt || entry.images?.[0]?.alt || entry.title || '프로젝트 썸네일';
    image.loading = 'lazy';
    image.style.cssText = 'width:100%;height:100%;object-fit:cover';
    card.querySelector('.square').replaceChildren(image);
  }
});
if (document.querySelector('#project-title')) {
  const title = current?.title || `PROJECT ${pad(number)}`;
  document.title = `${title} · ${label} · YEONGSEO CHOI`;
  document.querySelector('#project-title').textContent = title;
  document.querySelector('#collection-label').textContent = `${label} / PROJECT ${pad(number)}`;
  const back = document.querySelector('#collection-back');
  back.href = `${collection}.html`;
  back.textContent = `← BACK TO ${label}`;
  document.querySelectorAll('#portfolio-nav a').forEach(link => {
    if (link.getAttribute('href') === `${collection}.html`) link.setAttribute('aria-current', 'page');
  });
  document.querySelector('#previous-project').href = `project.html?collection=${collection}&project=${number === 1 ? 6 : number - 1}`;
  document.querySelector('#next-project').href = `project.html?collection=${collection}&project=${number === 6 ? 1 : number + 1}`;
  if (current?.video) {
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
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
      image.src = item.src;
      image.alt = item.alt || title;
      image.loading = 'lazy';
      figure.append(image);
      return figure;
    });
    document.querySelector('#project-images').replaceChildren(...images);
  }
}

const bannerVideo = document.querySelector('#banner-video');
const bannerControl = document.querySelector('.banner-control');
if (bannerVideo && bannerControl) {
  const updateVideoControl = () => {
    bannerControl.textContent = bannerVideo.paused ? 'PLAY' : 'PAUSE';
    bannerControl.setAttribute('aria-label', bannerVideo.paused ? '배너 영상 재생' : '배너 영상 일시정지');
  };
  bannerVideo.addEventListener('play', updateVideoControl);
  bannerVideo.addEventListener('pause', updateVideoControl);
  bannerControl.addEventListener('click', () => {
    if (bannerVideo.paused) bannerVideo.play().catch(updateVideoControl);
    else bannerVideo.pause();
  });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) {
    bannerVideo.autoplay = false;
    bannerVideo.pause();
  }
  updateVideoControl();
}
