import json
from unittest import mock

from django.test import TestCase, override_settings

from . import fuzzy, mnemonics
from .models import Artwork, Student
from .services import images, tts


class SentenceTests(TestCase):
    def sel(self, **kw):
        return mnemonics.resolve(kw)

    def test_full_sentence_is_grammatical(self):
        c = self.sel(who='мысық', where='ғарыш', act='ұшады', look='кемпірқосақ', style='мультфильм')
        self.assertEqual(mnemonics.sentence_text(c),
                         'Мысық ғарышта ұшады. Кемпірқосақ түсті суретті мультфильм стилінде саламыз.')

    def test_partial_sentences(self):
        self.assertEqual(mnemonics.sentence_text(self.sel(who='ит', act='жүзеді')), 'Ит жүзеді.')
        self.assertEqual(mnemonics.sentence_text(self.sel(who='қыз', where='киіз үй', act='ән салады', look='түнгі')),
                         'Қыз киіз үйдің жанында ән салады. Түнгі сурет саламыз.')
        self.assertEqual(mnemonics.sentence_text(self.sel(who='аю', act='кітап оқиды', style='акварель')),
                         'Аю кітап оқиды. Суретті акварельмен саламыз.')

    def test_every_card_has_required_fields(self):
        for sid, cards in mnemonics.CARDS.items():
            for c in cards:
                self.assertTrue({'k', 'syl', 'e', 'en'} <= c.keys(), c)
                self.assertEqual(c['syl'].replace('-', ''), c['k'], 'буын сөзбен сәйкес емес')
                if sid == 'where':
                    self.assertIn('loc', c)
                if sid in ('look', 'style'):
                    self.assertIn('phr', c)

    def test_prompt_built_only_from_cards(self):
        c = self.sel(who='робот', act='билейді', where='бақ')
        p = mnemonics.build_prompt(c)
        self.assertTrue(p.startswith('a friendly robot dancing in a flower garden'))
        self.assertIn('safe for kids', p)
        self.assertEqual(mnemonics.resolve({'who': '<script>', 'act': 'ұшады'}), {'act': mnemonics.find_card('act', 'ұшады')})


class FuzzyTests(TestCase):
    def top(self, q):
        r = fuzzy.suggest(q)
        return r[0]['k'] if r else None

    def test_dysgraphia_errors(self):
        cases = {
            'мысык': 'мысық',     # орыс әрпі
            'дақ': 'бақ',         # б↔д айна әріп
            'орамн': 'орман',     # орын ауыстыру
            'жугиреди': 'жүгіреді',
            'кемпирқосак': 'кемпірқосақ',
            'айдахар': 'айдаһар',
            'теңізде': 'теңіз',   # септік түрі
        }
        for typed, want in cases.items():
            self.assertEqual(self.top(typed), want, typed)

    def test_empty_and_noise(self):
        self.assertEqual(fuzzy.suggest(''), [])
        self.assertEqual(fuzzy.suggest('щщщщщщщщ'), [])


class TTSTests(TestCase):
    def test_caps_are_lowercased_for_speech(self):
        self.assertEqual(tts.normalize('Қызыл түлкі сұрайды: суретте КІМ болады?'),
                         'Қызыл түлкі сұрайды: суретте кім болады?')
        self.assertEqual(tts.normalize('ол НЕ ІСТЕЙДІ?'), 'ол не істейді?')

    @override_settings(ELEVENLABS_API_KEY='')
    def test_api_without_key_returns_503(self):
        r = self.client.get('/api/tts/', {'t': 'сәлем'})
        self.assertEqual(r.status_code, 503)
        self.assertIsNone(r.json()['url'])


class PagesTests(TestCase):
    def test_pages_render(self):
        for url in ('/', '/learn/', '/create/', '/gallery/', '/teacher/'):
            with mock.patch.object(tts, 'status', return_value={'ok': True, 'msg': 'ok'}):
                r = self.client.get(url)
            self.assertEqual(r.status_code, 200, url)
        self.assertEqual(Student.objects.count(), 1)

    def test_generate_saves_artwork_and_stars(self):
        with mock.patch.object(images, 'generate', return_value=b'\xff\xd8fakejpeg'):
            r = self.client.post('/api/generate/', json.dumps({
                'selection': {'who': 'мысық', 'act': 'ұшады', 'where': 'ғарыш'},
                'stats': {'seconds': 30, 'cards': 3}, 'mode': 'learn',
            }), content_type='application/json')
        d = r.json()
        self.assertTrue(d['ok'])
        self.assertEqual(d['sentence'], 'Мысық ғарышта ұшады.')
        self.assertEqual(d['gained'], 6)
        a = Artwork.objects.get()
        self.assertTrue(a.image.name.startswith('art/'))
        a.image.delete(save=False)

    def test_generate_offline_fallback(self):
        with mock.patch.object(images, 'generate', side_effect=images.ImageError('down')):
            r = self.client.post('/api/generate/', json.dumps({'selection': {'who': 'ит', 'act': 'жүзеді'}}),
                                 content_type='application/json')
        self.assertFalse(r.json()['ok'])
        self.assertEqual(Artwork.objects.count(), 1)

    def test_generate_requires_who_and_act(self):
        r = self.client.post('/api/generate/', json.dumps({'selection': {'who': 'ит'}}), content_type='application/json')
        self.assertEqual(r.status_code, 400)
