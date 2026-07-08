import uuid
from django.db import models
from django.conf import settings

class EmergencyProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='emergency_profile')
    emergency_contact_name = models.CharField(max_length=255, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    blood_group = models.CharField(max_length=5, blank=True, null=True)
    allergies = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        # Automatically sync from HealthProfile if they exist
        try:
            health_profile = self.user.health_profile
            if health_profile:
                self.blood_group = health_profile.blood_group
                self.allergies = health_profile.allergies
        except AttributeError:
            pass
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email}'s Emergency Profile"
