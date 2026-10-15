# МнемоСурет

**Дисграфиясы бар балаларға ЖИ графикалық генераторларын қолдануды үйретуге арналған мнемоникалық интерфейс** (Django).

Бала сөзді жазбайды: бес сұраққа суретті карточкалармен жауап береді, жүйе грамматикалық дұрыс қазақша сөйлем құрастырады, оны **ElevenLabs** арқылы қазақша дауыстап оқиды және графикалық ЖИ-генераторға қауіпсіз ағылшынша сұраныс жібереді.

## Мнемоникалық модель «Кемпірқосақ жолы»

| № | Жануар | Түс | Сұрақ | Рөлі |
|---|--------|-----|-------|------|
| 1 | 🦊 Түлкі | қызыл | КІМ? | кейіпкер |
| 2 | 🐝 Ара | сары | ҚАЙДА? | орын |
| 3 | 🐸 Бақа | жасыл | НЕ ІСТЕЙДІ? | әрекет |
| 4 | 🐳 Кит | көк | ҚАНДАЙ? | түс, көңіл-күй |
| 5 | 🦉 Үкі | күлгін | ҚАЛАЙ? | көркем стиль |

Мысал: карточкалар → «**Мысық ғарышта ұшады. Кемпірқосақ түсті суретті мультфильм стилінде саламыз.**» → `a cute cat flying in outer space, rainbow colors, cartoon style, children's book illustration, …`

## Мүмкіндіктер

- **Жазусыз енгізу:** 47 суретті карточка, буынға бөлу (мы-сық), бірінші әріпті түспен белгілеу.
- **Қазақша дауыс:** ElevenLabs `eleven_v3` (қазақ тілін қолдайтын жалғыз модель), `language_code=kk`, дауыс George, `stability=1.0`. Әр фраза бір рет синтезделіп `media/tts/` ішінде кэштеледі. БАС ӘРІППЕН жазылған сөздер әріптеп оқылмауы үшін кіші әріпке ауыстырылады. Жалғыз сөз контекстпен айтылады («Бұл сөз — мысық.»), өйткені v3 тым қысқа мәтінді бұрмалайды. Қазақша дауыс болмаса — орысша дауыспен бұрмалап оқымайды.
- **Айтылымды автоматты тексеру:** `build_tts` әр фразаны бірнеше рет синтездеп, ElevenLabs Scribe арқылы қайта таниды да, ең дәл нұсқаны сақтайды (есеп: `media/tts/_report.json`).
- **Қатеге төзімділік:** б↔д, қ→к, әріп түсіп қалуы/орын ауыстыруы ескерілетін Дамерау–Левенштейн іздеуі (`core/fuzzy.py`).
- **Дауыспен енгізу:** Web Speech API (`kk-KZ`, Chrome).
- **Қауіпсіз генерация:** сұраныс тек тексерілген карточка фрагменттерінен серверде құралады + «safe for kids» құйрығы.
- **Үйрену / Еркін режим**, ұпайлар, галерея, **мұғалім панелі** (графиктер, әр оқушыға бейімдеу баптаулары, бірнеше оқушы).

## Сурет генераторы

Әдепкі — **Pollinations.ai (Flux)**: тегін, кілтсіз, сервер арқылы шақырылады, нәтиже `media/art/` ішіне сақталады. Генератор жауап бермесе — эмодзиден офлайн эскиз салынады.
`POLLINATIONS_TOKEN` берсеңіз (enter.pollinations.ai), лимит артады және су белгісі алынады. Басқа провайдер қосу: `core/services/images.py` → `PROVIDERS`.

## Іске қосу (Windows, PowerShell)

```powershell
uv venv                                   # .venv жасау
uv pip install -r requirements.txt        # тәуелділіктер
copy .env.example .env                    # кілттерді .env-ге жазыңыз
.venv\Scripts\python manage.py migrate    # дерекқор
.venv\Scripts\python manage.py seed_demo  # (міндетті емес) демо-оқушы мен статистика
.venv\Scripts\python manage.py build_tts  # барлық фразаны алдын ала дыбыстау + тексеру
.venv\Scripts\python manage.py build_tts --weak  # күмәнді фразаларды жақсарту
.venv\Scripts\python manage.py runserver  # http://127.0.0.1:8000
```

Әкімші панелі: `python manage.py createsuperuser` → `/admin/`.
Тесттер: `.venv\Scripts\python manage.py test core`.

## `.env`

| Айнымалы | Мағынасы |
|----------|----------|
| `ELEVENLABS_API_KEY` | ElevenLabs кілті (`sk_…`, 51 таңба; Text to Speech + Speech to Text рұқсаты) |
| `ELEVENLABS_VOICE_ID` | дауыс ID (әдепкі George — сынақта қазақша ең анық) |
| `ELEVENLABS_STABILITY` | `1.0` — айтылым тұрақты |
| `ELEVENLABS_MODEL` | `eleven_v3` — қазақ тілін қолдайды |
| `IMAGE_PROVIDER` | `pollinations` немесе `none` |
| `POLLINATIONS_TOKEN` | міндетті емес |
| `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS` | Django |

## Құрылым

```
mnemo/              Django баптаулары
core/
  mnemonics.py      модель: қадамдар, карточкалар, сөйлем мен сұраныс құрау
  fuzzy.py          дисграфияға бейім іздеу
  services/tts.py   ElevenLabs + кэш
  services/images.py графикалық генератор
  models.py         Student, Artwork
  views.py          беттер және API (/api/tts, /api/suggest, /api/generate)
  templates/, static/
  management/commands/  build_tts, seed_demo
legacy/             бастапқы статикалық прототип (JS)
presentation/       қорғауға арналған презентация
```
