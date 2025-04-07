from django.contrib import admin
from .models import CompetitorAd

@admin.register(CompetitorAd)
class CompetitorAdAdmin(admin.ModelAdmin):
    list_display = ('competitor_name', 'page_name', 'ad_delivery_date_start', 'impressions_upper', 'created_at')
    list_filter = ('competitor_name', 'page_name')
    search_fields = ('competitor_name', 'page_name', 'ad_creative_text')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('competitor_name', 'page_id', 'page_name', 'ad_snapshot_url')
        }),
        ('Ad Content', {
            'fields': ('ad_creative_text', 'ad_creative_image_url')
        }),
        ('Performance Data', {
            'fields': (
                ('impressions_lower', 'impressions_upper'),
                ('spend_lower', 'spend_upper', 'currency'),
                'publisher_platforms', 'demographic_distribution'
            )
        }),
        ('Timing', {
            'fields': ('ad_delivery_date_start', 'ad_delivery_date_end', 'created_at', 'updated_at')
        }),
    ) 