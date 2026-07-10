import time
from django.utils import timezone
from apps.intelligence.models import AIRequestLog
from apps.intelligence.exceptions import (
    AIBaseException, AIProviderUnavailable, AIRateLimited,
    AIInvalidResponse, AIParsingError, AITimeout
)
from apps.intelligence.utils.response_cleaner import ResponseCleaner
from apps.intelligence.utils.json_validator import JSONValidator

class AIGateway:
    """Centralized AI Gateway that acts as a secure facade for all AI provider calls."""
    
    def __init__(self, provider=None):
        self.provider = provider

    def process_report_analysis(self, prompt: str, ocr_text: str, user=None, metadata: dict = None, retries=3) -> dict:
        if not self.provider:
            raise AIProviderUnavailable("No AI provider configured in the gateway.")

        start_time = timezone.now()
        start_ts = time.time()
        
        raw_response = ""
        
        try:
            # Execute with retries on transient errors
            for attempt in range(retries):
                try:
                    raw_response = self.provider.analyze_medical_report(prompt, ocr_text, metadata)
                    break
                except (AITimeout, AIProviderUnavailable) as e:
                    if attempt == retries - 1:
                        raise
                    # Backoff sleep
                    time.sleep(0.1 * (attempt + 1))
            
            end_time = timezone.now()
            processing_time = time.time() - start_ts

            if not raw_response or not raw_response.strip():
                raise AIInvalidResponse("AI provider returned empty response content.")

            # Clean and validate the raw text
            cleaned = ResponseCleaner.clean(raw_response)
            structured_data = JSONValidator.validate_and_parse(cleaned)

            # Log success
            AIRequestLog.objects.create(
                user=user,
                prompt=prompt,
                raw_response=raw_response,
                status_code=200,
                start_time=start_time,
                end_time=end_time,
                processing_time=processing_time,
                provider=getattr(self.provider, 'name', 'unknown'),
                status="success"
            )
            return structured_data

        except Exception as e:
            end_time = timezone.now()
            processing_time = time.time() - start_ts
            
            # Determine appropriate HTTP status code equivalent
            if isinstance(e, AITimeout):
                status_code = 408
            elif isinstance(e, AIRateLimited):
                status_code = 429
            elif isinstance(e, AIInvalidResponse):
                status_code = 204
            elif isinstance(e, AIParsingError):
                status_code = 422
            else:
                status_code = 500

            AIRequestLog.objects.create(
                user=user,
                prompt=prompt,
                raw_response=raw_response or "",
                status_code=status_code,
                start_time=start_time,
                end_time=end_time,
                processing_time=processing_time,
                provider=getattr(self.provider, 'name', 'unknown') if self.provider else 'none',
                status="failed",
                error=str(e)
            )
            raise
