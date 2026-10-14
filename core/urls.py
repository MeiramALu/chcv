from django.urls import path

from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('learn/', views.studio, {'mode': 'learn'}, name='learn'),
    path('create/', views.studio, {'mode': 'create'}, name='create'),
    path('gallery/', views.gallery, name='gallery'),
    path('teacher/', views.teacher, name='teacher'),

    path('student/switch/', views.switch_student, name='switch_student'),
    path('student/add/', views.add_student, name='add_student'),
    path('student/settings/', views.save_settings, name='save_settings'),
    path('student/reset/', views.reset_stats, name='reset_stats'),

    path('api/tts/', views.api_tts, name='api_tts'),
    path('api/suggest/', views.api_suggest, name='api_suggest'),
    path('api/generate/', views.api_generate, name='api_generate'),
]
