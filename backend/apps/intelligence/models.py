import uuid
from django.db import models
from django.conf import settings
from apps.vault.models import MedicalRecord, MedicalFile

class DocumentAnalysis(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record = models.OneToOneField(MedicalRecord, on_delete=models.CASCADE, related_name='analysis')
    ocr_text = models.TextField(blank=True)
    structured_ai_json = models.JSONField(default=dict, blank=True)
    ai_summary = models.TextField(blank=True)
    diagnoses = models.JSONField(default=list, blank=True)
    medicines = models.JSONField(default=list, blank=True)
    recommendations = models.JSONField(default=list, blank=True)
    doctor_questions = models.JSONField(default=list, blank=True)
    confidence = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Analysis {self.id} for Record {self.record_id}"

class AIRequestLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    prompt = models.TextField()
    raw_response = models.TextField(blank=True)
    status_code = models.IntegerField(null=True, blank=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    processing_time = models.FloatField(null=True, blank=True)
    provider = models.CharField(max_length=100, default='mock')
    status = models.CharField(max_length=50, default='failed')
    error = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AI Log {self.id} ({self.provider} - {self.status})"

class OCRLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.ForeignKey(MedicalFile, on_delete=models.CASCADE)
    extracted_text_length = models.IntegerField()
    raw_text = models.TextField(blank=True, null=True)
    confidence = models.FloatField(blank=True, null=True)
    execution_time = models.FloatField(blank=True, null=True)  # in seconds
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"OCR Log {self.id} for File {self.file_id}"

class ProcessingLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record = models.ForeignKey(MedicalRecord, on_delete=models.CASCADE, related_name='processing_logs')
    stage = models.CharField(max_length=100) # e.g. OCR, Sarvam AI, Summary
    status = models.CharField(max_length=50) # e.g. Success, Failed
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Process Log {self.id} ({self.stage} - {self.status})"
