"""Барлық тұрақты фразаларды (сұрақтар, карточкалар, нұсқаулар) ElevenLabs арқылы
алдын ала дыбыстап, media/tts/ ішіне сақтайды. Сабақ кезінде кідіріс болмайды.

Әр фраза бірнеше рет синтезделіп, ElevenLabs Scribe арқылы қайта танылады —
ең дәл айтылған нұсқа сақталады (eleven_v3 әр жолы сәл басқаша оқиды).
Нәтижелер media/tts/_report.json файлына жазылады.

    python manage.py build_tts            # жоқтарын жасау
    python manage.py build_tts --weak     # тек күмәнді (< 0.9) фразаларды жақсартуға тырысу
    python manage.py build_tts --force    # бәрін қайта жасау
"""
import json
from concurrent.futures import ThreadPoolExecutor

from django.conf import settings
from django.core.management.base import BaseCommand

from core import mnemonics
from core.services import tts

GOOD = 0.9


class Command(BaseCommand):
    help = 'Тұрақты қазақша фразаларды ElevenLabs арқылы алдын ала дыбыстау және тексеру'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='бар файлдарды да қайта жасау')
        parser.add_argument('--weak', action='store_true', help='тек күмәнді фразаларды жақсартуға тырысу')
        parser.add_argument('--attempts', type=int, default=4, help='бір фразаға ең көп нұсқа саны')
        parser.add_argument('--no-verify', action='store_true', help='Scribe арқылы тексермеу')
        parser.add_argument('--workers', type=int, default=2, help='қатар жұмыс (тариф: ең көбі 3 сұрау)')

    def handle(self, *args, force, weak, attempts, no_verify, workers, **opts):
        texts = list(dict.fromkeys(mnemonics.all_static_texts()))
        report_path = settings.MEDIA_ROOT / 'tts' / '_report.json'
        report = json.loads(report_path.read_text('utf-8')) if report_path.exists() else {}

        if weak:
            todo = [t for t in texts if t in report and report[t]['score'] < GOOD]
        elif force:
            todo = texts
        else:
            todo = [t for t in texts if not tts.cached_url(t)]
        self.stdout.write(f'Фразалар: {len(texts)}, өңделетіні: {len(todo)}')

        def job(t):
            try:
                if no_verify:
                    tts.synthesize(t, force=True)
                    return t, None, ''
                # --weak: бұрынғы нұсқадан жақсырақ болса ғана ауыстырылады
                floor = report[t]['score'] if weak else None
                _, score, heard = tts.synthesize(t, verify=True, attempts=attempts, force=True, keep_above=floor)
                return t, score, heard
            except tts.TTSUnavailable as e:
                return t, -1, str(e)

        doubtful, failed = [], 0
        with ThreadPoolExecutor(workers) as ex:
            for t, score, heard in ex.map(job, todo):
                if score == -1:
                    failed += 1
                    self.stderr.write(self.style.ERROR(f'  ✗ {t}: {heard}'))
                    continue
                if score is None:
                    self.stdout.write(f'  ✓ {t}')
                    continue
                if not weak or score >= report[t]['score']:
                    report[t] = {'score': round(score, 3), 'heard': heard}
                score = report[t]['score']
                if score >= GOOD:
                    self.stdout.write(f'  ✓ {score:.2f}  {t}')
                else:
                    doubtful.append(t)
                    self.stdout.write(self.style.WARNING(f"  ~ {score:.2f}  {t}  →  естілгені: {report[t]['heard']}"))

        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=1), 'utf-8')
        if doubtful:
            self.stdout.write(self.style.WARNING(f'\nКүмәнді: {len(doubtful)}. Жақсартуға тырысу: build_tts --weak'))
        style = self.style.SUCCESS if not failed else self.style.ERROR
        self.stdout.write(style(f'Дайын: {len(todo) - len(doubtful) - failed} / {len(todo)}, '
                                f'күмәнді: {len(doubtful)}, қате: {failed}'))
