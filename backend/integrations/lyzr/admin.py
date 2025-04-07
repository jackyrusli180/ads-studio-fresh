from django.contrib import admin
from .models import LyzrTokenAnalysis

@admin.register(LyzrTokenAnalysis)
class LyzrTokenAnalysisAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'timestamp')
    list_filter = ('timestamp',)
    search_fields = ('raw_content',)
    readonly_fields = ('timestamp',)
    fieldsets = (
        (None, {
            'fields': ('raw_content', 'timestamp'),
        }),
    ) 