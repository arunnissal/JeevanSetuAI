import re

class ResponseCleaner:
    @classmethod
    def clean(cls, raw_response: str) -> str:
        if not raw_response:
            return ""

        cleaned = raw_response.strip()

        # 1. Extract JSON block if surrounded by conversational markdown
        json_match = re.search(r'```json\s*(.*?)\s*```', cleaned, re.DOTALL | re.IGNORECASE)
        if json_match:
            cleaned = json_match.group(1).strip()
        else:
            # Fallback to finding the first { and last }
            first_brace = cleaned.find('{')
            last_brace = cleaned.rfind('}')
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                cleaned = cleaned[first_brace:last_brace + 1].strip()

        # 2. Normalize carriage returns and duplicate newlines
        cleaned = cleaned.replace('\r\n', '\n').replace('\r', '\n')
        
        return cleaned
