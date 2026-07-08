import uuid
from django.db import models
from django.conf import settings

class TimelineEvent(models.Model):
    EVENT_TYPES = [
        ('UPLOAD', 'Document Uploaded'),
        ('AI', 'AI Summary Generated'),
        ('SOS', 'Emergency SOS Triggered'),
        ('PROFILE', 'Profile Updated'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='timeline_events')
    title = models.CharField(max_length=255)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    record_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.title} ({self.event_type})"
