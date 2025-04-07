from django.db import models
from django.utils.translation import gettext_lazy as _


class TokenListing(models.Model):
    """
    Model to store information about new token listings from exchanges
    """
    
    class ListingType(models.TextChoices):
        SPOT = 'spot', _('Spot')
        FUTURES = 'futures', _('Futures')
        PERPETUAL = 'perpetual', _('Perpetual')
        MARGIN = 'margin', _('Margin')
        UNKNOWN = 'unknown', _('Unknown')
    
    class Region(models.TextChoices):
        SINGAPORE = 'SG', _('Singapore')
        TURKEY = 'TR', _('Turkey')
    
    title = models.CharField(max_length=255)
    symbol = models.CharField(max_length=20)
    publication_date = models.DateTimeField()
    source_url = models.URLField()
    listing_type = models.CharField(
        max_length=20,
        choices=ListingType.choices,
        default=ListingType.UNKNOWN
    )
    region = models.CharField(
        max_length=5,
        choices=Region.choices
    )
    raw_date_str = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('symbol', 'listing_type', 'region')
        ordering = ['-publication_date']
        verbose_name = _('Token Listing')
        verbose_name_plural = _('Token Listings')
    
    def __str__(self):
        return f"{self.symbol} ({self.get_listing_type_display()}) - {self.get_region_display()}" 