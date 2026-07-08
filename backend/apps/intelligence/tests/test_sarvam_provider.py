import os
from unittest.mock import patch
from django.test import TestCase
import requests
from apps.intelligence.providers.sarvam_provider import SarvamProvider
from apps.intelligence.exceptions import (
    AIProviderUnavailable, AIRateLimited, AITimeout, AIInvalidResponse
)

class SarvamProviderTestCase(TestCase):
    
    def setUp(self):
        # Set environment variables for all provider tests to prevent initialization errors
        self.patcher = patch.dict(os.environ, {
            "SARVAM_API_KEY": "sk_test_api_key",
            "SARVAM_MODEL": "test_env_model"
        })
        self.patcher.start()

    def tearDown(self):
        self.patcher.stop()

    def test_api_key_loads_from_env(self):
        provider = SarvamProvider()
        self.assertEqual(provider.api_key, "sk_test_api_key")
        self.assertEqual(provider.model, "test_env_model")

    @patch('requests.post')
    def test_authentication_and_generation_succeeds(self, mock_post):
        mock_response = mock_post.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": "Clean summary output"
                }
            }]
        }

        provider = SarvamProvider()
        result = provider.analyze_medical_report("Prompt template", "Extracted OCR text")
        
        self.assertEqual(result, "Clean summary output")
        mock_post.assert_called_once()

    @patch('requests.post')
    def test_empty_response_handled(self, mock_post):
        mock_response = mock_post.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": []
        }

        provider = SarvamProvider()
        with self.assertRaises(AIInvalidResponse):
            provider.analyze_medical_report("Prompt", "OCR")

    @patch('requests.post')
    def test_timeout_handled(self, mock_post):
        mock_post.side_effect = requests.exceptions.Timeout("Request timed out")

        provider = SarvamProvider()
        with self.assertRaises(AITimeout):
            provider.analyze_medical_report("Prompt", "OCR")

    @patch('requests.post')
    def test_rate_limit_handled(self, mock_post):
        mock_response = mock_post.return_value
        mock_response.status_code = 429

        provider = SarvamProvider()
        with self.assertRaises(AIRateLimited):
            provider.analyze_medical_report("Prompt", "OCR")

    @patch('requests.post')
    def test_invalid_credentials_handled(self, mock_post):
        mock_response = mock_post.return_value
        mock_response.status_code = 401

        provider = SarvamProvider()
        with self.assertRaises(AIProviderUnavailable):
            provider.analyze_medical_report("Prompt", "OCR")

    @patch('requests.post')
    def test_network_failure_handled(self, mock_post):
        mock_post.side_effect = requests.exceptions.ConnectionError("Connection refused")

        provider = SarvamProvider()
        with self.assertRaises(AIProviderUnavailable):
            provider.analyze_medical_report("Prompt", "OCR")

    def test_missing_credentials_throws(self):
        # Temporarily clear environment variables
        with patch.dict(os.environ, {"SARVAM_API_KEY": ""}):
            provider = SarvamProvider()
            with self.assertRaises(AIProviderUnavailable):
                provider.analyze_medical_report("Prompt", "OCR")
