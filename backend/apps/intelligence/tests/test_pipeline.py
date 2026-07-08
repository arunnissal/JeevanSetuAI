from unittest.mock import patch
import os
from django.test import TestCase
from django.contrib.auth import get_user_model
import requests
from apps.vault.models import MedicalFile, MedicalRecord
from apps.intelligence.models import DocumentAnalysis, OCRLog, ProcessingLog, AIRequestLog
from apps.intelligence.services.pipeline import IntelligencePipeline

User = get_user_model()

class IntelligencePipelineTestCase(TestCase):
    
    def setUp(self):
        # Set credentials
        self.patcher = patch.dict(os.environ, {
            "SARVAM_API_KEY": "sk_test_api_key",
            "SARVAM_MODEL": "test_model"
        })
        self.patcher.start()

        # Create user
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="Password123",
            full_name="John Doe"
        )
        
        # Create medical file
        self.medical_file = MedicalFile.objects.create(
            file_url="https://res.cloudinary.com/dummy/image/upload/v1/test.pdf"
        )

        # Create record
        self.record = MedicalRecord.objects.create(
            user=self.user,
            file=self.medical_file,
            record_type="blood_test",
            processing_status="pending"
        )

    def tearDown(self):
        self.patcher.stop()

    @patch('requests.post')
    def test_pipeline_runs_and_saves_successfully(self, mock_post):
        # Mock Sarvam response to return valid report analysis JSON
        mock_response = mock_post.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": """{
                        "summary": "This is a clean summary",
                        "diagnoses": ["Anemia"],
                        "medicines": ["Iron Supplements"],
                        "tests": ["Ferritin"],
                        "recommendations": ["Eat iron rich food"],
                        "doctor_questions": ["Check dietary habits?"],
                        "confidence": "HIGH",
                        "medical_disclaimer": "Safety note"
                    }"""
                }
            }]
        }

        # Run pipeline synchronously
        success = IntelligencePipeline.run(self.record.id)
        
        # 1. Assert return status
        self.assertTrue(success)
        
        # 2. Assert MedicalRecord status updated
        self.record.refresh_from_db()
        self.assertEqual(self.record.processing_status, "completed")
        
        # 3. Assert DocumentAnalysis saved
        analysis = DocumentAnalysis.objects.get(record=self.record)
        self.assertEqual(analysis.ai_summary, "This is a clean summary")
        self.assertEqual(analysis.diagnoses, ["Anemia"])
        self.assertEqual(analysis.confidence, 1.0) # HIGH translates to 1.0
        
        # 4. Assert logs created
        self.assertTrue(OCRLog.objects.filter(file=self.medical_file).exists())
        self.assertTrue(ProcessingLog.objects.filter(record=self.record, stage="Pipeline End").exists())
        self.assertTrue(AIRequestLog.objects.filter(user=self.user, status="success").exists())

    @patch('requests.post')
    def test_pipeline_handles_ai_failure_gracefully(self, mock_post):
        # Mock transient timeout or rate limit
        mock_post.side_effect = requests.exceptions.Timeout("Timed out")

        # Run pipeline synchronously
        success = IntelligencePipeline.run(self.record.id)
        
        # 1. Assert pipeline failed
        self.assertFalse(success)
        
        # 2. Assert MedicalRecord status set to failed
        self.record.refresh_from_db()
        self.assertEqual(self.record.processing_status, "failed")
        
        # 3. Assert error details recorded in ProcessingLog
        self.assertTrue(ProcessingLog.objects.filter(record=self.record, status="Failed").exists())
        # Assert failure details logged in AIRequestLog
        self.assertTrue(AIRequestLog.objects.filter(user=self.user, status="failed").exists())
