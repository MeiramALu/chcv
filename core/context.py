from .models import Student

SESSION_KEY = 'student_id'


def current_student(request):
    """Сессиядағы оқушы; жоқ болса — біріншісі немесе жаңадан «Оқушы»."""
    sid = request.session.get(SESSION_KEY)
    st = Student.objects.filter(pk=sid).first() if sid else None
    if not st:
        st = Student.objects.order_by('pk').first() or Student.objects.create(name='Оқушы')
        request.session[SESSION_KEY] = st.pk
    return st


def student(request):
    if request.path.startswith(('/admin', '/static', '/media')):
        return {}
    return {'student': current_student(request), 'students': Student.objects.all()}
