from rest_framework import serializers
from apps.vault.models import MedicalRecord, MedicalFile
from apps.intelligence.models import DocumentAnalysis

class MedicalFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalFile
        fields = ['id', 'file_url', 'uploaded_at']

class DocumentAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentAnalysis
        fields = [
            'id', 'ocr_text', 'structured_ai_json', 'ai_summary', 
            'diagnoses', 'medicines', 'recommendations', 'doctor_questions', 
            'confidence'
        ]

class MedicalRecordSerializer(serializers.ModelSerializer):
    file = MedicalFileSerializer(read_only=True)
    analysis = DocumentAnalysisSerializer(read_only=True)

    class Meta:
        model = MedicalRecord
        fields = ['id', 'file', 'metadata', 'record_type', 'processing_status', 'created_at', 'analysis']
        read_only_fields = ['id', 'processing_status', 'created_at']
