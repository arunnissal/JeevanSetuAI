import os
import requests
from apps.intelligence.providers.provider_interface import BaseAIProvider
from apps.intelligence.exceptions import (
    AIProviderUnavailable, AIRateLimited, AITimeout, AIInvalidResponse
)

class SarvamProvider(BaseAIProvider):
    name = "sarvam"

    def __init__(self):
        self.api_key = os.environ.get("SARVAM_API_KEY")
        self.model = os.environ.get("SARVAM_MODEL", "sarvam-105b")
        self.base_url = "https://api.sarvam.ai"

    def _make_request(self, messages: list) -> str:
        if not self.api_key:
            raise AIProviderUnavailable("SARVAM_API_KEY is not configured in the environment.")

        url = f"{self.base_url}/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "api-subscription-key": self.api_key
        }
        payload = {
            "model": self.model,
            "messages": messages
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 401 or response.status_code == 403:
                raise AIProviderUnavailable(f"Authentication failed with Sarvam API. Status: {response.status_code}")
            elif response.status_code == 429:
                raise AIRateLimited("Sarvam API rate limit exceeded.")
            elif response.status_code >= 500:
                raise AIProviderUnavailable(f"Sarvam server error. Status: {response.status_code}")
            
            response.raise_for_status()
            
            data = response.json()
            # Extract content from OpenAI compatible payload format
            content = data["choices"][0]["message"]["content"]
            return content

        except requests.exceptions.Timeout:
            raise AITimeout("Sarvam API request timed out.")
        except requests.exceptions.HTTPError as e:
            raise AIInvalidResponse(f"Sarvam API HTTP error: {str(e)}")
        except requests.exceptions.RequestException as e:
            raise AIProviderUnavailable(f"Sarvam API network error: {str(e)}")
        except (KeyError, IndexError, ValueError) as e:
            raise AIInvalidResponse(f"Malformed response format from Sarvam API: {str(e)}")

    def analyze_medical_report(self, prompt: str, ocr_text: str, metadata: dict = None) -> str:
        messages = [
            {"role": "system", "content": "You are a professional medical analysis companion."},
            {"role": "user", "content": f"{prompt}\n\n[Medical Report OCR Text]:\n{ocr_text}"}
        ]
        return self._make_request(messages)

    def health_assistant_chat(self, chat_history: list, user_message: str) -> str:
        return self.chat(chat_history, user_message)

    def chat(self, chat_history: list, user_message: str) -> str:
        messages = []
        for msg in chat_history:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": user_message})
        return self._make_request(messages)
