from django.db import models

class LyzrTokenAnalysis(models.Model):
    """
    Model for storing token analysis data from Lyzr agent
    """
    raw_content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Lyzr Token Analysis'
        verbose_name_plural = 'Lyzr Token Analyses'

    def __str__(self):
        return f"Analysis from {self.timestamp.strftime('%Y-%m-%d %H:%M')}" 