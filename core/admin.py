from django.contrib import admin
from django.utils.html import format_html

from .models import Artwork, Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('name', 'stars', 'created', 'syllables', 'first_letter', 'auto_speak', 'big_font')
    search_fields = ('name',)


@admin.register(Artwork)
class ArtworkAdmin(admin.ModelAdmin):
    list_display = ('thumb', 'sentence', 'student', 'mode', 'ok', 'seconds', 'fixes', 'created')
    list_filter = ('student', 'mode', 'ok')
    search_fields = ('sentence', 'prompt')
    readonly_fields = ('thumb', 'prompt', 'seed')

    @admin.display(description='Сурет')
    def thumb(self, obj):
        return format_html('<img src="{}" style="height:60px;border-radius:6px">', obj.image.url) if obj.image else '—'
