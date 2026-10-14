// Дисграфияға тән қателер жиынында сөзді тану дәлдігін бағалау
// Іске қосу: node tests/fuzzy_eval.js
const fs = require('fs'), path = require('path');
const app = path.join(__dirname, '..', 'app');
const src = fs.readFileSync(path.join(app, 'data.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(app, 'app.js'), 'utf8').split('// ---------- қатемен')[1].split('function renderSuggest')[0].replace(/^[^\n]*\n/, '');
eval(src.replace(/^const (SLOTS|CARDS|SAFE_SUFFIX|FOLD|MIRROR) /gm, 'var $1 ') + ';global.fuzzyFind=fuzzyFind;global.CARDS=CARDS;global.SLOTS=SLOTS;global.SAFE_SUFFIX=SAFE_SUFFIX;');

const RU = { 'ә': 'а', 'ө': 'о', 'ұ': 'у', 'ү': 'у', 'қ': 'к', 'ғ': 'г', 'ң': 'н', 'һ': 'х', 'і': 'и' };
const MIR = { 'б': 'д', 'д': 'б', 'п': 'б', 'з': 'с', 'с': 'з', 'ш': 'щ', 'т': 'д', 'л': 'м', 'м': 'л' };
const errs = {
  'Әріп түсіп қалуы': w => w.length < 4 ? null : w.slice(0, 1 + Math.floor((w.length - 2) / 2)) + w.slice(2 + Math.floor((w.length - 2) / 2)),
  'Айна/ұқсас әріп (б↔д)': w => { const i = [...w].findIndex(c => MIR[c]); return i < 0 ? null : w.slice(0, i) + MIR[w[i]] + w.slice(i + 1); },
  'Әріптердің орын ауыстыруы': w => w.length < 4 ? null : w.slice(0, 1) + w[2] + w[1] + w.slice(3),
  'Қазақ әрпі орнына орыс әрпі': w => { const r = [...w].map(c => RU[c] || c).join(''); return r === w ? null : r; },
  'Қосымша әріп': w => w.slice(0, 2) + w[1] + w.slice(2),
  'Екі қате бірге': w => { if (w.length < 5) return null; const a = w.slice(0, 1) + w[2] + w[1] + w.slice(3); return a.slice(0, -2) + a.slice(-1); },
};
const words = []; SLOTS.forEach(s => CARDS[s.id].forEach(c => { if (!c.k.includes(' ')) words.push(c.k); }));
const out = { words: words.length, byType: [] };
for (const [name, f] of Object.entries(errs)) {
  let n = 0, top1 = 0, top3 = 0;
  for (const w of words) {
    const t = f(w); if (!t || t === w) continue; n++;
    const r = fuzzyFind(t).map(x => x.c.k);
    if (r[0] === w) top1++; if (r.slice(0, 3).includes(w)) top3++;
  }
  out.byType.push({ name, n, top1: Math.round(top1 / n * 100), top3: Math.round(top3 / n * 100) });
}
// әрекет саны: қолмен жазу vs карточка
const sets = [['мысық','ғарыш','ұшады','кемпірқосақ','мультфильм'],['айдаһар','сарай','ұйықтайды','түнгі','ертегі'],['түйе','дала','жүгіреді','күнгі','акварель'],['робот','бақ','сурет салады','көңілді','көлемді'],['аю','орман','оқиды','күзгі','балауыз'],['ат','тау','жүгіреді','қысқы','қарындаш'],['қыз','киіз үй','ән салады','алтын','ертегі'],['ит','теңіз','жүзеді','көк','пиксель']];
const ids = ['who','where','act','look','style'];
let kk = 0, en = 0;
sets.forEach(s => { const c = ids.map((id, j) => CARDS[id].find(x => x.k === s[j]));
  kk += [c[0].k, c[1].loc, c[2].k, c[3].k, c[4].k].join(' ').length;
  en += [[c[0].en, c[2].en, c[1].en].join(' '), c[3].en, c[4].en].join(', ').length; });
out.actions = { kazakhTyping: Math.round(kk / sets.length), englishPrompt: Math.round(en / sets.length), mnemoClicks: 6 };
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(__dirname, 'metrics.json'), JSON.stringify(out, null, 1));
