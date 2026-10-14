// МнемоСурет — дипломдық жұмысты қорғауға арналған презентация. Іске қосу: node build.js
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');
const { applyTheme } = require('./apply_theme.js');

const M = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tests', 'metrics.json'), 'utf8'));
const SH = (f) => path.join(__dirname, 'shots', f);
const single = M.byType.filter(b => b.name !== 'Екі қате бірге');
const ACC1 = Math.round(single.reduce((a, b) => a + b.top1 * b.n, 0) / single.reduce((a, b) => a + b.n, 0));
const DOUBLE = M.byType.find(b => b.name === 'Екі қате бірге');
const NTEST = M.byType.reduce((a, b) => a + b.n, 0);

const THEME = {
  name: 'MnemoSuret Defense',
  headFontFace: 'Cambria', bodyFontFace: 'Calibri',
  colors: {
    dk1: '1E2433', lt1: 'FFFFFF', dk2: '1F2A44', lt2: 'F2F4F8',
    accent1: '1F2A44', accent2: '3C6E9F', accent3: 'B33A3A', accent4: '8C95A8', accent5: 'D6DCE6', accent6: '5A6275',
    hlink: '3C6E9F', folHlink: '1F2A44',
  },
};
const HEX = THEME.colors;
// мнемоника түстері — тек модельді сипаттайтын жерде (мазмұн бөлігі)
const MN = ['E5484D', 'F2A10C', '2F9E5B', '2F7FD8', '8445C2'];

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'МнемоСурет — дипломдық жұмыс';
pres.author = '[Аты-жөні]';
const C = pres.SchemeColor;

// ---------- layouts ----------
pres.defineSlideMaster({
  title: 'DEF_TITLE', background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 2.05, w: 11.7, h: 2.0, fontSize: 30, bold: true, color: C.background1, valign: 'middle', align: 'left', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.8, y: 4.25, w: 11.7, h: 0.6, fontSize: 18, color: 'C3CAD8', valign: 'top', align: 'left', margin: 0 }, text: '' } },
  ],
});
pres.defineSlideMaster({
  title: 'DEF_CONTENT', background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.4, w: 12.1, h: 0.8, fontSize: 28, bold: true, color: C.text2, valign: 'middle', align: 'left', margin: 0 }, text: '' } },
    { text: { text: 'Дисграфиясы бар балаларға арналған мнемоникалық интерфейс · Дипломдық жұмыс', options: { x: 0.6, y: 7.0, w: 10, h: 0.3, fontSize: 10, color: '8C95A8', margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: '8C95A8', align: 'right' },
});

// ---------- helpers ----------
const T = (s, text, opts) => s.addText(text, { isTextBox: true, margin: 0, color: C.text1, ...opts });
function content(title, section) {
  const s = pres.addSlide({ masterName: 'DEF_CONTENT', sectionTitle: section });
  s.addText(title, { placeholder: 'title' });
  return s;
}
function panel(s, x, y, w, h, name = 'panel') {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.background2 }, line: { type: 'none' }, objectName: name });
}
function frame(s, file, x, y, w, h) {
  s.addShape(pres.shapes.RECTANGLE, { x: x - 0.04, y: y - 0.04, w: w + 0.08, h: h + 0.08, fill: { color: C.background1 }, line: { color: 'C9CFDA', width: 1 }, objectName: 'shot-frame' });
  s.addImage({ path: SH(file), x, y, w, h, objectName: 'screenshot' });
}
function bullets(s, items, x, y, w, h, fs = 16, opts = {}) {
  s.addText(items.map((t, i) => {
    const [head, rest] = Array.isArray(t) ? t : [null, t];
    const end = i < items.length - 1;
    const para = { bullet: { indent: 16 }, paraSpaceAfter: 9, color: C.text1 };
    if (!head) return [{ text: rest, options: { ...para, breakLine: end } }];
    return [{ text: head + ' ', options: { ...para, bold: true } }, { text: rest, options: { color: C.text1, breakLine: end } }];
  }).flat(), { isTextBox: true, x, y, w, h, fontSize: fs, valign: 'top', margin: 0, ...opts });
}
function label(s, text, x, y, w) { T(s, text.toUpperCase(), { x, y, w, h: 0.3, fontSize: 11, bold: true, color: C.accent2, charSpacing: 1 }); }
function shotSlide(title, section, file, aspect, points, notes, caption) {
  const s = content(title, section);
  const maxW = 8.0, maxH = 4.95;
  let w = maxW, h = w / aspect; if (h > maxH) { h = maxH; w = h * aspect; }
  frame(s, file, 0.65, 1.5, w, h);
  T(s, caption, { x: 0.65, y: 1.5 + h + 0.12, w, h: 0.3, fontSize: 11, italic: true, color: C.accent6 });
  const bx = 0.65 + w + 0.5;
  label(s, 'Функционалы', bx, 1.5, 13.33 - bx - 0.6);
  bullets(s, points, bx, 1.9, 13.33 - bx - 0.6, 4.8, 15);
  s.addNotes(notes);
}
const tblHead = (cells) => cells.map(t => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: HEX.dk2 }, fontSize: 13 } }));
const chartText = { catAxisLabelFontFace: '+mn-lt', valAxisLabelFontFace: '+mn-lt', dataLabelFontFace: '+mn-lt', titleFontFace: '+mn-lt', legendFontFace: '+mn-lt',
  catAxisLabelColor: '5A6275', valAxisLabelColor: '5A6275', catAxisLabelFontSize: 12, valAxisLabelFontSize: 11, dataLabelFontSize: 12, dataLabelColor: '1E2433',
  titleColor: '1E2433', titleFontSize: 14, catAxisLineColor: 'C9CFDA' };

// ===== 1. Титул =====
pres.addSection({ title: 'Кіріспе' });
{
  const s = pres.addSlide({ masterName: 'DEF_TITLE', sectionTitle: 'Кіріспе' });
  T(s, '[Университет атауы]', { x: 0.8, y: 0.6, w: 11.7, h: 0.4, fontSize: 16, bold: true, color: C.background1 });
  T(s, '[Факультет]  ·  [Кафедра]', { x: 0.8, y: 1.0, w: 11.7, h: 0.35, fontSize: 14, color: 'C3CAD8' });
  T(s, 'ДИПЛОМДЫҚ ЖҰМЫС', { x: 0.8, y: 1.65, w: 11.7, h: 0.35, fontSize: 13, bold: true, color: '9FB4CF', charSpacing: 2 });
  s.addText('Дисграфиясы бар балаларға ЖИ графикалық генераторларын қолдануды үйретуге арналған мнемоникалық интерфейсті бағдарламалық әзірлеу', { placeholder: 'title' });
  s.addText('Мамандығы: [шифр және атауы]', { placeholder: 'body' });
  s.addShape(pres.shapes.LINE, { x: 0.8, y: 5.35, w: 11.7, h: 0, line: { color: '45526E', width: 1 }, objectName: 'divider' });
  T(s, [{ text: 'Орындаған: ', options: { color: '9FB4CF' } }, { text: '[аты-жөні], [топ]', options: { color: C.background1, bold: true } }], { x: 0.8, y: 5.6, w: 5.8, h: 0.4, fontSize: 15 });
  T(s, [{ text: 'Ғылыми жетекші: ', options: { color: '9FB4CF' } }, { text: '[ғылыми дәрежесі, аты-жөні]', options: { color: C.background1, bold: true } }], { x: 0.8, y: 6.05, w: 5.8, h: 0.4, fontSize: 15 });
  T(s, '[Қала], 2026', { x: 9.5, y: 6.05, w: 3.0, h: 0.4, fontSize: 15, color: 'C3CAD8', align: 'right' });
  s.addNotes('Құрметті комиссия мүшелері! Назарларыңызға дипломдық жұмысымды ұсынамын. Тақырыбы: ...');
}

// ===== 2. Өзектілігі =====
{
  const s = content('Зерттеудің өзектілігі', 'Кіріспе');
  bullets(s, [
    ['Генеративті ЖИ', 'білім беруге енуде: Midjourney, DALL·E, Stable Diffusion балалардың шығармашылығы мен көрнекі ойлауын дамытуға мүмкіндік береді.'],
    ['Кіру кедергісі —', 'мәтіндік сұраныс (промпт). Генератормен жұмыс жазу дағдысын және көбіне ағылшын тілін талап етеді.'],
    ['Дисграфиясы бар балалар', 'әріптерді шатастырады, түсіріп кетеді, орнын ауыстырады — сондықтан мұндай құралдардан іс жүзінде тыс қалады.'],
    ['Қазақ тіліндегі', 'ерекше білім беру қажеттілігі бар балаларға бейімделген ЖИ интерфейстері жеткіліксіз зерттелген.'],
  ], 0.65, 1.55, 7.4, 5.0, 16);
  const stats = [
    ['7–15%', 'оқушыларда дамудың дисграфиясы кездеседі', '(Döhla & Heim, 2016)'],
    [`${M.actions.englishPrompt} таңба`, 'бір суретке арналған ағылшынша промпттың орташа ұзындығы', '(автордың есебі, n = 8)'],
    [`${M.actions.kazakhTyping} таңба`, 'сол сипаттаманың қазақша нұсқасы', '(автордың есебі, n = 8)'],
  ];
  stats.forEach(([v, l, src], i) => {
    const y = 1.55 + i * 1.75;
    panel(s, 8.55, y, 4.15, 1.55, 'stat-panel');
    T(s, v, { x: 8.8, y: y + 0.12, w: 3.8, h: 0.65, fontSize: 32, bold: true, color: i === 0 ? C.accent3 : C.text2, fontFace: 'Cambria' });
    T(s, l, { x: 8.8, y: y + 0.78, w: 3.8, h: 0.45, fontSize: 13, valign: 'top' });
    T(s, src, { x: 8.8, y: y + 1.18, w: 3.8, h: 0.28, fontSize: 10, italic: true, color: C.accent6 });
  });
  s.addNotes('Өзектілік: ЖИ генераторлары кең таралды, бірақ олардың интерфейсі — мәтін. Дисграфиясы бар бала үшін бұл негізгі кедергі. 7–15% — Döhla & Heim (Frontiers in Psychology, 2016) шолуы.');
}

// ===== 3. Объект, пән, мақсат =====
{
  const s = content('Зерттеу объектісі, пәні және мақсаты', 'Кіріспе');
  const rows = [
    ['Объектісі', 'Дисграфиясы бар бастауыш сынып оқушыларының генеративті ЖИ құралдарымен өзара әрекеттесу үдерісі.'],
    ['Пәні', 'ЖИ графикалық генераторына сұраныс құруды жазусыз жүзеге асыратын мнемоникалық пайдаланушы интерфейсі.'],
    ['Мақсаты', 'Дисграфиясы бар балаларға мнемоникалық тірек арқылы ЖИ генераторын қолдануды үйрететін веб-қосымшаны әзірлеу және оның тиімділігін бағалау.'],
    ['Гипотеза', 'Мәтіндік енгізуді мнемоникалық карточкалармен және қатеге төзімді іздеумен алмастыру промпт құрудың күрделілігін төмендетеді және баланың генераторды өз бетінше қолдануына мүмкіндік береді.'],
  ];
  rows.forEach(([h, d], i) => {
    const y = 1.55 + i * 1.3;
    panel(s, 0.65, y, 12.05, 1.12, 'def-row');
    T(s, h, { x: 0.95, y, w: 2.3, h: 1.12, fontSize: 18, bold: true, color: C.text2, valign: 'middle', fontFace: 'Cambria' });
    T(s, d, { x: 3.3, y, w: 9.15, h: 1.12, fontSize: 16, valign: 'middle' });
  });
  s.addNotes('Объект, пән, мақсат және гипотезаны оқып шығу.');
}

// ===== 4. Міндеттері =====
{
  const s = content('Зерттеу міндеттері', 'Кіріспе');
  const tasks = [
    'Дисграфияның клиникалық-педагогикалық сипаттамасын және оның цифрлық интерфейске қоятын талаптарын талдау.',
    'Генеративті ЖИ құралдарының қолжетімділігін және промпт құру тәсілдерін салыстырмалы талдау.',
    '«Кемпірқосақ жолы» мнемоникалық моделін әзірлеу: промпттың бес семантикалық компоненті.',
    'Дисграфияға тән қателерге төзімді сөз тану алгоритмін құру.',
    'Веб-қосымшаны жобалау және іске асыру: интерфейс, ЖИ интеграциясы, мұғалім панелі.',
    'Жүйенің тиімділігін эксперименттік бағалау.',
  ];
  tasks.forEach((t, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.65 + col * 6.15, y = 1.6 + row * 1.7;
    T(s, String(i + 1).padStart(2, '0'), { x, y, w: 0.9, h: 0.6, fontSize: 30, bold: true, color: C.accent2, fontFace: 'Cambria' });
    T(s, t, { x: x + 1.0, y: y + 0.05, w: 4.85, h: 1.4, fontSize: 16, valign: 'top' });
  });
  s.addNotes('Алты міндет; әрқайсысының нәтижесі келесі слайдтарда көрсетіледі.');
}

// ===== 5. Жаңалығы мен маңыздылығы =====
{
  const s = content('Ғылыми жаңалығы және практикалық маңыздылығы', 'Кіріспе');
  panel(s, 0.65, 1.55, 5.9, 3.9, 'novelty');
  panel(s, 6.8, 1.55, 5.9, 3.9, 'practice');
  label(s, 'Ғылыми жаңалығы', 0.95, 1.8, 5.3);
  bullets(s, [
    'Промпттың семантикалық құрылымын (кім – қайда – не істейді – қандай – қалай) түс, кейіпкер және сұрақ арқылы кодтайтын мнемоникалық модель ұсынылды.',
    'Дисграфияға тән қателерге (айна әріптер, орын ауыстыру, қазақ әріптерін алмастыру) салмақталған Дамерау–Левенштейн метрикасы бейімделді.',
    'Шектеулі сөздік арқылы балаларға қауіпсіз промпт генерациялау тәсілі негізделді.',
  ], 0.95, 2.2, 5.3, 4.3, 15);
  label(s, 'Практикалық маңыздылығы', 7.1, 1.8, 5.3);
  bullets(s, [
    'Қосымшаны мұғалім-логопедтер, инклюзивті сыныптар мен ата-аналар орнатусыз пайдалана алады.',
    'Мұғалім панелі баланың прогресін бақылауға және интерфейсті жеке бейімдеуге мүмкіндік береді.',
    'Шешім қазақ тілінде жасалған және басқа тілдерге сөздікті ауыстыру арқылы кеңейтіледі.',
  ], 7.1, 2.2, 5.3, 4.3, 15);
  s.addNotes('Жаңалықтың үш тармағы және практикалық қолданылуы.');
}

// ===== 6. Зерттеу әдістері =====
pres.addSection({ title: 'Әдістеме' });
{
  const s = content('Зерттеу әдістері және әзірлеу кезеңдері', 'Әдістеме');
  const steps = [
    ['Талдау', 'әдебиеттерді, дисграфия типологиясын және ЖИ құралдарын талдау'],
    ['Модельдеу', 'мнемоникалық модель мен промпт құрылымын жобалау'],
    ['Алгоритм', 'қатеге төзімді тану алгоритмін әзірлеу'],
    ['Іске асыру', 'веб-қосымша, ЖИ API интеграциясы, аналитика'],
    ['Бағалау', `${NTEST} тест жағдайында автоматты эксперимент`],
  ];
  steps.forEach(([h, d], i) => {
    const x = 0.65 + i * 2.45, w = 2.2;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.75, w, h: 0.75, fill: { color: i === 4 ? C.accent2 : C.text2 }, line: { type: 'none' }, objectName: 'stage-head' });
    T(s, `${i + 1}. ${h}`, { x: x + 0.15, y: 1.75, w: w - 0.3, h: 0.75, fontSize: 17, bold: true, color: C.background1, valign: 'middle' });
    panel(s, x, 2.5, w, 1.75, 'stage-body');
    T(s, d, { x: x + 0.15, y: 2.65, w: w - 0.3, h: 1.5, fontSize: 14, valign: 'top' });
    if (i < 4) s.addShape(pres.shapes.LINE, { x: x + w + 0.03, y: 2.12, w: 0.19, h: 0, line: { color: '8C95A8', width: 1.5, endArrowType: 'triangle' }, objectName: 'stage-arrow' });
  });
  label(s, 'Қолданылған әдістер', 0.65, 4.7, 12);
  bullets(s, [
    ['Теориялық:', 'ғылыми әдебиетті талдау, салыстыру, жүйелеу, модельдеу.'],
    ['Практикалық:', 'пайдаланушыға бағытталған жобалау (UCD), прототиптеу, бағдарламалау.'],
    ['Эмпирикалық:', 'синтетикалық қателер жиынында есептік эксперимент, әрекет санын өлшеу.'],
  ], 0.65, 5.05, 12, 1.8, 15);
  s.addNotes('Жұмыс бес кезеңнен тұрды.');
}

// ===== 7. Мнемоникалық модель (кесте) =====
{
  const s = content('Мнемоникалық модель «Кемпірқосақ жолы»', 'Әдістеме');
  const data = [
    ['1', 'Қызыл', 'Түлкі', 'КІМ?', 'Субъект (кейіпкер)', 'мысық → a cute cat'],
    ['2', 'Сары', 'Ара', 'ҚАЙДА?', 'Орын (контекст)', 'ғарыш → in outer space'],
    ['3', 'Жасыл', 'Бақа', 'НЕ ІСТЕЙДІ?', 'Әрекет (предикат)', 'ұшады → flying'],
    ['4', 'Көк', 'Кит', 'ҚАНДАЙ?', 'Түс, көңіл-күй', 'кемпірқосақ → rainbow colors'],
    ['5', 'Күлгін', 'Үкі', 'ҚАЛАЙ?', 'Көркем стиль', 'мультфильм → cartoon style'],
  ];
  const rows = [tblHead(['№', 'Түс', 'Кейіпкер', 'Сұрақ', 'Промпт компоненті', 'Мысал (KZ → EN)'])];
  data.forEach((r, i) => rows.push(r.map((t, j) => ({ text: t, options: {
    fontSize: 14, color: j === 1 ? 'FFFFFF' : HEX.dk1, bold: j === 1 || j === 3, fill: { color: j === 1 ? MN[i] : (i % 2 ? 'FFFFFF' : HEX.lt2) } } }))));
  s.addTable(rows, { x: 0.65, y: 1.55, w: 12.05, colW: [0.55, 1.3, 1.5, 1.9, 2.8, 4.0], rowH: 0.5, border: { type: 'solid', color: 'D6DCE6', pt: 0.75 }, valign: 'middle', fontFace: 'Calibri', margin: [0.04, 0.1, 0.04, 0.1] });
  label(s, 'Есте сақтау механизмі', 0.65, 4.85, 12);
  bullets(s, [
    ['Көп арналы кодтау:', 'әр компонент түс (кемпірқосақ реті), кейіпкер-жануар, сұрақ сөзі және пішін арқылы бекітіледі.'],
    ['Тіл құрылымына сәйкестік:', 'қадамдар реті қазақ сөйлемінің S–O–V құрылымын қайталайды: «Мысық ғарышта ұшады».'],
    ['Көлемі:', '46 карточка; сөйлем қазақша құралып, ЖИ-ге ағылшынша аударма жіберіледі.'],
  ], 0.65, 5.2, 12, 1.7, 15);
  s.addNotes('Модельдің негізі — бала білетін кемпірқосақ тізбегі. Бала промптты жазбайды, сұрақтарға жауап береді.');
}

// ===== 8. Бейімдеу талаптары (кесте) =====
{
  const s = content('Дисграфия ерекшеліктері және интерфейстік шешімдер', 'Әдістеме');
  const data = [
    ['Жазу кезінде әріп түсіру, ауыстыру', 'Сөзді карточкадан таңдау; жазу міндетті емес'],
    ['Айна әріптерді шатастыру (б–д, п–б)', 'Қатеге төзімді іздеу: ұқсас әріп — 0,5 айыппұл'],
    ['Сөзді буынға бөлудің қиындығы', 'Буындық жазылым: мы-сық, ұ-ша-ды'],
    ['Әріп бейнесін есте сақтау әлсіздігі', 'Бірінші әріпті санат түсімен белгілеу'],
    ['Оқу жылдамдығының төмендігі', 'Дыбыстау (TTS), реттелетін жылдамдық'],
    ['Моторикалық шаршау', 'Дауыспен енгізу (STT, kk-KZ), үлкен басу аймақтары'],
    ['Мотивацияның тез төмендеуі', 'Нәтиже 10–30 секундта, жұлдыздар жүйесі'],
  ];
  const rows = [tblHead(['Дисграфиядағы қиындық', 'МнемоСурет интерфейсіндегі шешім'])];
  data.forEach((r, i) => rows.push(r.map(t => ({ text: t, options: { fontSize: 15, color: HEX.dk1, fill: { color: i % 2 ? 'FFFFFF' : HEX.lt2 } } }))));
  s.addTable(rows, { x: 0.65, y: 1.55, w: 12.05, colW: [5.4, 6.65], rowH: 0.62, border: { type: 'solid', color: 'D6DCE6', pt: 0.75 }, valign: 'middle', fontFace: 'Calibri', margin: [0.04, 0.12, 0.04, 0.12] });
  s.addNotes('Әр шешім дисграфияның нақты көрінісіне сәйкес таңдалды.');
}

// ===== 9. Архитектура =====
pres.addSection({ title: 'Іске асыру' });
{
  const s = content('Жүйенің архитектурасы', 'Іске асыру');
  const box = (x, y, w, h, title, sub, strong, name) => {
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: strong ? C.text2 : C.background2 }, line: { color: strong ? HEX.dk2 : 'C9CFDA', width: 1 }, objectName: name });
    T(s, title, { x: x + 0.15, y: y + 0.12, w: w - 0.3, h: 0.4, fontSize: 15, bold: true, color: strong ? C.background1 : C.text2 });
    T(s, sub, { x: x + 0.15, y: y + 0.55, w: w - 0.3, h: h - 0.65, fontSize: 12, color: strong ? 'D6DCE6' : C.text1, valign: 'top' });
  };
  const line = (o, dash) => s.addShape(pres.shapes.LINE, { ...o, line: { color: '5A6275', width: 1.5, ...(dash ? { dashType: 'dash' } : {}), ...(o.end === false ? {} : { endArrowType: 'triangle' }) }, objectName: 'flow-arrow' });
  // жоғарғы қатар: негізгі ағын
  box(0.65, 1.6, 2.3, 1.45, 'Пайдаланушы', 'бала: карточка, дауыс, мәтін', false, 'n-user');
  box(3.4, 1.6, 2.9, 1.45, 'Мнемо-интерфейс', 'кемпірқосақ жолы, буын, TTS/STT', true, 'n-ui');
  box(6.75, 1.6, 2.9, 1.45, 'Промпт құрастырушы', 'KZ→EN, қауіпсіз суффикс, шектеулі сөздік', true, 'n-prompt');
  box(10.1, 1.6, 2.6, 1.45, 'ЖИ генератор', 'Pollinations API (Flux), 3 рет қайталау', false, 'n-ai');
  line({ x: 2.95, y: 2.32, w: 0.45, h: 0 }); line({ x: 6.3, y: 2.32, w: 0.45, h: 0 }); line({ x: 9.65, y: 2.32, w: 0.45, h: 0 });
  // төменгі қатар: көмекші модульдер
  box(3.4, 3.9, 2.9, 1.45, 'Қатені тану модулі', 'салмақталған Дамерау–Левенштейн', false, 'n-fuzzy');
  box(6.75, 3.9, 2.9, 1.45, 'Деректер қоймасы', 'localStorage: галерея, сессиялар, баптаулар', false, 'n-store');
  box(10.1, 3.9, 2.6, 1.45, 'Офлайн режим', 'желі болмаса — жергілікті эскиз', false, 'n-off');
  box(0.65, 3.9, 2.3, 1.45, 'Мұғалім панелі', 'көрсеткіштер, графиктер, баптаулар', false, 'n-teacher');
  line({ x: 4.85, y: 3.05, w: 0, h: 0.85 }); line({ x: 11.4, y: 3.05, w: 0, h: 0.85 });
  line({ x: 9.65, y: 4.62, w: 0.45, h: 0, flipH: true });
  // қойма → мұғалім (төменнен айналып)
  line({ x: 8.2, y: 5.35, w: 0, h: 0.3, end: false }, true); line({ x: 1.8, y: 5.65, w: 6.4, h: 0, end: false }, true); line({ x: 1.8, y: 5.35, w: 0, h: 0.3, flipV: true }, true);
  T(s, 'Клиенттік архитектура: сервер қажет емес, қосымша браузерде орнатусыз іске қосылады. Генераторға тек сөздіктегі сөздерден құралған мәтін жіберіледі, бұл балаға қолайсыз контент тәуекелін төмендетеді.',
    { x: 0.65, y: 5.95, w: 12.05, h: 0.8, fontSize: 14, color: C.accent6, valign: 'top' });
  s.addNotes('Деректер ағымы жоғарғы қатарда, көмекші модульдер төменгі қатарда.');
}

// ===== 10. Алгоритм =====
{
  const s = content('Дисграфияға бейімделген сөз тану алгоритмі', 'Іске асыру');
  label(s, '1. Нормализация', 0.65, 1.55, 5.8);
  T(s, 'φ(w): кіші әріп; қазақ әріптері орыс баламасына теңестіріледі: ә→а, ө→о, ұ,ү→у, қ→к, ғ→г, ң→н, і→и.', { x: 0.65, y: 1.9, w: 5.8, h: 0.9, fontSize: 15, valign: 'top' });
  label(s, '2. Салмақталған қашықтық', 0.65, 2.9, 5.8);
  panel(s, 0.65, 3.25, 5.8, 1.95, 'formula');
  T(s, [
    { text: 'd(i, j) = min {', options: { breakLine: true } },
    { text: '   d(i−1, j) + 1,   d(i, j−1) + 1,', options: { breakLine: true } },
    { text: '   d(i−1, j−1) + c(aᵢ, bⱼ),', options: { breakLine: true } },
    { text: '   d(i−2, j−2) + 0,5   — орын ауыстыру }', options: {} },
  ], { x: 0.9, y: 3.35, w: 5.4, h: 1.75, fontSize: 16, fontFace: 'Cambria Math', valign: 'middle' });
  T(s, 'c(a, b) = 0, егер a = b;  0,5 — айна жұп (б–д, п–б, з–с, ш–щ);  1 — қалған жағдайда', { x: 0.65, y: 5.3, w: 5.8, h: 0.6, fontSize: 13, color: C.accent6, valign: 'top' });
  label(s, '3. Шешім ережесі', 6.95, 1.55, 5.75);
  bullets(s, [
    ['Шек:', 'τ(w) = max(1, ⌊|w| / 3⌋) — ұзын сөзге көбірек қате рұқсат етіледі.'],
    ['Префикс:', 'кіріс сөздің басы болса, d = 0,3 (бала сөзді аяқтамаса да танылады).'],
    ['Нәтиже:', 'd ≤ τ болатын карточкалар d бойынша сұрыпталып, 5 ұсыныс көрсетіледі.'],
    ['Растау:', 'бала ұсынысты өзі таңдайды — жүйе автоматты түрде алмастырмайды.'],
  ], 6.95, 1.95, 5.75, 3.4, 15);
  panel(s, 6.95, 5.15, 5.75, 0.8, 'example');
  T(s, [{ text: 'Мысал:  ', options: { bold: true, color: C.text2 } }, { text: '«гарш» → φ → «гарш»;  d(«гарш», «гариш») = 1 ≤ τ = 1  ⇒  ғарыш' }],
    { x: 7.15, y: 5.15, w: 5.4, h: 0.8, fontSize: 14, valign: 'middle' });
  s.addNotes('Классикалық Дамерау–Левенштейн қашықтығы дисграфияға тән қателерге жартылай айыппұлмен бейімделді.');
}

// ===== 11–14. Интерфейс =====
shotSlide('Интерфейс: үйрену режимі', 'Іске асыру', 'learn.png', 1440 / 900, [
  ['Қадамдық өту:', 'келесі компоненттер алдыңғысы толтырылғанша бұғатталады — тізбек бекиді.'],
  ['Кейіпкер-нұсқаушы', 'сұрақты мәтінмен және дауыспен береді.'],
  ['Карточкалар:', 'буындық жазылым, бірінші әріп санат түсімен белгіленген.'],
  ['Сөйлем', 'таңдау барысында автоматты құралады.'],
], 'Үйрену режимінде бала мнемоникалық тізбекті қадам-қадаммен меңгереді.', '1-сурет. Үйрену режимі: «Кім?» компонентін таңдау');
shotSlide('Интерфейс: промпт құру және генерация', 'Іске асыру', 'result.png', 1440 / 960, [
  ['Бес компонент', 'толтырылғаннан кейін генерация батырмасы белсенді болады.'],
  ['Аударма:', 'қазақша сөйлем ағылшынша промптқа түрленеді: «a cute cat flying in outer space, rainbow colors, cartoon style…»'],
  ['Генерация уақыты:', '10–30 с (Pollinations API).'],
  ['Сақтау:', 'нәтиже галереяға компоненттерімен бірге жазылады.'],
], 'Скриншот нақты жұмыстан алынған, сурет генератордан келген.', '2-сурет. Толық промпт және ЖИ генерациясының нәтижесі');
shotSlide('Интерфейс: қатеге төзімді енгізу', 'Іске асыру', 'typo.png', 1440 / 900, [
  ['Мәтіндік енгізу', 'міндетті емес, бірақ қолжетімді — бала өзі жазып көре алады.'],
  ['Ұсыныс:', 'қате жазылған «гарш» сөзі үшін «ғарыш» карточкасы ұсынылады.'],
  ['Дауыстық енгізу', 'нәтижесі де осы алгоритммен өңделеді.'],
  ['Статистика:', 'түзетілген сөздер саны мұғалім панеліне жазылады.'],
], 'Қатені тану модулінің интерфейстегі көрінісі.', '3-сурет. Қате жазылған сөзді тану');
shotSlide('Интерфейс: мұғалім панелі', 'Іске асыру', 'teacher.png', 1440 / 1180, [
  ['Көрсеткіштер:', 'суреттер саны, промпт құрау уақыты, түзетілген сөздер.'],
  ['Динамика:', 'күндік белсенділік және құрау уақытының өзгерісі.'],
  ['Құрылым:', 'енгізу тәсілдерінің үлесі, жиі қолданылатын сөздер.'],
  ['Бейімдеу:', 'буын, түс белгісі, қаріп өлшемі, оқу жылдамдығы.'],
], 'Скриншотта демонстрациялық деректер көрсетілген.', '4-сурет. Мұғалім панелі (демонстрациялық деректер)');

// ===== 15. Эксперимент: дәлдік =====
pres.addSection({ title: 'Нәтижелер' });
{
  const s = content('Эксперимент: қате жазылған сөзді тану дәлдігі', 'Нәтижелер');
  const labels = M.byType.map(b => b.name);
  s.addChart(pres.charts.BAR, [
    { name: 'Top-1 (бірінші ұсыныс)', labels, values: M.byType.map(b => b.top1) },
    { name: 'Top-3 (алғашқы үш ұсыныс)', labels, values: M.byType.map(b => b.top3) },
  ], {
    x: 0.55, y: 1.45, w: 7.9, h: 5.35, barDir: 'bar', barGrouping: 'clustered', barGapWidthPct: 55,
    chartColors: [HEX.dk2, '9FB4CF'], showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0"%"',
    valAxisMaxVal: 115, valAxisMinVal: 0, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    catAxisOrientation: 'maxMin', showLegend: true, legendPos: 'b', legendFontSize: 12, ...chartText,
  });
  label(s, 'Эксперимент шарттары', 8.85, 1.55, 3.85);
  bullets(s, [
    `Сөздік: ${M.words} бір сөзді карточка`,
    `Қатенің 6 типі, барлығы ${NTEST} тест жағдайы`,
    'Қателер дисграфия типологиясы бойынша автоматты енгізілді',
  ], 8.85, 1.9, 3.85, 1.9, 14);
  panel(s, 8.85, 3.85, 3.85, 1.35, 'res1');
  T(s, `${ACC1}%`, { x: 9.05, y: 3.92, w: 3.5, h: 0.6, fontSize: 30, bold: true, color: C.text2, fontFace: 'Cambria' });
  T(s, 'бір қате кезіндегі Top-1 дәлдік', { x: 9.05, y: 4.55, w: 3.5, h: 0.5, fontSize: 13, valign: 'top' });
  panel(s, 8.85, 5.35, 3.85, 1.35, 'res2');
  T(s, `${DOUBLE.top3}%`, { x: 9.05, y: 5.42, w: 3.5, h: 0.6, fontSize: 30, bold: true, color: C.accent3, fontFace: 'Cambria' });
  T(s, 'екі қате қатар келгенде — жетілдіруді қажет етеді', { x: 9.05, y: 6.05, w: 3.5, h: 0.6, fontSize: 13, valign: 'top' });
  s.addNotes(`Тест скрипті tests/fuzzy_eval.js. Бір қатеде Top-1 дәлдік ${ACC1}%, екі қатеде ${DOUBLE.top3}% — бұл жұмыстың шектеуі ретінде көрсетіледі.`);
}

// ===== 16. Тиімділік: әрекет саны =====
{
  const s = content('Нәтиже: промпт құрудың күрделілігі', 'Нәтижелер');
  s.addChart(pres.charts.BAR, [{ name: 'Әрекет саны', labels: ['Ағылшынша промпт (пернелер)', 'Қазақша сипаттама (пернелер)', 'МнемоСурет (басулар)'], values: [M.actions.englishPrompt, M.actions.kazakhTyping, M.actions.mnemoClicks] }], {
    x: 0.55, y: 1.45, w: 7.6, h: 5.35, barDir: 'col', barGapWidthPct: 70, chartColors: ['9FB4CF', '9FB4CF', HEX.dk2], invertedColors: ['9FB4CF', '9FB4CF', HEX.dk2],
    showValue: true, dataLabelPosition: 'outEnd', valGridLine: { color: 'E6E9EF', size: 0.5 }, catGridLine: { style: 'none' }, showLegend: false,
    showTitle: true, title: 'Бір суретке қажетті әрекет саны (8 мысалдың орташасы)', ...chartText,
  });
  panel(s, 8.55, 1.55, 4.15, 2.2, 'k1');
  T(s, `${Math.round(M.actions.englishPrompt / M.actions.mnemoClicks)} есе`, { x: 8.8, y: 1.7, w: 3.8, h: 0.75, fontSize: 36, bold: true, color: C.text2, fontFace: 'Cambria' });
  T(s, 'аз әрекет: ағылшынша промпт жазумен салыстырғанда', { x: 8.8, y: 2.5, w: 3.8, h: 0.9, fontSize: 14, valign: 'top' });
  panel(s, 8.55, 3.95, 4.15, 2.2, 'k2');
  T(s, '0 таңба', { x: 8.8, y: 4.1, w: 3.8, h: 0.75, fontSize: 36, bold: true, color: C.text2, fontFace: 'Cambria' });
  T(s, 'жазу талап етілмейді: 5 карточка және 1 генерация батырмасы', { x: 8.8, y: 4.9, w: 3.8, h: 0.9, fontSize: 14, valign: 'top' });
  T(s, 'Есептеу: жобадағы 8 демонстрациялық сұраныс бойынша (tests/fuzzy_eval.js).', { x: 8.55, y: 6.35, w: 4.15, h: 0.45, fontSize: 11, italic: true, color: C.accent6, valign: 'top' });
  s.addNotes('Әрекет саны — интерфейс күрделілігінің объективті көрсеткіші.');
}

// ===== 17. Қорытынды =====
pres.addSection({ title: 'Қорытынды' });
{
  const s = content('Қорытынды', 'Қорытынды');
  const res = [
    'Дисграфияның интерфейске қоятын талаптары жүйеленіп, 7 қиындыққа сәйкес интерфейстік шешімдер анықталды.',
    'Промпттың бес семантикалық компонентін кодтайтын «Кемпірқосақ жолы» мнемоникалық моделі әзірленді.',
    `Дисграфияға бейімделген сөз тану алгоритмі құрылды: бір қате кезінде Top-1 дәлдігі ${ACC1}%.`,
    'ЖИ генераторымен интеграцияланған, офлайн режимі бар «МнемоСурет» веб-қосымшасы іске асырылды.',
    `Промпт құруға қажетті әрекет саны ${M.actions.englishPrompt}-ден ${M.actions.mnemoClicks}-ға дейін қысқарды; гипотеза есептік деңгейде расталды.`,
  ];
  res.forEach((t, i) => {
    const y = 1.55 + i * 0.82;
    T(s, String(i + 1), { x: 0.65, y, w: 0.5, h: 0.65, fontSize: 22, bold: true, color: C.accent2, fontFace: 'Cambria', valign: 'middle' });
    T(s, t, { x: 1.2, y, w: 6.6, h: 0.72, fontSize: 15, valign: 'middle' });
  });
  panel(s, 8.3, 1.55, 4.4, 3.6, 'future');
  label(s, 'Даму перспективалары', 8.55, 1.8, 3.9);
  bullets(s, [
    'Логопед-мұғаліммен бақылау және тәжірибе топтарында педагогикалық эксперимент',
    'Екі және одан көп қатені контекст арқылы тану',
    'Қазақ тіліндегі сапалы TTS дауысын интеграциялау',
    'Мұғалімге арналған карточка редакторы',
  ], 8.55, 2.2, 3.9, 4.0, 14);
  s.addNotes('Міндеттер бойынша нәтижелер және даму перспективалары. Педагогикалық эксперимент — келесі кезең.');
}

// ===== 18. Рақмет =====
{
  const s = pres.addSlide({ masterName: 'DEF_TITLE', sectionTitle: 'Қорытынды' });
  s.addText('Назарларыңызға рақмет!', { placeholder: 'title' });
  s.addText('Сұрақтарыңызға жауап беруге дайынмын', { placeholder: 'body' });
  s.addShape(pres.shapes.LINE, { x: 0.8, y: 5.35, w: 11.7, h: 0, line: { color: '45526E', width: 1 }, objectName: 'divider' });
  T(s, '[аты-жөні]  ·  [e-mail]', { x: 0.8, y: 5.6, w: 11.7, h: 0.4, fontSize: 15, color: 'C3CAD8' });
  s.addNotes('Демонстрация: app/index.html — үйрену режимінде бір суретті салып көрсету.');
}

(async () => {
  const out = path.join(__dirname, 'MnemoSuret_qorgau_v2.pptx');
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log('OK', out);
})();
