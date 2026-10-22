# Yeongseo Choi Portfolio / Tourism Content Archive

## 새 포트폴리오 홈

- `index.html`: 기본 진입 화면. 블랙 배경, 네온 블루 `#00DFFF`, 배너 영상 자리와 교차 배치한 네 가지 메뉴.
- `marketing.html`: 기존 관광 콘텐츠 아카이브 홈. CONTENTS MARKETING PROJECT 메뉴에서 연결됩니다.
- `about.html`: 연락처, 프로필 사진 공간, AWARDS 및 EXPERIENCE.
- `art.html`, `drawing.html`: 정사각형 프로젝트 썸네일 목록.
- `project.html?collection=drawing&project=1`: 프로젝트별 여러 이미지 상세 화면. `collection=art`도 지원합니다.
- 새 화면 스타일: `assets/css/portfolio.css`. 동작과 프로젝트 데이터: `assets/js/portfolio.js`.

배너 영상은 `index.html`의 안내 주석에 따라 video 요소를 추가합니다. 프로필 사진은 `about.html`의 `.portrait` 내부를 img로 교체합니다. 수상·경험은 실제 내역이 없어 빈 공간으로 두었습니다.

프로젝트는 `assets/js/portfolio.js`의 `projects` 객체에 `drawing-1` 또는 `art-1`부터 각각 6번까지 등록합니다. 각 항목의 `title`, 선택적인 `thumbnail`, `images: [{ src, alt }]`를 입력하면 목록의 썸네일과 상세 이미지가 함께 반영됩니다. 이미지는 원하는 수만큼 추가할 수 있습니다. 기본 상태는 모든 이미지가 비어 있습니다.

기존 GitHub Pages 배포 방식 그대로 사용하면 루트 주소에서 새 홈이 열립니다.

SK플래닛 관광 콘텐츠 제작 프로젝트의 조사, 제작물, SNS 분석과 최종 팀 프로젝트를 기록하는 반응형 정적 웹사이트입니다.

## 페이지

- `marketing.html`: 관광 콘텐츠 아카이브 소개 및 메인 랜딩
- `brand.html`: NARU studio 브랜드 아이덴티티 및 CI 가이드
- `report.html`: 관광 자원 조사 및 콘텐츠 기획 자료
- `contents.html`: 카드뉴스 및 영상 아카이브
- 카드뉴스 이미지: `assets/images/contents/naru-cardnews-01.jpg`부터 `03.jpg`까지 순서대로 표시
- `sns.html`: SNS 성과 분석 대시보드
- `spoton.html`: 스마트폰 프레임 안에서 실행되는 SPOT:ON 인터랙티브 서비스 미리보기
- `final.html`: 팀 프로젝트 케이스 스터디

## 콘텐츠 수정

- 공통 색상과 간격: `assets/css/variables.css`
- NARU studio CI 원본: `assets/images/common/naru-logo.png`
- 공통 레이아웃: `assets/css/common.css`
- 페이지별 디자인: `assets/css/pages.css`
- 모바일·태블릿 대응: `assets/css/responsive.css`
- 메뉴와 필터 동작: `assets/js/main.js`
- 이미지: `assets/images/` 아래 페이지별 폴더를 만든 뒤 HTML의 플레이스홀더를 `<img>` 요소로 교체
- 영상: `assets/videos/contents/`에 넣거나 외부 영상 주소 연결

## GitHub Pages 배포

1. 이 폴더를 GitHub 저장소에 업로드합니다.
2. 저장소의 **Settings → Pages**로 이동합니다.
3. **Build and deployment**에서 `Deploy from a branch`를 선택합니다.
4. 배포할 브랜치의 `/ (root)` 폴더를 선택하고 저장합니다.

모든 링크와 에셋 경로가 상대경로로 작성되어 프로젝트형 GitHub Pages 주소에서도 별도 수정 없이 동작합니다.

## SNS 성과 기록

- 실시간 계정 연결 및 예약 수집을 제거했습니다.
- SNS 탭의 **성과 기록 편집**에서 운영 기간, 역할, 전후 지표, 월별 추이, 대표 콘텐츠와 분석 사례를 직접 등록합니다.
- 인사이트 캡처는 PNG/JPG/WebP, 채널별 최대 1.5 MB를 지원합니다.
- 저장은 해당 브라우저의 로컬 기록입니다. 저장 후 편집을 닫고 **공개용 SNS 페이지 내보내기**를 누르면 기록과 캡처가 포함된 `sns.html`을 받습니다.
- 내보낸 파일로 저장소의 `sns.html`을 교체하고 기존 배포 절차로 반영합니다. 다른 페이지는 변경하지 않습니다.
- **공개 기록으로 돌아가기**는 로컬 초안을 지우고 현재 페이지에 포함된 기록을 복원합니다.
- 확인되지 않은 수치는 미등록으로 표시하며, 시작값 0의 성장률과 분모 0의 참여율은 계산하지 않습니다.
