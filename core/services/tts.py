"""ElevenLabs арқылы қазақша дыбыстау + файлдық кэш (media/tts/).

Бір мәтін бір рет қана синтезделеді: келесі сұрауларда дайын mp3 беріледі,
сондықтан ElevenLabs лимиті үнемделеді. Кілт болмаса не қате болса — None,
ол кезде браузер өз дауысымен оқиды.
"""
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
    key = f"{settings.ELEVENLABS_VOICE_ID}|{settings.ELEVENLABS_MODEL}|{normalize(text).lower()}"
    return f"tts/{hashlib.sha1(key.encode('utf-8')).hexdigest()[:16]}.mp3"


def cached_url(text):
    name = cache_name(text)
    return default_storage.url(name) if default_storage.exists(name) else None


def _request(text, with_language=True):
    body = {'text': text, 'model_id': settings.ELEVENLABS_MODEL}
    if with_language and settings.ELEVENLABS_LANGUAGE:
        body['language_code'] = settings.ELEVENLABS_LANGUAGE
    return requests.post(
        API.format(voice=settings.ELEVENLABS_VOICE_ID),
        params={'output_format': 'mp3_44100_64'},
        headers={'xi-api-key': settings.ELEVENLABS_API_KEY, 'Content-Type': 'application/json'},
        json=body, timeout=40,
    )


def synthesize(text):
    """mp3 файлының URL-ін қайтарады (кэштен немесе ElevenLabs-тен)."""
    global _blocked_until
    text = normalize(text)
    if not text:
        raise TTSUnavailable('бос мәтін')
    url = cached_url(text)
    if url:
        return url
    if not settings.ELEVENLABS_API_KEY:
        raise TTSUnavailable('ELEVENLABS_API_KEY берілмеген')
    if time.monotonic() < _blocked_until:
        raise TTSUnavailable('ElevenLabs уақытша қолжетімсіз')

    try:
        r = _request(text)
        if r.status_code == 400 and 'language' in r.text.lower():
            r = _request(text, with_language=False)
    except requests.RequestException as e:
        raise TTSUnavailable(f'желі қатесі: {e}') from e

    if r.status_code in (401, 402, 403, 429):
        _blocked_until = time.monotonic() + 300
        log.warning('ElevenLabs %s: %s', r.status_code, r.text[:200])
        raise TTSUnavailable(f'ElevenLabs {r.status_code}')
    if r.status_code != 200 or not r.headers.get('content-type', '').startswith('audio'):
        log.warning('ElevenLabs %s: %s', r.status_code, r.text[:200])
        raise TTSUnavailable(f'ElevenLabs {r.status_code}')

    name = default_storage.save(cache_name(text), ContentFile(r.content))
    return default_storage.url(name)


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
