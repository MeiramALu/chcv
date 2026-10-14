"""Көрсетілімге арналған демо-оқушы: 14 күндік статистика және 8 дайын сурет.

    python manage.py seed_demo
"""
import random
from datetime import timedelta
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone

from core import mnemonics
from core.models import Artwork, Student

DEMO_DIR = Path(__file__).resolve().parents[2] / 'demo'
SETS = [
    ['мысық', 'ғарыш', 'ұшады', 'кемпірқосақ', 'мультфильм'],
    ['айдаһар', 'сарай', 'ұйықтайды', 'түнгі', 'ертегі'],
    ['түйе', 'дала', 'жүгіреді', 'күндізгі', 'акварель'],
    ['робот', 'бақ', 'сурет салады', 'көңілді', 'көлемді'],
    ['аю', 'орман', 'кітап оқиды', 'күзгі', 'балауыз'],
    ['ат', 'тау', 'жүгіреді', 'қысқы', 'қарындаш'],
    ['қыз', 'киіз үй', 'ән салады', 'алтын', 'ертегі'],
    ['ит', 'теңіз', 'жүзеді', 'көк', 'пиксель'],
]


class Command(BaseCommand):
    help = 'Демо-оқушы мен статистика жасау'

    def handle(self, *args, **opts):
        Student.objects.filter(name='Демо оқушы').delete()
        st = Student.objects.create(name='Демо оқушы')
        rnd = random.Random(7)
        now = timezone.now()
        n = 0
        for d in range(13, -1, -1):
            progress = (13 - d) / 13
            for k in range(1 + rnd.randrange(4) + (d < 6)):
                sel = {sid: rnd.choice(mnemonics.CARDS[sid])['k'] for sid in mnemonics.SLOT_IDS}
                typed = 1 + rnd.randrange(2) if rnd.random() < 0.2 + progress * 0.3 else 0
                self._art(st, sel, now - timedelta(days=d, hours=k), seconds=round(95 - 55 * progress + rnd.random() * 18),
                          cards=5 + rnd.randrange(3), typed=typed, fixes=min(typed, round(typed * (0.6 + rnd.random() * 0.4))),
                          voice=int(rnd.random() < 0.25))
                n += 1
        for i, words in enumerate(SETS, 1):
            sel = dict(zip(mnemonics.SLOT_IDS, words))
            img = DEMO_DIR / f'{i}.jpg'
            self._art(st, sel, now - timedelta(minutes=10 * (len(SETS) - i)), seconds=40, cards=5, image=img)
            n += 1
        st.stars = n * 3 + 15
        st.save()
        self.stdout.write(self.style.SUCCESS(f'«{st.name}»: {n} жазба жасалды'))

    def _art(self, st, sel, when, image=None, **stats):
        cards = mnemonics.resolve(sel)
        a = Artwork(student=st, sentence=mnemonics.sentence_text(cards), prompt=mnemonics.build_prompt(cards),
                    seed=0, **{k: c['k'] for k, c in cards.items()}, **stats)
        if image and image.exists():
            a.image.save(f'demo_{image.name}', ContentFile(image.read_bytes()), save=False)
            a.ok = True
        a.save()
        Artwork.objects.filter(pk=a.pk).update(created=when)
