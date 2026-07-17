# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

프로젝트 지침의 정본은 `AGENTS.md` 다. 아래 import 로 전체를 읽어온다 —
**규칙을 고칠 땐 이 파일이 아니라 `AGENTS.md` 를 고친다.**

@AGENTS.md

## 빠른 요약

버추얼 스트리머 챠이로 쿠냐의 비공식 팬 사이트. **정적 HTML/CSS/JS · 빌드 없음 ·
의존성 없음 · 테스트 없음.** 저장소 루트를 GitHub Pages 가 그대로 서빙한다
(<https://chnu-kim.github.io/chyaro-kunya/>).

빌드 시스템이 없다는 건 검증을 대신해 줄 게 아무것도 없다는 뜻이다. 타입 체커도,
린터도, 테스트도 잡아주지 않으므로 **브라우저에서 직접 확인하거나 배포 URL 을 찔러
확인한다.** 아래 "구조 — 왜 이렇게 되어 있나"의 제약들이 문서에만 존재하고 코드로
강제되지 않는 이유이기도 하다.

## 명령어

```bash
python3 -m http.server          # 로컬 서버 → http://localhost:8000
                               # file:// 로 열면 절대 URL 에셋·폰트가 배포와 달라진다

sips -Z 336 assets/원본.png --out assets/파생-336.jpg   # 이미지 파생본 (macOS, WebP 불가)

# 배포는 main 에 푸시하면 GitHub Pages 가 자동 빌드 (~50초)
# remote 는 HTTPS 여야 한다 — 이유는 AGENTS.md "gh 계정 전환은 SSH 키 신원을 바꾸지 않는다"
git -c credential.helper='!gh auth git-credential' push origin main

# 푸시 후 검증: 추측하지 말고 실제로 찌른다
curl -sI https://chnu-kim.github.io/chyaro-kunya/ | head -1
```

## 구조 — 왜 이렇게 되어 있나

세 페이지(`index.html` · `landing.html` · `games.html`)는 각자 완결된 정적 문서이고,
공유하는 건 `css/site.css` 와 `js/site.js` 둘뿐이다. 컴포넌트 시스템이 없으므로
**nav·푸터 마크업은 세 파일에 각각 복제돼 있다** — 크롬을 고치면 세 곳을 다 고쳐야 한다.

- `css/site.css` — `:root` 디자인 토큰 + 공유 크롬. **색·타입의 정본.** 생 hex 금지,
  `var(--token)` 으로만 참조. 라이트/다크 두 테마가 살아 있어서 토큰을 우회하면
  한쪽에서 조용히 깨진다.
- `js/site.js` — 테마 토글 + 테마별 이미지 스왑 + 푸터 연도. 초기 테마는 각 페이지
  `<head>` 의 인라인 스크립트가 첫 페인트 전에 적용하고, `site.js` 는 그 결과를 읽어
  토글 상태만 맞춘다. 두 곳이 서로 다른 값을 계산할 여지가 없게 만든 구조다.
- `js/games.js` — 게임 보드. localStorage 를 **신뢰하지 않는 입력**으로 다룬다.
- 웹폰트는 각 페이지 `<head>` 에서 로드한다. `site.css` 에서 `@import` 하면
  파싱이 끝나야 폰트 origin 을 발견하는 직렬 렌더블로킹 체인이 생긴다.

## Claude Code 관련

- **파일 수정 전 반드시 Read.** 특히 `css/site.css` 는 토큰이 서로를 참조하므로
  한 값만 보고 고치면 파생 토큰이 깨진다.
- **od export 는 이 런타임에 없다.** HTML 을 이미지로 렌더할 경로가 없으니
  `og-cover.jpg` 같은 렌더 산출물은 사용자에게 캡처를 요청한다.
- **브라우저 자동화(Playwright/headless)를 쓰지 않는다.** 시각 확인이 필요하면
  사용자에게 보여주고 물어본다.
- PR 을 만들면(`gh pr create`) 직후 `/codex-pr-review --base <base>` 를 실행한다
  (사용자 전역 지침).
