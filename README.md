# 챠이로 쿠냐 팬 사이트

버추얼 스트리머 **챠이로 쿠냐**의 비공식 팬 사이트. 정적 사이트이며 빌드 과정이 없다 —
저장소 루트를 그대로 GitHub Pages 가 서빙한다.

**https://chnu-kim.github.io/chyaro-kunya/**

## 화면

| 파일 | 내용 |
|---|---|
| `index.html` | 홈 · 두 화면으로 가는 런처 |
| `landing.html` | 소개 — 프로필, 주요 컨텐츠, 채널 링크 |
| `games.html` | 플레이한 게임 보드 (추가·삭제·상태 필터, localStorage 저장) |
| `logo-identity-directions.html` | 로고 아이덴티티 확정 스펙 (내부 참고용, `noindex`) |
| `og-cover.html` | OG 커버 렌더 타깃 (사이트에서 링크하지 않음, `noindex`) |

## 구조

- `css/site.css` — 디자인 토큰과 공유 크롬(nav·푸터·테마 토글). **색·타입의 정본.**
  값을 직접 쓰지 말고 항상 `var(--token)` 으로 참조한다.
- `js/site.js` — 라이트/다크 테마 + 테마별 이미지 스왑 + 푸터 연도
- `js/games.js` — 게임 보드 상태
- `assets/` — 이미지. `kunya-debut-336.jpg` 같은 파생본은 원본에서 `sips` 로 만든 것이다.

## 채널

치지직 · 유튜브 · X 3개만 운영한다. **디스코드는 없다** — 만들지 말 것.

## 알려진 미완

- `assets/og-cover.jpg` 는 `og-cover.html` 을 렌더한 결과가 아니라 데뷔 사진을
  1200×630 에 패딩한 것이다. 조판·워터마크가 들어간 진짜 커버로 교체해야 한다.
- 저장소 이름을 바꾸거나 커스텀 도메인을 붙이면 각 페이지의 `og:image` / `og:url`
  절대 URL 도 같이 옮겨야 한다. 상대경로로 두면 X·Slack 이 카드 이미지를 무시한다.
