from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.vault.models import MedicalRecord
from apps.intelligence.models import DocumentAnalysis
from apps.timeline.models import TimelineEvent

@receiver(post_save, sender=MedicalRecord)
def create_medical_record_event(sender, instance, created, **kwargs):
    if created:
        record_type_display = instance.get_record_type_display()
        TimelineEvent.objects.create(
            user=instance.user,
            title=f"{record_type_display} Uploaded",
            event_type='UPLOAD',
            record_id=instance.id
        )

@receiver(post_save, sender=DocumentAnalysis)
def create_document_analysis_event(sender, instance, created, **kwargs):
    if created:
        TimelineEvent.objects.create(
            user=instance.record.user,
            title="AI Summary Generated",
            event_type='AI',
            record_id=instance.record.id
        )
