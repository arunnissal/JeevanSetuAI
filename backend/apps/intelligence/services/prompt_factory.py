import os
from django.conf import settings

class PromptFactory:
    # Map (record_type, document_subtype) to prompt file path relative to intelligence/prompts/
    PROMPT_MAPPING = {
        # Blood test subtypes
        ('blood_test', 'cbc'): 'blood_tests/cbc_prompt.txt',
        ('blood_test', 'lipid'): 'blood_tests/lipid_prompt.txt',
        ('blood_test', 'thyroid'): 'blood_tests/thyroid_prompt.txt',
        ('blood_test', 'diabetes'): 'blood_tests/diabetes_prompt.txt',
        ('blood_test', 'lft'): 'blood_tests/lft_prompt.txt',
        ('blood_test', 'kft'): 'blood_tests/kft_prompt.txt',
        ('blood_test', 'vitamin'): 'blood_tests/vitamin_prompt.txt',
        
        # Radiology subtypes
        ('radiology', 'xray'): 'radiology/xray_prompt.txt',
        ('radiology', 'ct'): 'radiology/ct_prompt.txt',
        ('radiology', 'mri'): 'radiology/mri_prompt.txt',
        ('radiology', 'ultrasound'): 'radiology/ultrasound_prompt.txt',
        ('radiology', 'ecg'): 'radiology/ecg_prompt.txt',
        ('radiology', 'echo'): 'radiology/echo_prompt.txt',

        # Other categories mapped directly via subtypes
        ('prescription', 'prescription'): 'prescription_prompt.txt',
        ('discharge_summary', 'discharge'): 'discharge_prompt.txt',
        ('doctor_consultation', 'consultation'): 'consultation_prompt.txt',
        ('vaccination', 'vaccination'): 'vaccination_prompt.txt',
        ('medical_certificate', 'medical_certificate'): 'medical_certificate_prompt.txt',
    }

    # Direct mapping for single-level fallbacks if keying tuple is missing
    SUBTYPE_FALLBACKS = {
        'prescription': 'prescription_prompt.txt',
        'discharge': 'discharge_prompt.txt',
        'consultation': 'consultation_prompt.txt',
        'vaccination': 'vaccination_prompt.txt',
        'medical_certificate': 'medical_certificate_prompt.txt',
        'cbc': 'blood_tests/cbc_prompt.txt',
        'lipid': 'blood_tests/lipid_prompt.txt',
        'thyroid': 'blood_tests/thyroid_prompt.txt',
        'diabetes': 'blood_tests/diabetes_prompt.txt',
        'lft': 'blood_tests/lft_prompt.txt',
        'kft': 'blood_tests/kft_prompt.txt',
        'vitamin': 'blood_tests/vitamin_prompt.txt',
        'xray': 'radiology/xray_prompt.txt',
        'ct': 'radiology/ct_prompt.txt',
        'mri': 'radiology/mri_prompt.txt',
        'ultrasound': 'radiology/ultrasound_prompt.txt',
        'ecg': 'radiology/ecg_prompt.txt',
        'echo': 'radiology/echo_prompt.txt',
    }

    @classmethod
    def get_prompt(cls, record_type: str, document_subtype: str) -> str:
        # 1. Attempt exact match on tuple (record_type, document_subtype)
        filename = cls.PROMPT_MAPPING.get((record_type, document_subtype))

        # 2. Fallback to subtype direct mapping if not matched
        if not filename:
            filename = cls.SUBTYPE_FALLBACKS.get(document_subtype)

        # 3. Ultimate fallback
        if not filename:
            filename = 'generic_prompt.txt'

        prompts_dir = os.path.join(settings.BASE_DIR, 'apps', 'intelligence', 'prompts')
        file_path = os.path.join(prompts_dir, filename)

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            # Safe ultimate fallback
            fallback_path = os.path.join(prompts_dir, 'generic_prompt.txt')
            try:
                with open(fallback_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except FileNotFoundError:
                return "Analyze this medical document and extract structured health parameters."
