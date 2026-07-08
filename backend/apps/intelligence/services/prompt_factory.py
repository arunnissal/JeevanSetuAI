import os
from django.conf import settings

class PromptFactory:
    PROMPT_FILES = {
        'blood_test': 'blood_test_prompt.txt',
        'lab_report': 'lab_report_prompt.txt',
        'prescription': 'prescription_prompt.txt',
        'discharge_summary': 'discharge_summary_prompt.txt',
        'doctor_consultation': 'consultation_prompt.txt',
        'vaccination': 'vaccination_prompt.txt',
        'medical_certificate': 'medical_certificate_prompt.txt',
        'radiology': 'radiology_prompt.txt',
        'other': 'generic_prompt.txt',
    }

    @classmethod
    def get_prompt_for_type(cls, record_type: str) -> str:
        filename = cls.PROMPT_FILES.get(record_type, 'generic_prompt.txt')
        prompts_dir = os.path.join(settings.BASE_DIR, 'apps', 'intelligence', 'prompts')
        file_path = os.path.join(prompts_dir, filename)

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            # Safe fallback if file is somehow missing
            return "You are an expert medical companion. Analyze this health record and output structured findings."
