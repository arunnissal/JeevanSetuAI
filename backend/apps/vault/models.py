import uuid
from django.db import models
from django.conf import settings

class MedicalFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file_url = models.URLField(max_length=500)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"File {self.id} (Uploaded: {self.uploaded_at})"

class MedicalRecord(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    RECORD_TYPE_CHOICES = [
        ('blood_test', 'Blood Test'),
        ('lab_report', 'Lab Report'),
        ('prescription', 'Prescription'),
        ('discharge_summary', 'Discharge Summary'),
        ('doctor_consultation', 'Doctor Consultation Note'),
        ('vaccination', 'Vaccination Record'),
        ('medical_certificate', 'Medical Certificate'),
        ('radiology', 'Radiology Report'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='medical_records')
    file = models.OneToOneField(MedicalFile, on_delete=models.CASCADE, related_name='medical_record')
    metadata = models.JSONField(default=dict, blank=True)
    record_type = models.CharField(max_length=50, choices=RECORD_TYPE_CHOICES, default='other')
    processing_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Record {self.id} for {self.user.email}"
