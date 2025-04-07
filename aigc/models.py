from django.db import models
from django.utils import timezone
from django.conf import settings

class AttributeCategory(models.Model):
    """Category for attributes (AssetType, Theme, USP, etc.)"""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Attribute Categories"
        ordering = ['name']

class Attribute(models.Model):
    """Individual attribute (Bitcoin, DeFi, Minimalist, etc.)"""
    category = models.ForeignKey(AttributeCategory, on_delete=models.CASCADE, related_name='attributes')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"{self.category.name} - {self.name}"
    
    class Meta:
        ordering = ['category__name', 'name']
        unique_together = ('category', 'name')

class AIGeneratedImage(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_images')
    prompt = models.TextField()
    image_url = models.URLField(max_length=500)
    branded_image_url = models.URLField(max_length=500, blank=True, null=True)
    headline = models.CharField(max_length=200, blank=True, null=True)
    tc_text = models.TextField(blank=True, null=True)
    resolution = models.CharField(max_length=10, default='1:1')
    model_used = models.CharField(max_length=50, default='flux-pro-1.1')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    feedback = models.TextField(blank=True, null=True)
    used_reference_image = models.BooleanField(default=False)
    attributes = models.ManyToManyField(Attribute, through='ImageAttribute', related_name='images')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"AI Image by {self.user.username} - {self.created_at.strftime('%Y-%m-%d')}"
    
    class Meta:
        ordering = ['-created_at']

class ImageAttribute(models.Model):
    """Relationship between images and attributes with confidence score"""
    image = models.ForeignKey(AIGeneratedImage, on_delete=models.CASCADE)
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE)
    confidence = models.FloatField(default=1.0)  # 0.0 to 1.0 score for auto-tagged attributes
    is_verified = models.BooleanField(default=False)  # Whether a human verified this attribute
    created_at = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"{self.image.id} - {self.attribute.name} ({self.confidence:.2f})"
    
    class Meta:
        unique_together = ('image', 'attribute')
        
class AIGeneratedHeadline(models.Model):
    image = models.ForeignKey(AIGeneratedImage, on_delete=models.CASCADE, related_name='headlines')
    text = models.CharField(max_length=200)
    created_at = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"Headline for {self.image.id}"
    
    class Meta:
        ordering = ['created_at']
