import json
from apps.intelligence.exceptions import AIParsingError
from apps.intelligence.utils.confidence_validator import ConfidenceValidator

class JSONValidator:
    DEFAULT_DISCLAIMER = "This information is AI-generated for educational purposes and should not replace professional medical advice."

    @classmethod
    def validate_and_parse(cls, cleaned_response: str) -> dict:
        if not cleaned_response:
            raise AIParsingError("Empty response body cannot be parsed.")

        try:
            data = json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            raise AIParsingError(f"JSON decode failed: {str(e)}")

        if not isinstance(data, dict):
            raise AIParsingError("AI response is not a valid JSON object.")

        # Extract values with sensible defaults
        summary = data.get('summary') or data.get('ai_summary') or "No summary available."
        
        diagnoses = data.get('diagnoses')
        if not isinstance(diagnoses, list):
            diagnoses = [diagnoses] if diagnoses else []
            
        medicines = data.get('medicines')
        if not isinstance(medicines, list):
            medicines = [medicines] if medicines else []
            
        tests = data.get('tests')
        if not isinstance(tests, list):
            tests = [tests] if tests else []
            
        recommendations = data.get('recommendations')
        if not isinstance(recommendations, list):
            recommendations = [recommendations] if recommendations else []
            
        doctor_questions = data.get('doctor_questions')
        if not isinstance(doctor_questions, list):
            doctor_questions = [doctor_questions] if doctor_questions else []

        raw_confidence = data.get('confidence', 'MEDIUM')
        confidence = ConfidenceValidator.validate(raw_confidence)

        medical_disclaimer = data.get('medical_disclaimer') or cls.DEFAULT_DISCLAIMER

        return {
            'summary': str(summary),
            'diagnoses': diagnoses,
            'medicines': medicines,
            'tests': tests,
            'recommendations': recommendations,
            'doctor_questions': doctor_questions,
            'confidence': confidence,
            'medical_disclaimer': str(medical_disclaimer)
        }
