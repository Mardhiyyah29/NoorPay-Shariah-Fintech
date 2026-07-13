import uuid
from django.db import models
from django.conf import settings


class Notification(models.Model):
    TYPES = [
        ('transaction','Transaction'),('budget','Budget Alert'),('zakat','Zakat'),
        ('scholarship','Scholarship'),('savings','Savings'),('system','System'),('reward','Reward'),
    ]
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type       = models.CharField(max_length=20, choices=TYPES, default='system')
    title      = models.CharField(max_length=200)
    body       = models.TextField()
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
