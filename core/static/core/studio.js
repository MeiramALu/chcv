// МнемоСурет — «Үйрену» және «Жасау» беттері
(() => {
  const { $, toast, post, speak, preload, sketch, esc } = Mnemo;
  const D = JSON.parse($('#mnemo-data').textContent);
  const P = JSON.parse($('#mnemo-prefs').textContent);
  const SLOTS = D.slots, CARDS = D.cards, PH = D.phrases;
  const MODE = window.MNEMO_MODE;

  const sel = {};          // slotId -> card
  let active = 0;          // белсенді қадам
  let busy = false;
  let sess = newSess();
  function newSess() { return { start: Date.now(), cards: 0, typed: 0, fixes: 0, voice: 0, hints: 0 }; }

  const firstEmpty = () => { const i = SLOTS.findIndex(s => !sel[s.id]); return i < 0 ? SLOTS.length - 1 : i; };
  const allDone = () => SLOTS.every(s => sel[s.id]);
  const guideSpeech = () => allDone() ? PH.all_done : D.steps[active];

  // ---------- сөз (буын + бірінші әріп) ----------
  function wordHTML(card, color) {
    const txt = P.syllables ? card.syl : card.k;
    if (!P.first_letter) return esc(txt);
    return `<span class="fl" style="color:${color}">${esc(txt[0])}</span>${esc(txt.slice(1))}`;
  }

  // ---------- кемпірқосақ жолы ----------
  function renderRoad() {
    $('#road').innerHTML = SLOTS.map((s, i) => {
      const c = sel[s.id];
      const locked = MODE === 'learn' && i > firstEmpty();
      const cls = ['slot', i === active && 'active', c && 'done', locked && 'locked'].filter(Boolean).join(' ');
      return `<button class="${cls}" data-i="${i}" style="--c:${s.color}">
        <span class="num">${i + 1}</span><span class="mas">${s.mascot}</span>
        <span class="slot-txt"><span class="qq">${s.q}</span>
        <span class="val">${c ? `<span class="e">${c.e}</span>${esc(c.k)}` : '<span class="empty">таңдалмаған</span>'}</span></span>
        ${c ? '<span class="ok"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>' : ''}
      </button>`;
    }).join('');
    document.querySelectorAll('.slot').forEach(el => el.onclick = () => {
      if (el.classList.contains('locked')) { toast('Алдымен алдыңғы қадамды толтыр'); speak(PH.locked); return; }
      active = +el.dataset.i; renderAll();
      if (P.auto_speak) speak(guideSpeech());
    });
  }

  function renderGuide() {
    const s = SLOTS[active];
    $('#guideMascot').textContent = allDone() ? '✅' : s.mascot;
    $('#guideText').innerHTML = allDone()
      ? 'Барлық бес қадам толтырылды. Енді <b>«Сурет салу»</b> батырмасын бас.'
      : `<b style="color:${s.color}">${active + 1}-қадам.</b> ${esc(s.rhyme)}`;
  }

  function renderCards() {
    const s = SLOTS[active];
    $('#cards').innerHTML = CARDS[s.id].map((c, j) => `
      <button class="card ${sel[s.id] === c ? 'sel' : ''}" data-j="${j}" style="--c:${s.color};--cs:${s.soft}">
        <div class="e">${c.e}</div><div class="w">${wordHTML(c, s.color)}</div></button>`).join('');
    document.querySelectorAll('.card').forEach(el => el.onclick = () => {
      sess.cards++;
      pick(s, CARDS[s.id][+el.dataset.j]);
    });
  }

  function pick(slot, card) {
    const wasEmpty = !sel[slot.id];
    sel[slot.id] = card;
    if (MODE === 'learn' && wasEmpty) bumpStars(1);
    const idx = SLOTS.indexOf(slot);
    const next = SLOTS.findIndex((s, i) => i > idx && !sel[s.id]);
    active = next >= 0 ? next : (SLOTS.findIndex(s => !sel[s.id]) >= 0 ? SLOTS.findIndex(s => !sel[s.id]) : active);
    renderAll();
    // алдымен таңдалған сөз, сосын келесі сұрақ (үйрену режимінде)
    if (P.auto_speak) {
      const follow = MODE === 'learn' ? guideSpeech() : (allDone() ? PH.all_done : '');
      speak([card.k, follow]);
    }
  }

  function bumpStars(n) { const el = $('#starCount'); el.textContent = +el.textContent + n; }

  // ---------- сөйлем (core/mnemonics.py sentence_segments-пен бірдей) ----------
  function segments() {
    const seg = [], cap = (t) => t[0].toUpperCase() + t.slice(1);
    const main = [];
    if (sel.who) main.push(['who', sel.who.k]);
    if (sel.where) main.push(['where', sel.where.loc]);
    if (sel.act) main.push(['act', sel.act.k]);
    main.forEach(([id, t], i) => {
      if (i === 0) t = cap(t);
      if (i === main.length - 1) t += '.';
      seg.push({ slot: id, text: t });
    });
    const { look, style } = sel;
    if (look || style) {
      const second = look ? [['look', look.phr], [null, style ? 'суретті' : 'сурет']] : [[null, 'суретті']];
      if (style) second.push(['style', style.phr]);
      second.push([null, 'саламыз.']);
      second.forEach(([id, t], i) => seg.push({ slot: id, text: i === 0 ? cap(t) : t }));
    }
    return seg;
  }
  const sentence = () => segments().map(s => s.text).join(' ');

  function renderSentence() {
    const seg = segments();
    $('#sentence').innerHTML = seg.length
      ? seg.map(x => {
          const s = SLOTS.find(v => v.id === x.slot);
          return s ? `<span class="wd" style="background:${s.soft};border-color:${s.color}">${esc(x.text)}</span>` : `<span class="glue">${esc(x.text)}</span>`;
        }).join(' ')
      : '<span class="ph">Карточкаларды таңда — сөйлем өзі құралады</span>';
    $('#genBtn').disabled = busy || !(sel.who && sel.act);
    $('#genBtn').title = sel.who && sel.act ? '' : '«Кім?» және «Не істейді?» қадамдары міндетті';
    $('#promptEn').textContent = buildPrompt() || '—';
  }

  function buildPrompt() {
    if (!sel.who) return '';
    return [[sel.who, sel.act, sel.where].filter(Boolean).map(c => c.en).join(' '),
      sel.look?.en, sel.style?.en, "children's book illustration, bright, friendly, safe for kids, no text, no letters"]
      .filter(Boolean).join(', ');
  }

  // ---------- қатемен жазуды түсіну (сервердегі core/fuzzy.py) ----------
  let sugTimer, sugSeq = 0;
  function onType(text, fromVoice = false) {
    clearTimeout(sugTimer);
    const box = $('#suggest');
    if (!text.trim()) { box.innerHTML = ''; return; }
    sugTimer = setTimeout(async () => {
      const my = ++sugSeq;
      let items = [];
      try { items = (await (await fetch('/api/suggest/?q=' + encodeURIComponent(text))).json()).items; } catch (e) {}
      if (my !== sugSeq) return;
      renderSuggest(items, fromVoice);
    }, fromVoice ? 0 : 180);
  }

  function renderSuggest(items, fromVoice) {
    const box = $('#suggest');
    if (!items.length) {
      box.innerHTML = '<div class="sg-label">Сәйкес сөз табылмады. Басқаша жазып көр немесе карточканы таңда.</div>';
      if (fromVoice) speak(PH.not_found);
      return;
    }
    box.innerHTML = `<div class="sg-label">${fromVoice ? 'Танылған сөз' : 'Мүмкін, сен мына сөзді айтқың келді'}:</div>` +
      items.map((r, i) => {
        const s = SLOTS.find(v => v.id === r.slot);
        return `<button class="chip" data-i="${i}" style="border-color:${s.color};color:${s.color}">
          ${!r.exact && !fromVoice ? `<span class="typo">${esc(r.typed)}</span> →` : ''} ${r.e} ${esc(r.k)}</button>`;
      }).join('');
    box.querySelectorAll('.chip').forEach(el => el.onclick = () => {
      const r = items[+el.dataset.i];
      if (!r.exact) sess.fixes++;
      fromVoice ? sess.voice++ : sess.typed++;
      $('#typeInput').value = ''; box.innerHTML = '';
      const slot = SLOTS.find(v => v.id === r.slot);
      active = SLOTS.indexOf(slot);
      pick(slot, CARDS[slot.id].find(c => c.k === r.k));
      toast(`«${r.k}» сөзі қосылды`);
    });
  }

  function initMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = $('#micBtn');
    if (!SR) { btn.onclick = () => toast('Браузер дауыстық енгізуді қолдамайды (Chrome ұсынылады)'); return; }
    const rec = new SR(); rec.lang = 'kk-KZ'; rec.interimResults = false;
    rec.onresult = (e) => { const t = e.results[0][0].transcript; $('#typeInput').value = t; onType(t, true); };
    rec.onend = () => btn.classList.remove('rec');
    rec.onerror = () => { btn.classList.remove('rec'); toast('Дауыс танылмады, қайталап көр'); };
    btn.onclick = () => { Mnemo.stop(); btn.classList.add('rec'); try { rec.start(); } catch (e) {} };
  }

  // ---------- сурет генерациясы (сервер арқылы) ----------
  async function generate() {
    if (busy || !(sel.who && sel.act)) return;
    busy = true; renderSentence();
    const r = $('#result');
    r.innerHTML = '<div class="loader"><div class="bar"></div>Сурет салынып жатыр…</div>';
    const text = sentence();
    speak([text, PH.drawing]);
    const selection = Object.fromEntries(Object.entries(sel).map(([k, c]) => [k, c.k]));
    const stats = { ...sess, seconds: Math.round((Date.now() - sess.start) / 1000) };
    try {
      const res = await post('/api/generate/', { selection, stats, mode: MODE });
      r.innerHTML = '';
      if (res.ok) {
        const img = new Image(); img.alt = res.sentence; img.src = res.image; r.appendChild(img);
        speak(PH.ready);
      } else {
        r.appendChild(sketch(res.emojis, sel.look ? SLOTS[3].soft : '#EEF0FA'));
        r.insertAdjacentHTML('beforeend', '<span class="badge-off">Офлайн эскиз</span>');
        speak(PH.offline);
      }
      $('#starCount').textContent = res.stars;
      toast(`Сурет галереяға сақталды (+${res.gained} ұпай)`);
      sess = newSess();
    } catch (e) {
      r.innerHTML = '<div class="result-empty">Қате шықты. Қайтадан көр.</div>';
      toast('Сервер қатесі: ' + e.message);
    } finally {
      busy = false; renderSentence();
    }
  }

  function clearAll() {
    Object.keys(sel).forEach(k => delete sel[k]);
    active = 0;
    $('#result').innerHTML = '<div class="result-empty">Нәтиже осы жерде көрсетіледі</div>';
    renderAll();
  }

  function renderAll() { renderRoad(); renderGuide(); renderCards(); renderSentence(); }

  // ---------- іске қосу ----------
  $('#genBtn').onclick = generate;
  $('#sayBtn').onclick = () => { const t = sentence(); t ? speak(t) : speak(guideSpeech()); };
  $('#guideSay').onclick = () => { sess.hints++; speak(guideSpeech()); };
  $('#clearBtn').onclick = clearAll;
  $('#typeInput').oninput = (e) => onType(e.target.value);
  initMic();
  renderAll();
  preload([...D.steps, PH.all_done, PH.drawing, PH.ready]);
  // браузер дыбысты тек қолданушы әрекетінен кейін ғана ойнатады
  if (MODE === 'learn' && P.auto_speak) document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('button, input, a, select')) speak([PH.welcome, D.steps[0]]);
  }, { once: true });
})();
