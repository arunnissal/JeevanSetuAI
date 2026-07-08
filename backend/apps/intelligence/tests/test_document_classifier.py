from django.test import TestCase
from apps.intelligence.services.document_classifier import DocumentClassifier
from apps.intelligence.services.prompt_factory import PromptFactory

class DocumentClassifierTestCase(TestCase):
    def test_classification_rules(self):
        test_cases = [
            # (ocr_text, record_type, expected_subtype, expected_prompt_keyword)
            ("The patient has abnormal CBC count with high hemoglobin and low platelets.", "blood_test", "cbc", "Complete Blood Count"),
            ("HbA1c levels are elevated at 7.2% suggesting diabetes mellitus.", "blood_test", "diabetes", "Diabetes screening"),
            ("Thyroid screening shows TSH is 4.5 uIU/mL.", "blood_test", "thyroid", "Thyroid Profile"),
            ("Lipid panel reveals HDL level is 45 mg/dL.", "blood_test", "lipid", "Lipid Profile"),
            ("MRI Brain indicates no acute hemorrhage.", "radiology", "mri", "MRI Scan"),
            ("Chest X-Ray shows clear lung fields.", "radiology", "xray", "Chest/Bone X-Ray"),
            ("Take Tablet Paracetamol 650mg once daily.", "prescription", "prescription", "Prescription document"),
            ("Diagnosis: Acute Appendicitis. Follow-up: in 2 weeks.", "discharge_summary", "discharge", "Discharge Summary"),
            ("Unknown text with random data", "other", "generic", "medical document"),
        ]

        for ocr_text, record_type, expected_subtype, expected_prompt_keyword in test_cases:
            subtype = DocumentClassifier.classify(ocr_text, record_type)
            self.assertEqual(
                subtype, 
                expected_subtype, 
                f"Classification failed. OCR: '{ocr_text}', Type: '{record_type}'. Got '{subtype}', expected '{expected_subtype}'."
            )
            
            prompt = PromptFactory.get_prompt(record_type, subtype)
            self.assertIsNotNone(prompt)
            self.assertIn(
                expected_prompt_keyword, 
                prompt,
                f"Prompt mapping failure. Subtype: '{subtype}'. Prompt content does not contain: '{expected_prompt_keyword}'."
            )
