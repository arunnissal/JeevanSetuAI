import re

class ResponseCleaner:
    @classmethod
    def clean(cls, raw_response: str) -> str:
        if not raw_response:
            return ""

        cleaned = raw_response.strip()

        # 1. Remove markdown block formatting: ```json ... ``` or ``` ... ```
        cleaned = re.sub(r'^```json\s*', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'^```\s*', '', cleaned)
        cleaned = re.sub(r'\s*```$', '', cleaned)

        # Trim again after fences removal
        cleaned = cleaned.strip()

        # 2. Normalize carriage returns and duplicate newlines
        cleaned = cleaned.replace('\r\n', '\n').replace('\r', '\n')
        
        # 3. Handle unescaped backslashes inside quotes or general control chars if necessary,
        # but standard python json parser loads standard double-escapes.
        
        return cleaned
