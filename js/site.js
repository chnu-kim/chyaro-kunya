/* site.js — 모든 페이지가 공유하는 크롬:
   ① 라이트/다크(Gothic Punk) 테마 토글 + localStorage 지속
   ② 테마에 따라 src 를 바꿔야 하는 이미지 스왑
   ③ 푸터 저작권 연도

   초기 테마는 각 페이지 <head> 의 인라인 스크립트가 첫 페인트 전에 이미
   적용한다. 여기서는 그 결과를 읽어 토글 상태만 맞추므로, 두 곳이 서로 다른
   값을 계산할 여지가 없다. */
(function () {
  var KEY = 'ck-theme';
  var root = document.documentElement;

  /* 테마별 아트워크 스왑.
     display:none 으로 두 장을 겹쳐두면 브라우저가 둘 다 내려받고, CSS
     content:url() 로 바꾸면 <img> 의 alt 노출이 엔진마다 달라진다. src 를
     직접 갈아끼우면 한 장만 받고 접근성 트리도 그대로다. */
  function swapImages(theme) {
    var imgs = document.querySelectorAll('[data-img-light][data-img-dark]');
    for (var i = 0; i < imgs.length; i++) {
      var next = imgs[i].getAttribute(theme === 'dark' ? 'data-img-dark' : 'data-img-light');
      if (next && imgs[i].getAttribute('src') !== next) imgs[i].setAttribute('src', next);
    }
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', String(theme === 'dark'));
      btns[i].setAttribute('aria-label', theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
    }
    swapImages(theme);
  }

  function current() {
    var t = root.getAttribute('data-theme');
    return t === 'dark' ? 'dark' : 'light';
  }

  apply(current());

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    var next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (err) {}
  });

  /* 사용자가 직접 고른 적이 없을 때만 OS 설정 변화를 따라간다. */
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function (e) {
      var saved;
      try { saved = localStorage.getItem(KEY); } catch (err) {}
      if (saved === 'light' || saved === 'dark') return;
      apply(e.matches ? 'dark' : 'light');
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  var years = document.querySelectorAll('[data-year]');
  for (var j = 0; j < years.length; j++) years[j].textContent = String(new Date().getFullYear());
}());
