# 챠이로 쿠냐 팬 사이트 (구 정적 사이트 · 은퇴)

> **이 저장소는 은퇴했다.** 현행 사이트는 **https://chyailokunya.com** 이고
> [`chnu-kim/chyailokunya`](https://github.com/chnu-kim/chyailokunya) 가 서빙한다.
> 2026-07-19 컷오버로 GitHub Pages 는 종료됐다 — 여기 코드는 소스 보존용이다.

버추얼 스트리머 **챠이로 쿠냐**의 비공식 팬 사이트. 정적 사이트이며 빌드 과정이 없다 —
저장소 루트를 GitHub Pages 가 그대로 서빙하던 구조다. 로컬에서 보려면
`python3 -m http.server` 후 <http://localhost:8000>.

## 화면

| 파일 | 내용 |
|---|---|
| `index.html` | 홈 · 두 화면으로 가는 런처 |
| `landing.html` | 소개 — 프로필, 주요 컨텐츠, 채널 링크 |
| `games.html` | 플레이한 게임 보드 (추가·삭제·상태 필터, localStorage 저장) |
| `logo-identity-directions.html` | 로고 아이덴티티 확정 스펙 (내부 참고용, `noindex`) |
| `og-cover.html` | OG 커버 렌더 타깃 (사이트에서 링크하지 않음, `noindex`) |
| `paw-shape-compare.html` | 발바닥 세로 길이 3안 비교 (내부 참고용, 링크 안 함, `noindex`) |

## 구조

- `css/site.css` — 디자인 토큰과 공유 크롬(nav·푸터·테마 토글). **색·타입의 정본.**
  값을 직접 쓰지 말고 항상 `var(--token)` 으로 참조한다.
- `js/site.js` — 라이트/다크 테마 + 테마별 이미지 스왑 + 푸터 연도
- `js/games.js` — 게임 보드 상태
- `assets/` — 이미지. `kunya-debut-336.jpg` 같은 파생본은 원본에서 `sips` 로 만든 것이다.

## 채널

치지직 · 유튜브 · X 3개만 운영한다. **디스코드는 없다** — 만들지 말 것.

## 확정된 결정

- `index.html`(런처)과 `landing.html`(소개)의 정보 구조가 겹치지만 **분리 유지로
  확정**됐다. 새 저장소도 분리를 그대로 가져갔다 — 병합 제안은 뒤집지 않는다.
