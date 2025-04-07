from django.db import models

class CompetitorAd(models.Model):
    """Model to store competitor ads from Meta Ad Library"""
    competitor_name = models.CharField(max_length=255)
    page_id = models.CharField(max_length=255)
    page_name = models.CharField(max_length=255)
    ad_snapshot_url = models.URLField(max_length=500)
    ad_creative_text = models.TextField(blank=True, null=True)
    ad_creative_image_url = models.URLField(max_length=500, blank=True, null=True)
    impressions_lower = models.IntegerField(blank=True, null=True)
    impressions_upper = models.IntegerField(blank=True, null=True)
    spend_lower = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    spend_upper = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=3, blank=True, null=True)
    ad_delivery_date_start = models.DateTimeField(blank=True, null=True)
    ad_delivery_date_end = models.DateTimeField(blank=True, null=True)
    publisher_platforms = models.JSONField(blank=True, null=True)
    demographic_distribution = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Competitor Ad"
        verbose_name_plural = "Competitor Ads"
        indexes = [
            models.Index(fields=['competitor_name']),
            models.Index(fields=['page_name']),
        ]

    def __str__(self):
        return f"{self.competitor_name} - {self.page_name}" 