from django.test import TestCase
from apps.intelligence.providers.provider_interface import BaseAIProvider
from apps.intelligence.services.ai_gateway import AIGateway
from apps.intelligence.models import AIRequestLog
from apps.intelligence.exceptions import (
    AITimeout, AIRateLimited, AIInvalidResponse, AIParsingError, AIProviderUnavailable
)

class MockProvider(BaseAIProvider):
    name = "mock_provider"

    def __init__(self, mode="valid"):
        self.mode = mode
        self.calls_count = 0

    def analyze_medical_report(self, prompt: str, ocr_text: str, metadata: dict = None) -> str:
        self.calls_count += 1
        
        if self.mode == "valid":
            return """{
                "summary": "This is a clean summary",
                "diagnoses": ["Anemia"],
                "medicines": ["Iron Supplements"],
                "tests": ["Ferritin"],
                "recommendations": ["Eat iron rich food"],
                "doctor_questions": ["Check dietary habits?"],
                "confidence": "HIGH",
                "medical_disclaimer": "Safety note"
            }"""
            
        elif self.mode == "markdown":
            return """```json
            {
                "summary": "Clean summary",
                "diagnoses": [],
                "medicines": [],
                "tests": [],
                "recommendations": [],
                "doctor_questions": [],
                "confidence": "LOW"
            }
            ```"""
            
        elif self.mode == "malformed":
            return "{invalid_json: true,"

        elif self.mode == "timeout":
            raise AITimeout("Connection timed out")

        elif self.mode == "empty":
            return ""

        elif self.mode == "missing":
            # Missing confidence and disclaimer - should get default fallback values
            return """{
                "summary": "Partial summary"
            }"""
            
        elif self.mode == "rate_limit":
            raise AIRateLimited("Too many requests")
            
        elif self.mode == "transient":
            # Fail on first call, succeed on second call
            if self.calls_count == 1:
                raise AITimeout("Transient timeout")
            return '{"summary": "Succeeded after retry"}'

        return ""

    def health_assistant_chat(self, chat_history: list, user_message: str) -> str:
        return "Hi there!"

class AIGatewayTestCase(TestCase):
    
    def test_valid_json_response(self):
        provider = MockProvider("valid")
        gateway = AIGateway(provider)
        
        result = gateway.process_report_analysis("test_prompt", "ocr_text")
        
        self.assertEqual(result["summary"], "This is a clean summary")
        self.assertEqual(result["confidence"], "HIGH")
        self.assertEqual(AIRequestLog.objects.filter(status="success").count(), 1)
        
    def test_markdown_json_response(self):
        provider = MockProvider("markdown")
        gateway = AIGateway(provider)
        
        result = gateway.process_report_analysis("test_prompt", "ocr_text")
        
        self.assertEqual(result["summary"], "Clean summary")
        self.assertEqual(result["confidence"], "LOW")
        self.assertEqual(result["medical_disclaimer"], JSONValidator.DEFAULT_DISCLAIMER if hasattr(JSONValidator, 'DEFAULT_DISCLAIMER') else "This information is AI-generated for educational purposes and should not replace professional medical advice.")
        self.assertEqual(AIRequestLog.objects.filter(status="success").count(), 1)

    def test_malformed_json_raises_parsing_error(self):
        provider = MockProvider("malformed")
        gateway = AIGateway(provider)
        
        with self.assertRaises(AIParsingError):
            gateway.process_report_analysis("test_prompt", "ocr_text")
            
        self.assertEqual(AIRequestLog.objects.filter(status="failed", status_code=422).count(), 1)

    def test_timeout_raises_timeout_error_and_logs(self):
        provider = MockProvider("timeout")
        gateway = AIGateway(provider)
        
        with self.assertRaises(AITimeout):
            gateway.process_report_analysis("test_prompt", "ocr_text", retries=2)
            
        # Verify it retried 2 times
        self.assertEqual(provider.calls_count, 2)
        self.assertEqual(AIRequestLog.objects.filter(status="failed", status_code=408).count(), 1)

    def test_empty_response_raises_invalid_response(self):
        provider = MockProvider("empty")
        gateway = AIGateway(provider)
        
        with self.assertRaises(AIInvalidResponse):
            gateway.process_report_analysis("test_prompt", "ocr_text")
            
        self.assertEqual(AIRequestLog.objects.filter(status="failed", status_code=204).count(), 1)

    def test_missing_fields_defaults_successfully(self):
        provider = MockProvider("missing")
        gateway = AIGateway(provider)
        
        result = gateway.process_report_analysis("test_prompt", "ocr_text")
        
        self.assertEqual(result["summary"], "Partial summary")
        self.assertEqual(result["confidence"], "MEDIUM") # Default confidence
        self.assertEqual(result["diagnoses"], []) # Default list
        self.assertEqual(AIRequestLog.objects.filter(status="success").count(), 1)

    def test_rate_limiting_raises_rate_limit(self):
        provider = MockProvider("rate_limit")
        gateway = AIGateway(provider)
        
        with self.assertRaises(AIRateLimited):
            gateway.process_report_analysis("test_prompt", "ocr_text")
            
        self.assertEqual(AIRequestLog.objects.filter(status="failed", status_code=429).count(), 1)

    def test_transient_error_succeeds_on_retry(self):
        provider = MockProvider("transient")
        gateway = AIGateway(provider)
        
        result = gateway.process_report_analysis("test_prompt", "ocr_text", retries=3)
        
        self.assertEqual(result["summary"], "Succeeded after retry")
        self.assertEqual(provider.calls_count, 2)
        self.assertEqual(AIRequestLog.objects.filter(status="success").count(), 1)

from apps.intelligence.utils.json_validator import JSONValidator
