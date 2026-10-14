"""Графикалық ЖИ-генератор.

Әдепкі провайдер — Pollinations.ai (Flux моделі): тегін, кілтсіз, сервер арқылы
шақырылады. Нәтиже media/art/ ішіне сақталады, сондықтан галерея сыртқы
сервиске тәуелді емес. Жаңа провайдер қосу үшін PROVIDERS-ке функция тіркеңіз.
"""
import logging
import time
from urllib.parse import quote

import requests
from django.conf import settings

log = logging.getLogger(__name__)


class ImageError(Exception):
    pass


def _pollinations(prompt, seed):
    url = f"https://image.pollinations.ai/prompt/{quote(prompt, safe='')}"
    params = {'width': settings.IMAGE_SIZE, 'height': settings.IMAGE_SIZE, 'seed': seed,
              'model': settings.POLLINATIONS_MODEL, 'nologo': 'true', 'safe': 'true', 'private': 'true'}
    headers = {'Authorization': f'Bearer {settings.POLLINATIONS_TOKEN}'} if settings.POLLINATIONS_TOKEN else {}
    deadline = time.monotonic() + settings.IMAGE_TIMEOUT
    last = 'белгісіз қате'
    for attempt in range(3):
        left = deadline - time.monotonic()
        if left < 5:
            break
        try:
            r = requests.get(url, params=params, headers=headers, timeout=left)
        except requests.RequestException as e:
            last = f'желі қатесі: {e}'
        else:
            if r.status_code == 200 and r.headers.get('content-type', '').startswith('image'):
                return r.content
            last = f'HTTP {r.status_code}'
        log.warning('Pollinations %s (әрекет %s)', last, attempt + 1)
        time.sleep(min(4 * (attempt + 1), max(0, deadline - time.monotonic() - 5)))
    raise ImageError(last)


def _none(prompt, seed):
    raise ImageError('генератор өшірулі (IMAGE_PROVIDER=none)')


PROVIDERS = {'pollinations': _pollinations, 'none': _none}


def generate(prompt, seed):
    """JPEG байттарын қайтарады немесе ImageError шығарады."""
    provider = PROVIDERS.get(settings.IMAGE_PROVIDER)
    if not provider:
        raise ImageError(f'белгісіз провайдер: {settings.IMAGE_PROVIDER}')
    return provider(prompt, seed)
