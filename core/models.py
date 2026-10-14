import json

from django.db import models

from .mnemonics import SLOT_IDS, resolve, sentence_segments, SLOT_BY_ID


class Student(models.Model):
    name = models.CharField('Аты', max_length=60)
    created = models.DateTimeField('Қосылған уақыты', auto_now_add=True)
    stars = models.PositiveIntegerField('Ұпай', default=0)

    # бейімдеу баптаулары (мұғалім әр оқушыға бөлек қояды)
    syllables = models.BooleanField('Сөзді буынға бөлу', default=True)
    first_letter = models.BooleanField('Бірінші әріпті түспен белгілеу', default=True)
    auto_speak = models.BooleanField('Таңдалған сөзді дауыстап оқу', default=True)
    big_font = models.BooleanField('Үлкен қаріп және кең аралық', default=False)
    rate = models.FloatField('Оқу жылдамдығы', default=0.9)

    SETTINGS = ('syllables', 'first_letter', 'auto_speak', 'big_font', 'rate')

    class Meta:
        verbose_name = 'Оқушы'
        verbose_name_plural = 'Оқушылар'
        ordering = ['name']

    def __str__(self):
        return self.name

    def settings_dict(self):
        return {k: getattr(self, k) for k in self.SETTINGS}


class Artwork(models.Model):
    MODES = [('learn', 'Үйрену'), ('create', 'Еркін')]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='artworks', verbose_name='Оқушы')
    created = models.DateTimeField('Уақыты', auto_now_add=True)
    mode = models.CharField('Режим', max_length=10, choices=MODES, default='create')

    who = models.CharField('Кім?', max_length=40, blank=True)
    where = models.CharField('Қайда?', max_length=40, blank=True)
    act = models.CharField('Не істейді?', max_length=40, blank=True)
    look = models.CharField('Қандай?', max_length=40, blank=True)
    style = models.CharField('Қалай?', max_length=40, blank=True)

    sentence = models.CharField('Сөйлем', max_length=300)
    prompt = models.TextField('Генераторға сұраныс')
    seed = models.PositiveIntegerField(default=0)
    image = models.FileField('Сурет', upload_to='art/%Y/%m/', blank=True)
    ok = models.BooleanField('Генератор сәтті', default=False)

    # сессия метрикасы — мұғалім панелі үшін
    seconds = models.PositiveIntegerField('Құрау уақыты, с', default=0)
    cards = models.PositiveIntegerField('Карточкамен таңдау', default=0)
    typed = models.PositiveIntegerField('Жазып енгізу', default=0)
    fixes = models.PositiveIntegerField('Түзетілген сөз', default=0)
    voice = models.PositiveIntegerField('Дауыспен енгізу', default=0)
    hints = models.PositiveIntegerField('Көмек тыңдау', default=0)

    class Meta:
        verbose_name = 'Сурет'
        verbose_name_plural = 'Суреттер'
        ordering = ['-created']

    def __str__(self):
        return self.sentence

    def selection(self):
        return {sid: getattr(self, sid) for sid in SLOT_IDS if getattr(self, sid)}

    def segments(self):
        out = []
        for s in sentence_segments(resolve(self.selection())):
            slot = SLOT_BY_ID.get(s['slot'])
            out.append({**s, 'color': slot['color'] if slot else '', 'soft': slot['soft'] if slot else ''})
        return out

    def emojis(self):
        return {sid: c['e'] for sid, c in resolve(self.selection()).items()}

    def emojis_json(self):
        return json.dumps(self.emojis(), ensure_ascii=False)
