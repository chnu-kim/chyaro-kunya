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
  var emptyFor  = { filter: null, board: null };
  var countEl   = document.getElementById('gameCount');
  var form      = document.getElementById('addForm');
  var nameIn    = document.getElementById('f-name');
  var nameErr   = document.getElementById('f-name-err');
  var filters   = document.getElementById('filters');
  var statusEl  = document.getElementById('liveStatus');
  var storeWarn = document.getElementById('storeWarn');
  var addOpen   = document.getElementById('addOpen');
  var addClose  = document.getElementById('addClose');
  var dialog    = document.getElementById('addDialog');
  var addStatus = document.getElementById('addStatus');

  grid.setAttribute('tabindex', '-1');
  if (!storageOK && storeWarn) storeWarn.hidden = false;
  emptyFor.filter = empty.querySelector('[data-empty="filter"]');
  emptyFor.board  = empty.querySelector('[data-empty="board"]');

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

  /* 카드는 그림이 아니라 데이터라 평범한 div 다. 이전엔 그림+캡션 요소로 짜여
     있었는데 관계가 뒤집혀 있었다 — 그림 몫인 썸네일은 aria-hidden 이고 제목·
     메타·삭제가 전부 캡션 쪽에 들어가서, 콘텐츠는 없고 캡션만 있는 그림이 됐다.
     부수 효과도 있었다: site.css 의 사진지 부품이 캡션 요소에 가운데 정렬을
     물려서 삭제 버튼만 이유 없이 가운데 서 있었다(이름·메타는 왼쪽인데).
     이제 왼쪽으로 정렬된다.
     data-card 는 render() 가 갈아끼울 대상 표시다 — 붙이기 슬롯과 폼은 같은
     그리드의 정적 자식이라 이 표시가 없어야 살아남는다. */
  function card(g) {
    var st = statusOf(g.status);
    var initial = g.name.charAt(0);
    return '' +
      '<div class="polaroid game" data-card style="--rest-rot:' + ROT[axis(g.id, 'rot', ROT.length)] +
        ';--thumb-a:' + ANGLE[axis(g.id, 'ang', ANGLE.length)] + '" data-id="' + esc(g.id) +
        '" data-od-id="game-card-' + esc(g.id) + '">' +
        '<span class="clip" aria-hidden="true"></span>' +
        '<div class="game__thumb" data-p="' + axis(g.id, 'pat', PATTERNS) + '" aria-hidden="true">' +
          '<span class="game__initial">' + esc(initial) + '</span>' +
          '<svg><use href="#mk-paw"/></svg>' +
        '</div>' +
        '<div class="game__body">' +
          '<div class="game__top">' +
            '<h3 class="game__name">' + esc(g.name) + '</h3>' +
            '<span class="chip ' + st.cls + '">' + esc(st.label) + '</span>' +
          '</div>' +
          '<dl class="game__meta">' +
            '<div><dt>장르</dt><dd>' + esc(g.genre) + '</dd></div>' +
            '<div><dt>플랫폼</dt><dd>' + esc(g.platform) + '</dd></div>' +
          '</dl>' +
          '<button class="game__del" type="button" data-del="' + esc(g.id) + '" aria-label="' + esc(g.name) + ' 삭제">삭제</button>' +
        '</div>' +
      '</div>';
  }

  /* 사진을 뗀 자리. 카드가 있던 그 칸에 들어서므로 되돌리기가 "무엇을"
     되돌리는지 위치가 말해준다 — 그리드 위에 얹히던 별도 바는 사라진 물건과
     떨어져 있어서 정작 그게 뭔지 설명이 필요했다. */
  function ghostCard(g, fresh) {
    return '' +
      '<div class="polaroid game game--ghost' + (fresh ? ' game--settling' : '') +
        '" data-card data-od-id="game-ghost">' +
        '<div class="game__thumb" aria-hidden="true"></div>' +
        '<div class="game__body">' +
          '<p class="game__ghost-msg">‘' + esc(g.name) + '’ 뗐어요.</p>' +
          '<button class="game__undo" type="button" data-undo data-od-id="undo-restore">되돌리기</button>' +
        '</div>' +
      '</div>';
  }

  function announce(msg) { if (statusEl) statusEl.textContent = msg; }

  // ---- 삭제 되돌리기 -------------------------------------------------------
  var pending   = null;  // { game, index } — 아직 확정되지 않은 삭제 한 건
  var undoTimer = null;
  /* 유령이 "방금" 생겼는지. render() 는 카드를 매번 새로 만들므로, 이 표시가
     없으면 되돌리기가 떠 있는 동안 필터를 누를 때마다 유령이 다시 가라앉는다 —
     아무 일도 안 났는데 일어났다고 말하는 모션이다. 삭제 직후 한 번만 켜고
     그 렌더에서 소비한다. */
  var ghostFresh = false;

  /* 유령이 들어설 자리를 현재 필터 기준으로 다시 센다. pending.index 는 삭제
     직전 state 에서의 위치인데, 그 앞쪽 원소들은 splice 후에도 그대로라 그중
     필터를 통과하는 개수가 곧 화면상의 위치다. 필터가 유령 자신을 걸러내면
     보여줄 자리가 없다(-1). */
  function ghostIndex() {
    if (filter !== 'all' && pending.game.status !== filter) return -1;
    var n = 0;
    for (var i = 0; i < pending.index && i < state.length; i++) {
      if (filter === 'all' || state[i].status === filter) n++;
    }
    return n;
  }

  function render(announceMsg) {
    var list = state.filter(function (g) { return filter === 'all' || g.status === filter; });
    var html = list.map(card);
    var gi = pending ? ghostIndex() : -1;
    if (gi !== -1) html.splice(gi, 0, ghostCard(pending.game, ghostFresh));
    // 켜졌든 아니든 여기서 끈다 — 이 렌더 한 번만 "방금"이다.
    ghostFresh = false;

    // innerHTML 로 통째로 갈아엎을 수 없다 — 붙이기 슬롯과 폼이 같은 그리드에
    // 정적 자식으로 산다. 카드만 걷어내고 뒤에 다시 붙인다.
    var old = grid.querySelectorAll('[data-card]');
    for (var k = 0; k < old.length; k++) old[k].parentNode.removeChild(old[k]);
    grid.insertAdjacentHTML('beforeend', html.join(''));

    // 유령도 칸을 차지하므로 빈 화면이 아니다. 카운트에는 안 넣는다 — 뗀 물건은
    // 이미 목록에서 빠졌고, 되돌리기 전까진 없는 게 사실이다.
    empty.hidden = html.length > 0;
    // 보드가 통째로 비었나(사용자가 다 지웠다), 아니면 필터가 걸러냈나.
    var boardEmpty = state.length === 0;
    if (emptyFor.board)  emptyFor.board.hidden  = !boardEmpty;
    if (emptyFor.filter) emptyFor.filter.hidden = boardEmpty;
    countEl.innerHTML = filter === 'all'
      ? '총 <b>' + state.length + '</b>개'
      : '<b>' + list.length + '</b> / ' + state.length + '개 표시';
    var chips = filters.querySelectorAll('[data-filter]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].setAttribute('aria-pressed', String(chips[i].getAttribute('data-filter') === filter));
    }
    if (announceMsg) announce(announceMsg);
  }

  function ghostBtn() { return grid.querySelector('[data-undo]'); }

  /* 포커스를 받을 요소가 사라졌을 때 보드로 되돌리는 자리. preventScroll 이
     필수다: 보드는 화면 하나를 통째로 차지하는 컨테이너라, 그냥 focus() 하면
     브라우저가 보드 top 을 뷰포트로 끌어온다. 페이지 맨 위에서 삭제하고
     되돌리면 화면이 저 혼자 아래로 내려가던 게 이거였다. 포커스는 여기 있어야
     맞지만 시선까지 옮길 이유는 없다. */
  function focusGrid() { grid.focus({ preventScroll: true }); }
  function clearUndoTimer() { if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; } }

  function forgetUndo() {
    clearUndoTimer();
    if (!pending) return;
    // 되돌리기 버튼에 포커스가 남은 채로 지우면 포커스가 <body> 로 떨어진다.
    var hadFocus = document.activeElement === ghostBtn();
    pending = null;
    render();
    if (hadFocus) focusGrid();
  }

  function armUndoTimer() {
    clearUndoTimer();
    // 자동 해제는 사용자가 이 버튼을 보고 있지 않을 때만. 되돌릴지 고민하는
    // 중에 시간이 다 됐다는 이유로 포커스를 빼앗는 건 예고 없는 맥락 전환이다.
    //
    // hasFocus() 가 함께 필요하다: 창이 백그라운드로 가도 activeElement 는 그
    // 버튼에 남는다. 버튼 조건만 보면 탭을 떠난 뒤에도 8초마다 영원히 재무장해
    // 아무도 안 보는 타이머 체인이 끝나지 않는다. 창을 떠난 사람은 고민 중이
    // 아니므로 그때는 확정한다.
    var tick = function () {
      if (document.hasFocus() && document.activeElement === ghostBtn()) {
        undoTimer = setTimeout(tick, 8000);
        return;
      }
      forgetUndo();
    };
    undoTimer = setTimeout(tick, 8000);
  }

  function doUndo() {
    if (!pending) return;
    var g = pending.game, at = Math.min(pending.index, state.length);
    state.splice(at, 0, g);
    save(state);
    clearUndoTimer();
    pending = null;
    render('‘' + g.name + '’ 복구했어요.');
    focusGrid();
  }

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

  // 삭제 · 되돌리기 — 둘 다 그리드 안에서 나므로 한 리스너가 받는다.
  grid.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    if (t.closest('[data-undo]')) { doUndo(); return; }

    var b = t.closest('[data-del]');
    if (!b) return;
    var id = b.getAttribute('data-del');
    var at = -1;
    for (var i = 0; i < state.length; i++) { if (state[i].id === id) { at = i; break; } }
    if (at < 0) return;
    var removed = state.splice(at, 1)[0];
    save(state);
    // 앞선 삭제가 아직 안 정해졌으면 그건 확정된다 — 유령은 한 번에 하나다.
    clearUndoTimer();
    pending = { game: removed, index: at };
    ghostFresh = true;   // 이 렌더의 유령만 가라앉는다
    render();
    // 누른 버튼이 방금 사라져 포커스가 <body> 로 떨어진다. 같은 자리에 들어선
    // 유령의 되돌리기로 넘기면 손이 있던 곳에 그대로 머문다.
    var gb = ghostBtn();
    // 유령은 방금 누른 삭제 버튼이 있던 자리라 이미 눈앞이다. 그래도 같은
    // 이유로 스크롤은 막는다 — 자리만 맞으면 됐지 화면이 움직일 일은 아니다.
    if (gb) gb.focus({ preventScroll: true }); else focusGrid();
    armUndoTimer();
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
    // 붙이는 순간 앞선 삭제는 확정된다 — 아래 render() 가 유령을 지운다.
    clearUndoTimer();
    pending = null;

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
    // 카드가 열려 있는 동안 바깥은 inert 라 #liveStatus 가 안 읽히고, 보드도
    // 스크림에 가려 새 카드가 내려앉는 게 안 보인다. 붙었다는 사실은 카드 안에서
    // 말한다 — 위 render() 의 인자는 닫은 뒤 화면을 읽는 경로를 위해 남긴다.
    addStatus.textContent = '‘' + g.name + '’ 붙였어요. 총 ' + state.length + '개.';
    nameIn.focus();
  });

  nameIn.addEventListener('input', function () {
    if (nameIn.value.trim()) { nameIn.removeAttribute('aria-invalid'); nameErr.hidden = true; }
  });

  // ---- 붙이기 카드 열기/닫기 -----------------------------------------------
  /* 빈 칸을 눌러 카드를 집어 들고, 붙이면 보드에 내려앉는다. showModal 이
     포커스 트랩·Esc·뒤 배경 inert·백드롭·닫을 때 포커스 복원까지 전부 맡으므로
     여기서 손으로 해야 하는 건 폼 상태를 비우는 것뿐이다. */
  addOpen.addEventListener('click', function () { dialog.showModal(); });
  addClose.addEventListener('click', function () { dialog.close(); });

  /* 바깥을 눌러 닫기는 showModal 이 주지 않는다 — 백드롭은 ::backdrop 이라
     따로 누를 요소가 없고, 백드롭 클릭은 다이얼로그 자신을 target 으로 온다.
     그래서 "target 이 dialog 면 닫기"로는 부족하다: 카드 안쪽이라도 패딩 위를
     누르면 똑같이 dialog 가 target 이라 카드가 자기 여백에서 닫힌다.
     좌표를 카드 사각형과 대조해 정말 바깥인지 본다.
     누른 곳과 뗀 곳을 둘 다 보는 이유: 입력값을 드래그로 선택하다 카드 밖에서
     손을 떼면 click 은 dialog 로 올라온다. 그때 닫으면 적던 게 사라진다. */
  function onBackdrop(e) {
    if (e.target !== dialog) return false;   // 자식 위였으면 자식이 target 이다
    var r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right ||
           e.clientY < r.top  || e.clientY > r.bottom;
  }
  var downOutside = false;
  dialog.addEventListener('pointerdown', function (e) { downOutside = onBackdrop(e); });
  dialog.addEventListener('click', function (e) {
    if (downOutside && onBackdrop(e)) dialog.close();
    downOutside = false;
  });

  // Esc 로도 닫히므로 버튼 경로와 별개로 여기서 비운다 — 다음에 열었을 때
  // 지난번 입력과 "붙였어요" 가 남아 있으면 안 된다.
  dialog.addEventListener('close', function () {
    form.reset();
    nameIn.removeAttribute('aria-invalid');
    nameErr.hidden = true;
    addStatus.textContent = '';
  });

  render();
}());
