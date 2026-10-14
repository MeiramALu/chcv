"""Дисграфияға бейім сөз іздеу.

Дисграфияда жиі кездесетін қателер ескеріледі:
  * қазақ әрпінің орнына орыс әрпі (қ→к, ү→у, і→и …) — «бүктеу» (fold) арқылы;
  * айна/ұқсас әріптер (б↔д, п↔б, з↔с, ш↔щ) — жарты қате;
  * көрші әріптердің орын ауыстыруы — жарты қате (Дамерау–Левенштейн);
  * әріптің түсіп қалуы немесе артық әріп — бір қате.
"""
import re

from .mnemonics import CARDS, SLOTS

FOLD = {'ә': 'а', 'ө': 'о', 'ұ': 'у', 'ү': 'у', 'қ': 'к', 'ғ': 'г', 'ң': 'н', 'һ': 'х',
        'і': 'и', 'ы': 'и', 'й': 'и', 'ё': 'е', 'э': 'е', 'ъ': '', 'ь': ''}
MIRROR = {'б': 'д', 'д': 'б', 'п': 'б', 'ш': 'щ', 'щ': 'ш', 'з': 'с', 'с': 'з'}
_CLEAN = re.compile(r'[^a-zа-яәөұүқғңһіё ]')


def fold(word):
    w = _CLEAN.sub('', word.lower())
    return ''.join(FOLD.get(ch, ch) for ch in w)


def distance(a, b):
    m, n = len(a), len(b)
    d = [[0.0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        d[i][0] = i
    for j in range(n + 1):
        d[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                sub = 0
            elif MIRROR.get(a[i - 1]) == b[j - 1]:
                sub = 0.5
            else:
                sub = 1
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + sub)
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + 0.5)
    return d[m][n]


def find(text, limit=5):
    """Бір сөзге ең жақын карточкалар: [(score, slot_id, card), …]."""
    q = fold(text.strip())
    if len(q) < 2:
        return []
    res = []
    for slot in SLOTS:
        for card in CARDS[slot['id']]:
            cands = [fold(w) for w in (card['k'], card.get('loc')) if w]
            score = min(distance(q, w) for w in cands)
            if any(w.startswith(q) for w in cands):
                score = min(score, 0.3)
            tol = max(1, len(card['k']) // 3)
            if score <= tol:
                res.append((score, slot['id'], card))
    res.sort(key=lambda r: r[0])
    return res[:limit]


def suggest(text, limit=5):
    """Бүкіл фраза да, жеке сөздер де тексеріледі. Нәтиже — JSON-ға дайын тізім."""
    text = (text or '').strip()[:80]
    if not text:
        return []
    found, seen = [], set()
    for typed in [text, *text.split()]:
        for score, sid, card in find(typed):
            key = (sid, card['k'])
            if key in seen:
                continue
            seen.add(key)
            found.append({'slot': sid, 'k': card['k'], 'e': card['e'], 'typed': typed,
                          'exact': fold(typed) == fold(card['k']), 'score': score})
    found.sort(key=lambda r: r['score'])
    return found[:limit]
