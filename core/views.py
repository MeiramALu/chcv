import json
import random
import uuid
from collections import Counter
from datetime import timedelta

from django.contrib import messages
from django.core.files.base import ContentFile
from django.db.models import Avg, Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from . import fuzzy, mnemonics
from .context import SESSION_KEY, current_student
from .models import Artwork, Student
from .services import images, tts


# ---------- беттер ----------

def home(request):
    return render(request, 'core/home.html', {
        'slots': mnemonics.SLOTS,
        'card_count': mnemonics.card_count(),
    })


def studio(request, mode):
    st = current_student(request)
    return render(request, 'core/studio.html', {
        'mode': mode,
        'data': mnemonics.client_data(),
        'prefs': st.settings_dict(),
    })


def gallery(request):
    st = current_student(request)
    return render(request, 'core/gallery.html', {'artworks': st.artworks.all()[:60]})


def teacher(request):
    st = current_student(request)
    arts = st.artworks.all()
    return render(request, 'core/teacher.html', {
        'kpi': _kpis(st, arts),
        'charts': _charts(arts),
        'tts_status': tts.status(),
    })


def _kpis(st, arts):
    agg = arts.aggregate(sec=Avg('seconds'), fixes=Sum('fixes'))
    return [
        (arts.count(), 'Салынған суреттер'),
        (f"{round(agg['sec'] or 0)} с", 'Сөйлем құраудың орташа уақыты'),
        (agg['fixes'] or 0, 'Автоматты түзетілген сөздер'),
        (st.stars, 'Жиналған ұпай'),
    ]


def _charts(arts):
    today = timezone.localdate()
    days = [today - timedelta(days=i) for i in range(13, -1, -1)]
    by_day = {d: [] for d in days}
    words = Counter()
    inputs = Counter()
    for a in arts:
        d = timezone.localtime(a.created).date()
        if d in by_day:
            by_day[d].append(a.seconds)
        words.update(a.selection().values())
        inputs['card'] += max(0, a.cards - a.typed - a.voice)
        inputs['typed'] += a.typed
        inputs['voice'] += a.voice
    color_of = {c['k']: s['color'] for s in mnemonics.SLOTS for c in mnemonics.CARDS[s['id']]}
    top = words.most_common(7)
    return {
        'labels': [d.strftime('%d.%m') for d in days],
        'daily': [len(by_day[d]) for d in days],
        'time': [round(sum(v) / len(v)) if v else None for v in by_day.values()],
        'inputs': [inputs['card'], inputs['typed'], inputs['voice']],
        'top': {'labels': [w for w, _ in top], 'values': [n for _, n in top],
                'colors': [color_of.get(w, '#1F2A44') for w, _ in top]},
    }


# ---------- оқушылар мен баптаулар ----------

@require_POST
def switch_student(request):
    st = get_object_or_404(Student, pk=request.POST.get('student'))
    request.session[SESSION_KEY] = st.pk
    return redirect(request.POST.get('next') or 'home')


@require_POST
def add_student(request):
    name = request.POST.get('name', '').strip()[:60]
    if name:
        st = Student.objects.create(name=name)
        request.session[SESSION_KEY] = st.pk
        messages.success(request, f'«{name}» қосылды')
    return redirect('teacher')


@require_POST
def save_settings(request):
    st = current_student(request)
    for f in ('syllables', 'first_letter', 'auto_speak', 'big_font'):
        setattr(st, f, request.POST.get(f) == 'on')
    try:
        st.rate = min(1.3, max(0.6, float(request.POST.get('rate', st.rate))))
    except ValueError:
        pass
    st.save()
    messages.success(request, 'Баптаулар сақталды')
    return redirect('teacher')


@require_POST
def reset_stats(request):
    st = current_student(request)
    for a in st.artworks.all():
        a.image.delete(save=False)
    st.artworks.all().delete()
    st.stars = 0
    st.save(update_fields=['stars'])
    messages.success(request, 'Статистика тазаланды')
    return redirect('teacher')


# ---------- API ----------

@require_GET
def api_tts(request):
    text = request.GET.get('t', '')
    try:
        return JsonResponse({'url': tts.synthesize(text)})
    except tts.TTSUnavailable as e:
        return JsonResponse({'url': None, 'error': str(e)}, status=503)


@require_GET
def api_suggest(request):
    return JsonResponse({'items': fuzzy.suggest(request.GET.get('q', ''))})


@require_POST
def api_generate(request):
    try:
        body = json.loads(request.body or b'{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON қате'}, status=400)
    cards = mnemonics.resolve(body.get('selection'))
    if 'who' not in cards or 'act' not in cards:
        return JsonResponse({'error': '«Кім?» және «Не істейді?» қадамдары міндетті'}, status=400)

    st = current_student(request)
    stats = body.get('stats') or {}
    num = lambda k: max(0, min(10_000, int(stats.get(k) or 0)))
    mode = 'learn' if body.get('mode') == 'learn' else 'create'
    art = Artwork(
        student=st, mode=mode,
        sentence=mnemonics.sentence_text(cards), prompt=mnemonics.build_prompt(cards),
        seed=random.randint(1, 999_999),
        seconds=num('seconds'), cards=num('cards'), typed=num('typed'),
        fixes=num('fixes'), voice=num('voice'), hints=num('hints'),
        **{sid: c['k'] for sid, c in cards.items()},
    )
    error = None
    try:
        data = images.generate(art.prompt, art.seed)
        art.image.save(f'{uuid.uuid4().hex[:12]}.jpg', ContentFile(data), save=False)
        art.ok = True
    except images.ImageError as e:
        error = str(e)
    art.save()

    gained = 3 + (len(cards) if mode == 'learn' else 0)
    st.stars += gained
    st.save(update_fields=['stars'])
    return JsonResponse({
        'id': art.pk, 'ok': art.ok, 'image': art.image.url if art.ok else None, 'error': error,
        'sentence': art.sentence, 'prompt': art.prompt, 'stars': st.stars, 'gained': gained,
        'emojis': art.emojis(),
    })
