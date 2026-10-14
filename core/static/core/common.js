// МнемоСурет — барлық беттерге ортақ: дыбыстау, хабарлама, API, офлайн эскиз
window.Mnemo = (() => {
  const $ = (s) => document.querySelector(s);
  const csrf = () => document.querySelector('meta[name=csrf-token]').content;
  const rate = () => +(document.body.dataset.rate || 0.9);

  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2400);
  }

  async function post(url, data) {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() },
      body: JSON.stringify(data),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || r.status);
    return j;
  }

  // ---------- дыбыстау ----------
  // 1) сервер → ElevenLabs (eleven_v3, kk) → кэштелген mp3;
  // 2) сервер қолжетімсіз болса — браузердің ҚАЗАҚША дауысы (тек kk-KZ бар болса).
  //    Орысша дауыспен қазақ сөзін бұрмалап оқығаннан гөрі үндемеген дұрыс.
  const player = new Audio();
  const urlCache = new Map();
  let seq = 0, warned = false;

  async function ttsUrl(text) {
    if (urlCache.has(text)) return urlCache.get(text);
    try {
      const r = await fetch('/api/tts/?t=' + encodeURIComponent(text));
      const j = await r.json();
      if (j.url) { urlCache.set(text, j.url); return j.url; }
    } catch (e) { /* желі жоқ */ }
    return null;
  }

  function play(url, my) {
    return new Promise((ok, bad) => {
      if (my !== seq) return bad(new Error('cancel'));
      player.src = url;
      player.playbackRate = Math.min(1.4, Math.max(0.6, rate() / 0.9));
      player.onended = ok; player.onerror = bad;
      player.play().catch(bad);
    });
  }

  function stop() {
    seq++; player.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  // speak('мәтін') немесе speak(['фраза 1', 'фраза 2']) — әр фраза бөлек кэштеледі
  async function speak(parts) {
    parts = (Array.isArray(parts) ? parts : [parts]).map(t => (t || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!parts.length) return;
    stop();
    const my = seq;
    const urls = parts.map(ttsUrl);  // бәрін қатар сұраймыз
    for (let i = 0; i < parts.length; i++) {
      const url = await urls[i];
      if (my !== seq) return;
      if (url) { try { await play(url, my); continue; } catch (e) { if (my !== seq) return; } }
      browserSpeak(parts.slice(i).join(' '));
      return;
    }
  }

  function kkVoice() {
    if (!('speechSynthesis' in window)) return null;
    return speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('kk')) || null;
  }
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => {};

  function browserSpeak(text) {
    const v = kkVoice();
    if (!v) {
      if (!warned) { warned = true; toast('Қазақша дауыс қолжетімсіз: мұғалім панелінде ElevenLabs кілтін тексеріңіз'); }
      return;
    }
    const u = new SpeechSynthesisUtterance(text.replace(/[А-ЯӘӨҰҮҚҒҢҺІЁ]{2,}/g, w => w.toLowerCase()));
    u.voice = v; u.lang = v.lang; u.rate = rate();
    speechSynthesis.speak(u);
  }

  // алдын ала жүктеу: келесі сұрақтың дыбысы кідіріссіз шығуы үшін
  function preload(texts) { texts.forEach(t => ttsUrl(t)); }

  // ---------- офлайн эскиз (генератор жауап бермесе) ----------
  function sketch(e, soft = '#E2EEFB') {
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, soft); gr.addColorStop(1, '#fff');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '200px serif'; g.fillText(e.where || '🌈', 256, 330);
    g.font = '170px serif'; g.fillText(e.who || '⭐', 256, 230);
    g.font = '90px serif'; g.fillText(e.act || '', 420, 110); g.fillText(e.look || '', 90, 110);
    g.font = '70px serif'; g.fillText(e.style || '', 440, 450);
    return cv;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  return { $, toast, post, speak, stop, preload, sketch, esc };
})();
