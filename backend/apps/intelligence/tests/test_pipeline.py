import os
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
import requests
import io
from PIL import Image
import fitz # PyMuPDF
from apps.vault.models import MedicalFile, MedicalRecord
from apps.intelligence.models import DocumentAnalysis, OCRLog, ProcessingLog, AIRequestLog
from apps.intelligence.services.pipeline import IntelligencePipeline
from apps.intelligence.exceptions import OCRValidationException

User = get_user_model()

class IntelligencePipelineTestCase(TestCase):
    
    def setUp(self):
        # Setup credentials
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
        
        # Paths
        self.db_path = r"D:\Coding\Projects\JeevanAI\tesseract_mock_db.txt"

        # Generate dummy PNG bytes
        img = Image.new('RGB', (10, 10), color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        self.png_bytes = buf.getvalue()

        # Generate dummy PDF bytes using PyMuPDF
        doc = fitz.open()
        doc.new_page()
        self.pdf_bytes = doc.write()

    def tearDown(self):
        self.patcher.stop()
        if os.path.exists(self.db_path):
            try:
                os.remove(self.db_path)
            except:
                pass

    def _write_mock_ocr_db(self, text):
        with open(self.db_path, "w", encoding="utf-8") as f:
            f.write(text)

    @patch('requests.post')
    @patch('requests.get')
    def test_pipeline_blood_test_success(self, mock_get, mock_post):
        # 1. Mock file download
        mock_response_get = MagicMock()
        mock_response_get.status_code = 200
        mock_response_get.content = self.pdf_bytes
        mock_get.return_value = mock_response_get

        # 2. Mock Sarvam AI response
        mock_response_post = MagicMock()
        mock_response_post.status_code = 200
        mock_response_post.json.return_value = {
            "choices": [{
                "message": {
                    "content": '{"summary": "Blood test results normal", "diagnoses": [], "medicines": [], "confidence": "HIGH"}'
                }
            }]
        }
        mock_post.return_value = mock_response_post

        # Write mock OCR text to db file
        blood_text = "Complete Blood Count (CBC) Report.\nHemoglobin: 14.5 g/dL (Reference: 13.5-17.5)\nWBC Count: 6.5 x10^3 /mcL."
        self._write_mock_ocr_db(blood_text)

        # Create record
        file_obj = MedicalFile.objects.create(file_url="https://res.cloudinary.com/dummy/blood_report.pdf")
        record = MedicalRecord.objects.create(
            user=self.user,
            file=file_obj,
            record_type="blood_test",
            processing_status="pending"
        )

        success = IntelligencePipeline.run(record.id)
        
        self.assertTrue(success)
        record.refresh_from_db()
        self.assertEqual(record.processing_status, "completed")
        
        analysis = DocumentAnalysis.objects.get(record=record)
        self.assertIn("Hemoglobin", analysis.ocr_text)
        self.assertEqual(analysis.ai_summary, "Blood test results normal")

    @patch('requests.post')
    @patch('requests.get')
    def test_pipeline_prescription_success(self, mock_get, mock_post):
        mock_response_get = MagicMock()
        mock_response_get.status_code = 200
        mock_response_get.content = self.png_bytes
        mock_get.return_value = mock_response_get

        mock_response_post = MagicMock()
        mock_response_post.status_code = 200
        mock_response_post.json.return_value = {
            "choices": [{
                "message": {
                    "content": '{"summary": "Prescribed Paracetamol OD", "diagnoses": ["Fever"], "medicines": ["Paracetamol"], "confidence": "MEDIUM"}'
                }
            }]
        }
        mock_post.return_value = mock_response_post

        # Write mock prescription OCR text
        prescription_text = "Rx\nTab Paracetamol 650mg - OD for 3 days."
        self._write_mock_ocr_db(prescription_text)

        file_obj = MedicalFile.objects.create(file_url="https://res.cloudinary.com/dummy/prescription.png")
        record = MedicalRecord.objects.create(
            user=self.user,
            file=file_obj,
            record_type="prescription",
            processing_status="pending"
        )

        success = IntelligencePipeline.run(record.id)
        
        self.assertTrue(success)
        record.refresh_from_db()
        self.assertEqual(record.processing_status, "completed")
        
        analysis = DocumentAnalysis.objects.get(record=record)
        self.assertIn("Paracetamol", analysis.ocr_text)

    @patch('requests.post')
    @patch('requests.get')
    def test_pipeline_radiology_success(self, mock_get, mock_post):
        mock_response_get = MagicMock()
        mock_response_get.status_code = 200
        mock_response_get.content = self.png_bytes
        mock_get.return_value = mock_response_get

        mock_response_post = MagicMock()
        mock_response_post.status_code = 200
        mock_response_post.json.return_value = {
            "choices": [{
                "message": {
                    "content": '{"summary": "Normal MRI Study", "diagnoses": [], "medicines": [], "confidence": "HIGH"}'
                }
            }]
        }
        mock_post.return_value = mock_response_post

        radiology_text = "MRI BRAIN CLINICAL STUDY.\nFindings: normal study."
        self._write_mock_ocr_db(radiology_text)

        file_obj = MedicalFile.objects.create(file_url="https://res.cloudinary.com/dummy/mri.jpg")
        record = MedicalRecord.objects.create(
            user=self.user,
            file=file_obj,
            record_type="radiology",
            processing_status="pending"
        )

        success = IntelligencePipeline.run(record.id)
        
        self.assertTrue(success)
        record.refresh_from_db()
        self.assertEqual(record.processing_status, "completed")
        
        analysis = DocumentAnalysis.objects.get(record=record)
        self.assertIn("MRI BRAIN", analysis.ocr_text)

    @patch('requests.get')
    def test_pipeline_blank_or_invalid_ocr_rejected(self, mock_get):
        mock_response_get = MagicMock()
        mock_response_get.status_code = 200
        mock_response_get.content = self.png_bytes
        mock_get.return_value = mock_response_get

        # Write blank/meaningless text
        self._write_mock_ocr_db("     \n   ")

        file_obj = MedicalFile.objects.create(file_url="https://res.cloudinary.com/dummy/blank.png")
        record = MedicalRecord.objects.create(
            user=self.user,
            file=file_obj,
            record_type="blood_test",
            processing_status="pending"
        )

        success = IntelligencePipeline.run(record.id)
        
        # Should fail due to OCR Validation
        self.assertFalse(success)
        record.refresh_from_db()
        self.assertEqual(record.processing_status, "failed")
        
        # Verify log entry in OCRLog shows failure
        self.assertTrue(OCRLog.objects.filter(file=file_obj, status="Failed (Blank or unreadable)").exists())
        self.assertTrue(ProcessingLog.objects.filter(record=record, status="Failed").exists())
