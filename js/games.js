/* games.js — 플레이 게임 목록: 동적 추가/삭제, 상태 필터, localStorage 지속.
   카드는 폴라로이드 그리드로 렌더한다. 알 수 없는 장르/플랫폼은 정직한 '—' 플레이스홀더.

   저장소는 신뢰하지 않는 입력으로 다룬다. 다른 탭·확장·중단된 쓰기·과거 스키마가
   무엇을 남겼든, 이 페이지는 빈 화면 대신 시드로 복구되어야 한다. */
(function () {
  var KEY = 'ck-games-v1';

  // 상태 정의 — 칩 색 매핑
  var STATUS = {
    playing:  { label: '플레이중', cls: 'chip--live' },
    cleared:  { label: '클리어',   cls: 'chip--ok' },
    planned:  { label: '예정',     cls: 'chip--warn' },
    played:   { label: '플레이함', cls: '' }
  };
  function statusOf(key) {
    // 대괄호 조회는 프로토타입 체인을 탄다: g.status='constructor' 면 Object 가
    // 반환되어 || 폴백이 걸리지 않고 'undefined' 가 화면에 찍힌다.
    return Object.prototype.hasOwnProperty.call(STATUS, key) ? STATUS[key] : STATUS.played;
  }

  // 사용자 제공 예시 8종. 널리 알려진 게임만 장르를 채우고, 불확실하면 '—'.
  var SEED = [
    { name: '마이 보이스 주',              genre: '—',           platform: '—',  status: 'played'  },
    { name: '마인크래프트',                genre: '샌드박스',     platform: 'PC', status: 'playing' },
    { name: '겟 투 워크',                  genre: '—',           platform: '—',  status: 'played'  },
    { name: '레이튼 교수와 이상한 마을',   genre: '퍼즐 어드벤처', platform: '—',  status: 'cleared' },
    { name: '레이튼 교수와 악마의 상자',   genre: '퍼즐 어드벤처', platform: '—',  status: 'played'  },
    { name: '리그 오브 레전드',            genre: 'AOS',         platform: 'PC', status: 'playing' },
    { name: '리틀 나이트메어',             genre: '호러 퍼즐',    platform: '—',  status: 'cleared' },
    { name: '엘든링',                      genre: '액션 RPG',     platform: 'PC', status: 'played'  }
  ];

  function seeds() {
    return SEED.map(function (g, i) { return Object.assign({ id: 'seed-' + i }, g); });
  }

  /* 어떤 레코드든 렌더 가능한 형태로 강제 변환한다. 문자열이 아닌 name 하나가
     map() 안에서 던지면 카드 8장이 통째로 사라지므로, 경계에서 막는다. */
  function coerce(g, i) {
    if (!g || typeof g !== 'object') return null;
    var name = String(g.name == null ? '' : g.name).trim();
    if (!name) return null;
    return {
      id:       String(g.id == null ? '' : g.id) || ('g-' + i + '-' + name.length),
      name:     name,
      genre:    String(g.genre == null ? '' : g.genre).trim() || '—',
      platform: String(g.platform == null ? '' : g.platform).trim() || '—',
      status:   Object.prototype.hasOwnProperty.call(STATUS, g.status) ? g.status : 'played'
    };
  }

  var storageOK = true;

  function load() {
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { storageOK = false; return seeds(); }
    if (!raw) return seeds();
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    // JSON.parse 성공 != 배열. '{"a":1}' · 'null' · '0' 모두 파싱을 통과한다.
    if (!Array.isArray(parsed)) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      return seeds();
    }
    var clean = parsed.map(coerce).filter(Boolean);
    // 빈 배열은 "저장소가 깨졌다"가 아니라 "사용자가 다 지웠다"이다. 시드를
    // 되살리면 삭제가 새로고침마다 취소되고 빈 상태 화면에 영영 닿지 못한다.
    // 레코드가 있었는데 전부 걸러졌을 때만 손상으로 보고 시드로 복구한다.
    if (parsed.length && !clean.length) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      return seeds();
    }
    return clean;
  }

  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      // 화면은 "이 브라우저에 저장돼요" 라고 약속했다. 지킬 수 없으면 철회한다.
      storageOK = false;
      if (storeWarn) storeWarn.hidden = false;
      return false;
    }
  }

  var state  = load();
  var filter = 'all';

  var grid      = document.getElementById('gameGrid');
  var empty     = document.getElementById('gridEmpty');
  var countEl   = document.getElementById('gameCount');
  var form      = document.getElementById('addForm');
  var nameIn    = document.getElementById('f-name');
  var nameErr   = document.getElementById('f-name-err');
  var filters   = document.getElementById('filters');
  var statusEl  = document.getElementById('liveStatus');
  var storeWarn = document.getElementById('storeWarn');
  var undoBar   = document.getElementById('undoBar');
  var undoMsg   = document.getElementById('undoMsg');
  var undoBtn   = document.getElementById('undoBtn');

  grid.setAttribute('tabindex', '-1');
  if (!storageOK && storeWarn) storeWarn.hidden = false;

  function esc(s) {
    return String(s).replace(/[&<>"'`]/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;', '`':'&#96;' }[c];
    });
  }

  /* 기울기와 종이결은 카드의 정체성이지 목록에서의 위치가 아니다. 인덱스로
     고르면 하나를 추가·삭제할 때마다 보드 전체가 다시 기울어진다. */
  var ROT   = ['-1.4deg', '0.8deg', '-0.6deg', '1.3deg', '-1deg', '0.5deg'];
  var ANGLE = ['135deg', '45deg', '160deg', '20deg', '110deg', '70deg'];
  var PATTERNS = 4;   // games.html 의 .game__thumb[data-p="0..3"]

  /* 축마다 해시를 새로 돌린다(소금을 다르게 준다). 한 해시를 >>3, >>6 으로 나눠
     쓰면 안 된다 — id 가 'seed-0'..'seed-7' 처럼 끝 한 글자만 다를 때 h*31+c 의
     상위 비트가 전부 같아서 축이 통째로 붕괴한다. 실측: 시드 8장이 패턴을 1종,
     각도를 2종밖에 못 받았다. 소금을 주면 4/4 · 6/6 으로 고르게 퍼진다. */
  function axis(id, salt, n) { return hash(id + '/' + salt) % n; }
  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function card(g) {
    var st = statusOf(g.status);
    var initial = g.name.charAt(0);
    return '' +
      '<figure class="polaroid game" style="--rot:' + ROT[axis(g.id, 'rot', ROT.length)] +
        ';--thumb-a:' + ANGLE[axis(g.id, 'ang', ANGLE.length)] + '" data-id="' + esc(g.id) +
        '" data-od-id="game-card-' + esc(g.id) + '">' +
        '<span class="clip" aria-hidden="true"></span>' +
        '<div class="game__thumb" data-p="' + axis(g.id, 'pat', PATTERNS) + '" aria-hidden="true">' +
          '<span class="game__initial">' + esc(initial) + '</span>' +
          '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="15" rx="5.4" ry="4.4"/><circle cx="6.5" cy="9" r="2"/><circle cx="17.5" cy="9" r="2"/><circle cx="9.4" cy="6.4" r="1.7"/><circle cx="14.6" cy="6.4" r="1.7"/></svg>' +
        '</div>' +
        '<figcaption class="game__body">' +
          '<div class="game__top">' +
            '<h3 class="game__name">' + esc(g.name) + '</h3>' +
            '<span class="chip ' + st.cls + '">' + esc(st.label) + '</span>' +
          '</div>' +
          '<dl class="game__meta">' +
            '<div><dt>장르</dt><dd>' + esc(g.genre) + '</dd></div>' +
            '<div><dt>플랫폼</dt><dd>' + esc(g.platform) + '</dd></div>' +
          '</dl>' +
          '<button class="game__del" type="button" data-del="' + esc(g.id) + '" aria-label="' + esc(g.name) + ' 삭제">삭제</button>' +
        '</figcaption>' +
      '</figure>';
  }

  function announce(msg) { if (statusEl) statusEl.textContent = msg; }

  function render(announceMsg) {
    var list = state.filter(function (g) { return filter === 'all' || g.status === filter; });
    grid.innerHTML = list.map(card).join('');
    empty.hidden = list.length > 0;
    countEl.innerHTML = filter === 'all'
      ? '총 <b>' + state.length + '</b>개'
      : '<b>' + list.length + '</b> / ' + state.length + '개 표시';
    var chips = filters.querySelectorAll('[data-filter]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].setAttribute('aria-pressed', String(chips[i].getAttribute('data-filter') === filter));
    }
    if (announceMsg) announce(announceMsg);
  }

  // ---- 삭제 되돌리기 -------------------------------------------------------
  var pending = null;  // { game, index }
  var undoTimer = null;

  function clearUndo() {
    if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
    pending = null;
    if (!undoBar || undoBar.hidden) return;
    // 되돌리기 버튼에 포커스가 남은 채로 숨기면 포커스가 <body> 로 떨어진다.
    var hadFocus = document.activeElement === undoBtn;
    undoBar.hidden = true;
    if (hadFocus) grid.focus();
  }

  function offerUndo(game, index) {
    pending = { game: game, index: index };
    undoMsg.textContent = '‘' + game.name + '’ 삭제했어요.';
    undoBar.hidden = false;
    undoBtn.focus();
    if (undoTimer) clearTimeout(undoTimer);
    // 자동 해제는 사용자가 이 버튼을 보고 있지 않을 때만. 되돌릴지 고민하는
    // 중에 시간이 다 됐다는 이유로 포커스를 빼앗는 건 예고 없는 맥락 전환이다.
    var tick = function () {
      if (document.activeElement === undoBtn) { undoTimer = setTimeout(tick, 8000); return; }
      clearUndo();
    };
    undoTimer = setTimeout(tick, 8000);
  }

  undoBtn.addEventListener('click', function () {
    if (!pending) return;
    var g = pending.game, at = Math.min(pending.index, state.length);
    state.splice(at, 0, g);
    save(state);
    clearUndo();
    render('‘' + g.name + '’ 복구했어요.');
    grid.focus();
  });

  // 필터
  filters.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('[data-filter]');
    if (!b) return;
    filter = b.getAttribute('data-filter');
    var list = state.filter(function (g) { return filter === 'all' || g.status === filter; });
    render(filter === 'all'
      ? '전체 ' + state.length + '개 표시'
      : b.textContent.trim() + ' ' + list.length + '개 표시');
  });

  // 삭제
  grid.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('[data-del]');
    if (!b) return;
    var id = b.getAttribute('data-del');
    var at = -1;
    for (var i = 0; i < state.length; i++) { if (state[i].id === id) { at = i; break; } }
    if (at < 0) return;
    var removed = state.splice(at, 1)[0];
    save(state);
    render();
    offerUndo(removed, at);
  });

  // 추가
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = nameIn.value.trim();
    if (!name) {
      nameIn.setAttribute('aria-invalid', 'true');
      nameErr.hidden = false;
      nameIn.focus();
      return;
    }
    nameIn.removeAttribute('aria-invalid');
    nameErr.hidden = true;
    clearUndo();

    var status = document.getElementById('f-status').value;
    var g = coerce({
      id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      name: name,
      genre: document.getElementById('f-genre').value,
      platform: document.getElementById('f-platform').value,
      status: status
    }, 0);
    state.unshift(g);
    save(state);

    form.reset();
    // 같은 상태로 여러 개를 연달아 기록하는 게 보통이므로 방금 고른 값을 남긴다.
    document.getElementById('f-status').value = status;
    // 방금 추가한 카드가 현재 필터에서 안 보이면 그대로 두는 대신 전체로 되돌린다.
    if (filter !== 'all' && filter !== g.status) filter = 'all';
    render('‘' + g.name + '’ 추가했어요.');
    nameIn.focus();
  });

  nameIn.addEventListener('input', function () {
    if (nameIn.value.trim()) { nameIn.removeAttribute('aria-invalid'); nameErr.hidden = true; }
  });

  render();
}());
