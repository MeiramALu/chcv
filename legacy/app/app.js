// МнемоСурет — негізгі логика
const $ = (s) => document.querySelector(s);
const KEY = 'mnemosuret.v1';

// ---------- сақтау ----------
const DEFAULT_SETTINGS = { syllables: true, firstLetter: true, autoSpeak: true, bigFont: false, rate: 0.8, elKey: '', elVoice: '' };
let db = load();
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d) return { settings: { ...DEFAULT_SETTINGS, ...d.settings }, sessions: d.sessions || [], gallery: d.gallery || [], stars: d.stars || 0 };
  } catch (e) {}
  return { settings: { ...DEFAULT_SETTINGS }, sessions: [], gallery: [], stars: 0 };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }

// ---------- күй ----------
const sel = {};          // slotId -> card
let active = 0;          // белсенді қадам
let mode = 'create';     // 'learn' | 'create'
let sess = newSess();
function newSess() { return { start: Date.now(), cards: 0, typed: 0, fixes: 0, voice: 0, hints: 0 }; }

// ---------- дыбыс ----------
// Реті: 1) алдын ала жасалған ElevenLabs файлдары (audio/, tools/tts_build.mjs),
// 2) ElevenLabs API — баптауда кілт болса (нәтиже кэштеледі), 3) сөйлемді сөз-сөзімен файлдардан, 4) браузер дауысы.
const player = new Audio();
let speakSeq = 0, liveUrl = null;
const norm = (t) => t.trim().toLowerCase();
const clip = (t) => window.AUDIO && window.AUDIO[norm(t)] ? 'audio/' + window.AUDIO[norm(t)] : null;

function playUrl(url, my) {
  return new Promise((ok, bad) => {
    if (my !== speakSeq) return bad(new Error('cancel'));
    player.src = url;
    player.playbackRate = Math.min(1.4, Math.max(0.6, (+db.settings.rate || 0.8) / 0.8));
    player.onended = ok; player.onerror = bad;
    player.play().catch(bad);
  });
}

async function elevenUrl(text) {
  const key = db.settings.elKey, voice = db.settings.elVoice || 'EXAVITQu4vr4xnSDxMaL';
  if (!key) return null;
  const cacheKey = `https://tts.cache/${voice}/${encodeURIComponent(norm(text))}`;
  const cache = window.caches ? await caches.open('mnemo-tts').catch(() => null) : null;
  let res = cache && await cache.match(cacheKey);
  if (!res) {
    res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_v3', language_code: 'kk' }),
    });
    if (!res.ok) { console.warn('ElevenLabs', res.status, await res.text()); return null; }
    if (cache) await cache.put(cacheKey, res.clone()).catch(() => {});
  }
  if (liveUrl) URL.revokeObjectURL(liveUrl);
  return (liveUrl = URL.createObjectURL(await res.blob()));
}

async function speak(text, parts) {
  if (!text) return;
  const my = ++speakSeq;
  player.pause();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  try {
    const f = clip(text);
    if (f) return await playUrl(f, my);
    const live = await elevenUrl(text);
    if (live) return await playUrl(live, my);
    if (parts && parts.length && parts.every(clip)) { for (const p of parts) await playUrl(clip(p), my); return; }
  } catch (e) { if (my !== speakSeq) return; }
  if (my === speakSeq) browserSpeak(text);
}

function browserSpeak(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  const vs = speechSynthesis.getVoices();
  const v = vs.find(v => v.lang.startsWith('kk')) || vs.find(v => v.lang.startsWith('ru'));
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'kk-KZ';
  u.rate = +db.settings.rate || 0.8;
  speechSynthesis.speak(u);
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2200);
}
function addStars(n) { db.stars += n; save(); $('#starCount').textContent = db.stars; }

// ---------- сөзді көрсету (буын + бірінші әріп) ----------
function wordHTML(card, color) {
  const s = db.settings;
  const txt = s.syllables ? card.syl : card.k;
  if (!s.firstLetter) return esc(txt);
  return `<span class="fl" style="color:${color}">${esc(txt[0])}</span>${esc(txt.slice(1))}`;
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ---------- кемпірқосақ жолы ----------
function renderRoad() {
  $('#road').innerHTML = SLOTS.map((s, i) => {
    const c = sel[s.id];
    const locked = mode === 'learn' && i > firstEmpty();
    const cls = ['slot', i === active && 'active', c && 'filled done', locked && 'locked'].filter(Boolean).join(' ');
    return `<div class="${cls}" data-i="${i}" style="--c:${s.color}">
      <span class="num">${i + 1}</span>
      <span class="mas">${s.mascot}</span>
      <div><div class="qq">${s.q}</div>
      <div class="val">${c ? `<span class="e">${c.e}</span>${esc(c.k)}` : '<span class="empty">таңдалмаған</span>'}</div></div>
      ${c ? '<span class="ok"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>' : ''}
    </div>`;
  }).join('');
  document.querySelectorAll('.slot').forEach(el => el.onclick = () => {
    if (el.classList.contains('locked')) { toast('Алдымен алдыңғы қадамды толтырыңыз'); return; }
    active = +el.dataset.i; renderAll();
  });
}
function stepLabel(i) { return `${i + 1}-қадам.`; }
function firstEmpty() { const i = SLOTS.findIndex(s => !sel[s.id]); return i < 0 ? SLOTS.length - 1 : i; }

function renderGuide() {
  const s = SLOTS[active];
  const done = SLOTS.every(x => sel[x.id]);
  $('#guideMascot').textContent = done ? '✓' : s.mascot;
  $('#guideText').innerHTML = done
    ? 'Барлық бес қадам толтырылды. Енді <b>«Сурет салу»</b> батырмасын басыңыз.'
    : `<b style="color:${s.color}">${stepLabel(active)}</b> ${esc(s.rhyme)}`;
}

function renderCards() {
  const s = SLOTS[active];
  $('#cards').innerHTML = CARDS[s.id].map((c, j) => {
    const on = sel[s.id] === c;
    return `<button class="card ${on ? 'sel' : ''}" data-j="${j}" style="--c:${s.color};--cs:${s.soft}">
      <div class="e">${c.e}</div><div class="w">${wordHTML(c, s.color)}</div></button>`;
  }).join('');
  document.querySelectorAll('.card').forEach(el => el.onclick = () => pick(s, CARDS[s.id][+el.dataset.j]));
}

function pick(slot, card, how = 'card') {
  const wasEmpty = !sel[slot.id];
  sel[slot.id] = card;
  sess.cards++;
  if (db.settings.autoSpeak) speak(card.k);
  if (mode === 'learn' && wasEmpty) addStars(1);
  const next = SLOTS.findIndex((s, i) => i > SLOTS.indexOf(slot) && !sel[s.id]);
  if (next >= 0) active = next; else { const e = SLOTS.findIndex(s => !sel[s.id]); if (e >= 0) active = e; }
  renderAll();
}

// ---------- сөйлем ----------
function sentenceParts() {
  const p = [];
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  const add = (id, text) => { const s = SLOTS.find(x => x.id === id); p.push({ s, text, e: sel[id]?.e }); };
  if (sel.who) add('who', cap(sel.who.k));
  if (sel.where) add('where', sel.where.loc);
  if (sel.act) add('act', sel.act.k);
  if (sel.look) add('look', sel.look.k);
  if (sel.style) add('style', sel.style.k);
  return p;
}
function renderSentence() {
  const p = sentenceParts();
  $('#sentence').innerHTML = p.length
    ? p.map(x => `<span class="wd" style="background:${x.s.soft};border-color:${x.s.color}">${esc(x.text)}</span>`).join(' ')
    : '<span class="ph">Карточкаларды таңдаңыз — сөйлем автоматты түрде құралады</span>';
  $('#genBtn').disabled = !(sel.who && sel.act);
  $('#promptEn').textContent = buildPrompt() || '—';
}
function buildPrompt() {
  if (!sel.who) return '';
  return [[sel.who?.en, sel.act?.en, sel.where?.en].filter(Boolean).join(' '), sel.look?.en, sel.style?.en, SAFE_SUFFIX]
    .filter(Boolean).join(', ');
}

// ---------- қатемен жазуды түсіну (дисграфияға бейім іздеу) ----------
const FOLD = { 'ә': 'а', 'ө': 'о', 'ұ': 'у', 'ү': 'у', 'қ': 'к', 'ғ': 'г', 'ң': 'н', 'һ': 'х', 'і': 'и', 'ы': 'и', 'й': 'и', 'ё': 'е', 'э': 'е', 'ъ': '', 'ь': '' };
const MIRROR = { 'б': 'д', 'д': 'б', 'п': 'б', 'ш': 'щ', 'щ': 'ш', 'з': 'с', 'с': 'з' }; // жиі шатастырылатын әріптер
function fold(w) { return w.toLowerCase().replace(/[^a-zа-яәөұүқғңһіё ]/g, '').split('').map(c => FOLD[c] ?? c).join(''); }
function lev(a, b) {
  // Дамерау–Левенштейн: айна әріптер (б/д) мен орын ауыстыру «жартылай қате»
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const sub = a[i - 1] === b[j - 1] ? 0 : (MIRROR[a[i - 1]] === b[j - 1] ? 0.5 : 1);
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + sub);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 0.5);
  }
  return d[m][n];
}
function fuzzyFind(input) {
  const q = fold(input.trim());
  if (q.length < 2) return [];
  const res = [];
  SLOTS.forEach(s => CARDS[s.id].forEach(c => {
    const cands = [c.k, c.loc].filter(Boolean).map(fold);
    let d = Math.min(...cands.map(w => lev(q, w)));
    if (cands.some(w => w.startsWith(q))) d = Math.min(d, 0.3);
    const tol = Math.max(1, Math.floor(c.k.length / 3));
    if (d <= tol) res.push({ s, c, d });
  }));
  return res.sort((a, b) => a.d - b.d).slice(0, 5);
}
function renderSuggest(text, fromVoice = false) {
  const words = text.split(/\s+/).filter(Boolean);
  const found = [];
  // бір сөз де, бүкіл фраза да тексеріледі
  [text, ...words].forEach(w => fuzzyFind(w).forEach(r => { if (!found.some(f => f.c === r.c)) found.push({ ...r, typed: w }); }));
  const box = $('#suggest');
  if (!text.trim()) { box.innerHTML = ''; return; }
  if (!found.length) { box.innerHTML = '<div class="sg-label">Сәйкес сөз табылмады. Басқаша жазып көріңіз немесе карточканы таңдаңыз.</div>'; return; }
  box.innerHTML = `<div class="sg-label">${fromVoice ? 'Танылған сөз' : 'Ұсынылатын сөздер'}:</div>` +
    found.slice(0, 5).map((r, i) => {
      const exact = fold(r.typed) === fold(r.c.k);
      return `<button class="chip" data-i="${i}" style="border-color:${r.s.color};color:${r.s.color}">
        ${!exact && !fromVoice ? `<span class="typo">${esc(r.typed)}</span> →` : ''} ${r.c.e} ${esc(r.c.k)}</button>`;
    }).join('');
  box.querySelectorAll('.chip').forEach(el => el.onclick = () => {
    const r = found[+el.dataset.i];
    if (fold(r.typed) !== fold(r.c.k)) sess.fixes++;
    fromVoice ? sess.voice++ : sess.typed++;
    $('#typeInput').value = ''; box.innerHTML = '';
    active = SLOTS.indexOf(r.s);
    pick(r.s, r.c, fromVoice ? 'voice' : 'typed');
    toast(`«${r.c.k}» сөзі қосылды`);
  });
}

// ---------- дауыспен енгізу ----------
function initMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $('#micBtn');
  if (!SR) { btn.onclick = () => toast('Браузер дауыстық енгізуді қолдамайды (Chrome ұсынылады)'); return; }
  const rec = new SR(); rec.lang = 'kk-KZ'; rec.interimResults = false;
  rec.onresult = (e) => { const t = e.results[0][0].transcript; $('#typeInput').value = t; renderSuggest(t, true); };
  rec.onend = () => btn.classList.remove('rec');
  rec.onerror = () => { btn.classList.remove('rec'); toast('Дауыс танылмады, қайталап көріңіз'); };
  btn.onclick = () => { btn.classList.add('rec'); try { rec.start(); } catch (e) {} };
}

// ---------- сурет генерациясы ----------
function imageUrl(prompt, seed) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&seed=${seed}`;
}
function offlineCanvas(item) {
  // желі болмаса — эмодзилерден жергілікті «эскиз»
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d');
  const col = SLOTS[3].color, base = item.look ? (SLOTS.find(s => s.id === 'look').soft) : '#EEF0FA';
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, base); gr.addColorStop(1, '#fff');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '200px serif'; g.fillText(item.where?.e || '🌈', 256, 330);
  g.font = '170px serif'; g.fillText(item.who?.e || '⭐', 256, 230);
  g.font = '90px serif'; g.fillText(item.act?.e || '', 420, 110); g.fillText(item.look?.e || '', 90, 110);
  g.fillStyle = col; return cv;
}
function showImage(container, item, onDone) {
  const img = new Image();
  let settled = false;
  const fail = () => {
    if (settled) return; settled = true;
    container.innerHTML = ''; container.appendChild(offlineCanvas(item));
    container.insertAdjacentHTML('beforeend', '<span class="badge-off">Офлайн эскиз</span>');
    onDone && onDone(false);
  };
  // тегін сервисте лимит бар: қате болса 3 рет қайталаймыз, сосын офлайн эскиз
  let tries = 0;
  const timer = setTimeout(fail, 120000);
  img.onload = () => { if (settled) return; settled = true; clearTimeout(timer); container.innerHTML = ''; container.appendChild(img); onDone && onDone(true); };
  img.onerror = () => {
    if (++tries <= 3 && /^https?:/.test(item.url)) { setTimeout(() => { img.src = item.url + '&try=' + tries; }, 12000); return; }
    clearTimeout(timer); fail();
  };
  img.alt = item.text || '';
  img.src = item.url;
}

function generate() {
  const prompt = buildPrompt(); if (!prompt) return;
  const seed = Math.floor(Math.random() * 99999);
  const item = {
    ts: Date.now(), url: imageUrl(prompt, seed), prompt,
    text: sentenceParts().map(p => p.text).join(' '),
    chips: sentenceParts().map(p => ({ c: p.s.color, t: `${p.e} ${p.text}` })),
    who: sel.who, where: sel.where, act: sel.act, look: sel.look,
  };
  const r = $('#result');
  r.innerHTML = '<div class="loader"><div class="bar"></div>Сурет генерациялануда…</div>';
  $('#genBtn').disabled = true;
  speak(item.text, sentenceParts().map(p => p.text));
  showImage(r, item, (ok) => {
    $('#genBtn').disabled = false;
    db.gallery.unshift(item); db.gallery = db.gallery.slice(0, 40);
    db.sessions.push({
      ts: Date.now(), sec: Math.round((Date.now() - sess.start) / 1000), filled: Object.keys(sel).length,
      cards: sess.cards, typed: sess.typed, fixes: sess.fixes, voice: sess.voice, ok,
      ids: Object.values(sel).map(c => c.k),
    });
    addStars(3); save();
    toast('Сурет сақталды (+3 ұпай)');
    sess = newSess();
  });
}

// ---------- галерея ----------
function renderGallery() {
  const g = $('#gallery');
  if (!db.gallery.length) { g.innerHTML = '<div class="g-empty">Әзірге сурет жоқ. «Жасау» бөліміне өтіңіз.</div>'; return; }
  g.innerHTML = db.gallery.map((it, i) => `<div class="g-item"><div class="im" data-i="${i}"></div>
    <div class="meta">${(it.chips || []).map(c => `<span class="tag" style="border-color:${c.c}">${esc(c.t.replace(/^\S+\s/, ''))}</span>`).join('')}</div></div>`).join('');
  g.querySelectorAll('.im').forEach(el => showImage(el, db.gallery[+el.dataset.i]));
}

// ---------- мұғалім панелі ----------
let charts = [];
function renderTeacher() {
  const S = db.sessions;
  const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const fixes = S.reduce((a, s) => a + s.fixes, 0);
  const voice = S.reduce((a, s) => a + s.voice, 0);
  $('#kpis').innerHTML = [
    [S.length, 'Салынған суреттер'],
    [Math.round(avg(S.map(s => s.sec))) + ' с', 'Сөйлем құраудың орташа уақыты'],
    [fixes, 'Автоматты түзетілген сөздер'],
    [db.stars, 'Жиналған ұпай'],
  ].map(([v, l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');
  document.querySelectorAll('[data-set]').forEach(el => {
    const k = el.dataset.set; if (el.type === 'checkbox') el.checked = !!db.settings[k]; else el.value = db.settings[k];
  });
  if (!window.Chart) return;
  charts.forEach(c => c.destroy()); charts = [];
  Chart.defaults.font.family = 'Inter, Segoe UI, sans-serif'; Chart.defaults.font.size = 13; Chart.defaults.color = '#5A6275';
  // күндер
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push(d); }
  const dayKey = (t) => new Date(t).toDateString();
  const lbl = days.map(d => `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`);
  const cnt = days.map(d => S.filter(s => dayKey(s.ts) === d.toDateString()).length);
  const tim = days.map(d => { const a = S.filter(s => dayKey(s.ts) === d.toDateString()).map(s => s.sec); return a.length ? Math.round(avg(a)) : null; });
  const grid = { color: '#EEF0F6' };
  charts.push(new Chart($('#chDaily'), { type: 'bar', data: { labels: lbl, datasets: [{ data: cnt, backgroundColor: '#1F2A44', borderRadius: 3, maxBarThickness: 26 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid, ticks: { precision: 0 } } } } }));
  charts.push(new Chart($('#chTime'), { type: 'line', data: { labels: lbl, datasets: [{ data: tim, borderColor: '#3C6E9F', backgroundColor: '#3C6E9F', tension: .3, spanGaps: true, pointRadius: 3 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid, beginAtZero: true } } } }));
  const cardsSum = S.reduce((a, s) => a + Math.max(0, s.cards - s.typed - s.voice), 0);
  const typed = S.reduce((a, s) => a + s.typed, 0);
  charts.push(new Chart($('#chInput'), { type: 'doughnut', data: { labels: ['Карточка', 'Жазу (түзетумен)', 'Дауыс'], datasets: [{ data: [cardsSum, typed, voice], backgroundColor: ['#1F2A44', '#3C6E9F', '#9FB4CF'], borderWidth: 0 }] },
    options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { boxWidth: 14, font: { size: 14, weight: 700 } } } } } }));
  const freq = {};
  S.forEach(s => (s.ids || []).forEach(k => freq[k] = (freq[k] || 0) + 1));
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const colorOf = (k) => (SLOTS.find(s => CARDS[s.id].some(c => c.k === k)) || SLOTS[0]).color;
  charts.push(new Chart($('#chTop'), { type: 'bar', data: { labels: top.map(t => t[0]), datasets: [{ data: top.map(t => t[1]), backgroundColor: top.map(t => colorOf(t[0])), borderRadius: 3 }] },
    options: { indexAxis: 'y', maintainAspectRatio: false, layout: { padding: { left: 12 } }, plugins: { legend: { display: false } }, scales: { x: { grid, ticks: { precision: 0 } }, y: { grid: { display: false }, ticks: { font: { size: 14, weight: 700 } } } } } }));
}

// ---------- басты бет ----------
function renderHome() {
  const roles = ['кейіпкер', 'орын', 'әрекет', 'түс, көңіл-күй', 'көркем стиль'];
  $('#homeRoad').innerHTML = SLOTS.map((s, i) => `<div class="m-row">
    <span class="n" style="background:${s.color}">${i + 1}</span><span class="m">${s.mascot}</span>
    <span class="q" style="color:${s.color}">${s.q}</span><span class="r">${roles[i]}</span></div>`).join('');
}

// ---------- маршрутизатор ----------
function renderAll() { renderRoad(); renderGuide(); renderCards(); renderSentence(); }
function route() {
  const r = (location.hash || '#home').slice(1);
  const view = r === 'learn' ? 'create' : r;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + view));
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.r === r));
  if (view === 'create') {
    const newMode = r === 'learn' ? 'learn' : 'create';
    if (newMode !== mode && newMode === 'learn') { Object.keys(sel).forEach(k => delete sel[k]); active = 0; }
    mode = newMode; renderAll();
  }
  if (view === 'gallery') renderGallery();
  if (view === 'teacher') renderTeacher();
  if (view === 'home') renderHome();
}

// ---------- іске қосу ----------
function applySettings() { document.body.classList.toggle('big', !!db.settings.bigFont); }
function init() {
  if (new URLSearchParams(location.search).has('demo')) seedDemo();
  applySettings();
  $('#starCount').textContent = db.stars;
  $('#genBtn').onclick = generate;
  $('#sayBtn').onclick = () => { const t = sentenceParts().map(p => p.text); speak(t.join(' '), t); };
  $('#guideSay').onclick = () => { sess.hints++; speak($('#guideText').textContent); };
  $('#clearBtn').onclick = () => { Object.keys(sel).forEach(k => delete sel[k]); active = 0; $('#result').innerHTML = '<div class="result-empty">Нәтиже осы жерде көрсетіледі</div>'; renderAll(); };
  $('#typeInput').oninput = (e) => renderSuggest(e.target.value);
  $('#resetBtn').onclick = () => { db.sessions = []; db.gallery = []; db.stars = 0; save(); $('#starCount').textContent = 0; renderTeacher(); toast('Статистика тазаланды'); };
  document.querySelectorAll('[data-set]').forEach(el => el.onchange = () => {
    db.settings[el.dataset.set] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value.trim(); save(); applySettings(); toast('Баптау сақталды');
  });
  initMic();
  window.onhashchange = route;
  route();
  const p = new URLSearchParams(location.search);
  if (p.has('type')) { $('#typeInput').value = p.get('type'); renderSuggest(p.get('type')); }
  if (p.has('gen')) generate();
}

// ---------- демо деректер (көрсетілім мен скриншот үшін) ----------
function seedDemo() {
  const P = new URLSearchParams(location.search);
  let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const pickC = (id) => CARDS[id][Math.floor(rnd() * CARDS[id].length)];
  db = { settings: { ...DEFAULT_SETTINGS }, sessions: [], gallery: [], stars: 0 };
  for (let d = 13; d >= 0; d--) {
    const n = 1 + Math.floor(rnd() * 4) + (d < 6 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const day = new Date(); day.setDate(day.getDate() - d); day.setHours(10 + k, 0, 0, 0);
      const progress = (13 - d) / 13;
      const typed = rnd() < 0.2 + progress * 0.3 ? 1 + Math.floor(rnd() * 2) : 0;
      db.sessions.push({
        ts: +day, sec: Math.round(95 - 55 * progress + rnd() * 18), filled: 5, cards: 5 + Math.floor(rnd() * 3),
        typed, fixes: Math.min(typed, Math.round(typed * (0.6 + rnd() * 0.4))), voice: rnd() < 0.25 ? 1 : 0, ok: true,
        ids: ['who', 'where', 'act', 'look', 'style'].map(id => pickC(id).k),
      });
    }
  }
  db.stars = db.sessions.length * 3 + 15;
  const demoSets = [
    ['мысық', 'ғарыш', 'ұшады', 'кемпірқосақ', 'мультфильм', 11],
    ['айдаһар', 'сарай', 'ұйықтайды', 'түнгі', 'ертегі', 22],
    ['түйе', 'дала', 'жүгіреді', 'күнгі', 'акварель', 33],
    ['робот', 'бақ', 'сурет салады', 'көңілді', 'көлемді', 44],
    ['аю', 'орман', 'оқиды', 'күзгі', 'балауыз', 55],
    ['ат', 'тау', 'жүгіреді', 'қысқы', 'қарындаш', 66],
    ['қыз', 'киіз үй', 'ән салады', 'алтын', 'ертегі', 77],
    ['ит', 'теңіз', 'жүзеді', 'көк', 'пиксель', 88],
  ];
  const find = (id, k) => CARDS[id].find(c => c.k === k);
  demoSets.forEach(([w, wh, a, l, st, seed]) => {
    Object.keys(sel).forEach(k => delete sel[k]);
    sel.who = find('who', w); sel.where = find('where', wh); sel.act = find('act', a); sel.look = find('look', l); sel.style = find('style', st);
    const prompt = buildPrompt();
    db.gallery.push({ ts: Date.now(), url: `demo/${db.gallery.length + 1}.jpg`, prompt, text: sentenceParts().map(p => p.text).join(' '),
      chips: sentenceParts().map(p => ({ c: p.s.color, t: `${p.e} ${p.text}` })), who: sel.who, where: sel.where, act: sel.act, look: sel.look });
  });
  Object.keys(sel).forEach(k => delete sel[k]);
  // ?fill=3 — алғашқы N қадамды толтырып қою
  const fill = +(P.get('fill') || 0);
  demoSets[0].slice(0, fill).forEach((k, i) => { const s = SLOTS[i]; sel[s.id] = find(s.id, k); });
  active = Math.min(fill, 4);
  if (P.has('big')) db.settings.bigFont = true;
  db.settings.autoSpeak = false;
  save();
}

init();
