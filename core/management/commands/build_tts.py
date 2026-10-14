"""Барлық тұрақты фразаларды (сұрақтар, карточкалар, нұсқаулар) ElevenLabs арқылы
алдын ала дыбыстап, media/tts/ ішіне сақтайды. Сабақ кезінде кідіріс болмайды.

    python manage.py build_tts
"""
from django.core.management.base import BaseCommand

from core import mnemonics
from core.services import tts


class Command(BaseCommand):
    help = 'Тұрақты қазақша фразаларды ElevenLabs арқылы алдын ала дыбыстау'

    def handle(self, *args, **opts):
        texts = list(dict.fromkeys(mnemonics.all_static_texts()))
        made = cached = 0
        for t in texts:
            if tts.cached_url(t):
                cached += 1
                continue
            try:
                tts.synthesize(t)
                made += 1
                self.stdout.write(f'  ✓ {t}')
            except tts.TTSUnavailable as e:
                self.stderr.write(self.style.ERROR(f'  ✗ {t}: {e}'))
                if 'ElevenLabs 4' in str(e) or 'берілмеген' in str(e):
                    break
        self.stdout.write(self.style.SUCCESS(f'Жаңа: {made}, бұрыннан бар: {cached}, барлығы: {len(texts)}'))
