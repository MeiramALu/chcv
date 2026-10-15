"""«Кемпірқосақ жолы» мнемоникалық моделі: 5 қадам = 5 түс = 5 жануар = 5 сұрақ.

Әр карточка:
    k    — сөз (экранда және дыбыстауда)
    syl  — буынға бөлінген жазылымы
    e    — эмодзи-белгі
    en   — генераторға жіберілетін ағылшынша фрагмент
    loc  — «қайда?» қадамындағы жатыс септік түрі (сөйлем үшін)
    phr  — «қандай?»/«қалай?» қадамындағы сөйлемдегі тіркес
"""

SLOTS = [
    {'id': 'who', 'q': 'КІМ?', 'mascot': '🦊', 'mascot_name': 'Түлкі', 'color': '#E5484D', 'soft': '#FDE8E8',
     'role': 'кейіпкер', 'rhyme': 'Қызыл түлкі сұрайды: суретте КІМ болады?'},
    {'id': 'where', 'q': 'ҚАЙДА?', 'mascot': '🐝', 'mascot_name': 'Ара', 'color': '#E0930B', 'soft': '#FEF3D7',
     'role': 'орын', 'rhyme': 'Сары ара сұрайды: ол ҚАЙДА жүр?'},
    {'id': 'act', 'q': 'НЕ ІСТЕЙДІ?', 'mascot': '🐸', 'mascot_name': 'Бақа', 'color': '#2F9E5B', 'soft': '#E3F5EA',
     'role': 'әрекет', 'rhyme': 'Жасыл бақа сұрайды: ол НЕ ІСТЕЙДІ?'},
    {'id': 'look', 'q': 'ҚАНДАЙ?', 'mascot': '🐳', 'mascot_name': 'Кит', 'color': '#2F7FD8', 'soft': '#E2EEFB',
     'role': 'түс, көңіл-күй', 'rhyme': 'Көк кит сұрайды: сурет ҚАНДАЙ болады?'},
    {'id': 'style', 'q': 'ҚАЛАЙ?', 'mascot': '🦉', 'mascot_name': 'Үкі', 'color': '#8445C2', 'soft': '#F0E6FA',
     'role': 'көркем стиль', 'rhyme': 'Күлгін үкі сұрайды: суретті ҚАЛАЙ саламыз?'},
]

CARDS = {
    'who': [
        {'k': 'мысық', 'syl': 'мы-сық', 'e': '🐱', 'en': 'a cute cat'},
        {'k': 'ит', 'syl': 'ит', 'e': '🐶', 'en': 'a friendly puppy'},
        {'k': 'қыз', 'syl': 'қыз', 'e': '👧', 'en': 'a little girl'},
        {'k': 'ұл', 'syl': 'ұл', 'e': '👦', 'en': 'a little boy'},
        {'k': 'ат', 'syl': 'ат', 'e': '🐴', 'en': 'a horse'},
        {'k': 'робот', 'syl': 'ро-бот', 'e': '🤖', 'en': 'a friendly robot'},
        {'k': 'айдаһар', 'syl': 'ай-да-һар', 'e': '🐉', 'en': 'a kind little dragon'},
        {'k': 'түйе', 'syl': 'тү-йе', 'e': '🐫', 'en': 'a camel'},
        {'k': 'аю', 'syl': 'а-ю', 'e': '🐻', 'en': 'a teddy bear'},
        {'k': 'құс', 'syl': 'құс', 'e': '🐦', 'en': 'a small bird'},
    ],
    'where': [
        {'k': 'орман', 'syl': 'ор-ман', 'e': '🌲', 'en': 'in a forest', 'loc': 'орманда'},
        {'k': 'ғарыш', 'syl': 'ға-рыш', 'e': '🚀', 'en': 'in outer space', 'loc': 'ғарышта'},
        {'k': 'теңіз', 'syl': 'те-ңіз', 'e': '🌊', 'en': 'at the sea', 'loc': 'теңізде'},
        {'k': 'тау', 'syl': 'тау', 'e': '🏔️', 'en': 'in the mountains', 'loc': 'тауда'},
        {'k': 'дала', 'syl': 'да-ла', 'e': '🌾', 'en': 'in the Kazakh steppe', 'loc': 'далада'},
        {'k': 'киіз үй', 'syl': 'ки-із үй', 'e': '⛺', 'en': 'near a Kazakh yurt', 'loc': 'киіз үйдің жанында'},
        {'k': 'қала', 'syl': 'қа-ла', 'e': '🏙️', 'en': 'in a big city', 'loc': 'қалада'},
        {'k': 'сарай', 'syl': 'са-рай', 'e': '🏰', 'en': 'in a fairy castle', 'loc': 'сарайда'},
        {'k': 'бақ', 'syl': 'бақ', 'e': '🌷', 'en': 'in a flower garden', 'loc': 'бақта'},
        {'k': 'мектеп', 'syl': 'мек-теп', 'e': '🏫', 'en': 'at school', 'loc': 'мектепте'},
    ],
    'act': [
        {'k': 'ұшады', 'syl': 'ұ-ша-ды', 'e': '🪁', 'en': 'flying'},
        {'k': 'жүгіреді', 'syl': 'жү-гі-ре-ді', 'e': '🏃', 'en': 'running'},
        {'k': 'ойнайды', 'syl': 'ой-най-ды', 'e': '⚽', 'en': 'playing with a ball'},
        {'k': 'ұйықтайды', 'syl': 'ұйық-тай-ды', 'e': '😴', 'en': 'sleeping'},
        {'k': 'алма жейді', 'syl': 'ал-ма жей-ді', 'e': '🍎', 'en': 'eating an apple'},
        {'k': 'жүзеді', 'syl': 'жү-зе-ді', 'e': '🏊', 'en': 'swimming'},
        {'k': 'билейді', 'syl': 'би-лей-ді', 'e': '💃', 'en': 'dancing'},
        {'k': 'кітап оқиды', 'syl': 'кі-тап о-қи-ды', 'e': '📖', 'en': 'reading a book'},
        {'k': 'ән салады', 'syl': 'ән са-ла-ды', 'e': '🎤', 'en': 'singing'},
        {'k': 'сурет салады', 'syl': 'су-рет са-ла-ды', 'e': '🖌️', 'en': 'painting a picture'},
    ],
    'look': [
        {'k': 'кемпірқосақ', 'syl': 'кем-пір-қо-сақ', 'e': '🌈', 'en': 'rainbow colors', 'phr': 'кемпірқосақ түсті'},
        {'k': 'көңілді', 'syl': 'кө-ңіл-ді', 'e': '😄', 'en': 'happy and joyful mood', 'phr': 'көңілді'},
        {'k': 'түнгі', 'syl': 'түн-гі', 'e': '🌙', 'en': 'night sky with stars', 'phr': 'түнгі'},
        {'k': 'күндізгі', 'syl': 'күн-діз-гі', 'e': '☀️', 'en': 'bright sunny day', 'phr': 'күндізгі'},
        {'k': 'көктемгі', 'syl': 'көк-тем-гі', 'e': '🌸', 'en': 'spring with blooming flowers', 'phr': 'көктемгі'},
        {'k': 'қысқы', 'syl': 'қыс-қы', 'e': '❄️', 'en': 'snowy winter', 'phr': 'қысқы'},
        {'k': 'күзгі', 'syl': 'күз-гі', 'e': '🍂', 'en': 'golden autumn', 'phr': 'күзгі'},
        {'k': 'қызыл', 'syl': 'қы-зыл', 'e': '🔴', 'en': 'red colors', 'phr': 'қызыл түсті'},
        {'k': 'көк', 'syl': 'көк', 'e': '🔵', 'en': 'blue colors', 'phr': 'көк түсті'},
        {'k': 'алтын', 'syl': 'ал-тын', 'e': '🟡', 'en': 'golden colors', 'phr': 'алтын түсті'},
    ],
    'style': [
        {'k': 'мультфильм', 'syl': 'мульт-фильм', 'e': '📺', 'en': 'cartoon style', 'phr': 'мультфильм стилінде'},
        {'k': 'акварель', 'syl': 'ак-ва-рель', 'e': '🎨', 'en': 'watercolor painting', 'phr': 'акварельмен'},
        {'k': 'қарындаш', 'syl': 'қа-рын-даш', 'e': '✏️', 'en': 'colored pencil drawing', 'phr': 'қарындашпен'},
        {'k': 'балауыз', 'syl': 'ба-ла-уыз', 'e': '🖍️', 'en': 'wax crayon drawing', 'phr': 'балауыз қарындашпен'},
        {'k': 'пиксель', 'syl': 'пик-сель', 'e': '👾', 'en': 'pixel art', 'phr': 'пиксель стилінде'},
        {'k': 'ертегі', 'syl': 'ер-те-гі', 'e': '🧚', 'en': 'fairy tale book illustration', 'phr': 'ертегі стилінде'},
        {'k': 'көлемді', 'syl': 'кө-лем-ді', 'e': '🧊', 'en': '3D render, soft clay', 'phr': 'көлемді етіп'},
    ],
}

SLOT_IDS = [s['id'] for s in SLOTS]
SLOT_BY_ID = {s['id']: s for s in SLOTS}

# Генераторға әрқашан қосылатын қауіпсіз «құйрық» — бала сұранысты өзі жазбайды,
# сондықтан генераторға тек тексерілген фрагменттер ғана жетеді.
SAFE_SUFFIX = "children's book illustration, bright, friendly, safe for kids, no text, no letters"

ORDINALS = ['Бірінші', 'Екінші', 'Үшінші', 'Төртінші', 'Бесінші']

# Дыбысталатын тұрақты фразалар (management command build_tts алдын ала дыбыстайды)
PHRASES = {
    'welcome': 'Сәлем! Бес сұраққа жауап берейік те, бірге сурет салайық.',
    'all_done': 'Барлық бес қадам толтырылды. Енді «Сурет салу» батырмасын бас.',
    'drawing': 'Сурет салынып жатыр. Сәл күте тұр.',
    'ready': 'Жарайсың! Сурет дайын.',
    'offline': 'Интернет баяу екен, сондықтан эскиз салдым.',
    'locked': 'Алдымен алдыңғы қадамды толтыр.',
    'not_found': 'Мұндай сөз табылмады. Карточканы таңдап көр.',
}


def find_card(slot_id, key):
    for c in CARDS.get(slot_id, []):
        if c['k'] == key:
            return c
    return None


def resolve(selection):
    """{'who': 'мысық', ...} → {'who': card, ...}; белгісіз мәндер алынып тасталады."""
    out = {}
    for sid in SLOT_IDS:
        key = (selection or {}).get(sid)
        card = find_card(sid, key) if key else None
        if card:
            out[sid] = card
    return out


def word_speech(word):
    """Жалғыз сөзді eleven_v3 бұрмалап оқиды (мәтін тым қысқа), сондықтан
    сөз қысқа контекстпен айтылады: «Бұл сөз — мысық.»"""
    return f'Бұл сөз — {word}.'


def step_prompt(index):
    """Қадам сұрағы — экранда да, дыбыста да бірдей."""
    return f"{ORDINALS[index]} қадам. {SLOTS[index]['rhyme']}"


def build_prompt(cards):
    """Генераторға арналған ағылшынша сұраныс (тек карточкалардан құралады)."""
    if 'who' not in cards:
        return ''
    head = ' '.join(c['en'] for c in (cards.get('who'), cards.get('act'), cards.get('where')) if c)
    tail = [cards[s]['en'] for s in ('look', 'style') if s in cards]
    return ', '.join([head, *tail, SAFE_SUFFIX])


def sentence_segments(cards):
    """Қазақша грамматикалық дұрыс сөйлем, түстік сегменттерге бөлінген.

    «Мысық ғарышта ұшады. Кемпірқосақ түсті суретті мультфильм стилінде саламыз.»
    Әр сегмент: {'slot': id | None, 'text': ...}
    """
    seg = []
    main = []
    if 'who' in cards:
        main.append(('who', cards['who']['k']))
    if 'where' in cards:
        main.append(('where', cards['where']['loc']))
    if 'act' in cards:
        main.append(('act', cards['act']['k']))
    for i, (sid, text) in enumerate(main):
        if i == 0:
            text = text[0].upper() + text[1:]
        if i == len(main) - 1:
            text += '.'
        seg.append({'slot': sid, 'text': text})

    look, style = cards.get('look'), cards.get('style')
    if look or style:
        second = []
        if look:
            second += [('look', look['phr']), (None, 'суретті' if style else 'сурет')]
        else:
            second.append((None, 'суретті'))
        if style:
            second.append(('style', style['phr']))
        second.append((None, 'саламыз.'))
        for i, (sid, text) in enumerate(second):
            if i == 0:
                text = text[0].upper() + text[1:]
            seg.append({'slot': sid, 'text': text})
    return seg


def sentence_text(cards):
    return ' '.join(s['text'] for s in sentence_segments(cards))


def all_static_texts():
    """Алдын ала дыбыстауға болатын барлық тұрақты мәтіндер."""
    texts = list(PHRASES.values())
    texts += [step_prompt(i) for i in range(len(SLOTS))]
    for sid in SLOT_IDS:
        for c in CARDS[sid]:
            texts.append(word_speech(c['k']))
    return texts


def client_data():
    """Шаблонға json_script арқылы берілетін деректер."""
    return {'slots': SLOTS, 'cards': CARDS, 'phrases': PHRASES,
            'steps': [step_prompt(i) for i in range(len(SLOTS))],
            'word_tpl': word_speech('{k}')}


def card_count():
    return sum(len(v) for v in CARDS.values())
