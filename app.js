// 약꼬옥 — 기록은 이 기기 안(localStorage)에만 저장해요
const STORAGE_KEY = 'my-app-yakkok-records';
const PRODUCTS_KEY = 'my-app-yakkok-products';
const GOALS_KEY = 'my-app-yakkok-goals';
const DAY_START_HOUR = 4; // 하루는 새벽 4시에 바뀜

const SLOTS = [
  { id: 'morning', name: '아침', deadline: 10, deadlineText: '오전 10시',
    pills: ['유산균', '엽산', '철분', '비타민D', '비타민C', '코큐텐'] },
  { id: 'evening', name: '저녁', deadline: 20, deadlineText: '오후 8시',
    pills: ['비타민C', '비타민E', '오메가3'] },
  { id: 'bedtime', name: '자기 전', deadline: 22, deadlineText: '밤 10시',
    pills: ['멜라토닌'] },
];

// 화면 안에 직접 그리는 선 아이콘
const ICONS = {
  morning: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  evening: '<path d="M17 18a5 5 0 0 0-10 0M12 6v3M4.2 10.2l1.4 1.4M2 18h2M20 18h2M18.4 11.6l1.4-1.4M2 22h20"/>',
  bedtime: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 11 3.5 3.5 0 0 0 7 18z"/>',
  rain: '<path d="M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 8 3.5 3.5 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  snow: '<path d="M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 8 3.5 3.5 0 0 0 7 15z"/><path d="M8 19h.01M12 19h.01M16 19h.01M10 22h.01M14 22h.01"/>',
  storm: '<path d="M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 8 3.5 3.5 0 0 0 7 15z"/><path d="M13 15l-2.5 3.5h3.5L11.5 22"/>',
  fog: '<path d="M4 8h16M3 12h18M5 16h14M7 20h10"/>',
};
const icon = (name, extra = '') =>
  `<svg class="ic ic-${name} ${extra}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const FLAME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2s6 4.6 6 11a6 6 0 0 1-12 0c0-3 1.8-5 1.8-5s.7 2.6 3 3C10.4 7.2 12 2 12 2z"/></svg>';
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const $ = (id) => document.getElementById(id);

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch (e) {
    return {};
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    alertBox('기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');
  }
}

const loadRecords = () => load(STORAGE_KEY);
const saveRecords = (records) => save(STORAGE_KEY, records);

// 내가 입력한 글자를 화면에 안전하게 넣기
function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 새벽 4시 전이면 어제 날짜로 셈
function dayOf(date) {
  const d = new Date(date);
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

function keyOf(day) {
  const m = String(day.getMonth() + 1).padStart(2, '0');
  const d = String(day.getDate()).padStart(2, '0');
  return `${day.getFullYear()}-${m}-${d}`;
}

function timeText(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 하루 시작(새벽 4시)부터 몇 시간 지났는지 (밤 12시 넘어도 24, 25…로 셈)
function hoursIntoDay(now) {
  const h = now.getHours() + now.getMinutes() / 60;
  return h < DAY_START_HOUR ? h + 24 : h;
}

function isMissed(slot, now, record) {
  return !record[slot.id] && hoursIntoDay(now) >= slot.deadline;
}

// 지금 먹을 차례인 시간대 고르기
function currentSlot(now, record) {
  const h = hoursIntoDay(now);
  const nowIndex = h < 15 ? 0 : h < 21 ? 1 : 2;
  for (let i = nowIndex; i < SLOTS.length; i++) {
    if (!record[SLOTS[i].id]) return SLOTS[i];
  }
  for (let i = nowIndex - 1; i >= 0; i--) {
    if (!record[SLOTS[i].id]) return SLOTS[i];
  }
  return null;
}

function todayRecord() {
  return loadRecords()[keyOf(dayOf(new Date()))] || {};
}

function render() {
  const now = new Date();
  const today = dayOf(now);
  const todayKey = keyOf(today);
  const records = loadRecords();
  const record = records[todayKey] || {};

  // 인사말 · 날짜
  const h = hoursIntoDay(now);
  $('greet').textContent =
    h < 11 ? '좋은 아침이에요 ☀' : h < 17 ? '좋은 오후예요' : h < 21 ? '좋은 저녁이에요' : '편안한 밤 되세요 🌙';
  $('todayDate').textContent =
    `${today.getMonth() + 1}월 ${today.getDate()}일 (${WEEKDAYS[today.getDay()]})`;

  // 안 먹은 약 알림
  const missed = SLOTS.filter((s) => isMissed(s, now, record));
  const alert = $('alert');
  if (missed.length) {
    alert.hidden = false;
    alert.innerHTML =
      '<p class="alert-title">아직 안 먹었어요!</p>' +
      missed.map((s) =>
        `<p class="alert-item"><b>${s.name}</b> (${s.deadlineText} 지남) · ${s.pills.join(', ')}</p>`
      ).join('');
  } else {
    alert.hidden = true;
    alert.innerHTML = '';
  }

  // 오늘 몇 번
  const doneCount = SLOTS.filter((s) => record[s.id]).length;
  $('count').innerHTML = `오늘 <b>${doneCount}</b> / ${SLOTS.length}`;

  const current = currentSlot(now, record);

  // 지금 먹을 약: 한 줄에 하나씩
  if (current) {
    $('nowTitle').innerHTML = `${icon(current.id)} 지금 먹을 약 · ${current.name}`;
    $('pillList').className = `pill-list slot-${current.id}`;
    $('pillList').innerHTML = current.pills.map((p, i) => `<li class="pill-row">
        <span class="pill-no">${i + 1}</span>
        <span class="pill-name">${p}</span>
      </li>`).join('');
  } else {
    $('nowTitle').textContent = '지금 먹을 약';
    $('pillList').className = 'pill-list';
    $('pillList').innerHTML = '<li class="done-card">오늘 약을 다 먹었어요 💗</li>';
  }

  // 오늘의 루틴: 시간대 색 카드
  $('routine').innerHTML = SLOTS.map((s) => {
    const time = record[s.id];
    const miss = isMissed(s, now, record);
    const status = time
      ? `<span class="taken">${time} 먹음</span>`
      : miss ? '<span class="missed">안 먹음</span>' : '아직이에요';
    const right = time
      ? `<button type="button" class="btn-cancel" data-cancel="${s.id}">취소</button>`
      : '';
    return `<div class="routine-card slot-${s.id}${time ? ' done' : ''}">
      <span class="routine-ic">${icon(s.id)}</span>
      <div class="routine-body">
        <p class="routine-name">${s.name}</p>
        <p class="routine-sub">${s.pills.length}가지 · ${status}</p>
      </div>
      ${right}
      <span class="routine-check" aria-label="${time ? '먹음' : '안 먹음'}">${time ? icon('check') : ''}</span>
    </div>`;
  }).join('');

  // 연속 기록
  const streak = streakDays(records, today);
  const streakHtml = `<span class="streak-ic">${FLAME}</span>
    <div>
      ${streak
        ? `<p class="streak-num"><b>${streak}</b>일째 꼬박꼬박!</p>
           <p class="streak-sub">세 번 다 먹은 날이 이어지고 있어요</p>`
        : `<p class="streak-num">연속 기록을 시작해요</p>
           <p class="streak-sub">오늘 세 번 다 먹으면 1일째가 돼요</p>`}
    </div>`;
  $('streakHome').innerHTML = streakHtml;
  $('streakHistory').innerHTML = streakHtml;

  // 지난 7일 + 날짜별 기록
  let week = '';
  let history = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const r = records[keyOf(d)] || {};
    const label = i === 0 ? '오늘' : `${d.getMonth() + 1}/${d.getDate()}`;
    const done = SLOTS.filter((s) => r[s.id]).length;
    week += `<div class="day${i === 0 ? ' is-today' : ''}" aria-label="${label} ${done}번 먹음">
      <p class="day-label">${label}</p>
      <div class="dots">${SLOTS.map((s) => `<span class="dot${r[s.id] ? ' on' : ''}"></span>`).join('')}</div>
    </div>`;
    history = `<li>
      <p class="history-date">${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})${i === 0 ? ' · 오늘' : ''}</p>
      <div class="history-slots">${SLOTS.map((s) => r[s.id]
        ? `<span class="chip slot-${s.id}">${icon(s.id)}${s.name} ${r[s.id]}</span>`
        : `<span class="chip off">${s.name} —</span>`).join('')}</div>
    </li>` + history;
  }
  week += '<p class="week-legend">동그라미 위에서부터 아침 · 저녁 · 자기 전</p>';
  $('week').innerHTML = week;
  $('history').innerHTML = history;

  // 아래쪽 버튼
  $('bigArea').innerHTML = current
    ? `<button type="button" class="btn-big" data-take="${current.id}">
        <span class="big-main">${icon(current.id)}${current.name} 약 먹었어요</span>
        <span class="big-sub">${current.pills.join(', ')}</span>
      </button>`
    : '<div class="all-done">오늘 약을 다 먹었어요 💗</div>';

  $('smallRow').innerHTML = SLOTS
    .filter((s) => s !== current && !record[s.id])
    .map((s) => `<button type="button" class="btn-small" data-take="${s.id}">${icon(s.id)}${s.name} 먹었어요</button>`)
    .join('');

  renderNutri(record);
  fitDock();
}

// 세 번 다 먹은 날이 며칠 이어졌는지 (오늘 아직이면 어제부터 셈)
function streakDays(records, today) {
  const allDone = (d) => {
    const r = records[keyOf(d)] || {};
    return SLOTS.every((s) => r[s.id]);
  };
  const d = new Date(today);
  if (!allDone(d)) d.setDate(d.getDate() - 1);
  let count = 0;
  while (count < 3650 && allDone(d)) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

// 아래쪽 버튼 · 메뉴 막대 높이만큼 화면 아래에 여백
function fitDock() {
  document.documentElement.style.setProperty('--dock', `${$('dock').offsetHeight}px`);
}
window.addEventListener('resize', fitDock);

function take(slotId) {
  const now = new Date();
  const key = keyOf(dayOf(now));
  const records = loadRecords();
  records[key] = records[key] || {};
  records[key][slotId] = timeText(now);
  saveRecords(records);
  if (navigator.vibrate) navigator.vibrate(30);
  render();
}

// ───── 성분 · 목표 ─────

// 시간대마다 나오는 제품 (같은 제품은 한 번만)
function productList() {
  const list = [];
  SLOTS.forEach((s) => s.pills.forEach((p) => {
    let item = list.find((x) => x.name === p);
    if (!item) list.push(item = { name: p, slots: [] });
    item.slots.push(s.name);
  }));
  return list;
}

function toNumber(text) {
  const n = parseFloat(String(text ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fmt(n) {
  return Number(n.toFixed(2)).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

function cleanUnit(unit) {
  const u = String(unit || '').trim();
  return /^(mcg|ug|μg)$/i.test(u) ? 'µg' : u;
}

// 띄어쓰기 · 대소문자는 무시하고 같은 성분으로 봄
const nameKey = (name) => String(name).replace(/\s/g, '').toLowerCase();

// 하루 동안 들어가는 성분 하나하나 (시간대 · 제품 · 양)
function dailyEntries(record) {
  const products = load(PRODUCTS_KEY);
  const entries = [];
  SLOTS.forEach((s) => s.pills.forEach((p) => {
    (products[p] || []).forEach((ing) => {
      const name = String(ing.name || '').trim();
      const amount = toNumber(ing.amount);
      if (!name || amount === null) return;
      entries.push({ slot: s.name, product: p, name, amount, unit: cleanUnit(ing.unit), taken: !!record[s.id] });
    });
  }));
  return entries;
}

// 성분 + 단위로 묶기 (단위가 다르면 따로)
function groupTotals(entries) {
  const groups = [];
  entries.forEach((e) => {
    const key = `${nameKey(e.name)}|${e.unit}`;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push(g = { key, name: e.name, unit: e.unit, taken: 0, planned: 0 });
    g.planned += e.amount;
    if (e.taken) g.taken += e.amount;
  });
  return groups;
}

function goalText(g, goal) {
  const pct = Math.round((g.taken / goal) * 100);
  const u = esc(g.unit);
  let text;
  if (g.taken < goal) text = `목표의 ${pct}% · ${fmt(goal - g.taken)} ${u} 남았어요`;
  else if (g.taken === goal) text = '목표만큼 먹었어요';
  else text = `목표보다 ${fmt(g.taken - goal)} ${u} 많아요`;
  if (g.planned !== g.taken) {
    text += ` <span class="later">(다 먹으면 목표의 ${Math.round((g.planned / goal) * 100)}%)</span>`;
  }
  return text;
}

function renderNutri(record) {
  const entries = dailyEntries(record);
  const goals = load(GOALS_KEY);

  // 오늘 성분 합계 + 목표 비교
  const groups = groupTotals(entries);
  $('totals').innerHTML = groups.length
    ? groups.map((g) => {
        const goal = toNumber(goals[g.key]);
        const compare = goal
          ? `<div class="bar" aria-hidden="true"><span style="width:${Math.min(100, (g.taken / goal) * 100)}%"></span></div>
             <p class="total-goal">목표 ${fmt(goal)} ${esc(g.unit)} · ${goalText(g, goal)}</p>`
          : '';
        return `<div class="total">
          <div class="total-top">
            <span class="total-name">${esc(g.name)}</span>
            <span class="total-num"><b>${fmt(g.taken)}</b> / ${fmt(g.planned)} ${esc(g.unit)}</span>
          </div>
          ${compare}
        </div>`;
      }).join('')
    : '<p class="empty">아래 \'제품 함량 입력\'에 함량을 넣으면 여기에 합계가 나와요.</p>';

  // 겹치는 성분 (단위와 상관없이 이름이 같으면 겹침)
  const byName = [];
  entries.forEach((e) => {
    let o = byName.find((x) => x.key === nameKey(e.name));
    if (!o) byName.push(o = { key: nameKey(e.name), name: e.name, from: [] });
    o.from.push(e);
  });
  const overlaps = byName.filter((o) => o.from.length >= 2);
  $('overlaps').innerHTML = overlaps.length
    ? overlaps.map((o) => `<div class="overlap">
        <p><span class="overlap-name">${esc(o.name)}</span><span class="overlap-count">하루 ${o.from.length}번</span></p>
        <p class="overlap-from">${o.from.map((e) =>
          `${e.slot} ${esc(e.product)} ${fmt(e.amount)} ${esc(e.unit)}`).join(' · ')}</p>
      </div>`).join('')
    : `<p class="empty">${entries.length ? '겹치는 성분이 없어요.' : '함량을 넣으면 여기서 알려 드려요.'}</p>`;
}

function renderProductEditor() {
  const products = load(PRODUCTS_KEY);
  $('productEditor').innerHTML = productList().map((p) => {
    const rows = (products[p.name] || []).map((ing, i) => `<div class="ing-row">
        <input class="in-name" data-product="${esc(p.name)}" data-index="${i}" data-field="name"
          value="${esc(ing.name || '')}" placeholder="성분 이름" aria-label="${esc(p.name)} 성분 이름"
          autocomplete="off" enterkeyhint="next">
        <input class="in-amount" data-product="${esc(p.name)}" data-index="${i}" data-field="amount"
          value="${esc(ing.amount || '')}" placeholder="양 (숫자)" inputmode="decimal" aria-label="양"
          autocomplete="off" enterkeyhint="next">
        <input class="in-unit" data-product="${esc(p.name)}" data-index="${i}" data-field="unit"
          value="${esc(ing.unit || '')}" placeholder="단위 (mg 등)" list="units" aria-label="단위"
          autocomplete="off" enterkeyhint="done">
        <button type="button" class="btn-x" data-remove-ing="${esc(p.name)}" data-index="${i}" aria-label="이 성분 지우기">✕</button>
      </div>`).join('');
    return `<div class="product">
      <p class="product-name">${esc(p.name)}<span class="product-when">${p.slots.join(' · ')}</span></p>
      ${rows}
      <button type="button" class="btn-add" data-add-ing="${esc(p.name)}">+ 성분 추가</button>
    </div>`;
  }).join('');
}

function renderGoalEditor() {
  const goals = load(GOALS_KEY);
  const groups = groupTotals(dailyEntries({}));
  $('goalEditor').innerHTML = groups.length
    ? groups.map((g) => `<div class="goal-row">
        <span class="goal-name">${esc(g.name)}</span>
        <input data-goal="${esc(g.key)}" value="${esc(goals[g.key] || '')}" placeholder="목표" inputmode="decimal"
          autocomplete="off" enterkeyhint="done"
          aria-label="${esc(g.name)} 하루 목표">
        <span class="goal-unit">${esc(g.unit)}</span>
      </div>`).join('')
    : '<p class="empty">제품 함량을 먼저 넣으면 여기에 성분이 나와요.</p>';
}

function addIngredient(productName) {
  const products = load(PRODUCTS_KEY);
  const list = products[productName] || [];
  // 처음 넣을 때는 제품 이름을 성분 이름으로 미리 적어 둠 (고칠 수 있음)
  list.push({ name: list.length ? '' : productName, amount: '', unit: '' });
  products[productName] = list;
  save(PRODUCTS_KEY, products);
  renderProductEditor();
  const inputs = document.querySelectorAll(`[data-product="${CSS.escape(productName)}"][data-index="${list.length - 1}"]`);
  if (inputs.length) inputs[list.length === 1 ? 1 : 0].focus();
}

function removeIngredient(productName, index) {
  const products = load(PRODUCTS_KEY);
  const ing = (products[productName] || [])[index];
  const label = ing && ing.name ? `${productName}의 '${ing.name}'` : `${productName}의 이 성분`;
  askConfirm(`${label} 줄을 지워요.`, () => {
    const latest = load(PRODUCTS_KEY);
    (latest[productName] || []).splice(index, 1);
    if (latest[productName] && !latest[productName].length) delete latest[productName];
    save(PRODUCTS_KEY, latest);
    renderProductEditor();
    renderGoalEditor();
    renderNutri(todayRecord());
  });
}

$('productEditor').addEventListener('input', (e) => {
  const t = e.target;
  if (!t.dataset.field) return;
  const products = load(PRODUCTS_KEY);
  const row = (products[t.dataset.product] || [])[Number(t.dataset.index)];
  if (!row) return;
  row[t.dataset.field] = t.value;
  save(PRODUCTS_KEY, products);
  renderNutri(todayRecord());
});
// 입력을 마치면(칸에서 나가면) 목표 칸 목록을 새로 그림
$('productEditor').addEventListener('change', renderGoalEditor);

$('goalEditor').addEventListener('input', (e) => {
  const key = e.target.dataset.goal;
  if (!key) return;
  const goals = load(GOALS_KEY);
  if (e.target.value.trim()) goals[key] = e.target.value.trim();
  else delete goals[key];
  save(GOALS_KEY, goals);
  renderNutri(todayRecord());
});

// ───── 오늘의 날씨 (Open-Meteo: 무료 · 키 없음, 고른 도시 좌표만 보냄) ─────

const CITY_KEY = 'my-app-yakkok-city';
const WEATHER_KEY = 'my-app-yakkok-weather';
const WEATHER_FRESH_MS = 30 * 60 * 1000;

const CITIES = [
  ['서울', 37.5665, 126.978], ['부산', 35.1796, 129.0756], ['인천', 37.4563, 126.7052],
  ['대구', 35.8714, 128.6014], ['대전', 36.3504, 127.3845], ['광주', 35.1595, 126.8526],
  ['울산', 35.5384, 129.3114], ['세종', 36.48, 127.289], ['수원', 37.2636, 127.0286],
  ['춘천', 37.8813, 127.7298], ['강릉', 37.7519, 128.8761], ['청주', 36.6424, 127.489],
  ['전주', 35.8242, 127.148], ['창원', 35.228, 128.6811], ['포항', 36.019, 129.3435],
  ['제주', 33.4996, 126.5312],
].map(([name, lat, lon]) => ({ name, lat, lon }));

// 날씨 번호 → 글자 · 아이콘
function weatherInfo(code) {
  if (code === 0) return ['맑음', 'morning'];
  if (code <= 2) return ['구름 조금', 'cloud'];
  if (code === 3) return ['흐림', 'cloud'];
  if (code <= 48) return ['안개', 'fog'];
  if (code <= 67 || (code >= 80 && code <= 82)) return ['비', 'rain'];
  if (code <= 77 || code === 85 || code === 86) return ['눈', 'snow'];
  if (code >= 95) return ['천둥번개', 'storm'];
  return ['흐림', 'cloud'];
}

let weatherLoading = false;

function renderWeather(message) {
  const city = load(CITY_KEY);
  const box = $('weather');
  if (!city.name) {
    box.innerHTML = `<span class="weather-ic">${icon('cloud')}</span>
      <span class="weather-text">날씨를 보려면 <b>도시를 골라 주세요</b></span>`;
    return;
  }
  const w = load(WEATHER_KEY);
  if (w.city !== city.name || typeof w.temp !== 'number') {
    box.innerHTML = `<span class="weather-ic">${icon('cloud')}</span>
      <span class="weather-text">${esc(city.name)} · ${message || '날씨 불러오는 중…'}</span>`;
    return;
  }
  const [text, ic] = weatherInfo(w.code);
  const old = Date.now() - w.at > WEATHER_FRESH_MS;
  const at = new Date(w.at);
  box.innerHTML = `<span class="weather-ic">${icon(ic)}</span>
    <span class="weather-text">
      <span>${esc(city.name)} <b>${Math.round(w.temp)}°</b> · ${text}</span>
      <span class="weather-sub">최고 ${Math.round(w.max)}° / 최저 ${Math.round(w.min)}°${old ? ` · ${timeText(at)} 기준` : ''}</span>
    </span>`;
}

async function updateWeather(force) {
  const city = load(CITY_KEY);
  if (!city.name || weatherLoading) return renderWeather();
  const w = load(WEATHER_KEY);
  if (!force && w.city === city.name && Date.now() - w.at < WEATHER_FRESH_MS) return renderWeather();

  weatherLoading = true;
  renderWeather();
  try {
    const url = 'https://api.open-meteo.com/v1/forecast'
      + `?latitude=${city.lat}&longitude=${city.lon}`
      + '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min'
      + '&timezone=auto&forecast_days=1';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    save(WEATHER_KEY, {
      city: city.name,
      at: Date.now(),
      temp: data.current.temperature_2m,
      code: data.current.weather_code,
      max: data.daily.temperature_2m_max[0],
      min: data.daily.temperature_2m_min[0],
    });
    weatherLoading = false;
    renderWeather();
  } catch (e) {
    weatherLoading = false;
    // 못 받아오면 마지막 날씨를 그대로 보여 줌
    renderWeather('날씨를 못 불러왔어요 (눌러서 다시)');
  }
}

function openCityDialog() {
  const city = load(CITY_KEY);
  $('cityGrid').innerHTML = CITIES.map((c, i) =>
    `<button type="button" class="city-btn${c.name === city.name ? ' is-on' : ''}" data-city="${i}">${c.name}</button>`
  ).join('');
  $('cityResults').innerHTML = '';
  $('cityQuery').value = '';
  $('cityDialog').hidden = false;
}

function chooseCity(c) {
  save(CITY_KEY, { name: c.name, lat: c.lat, lon: c.lon });
  $('cityDialog').hidden = true;
  updateWeather(true);
}

let searchResults = [];

$('citySearch').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('cityQuery').value.trim();
  if (!q) return;
  $('cityResults').innerHTML = '<p class="empty">찾는 중…</p>';
  try {
    const url = 'https://geocoding-api.open-meteo.com/v1/search'
      + `?name=${encodeURIComponent(q)}&count=6&language=ko&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    searchResults = (data.results || []).map((r) => ({
      name: r.name, lat: r.latitude, lon: r.longitude,
      where: [r.admin1, r.country].filter(Boolean).join(', '),
    }));
    $('cityResults').innerHTML = searchResults.length
      ? searchResults.map((r, i) => `<button type="button" class="city-result" data-result="${i}">
          ${esc(r.name)}<small>${esc(r.where)}</small></button>`).join('')
      : '<p class="empty">찾는 도시가 없어요. 다른 이름으로 해 보세요.</p>';
  } catch (err) {
    $('cityResults').innerHTML = '<p class="empty">찾지 못했어요. 인터넷 연결을 확인해 주세요.</p>';
  }
});

$('weather').addEventListener('click', () => {
  const w = load(WEATHER_KEY);
  const city = load(CITY_KEY);
  // 못 불러온 상태면 다시 받아오고, 아니면 도시 고르기
  if (city.name && w.city !== city.name && !weatherLoading) return updateWeather(true);
  openCityDialog();
});
$('cityGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-city]');
  if (b) chooseCity(CITIES[Number(b.dataset.city)]);
});
$('cityResults').addEventListener('click', (e) => {
  const b = e.target.closest('[data-result]');
  if (b) chooseCity(searchResults[Number(b.dataset.result)]);
});
$('cityClose').addEventListener('click', () => { $('cityDialog').hidden = true; });
$('cityDialog').addEventListener('click', (e) => { if (e.target.id === 'cityDialog') $('cityDialog').hidden = true; });

// ───── 탭 ─────

function showTab(name) {
  document.querySelectorAll('.nav-btn').forEach((t) => {
    const on = t.dataset.tab === name;
    t.classList.toggle('is-on', on);
    if (on) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  $('viewHome').hidden = name !== 'home';
  $('take').hidden = name !== 'home';
  $('viewNutri').hidden = name !== 'nutri';
  $('viewHistory').hidden = name !== 'history';
  fitDock();
  if (name === 'nutri') {
    renderProductEditor();
    renderGoalEditor();
    renderNutri(todayRecord());
  }
  window.scrollTo(0, 0);
}

// ───── 정말 지울까요? ─────

let pendingConfirm = null;

function askConfirm(text, onYes) {
  pendingConfirm = onYes;
  $('dialogText').textContent = text;
  $('dialog').hidden = false;
  $('dialogNo').focus();
}

function closeDialog() {
  pendingConfirm = null;
  $('dialog').hidden = true;
}

function askCancel(slotId) {
  const slot = SLOTS.find((s) => s.id === slotId);
  askConfirm(`오늘 ${slot.name} 기록을 지워요.`, () => {
    const key = keyOf(dayOf(new Date()));
    const records = loadRecords();
    if (records[key]) {
      delete records[key][slotId];
      saveRecords(records);
    }
    render();
  });
}

function alertBox(message) {
  const alert = $('alert');
  alert.hidden = false;
  alert.innerHTML = `<p class="alert-title">${message}</p>`;
}

document.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) return showTab(tabBtn.dataset.tab);
  const takeBtn = e.target.closest('[data-take]');
  if (takeBtn) return take(takeBtn.dataset.take);
  const cancelBtn = e.target.closest('[data-cancel]');
  if (cancelBtn) return askCancel(cancelBtn.dataset.cancel);
  const addBtn = e.target.closest('[data-add-ing]');
  if (addBtn) return addIngredient(addBtn.dataset.addIng);
  const removeBtn = e.target.closest('[data-remove-ing]');
  if (removeBtn) return removeIngredient(removeBtn.dataset.removeIng, Number(removeBtn.dataset.index));
});
$('dialogNo').addEventListener('click', closeDialog);
$('dialogYes').addEventListener('click', () => {
  const onYes = pendingConfirm;
  closeDialog();
  if (onYes) onYes();
});
$('dialog').addEventListener('click', (e) => { if (e.target.id === 'dialog') closeDialog(); });

// 앱을 다시 볼 때마다, 그리고 1분마다 화면을 새로 그림
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  render();
  updateWeather();
});
setInterval(() => { render(); updateWeather(); }, 60 * 1000);
render();
updateWeather();

// 서비스 워커: 새 버전이 적용되면 화면을 한 번 자동으로 새로고침
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => reg.update()).catch(() => {});
  });
}
