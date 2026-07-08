import re

class DocumentClassifier:
    @classmethod
    def classify(cls, ocr_text: str, record_type: str = None) -> str:
        if not ocr_text:
            return 'general_blood_test' if record_type == 'blood_test' else 'generic'

        text = ocr_text.lower()

        # Helper to match whole words with boundary support
        def has_word(word: str) -> bool:
            return bool(re.search(r'\b' + re.escape(word) + r'\b', text))

        def any_words(words: list) -> bool:
            return any(has_word(w) for w in words)

        # 1. Blood Test Subtypes
        if any_words(['hemoglobin', 'wbc', 'rbc', 'platelet', 'hematocrit', 'cbc']):
            return 'cbc'
        
        if any_words(['hdl', 'ldl', 'triglycerides', 'cholesterol', 'lipid']):
            return 'lipid'
            
        if any_words(['tsh', 't3', 't4', 'thyroid']):
            return 'thyroid'
            
        if any_words(['hba1c', 'glucose', 'fasting blood sugar', 'ppbs', 'diabetes']):
            return 'diabetes'
            
        if any_words(['vitamin d', 'vitamin b12', 'vit d', 'vit b12']):
            return 'vitamin'
            
        if any_words(['alt', 'ast', 'sgot', 'sgpt', 'bilirubin', 'lft', 'liver function']):
            return 'lft'
            
        if any_words(['creatinine', 'urea', 'egfr', 'kft', 'kidney function', 'renal']):
            return 'kft'

        # 2. Radiology Subtypes
        if any_words(['x-ray', 'xray', 'chest x-ray', 'cxr']):
            return 'xray'
            
        if any_words(['ct scan', 'ct', 'computed tomography', 'hrct']):
            return 'ct'
            
        if any_words(['mri', 'magnetic resonance']):
            return 'mri'
            
        if any_words(['ultrasound', 'usg', 'sonography']):
            return 'ultrasound'
            
        if any_words(['ecg', 'ekg', 'electrocardiogram']):
            return 'ecg'
            
        if any_words(['echo', 'echocardiogram']):
            return 'echo'

        # 3. Prescription
        if any_words(['tab', 'tablet', 'cap', 'capsule', 'rx', 'mg', 'sos', 'od', 'bd', 'tid']):
            return 'prescription'

        # 4. Discharge Summary
        if any_words(['diagnosis', 'admission', 'discharge', 'hospital course', 'follow-up']):
            return 'discharge'

        # 5. Consultation Note
        if any_words(['chief complaint', 'clinical findings', 'assessment', 'plan']):
            return 'consultation'

        # 6. Vaccination
        if any_words(['vaccine', 'dose', 'immunization']):
            return 'vaccination'

        # 7. Medical Certificate
        if any_words(['certified', 'medical leave', 'fitness']):
            return 'medical_certificate'

        # Fallbacks
        if record_type == 'blood_test':
            return 'general_blood_test'

        return 'generic'
