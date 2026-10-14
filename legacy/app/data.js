// МнемоСурет — мнемоникалық деректер: «Кемпірқосақ жолы» (5 қадам = 5 түс = 5 жануар)
const SLOTS = [
  { id: 'who',   q: 'КІМ?',        mascot: '🦊', mascotName: 'Түлкі', color: '#E5484D', soft: '#FDE8E8', shape: 'circle',
    rhyme: 'Қызыл түлкі сұрайды: суретте КІМ болады?' },
  { id: 'where', q: 'ҚАЙДА?',      mascot: '🐝', mascotName: 'Ара',   color: '#F2A10C', soft: '#FEF3D7', shape: 'triangle',
    rhyme: 'Сары ара сұрайды: ол ҚАЙДА жүр?' },
  { id: 'act',   q: 'НЕ ІСТЕЙДІ?', mascot: '🐸', mascotName: 'Бақа',  color: '#2F9E5B', soft: '#E3F5EA', shape: 'square',
    rhyme: 'Жасыл бақа сұрайды: ол НЕ ІСТЕЙДІ?' },
  { id: 'look',  q: 'ҚАНДАЙ?',     mascot: '🐳', mascotName: 'Кит',   color: '#2F7FD8', soft: '#E2EEFB', shape: 'star',
    rhyme: 'Көк кит сұрайды: сурет ҚАНДАЙ түсті?' },
  { id: 'style', q: 'ҚАЛАЙ?',      mascot: '🦉', mascotName: 'Үкі',   color: '#8445C2', soft: '#F0E6FA', shape: 'hexagon',
    rhyme: 'Күлгін үкі сұрайды: ҚАЛАЙ саламыз?' },
];

// k — сөз, syl — буын, e — белгі, en — генераторға арналған мәтін, loc — сөйлемдегі түрі
const CARDS = {
  who: [
    { k: 'мысық', syl: 'мы-сық', e: '🐱', en: 'a cute cat' },
    { k: 'ит', syl: 'ит', e: '🐶', en: 'a friendly puppy' },
    { k: 'қыз', syl: 'қыз', e: '👧', en: 'a little girl' },
    { k: 'ұл', syl: 'ұл', e: '👦', en: 'a little boy' },
    { k: 'ат', syl: 'ат', e: '🐴', en: 'a horse' },
    { k: 'робот', syl: 'ро-бот', e: '🤖', en: 'a friendly robot' },
    { k: 'айдаһар', syl: 'ай-да-һар', e: '🐉', en: 'a kind little dragon' },
    { k: 'түйе', syl: 'тү-йе', e: '🐫', en: 'a camel' },
    { k: 'аю', syl: 'а-ю', e: '🐻', en: 'a teddy bear' },
    { k: 'құс', syl: 'құс', e: '🐦', en: 'a small bird' },
  ],
  where: [
    { k: 'орман', syl: 'ор-ман', e: '🌲', en: 'in a forest', loc: 'орманда' },
    { k: 'ғарыш', syl: 'ға-рыш', e: '🚀', en: 'in outer space', loc: 'ғарышта' },
    { k: 'теңіз', syl: 'те-ңіз', e: '🌊', en: 'at the sea', loc: 'теңізде' },
    { k: 'тау', syl: 'тау', e: '🏔️', en: 'in the mountains', loc: 'тауда' },
    { k: 'дала', syl: 'да-ла', e: '🌾', en: 'in the Kazakh steppe', loc: 'далада' },
    { k: 'киіз үй', syl: 'ки-із үй', e: '⛺', en: 'near a Kazakh yurt', loc: 'киіз үйдің жанында' },
    { k: 'қала', syl: 'қа-ла', e: '🏙️', en: 'in a big city', loc: 'қалада' },
    { k: 'сарай', syl: 'са-рай', e: '🏰', en: 'in a fairy castle', loc: 'сарайда' },
    { k: 'бақ', syl: 'бақ', e: '🌷', en: 'in a flower garden', loc: 'бақта' },
    { k: 'мектеп', syl: 'мек-теп', e: '🏫', en: 'at school', loc: 'мектепте' },
  ],
  act: [
    { k: 'ұшады', syl: 'ұ-ша-ды', e: '🪁', en: 'flying' },
    { k: 'жүгіреді', syl: 'жү-гі-ре-ді', e: '🏃', en: 'running' },
    { k: 'ойнайды', syl: 'ой-най-ды', e: '⚽', en: 'playing' },
    { k: 'ұйықтайды', syl: 'ұйық-тай-ды', e: '😴', en: 'sleeping' },
    { k: 'жейді', syl: 'жей-ді', e: '🍎', en: 'eating an apple' },
    { k: 'жүзеді', syl: 'жү-зе-ді', e: '🏊', en: 'swimming' },
    { k: 'билейді', syl: 'би-лей-ді', e: '💃', en: 'dancing' },
    { k: 'оқиды', syl: 'о-қи-ды', e: '📖', en: 'reading a book' },
    { k: 'ән салады', syl: 'ән са-ла-ды', e: '🎤', en: 'singing' },
    { k: 'сурет салады', syl: 'су-рет са-ла-ды', e: '🖌️', en: 'painting a picture' },
  ],
  look: [
    { k: 'кемпірқосақ', syl: 'кем-пір-қо-сақ', e: '🌈', en: 'rainbow colors' },
    { k: 'көңілді', syl: 'кө-ңіл-ді', e: '😄', en: 'happy and joyful mood' },
    { k: 'түнгі', syl: 'түн-гі', e: '🌙', en: 'night sky with stars' },
    { k: 'күнгі', syl: 'күн-гі', e: '☀️', en: 'bright sunny day' },
    { k: 'қысқы', syl: 'қыс-қы', e: '❄️', en: 'snowy winter' },
    { k: 'күзгі', syl: 'күз-гі', e: '🍂', en: 'golden autumn' },
    { k: 'қызыл', syl: 'қы-зыл', e: '🔴', en: 'red colors' },
    { k: 'көк', syl: 'көк', e: '🔵', en: 'blue colors' },
    { k: 'алтын', syl: 'ал-тын', e: '🟡', en: 'golden colors' },
  ],
  style: [
    { k: 'мультфильм', syl: 'мульт-фильм', e: '📺', en: 'cartoon style' },
    { k: 'акварель', syl: 'ак-ва-рель', e: '🎨', en: 'watercolor painting' },
    { k: 'қарындаш', syl: 'қа-рын-даш', e: '✏️', en: 'pencil sketch' },
    { k: 'балауыз', syl: 'ба-ла-уыз', e: '🖍️', en: 'crayon drawing' },
    { k: 'пиксель', syl: 'пик-сель', e: '👾', en: 'pixel art' },
    { k: 'ертегі', syl: 'ер-те-гі', e: '🧚', en: 'fairy tale book illustration' },
    { k: 'көлемді', syl: 'кө-лем-ді', e: '🧊', en: '3D render, soft clay' },
  ],
};

// Генераторға әрқашан қосылатын қауіпсіз «құйрық»
const SAFE_SUFFIX = "children's book illustration, bright, friendly, safe for kids, no text";
