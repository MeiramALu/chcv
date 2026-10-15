"""ElevenLabs арқылы қазақша дыбыстау + файлдық кэш (media/tts/).

Бір мәтін бір рет қана синтезделеді: келесі сұрауларда дайын mp3 беріледі,
сондықтан ElevenLabs лимиті үнемделеді. Кілт болмаса не қате болса — None,
ол кезде браузер өз дауысымен оқиды.
"""
import difflib
import hashlib
import logging
import re
import time

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

log = logging.getLogger(__name__)

API = 'https://api.elevenlabs.io/v1/text-to-speech/{voice}'
STT_API = 'https://api.elevenlabs.io/v1/speech-to-text'
MAX_LEN = 300
_CAPS = re.compile(r'\b[А-ЯӘӨҰҮҚҒҢҺІЁ]{2,}\b')
_blocked_until = 0.0  # кілт жарамсыз болса, API-ді біраз уақыт мазаламаймыз


class TTSUnavailable(Exception):
    pass


def normalize(text):
    """Дыбыстауға дайындау: БАС ӘРІППЕН жазылған сөздер аббревиатура болып
    әріптеп оқылмауы үшін кіші әріпке ауыстырылады, артық бос орын алынады."""
    text = _CAPS.sub(lambda m: m.group(0).lower(), text)
    return re.sub(r'\s+', ' ', text).strip()[:MAX_LEN]


def cache_name(text):
    key = (f"{settings.ELEVENLABS_VOICE_ID}|{settings.ELEVENLABS_MODEL}|{settings.ELEVENLABS_STABILITY}|"
           f"{normalize(text).lower()}")
    return f"tts/{hashlib.sha1(key.encode('utf-8')).hexdigest()[:16]}.mp3"


def cached_url(text):
    name = cache_name(text)
    return default_storage.url(name) if default_storage.exists(name) else None


def _request(text, with_language=True):
    body = {'text': text, 'model_id': settings.ELEVENLABS_MODEL,
            'voice_settings': {'stability': settings.ELEVENLABS_STABILITY}}
    if with_language and settings.ELEVENLABS_LANGUAGE:
        body['language_code'] = settings.ELEVENLABS_LANGUAGE
    return requests.post(
        API.format(voice=settings.ELEVENLABS_VOICE_ID),
        params={'output_format': 'mp3_44100_64'},
        headers={'xi-api-key': settings.ELEVENLABS_API_KEY, 'Content-Type': 'application/json'},
        json=body, timeout=40,
    )


def _generate(text):
    """Бір рет синтездеу → mp3 байттары."""
    global _blocked_until
    if not settings.ELEVENLABS_API_KEY:
        raise TTSUnavailable('ELEVENLABS_API_KEY берілмеген')
    if time.monotonic() < _blocked_until:
        raise TTSUnavailable('ElevenLabs уақытша қолжетімсіз')
    try:
        for attempt in range(6):
            r = _request(text)
            if r.status_code == 400 and 'language' in r.text.lower():
                r = _request(text, with_language=False)
            # тарифте қатар сұраулар саны шектеулі (429) — сәл күтіп, қайталаймыз
            if r.status_code != 429 or 'quota' in r.text.lower():
                break
            time.sleep(1.5 * (attempt + 1))
    except requests.RequestException as e:
        raise TTSUnavailable(f'желі қатесі: {e}') from e

    if r.status_code in (401, 402, 403) or (r.status_code == 429 and 'quota' in r.text.lower()):
        _blocked_until = time.monotonic() + 300
        log.warning('ElevenLabs %s: %s', r.status_code, r.text[:200])
        raise TTSUnavailable(f'ElevenLabs {r.status_code}')
    if r.status_code != 200 or not r.headers.get('content-type', '').startswith('audio'):
        log.warning('ElevenLabs %s: %s', r.status_code, r.text[:200])
        raise TTSUnavailable(f'ElevenLabs {r.status_code}')
    return r.content


def transcribe(audio):
    """ElevenLabs Scribe арқылы аудионы қайта мәтінге айналдыру (сапаны тексеру үшін)."""
    if not audio or len(audio) < 2000:  # бос немесе бүлінген файл
        return ''
    for attempt in range(6):
        r = requests.post(STT_API, headers={'xi-api-key': settings.ELEVENLABS_API_KEY},
                          data={'model_id': 'scribe_v1', 'language_code': settings.ELEVENLABS_LANGUAGE or 'kk'},
                          files={'file': ('a.mp3', audio, 'audio/mpeg')}, timeout=60)
        if r.status_code != 429:
            break
        time.sleep(1.5 * (attempt + 1))
    return r.json().get('text', '') if r.ok else ''


def similarity(want, got):
    """0…1: дыбысталған мәтін түпнұсқаға қаншалықты сәйкес."""
    clean = lambda t: re.sub(r'[^\w ]', '', t.lower()).split()
    return difflib.SequenceMatcher(None, ' '.join(clean(want)), ' '.join(clean(got))).ratio()


def synthesize(text, verify=False, attempts=3, force=False, keep_above=None):
    """mp3 файлының URL-ін қайтарады (кэштен немесе ElevenLabs-тен).

    verify=True: eleven_v3 әр жолы сәл басқаша оқиды, сондықтан бірнеше нұсқа
    жасалып, әрқайсысы Scribe арқылы қайта танылады; ең дәлі сақталады.
    keep_above: жаңа нұсқа осы бағадан жоғары болмаса, бар файл сақталады.
    Қайтарылатын мән: verify кезінде (url, score, естілгені), әйтпесе url.
    """
    text = normalize(text)
    if not text:
        raise TTSUnavailable('бос мәтін')
    url = None if force else cached_url(text)
    if url:
        return (url, None, '') if verify else url

    best, best_score, heard = None, -1.0, ''
    for _ in range(attempts if verify else 1):
        audio = _generate(text)
        if not verify:
            best = audio
            break
        got = transcribe(audio)
        score = similarity(text, got)
        if score > best_score:
            best, best_score, heard = audio, score, got
        if score >= 0.98:
            break

    name = cache_name(text)
    if keep_above is not None and best_score <= keep_above and default_storage.exists(name):
        return default_storage.url(name), best_score, heard
    if default_storage.exists(name):
        default_storage.delete(name)
    url = default_storage.url(default_storage.save(name, ContentFile(best)))
    return (url, best_score, heard) if verify else url


def status():
    """Мұғалім панелі үшін: кілт бар ма, жұмыс істей ме."""
    if not settings.ELEVENLABS_API_KEY:
        return {'ok': False, 'msg': 'Кілт .env файлында берілмеген — браузер дауысы қолданылады.'}
    try:
        r = requests.get('https://api.elevenlabs.io/v1/user/subscription',
                         headers={'xi-api-key': settings.ELEVENLABS_API_KEY}, timeout=10)
    except requests.RequestException:
        return {'ok': False, 'msg': 'ElevenLabs серверіне қосылу мүмкін болмады.'}
    if r.status_code == 200:
        d = r.json()
        left = d.get('character_limit', 0) - d.get('character_count', 0)
        return {'ok': True, 'msg': f"ElevenLabs қосулы. Қалған таңба: {left:,}".replace(',', ' ')}
    if r.status_code == 401 and 'invalid_api_key' in r.text:
        return {'ok': False, 'msg': 'ElevenLabs кілті жарамсыз. .env файлындағы ELEVENLABS_API_KEY-ді тексеріңіз.'}
    if r.status_code == 401:
        # кілтте user_read рұқсаты болмауы мүмкін — дыбыстау бәрібір жұмыс істеуі мүмкін
        return {'ok': True, 'msg': 'ElevenLabs кілті қосулы (жазылым туралы ақпаратқа рұқсат жоқ).'}
    return {'ok': False, 'msg': f'ElevenLabs жауабы: {r.status_code}'}
