import uuid
from django.db import models
from django.conf import settings


class Scholarship(models.Model):
    STATUS = [
        ('not_applied','Not Applied'),('applied','Applied'),
        ('in_review','In Review'),('awarded','Awarded'),('rejected','Rejected'),
    ]
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='scholarships')
    name         = models.CharField(max_length=200)
    organization = models.CharField(max_length=150, blank=True)
    amount       = models.CharField(max_length=50, blank=True)
    deadline     = models.DateField(null=True, blank=True)
    status       = models.CharField(max_length=15, choices=STATUS, default='not_applied')
    progress     = models.PositiveSmallIntegerField(default=0)
    notes        = models.TextField(blank=True)
    link         = models.URLField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'scholarships'
        ordering = ['deadline', '-created_at']
