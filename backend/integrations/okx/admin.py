from django.contrib import admin
from .models import TokenListing


@admin.register(TokenListing)
class TokenListingAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'listing_type', 'region', 'publication_date')
    list_filter = ('listing_type', 'region', 'publication_date')
    search_fields = ('symbol', 'title')
    date_hierarchy = 'publication_date'
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('symbol', 'title', 'publication_date', 'source_url', 'listing_type', 'region'),
        }),
        ('Additional Information', {
            'fields': ('raw_date_str', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    ) 