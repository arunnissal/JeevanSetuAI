import logging
import time
from django.db import transaction
from apps.vault.models import MedicalRecord
from apps.intelligence.models import DocumentAnalysis, OCRLog, ProcessingLog
from apps.intelligence.services.document_classifier import DocumentClassifier
from apps.intelligence.services.prompt_factory import PromptFactory
from apps.intelligence.services.ai_gateway import AIGateway
from apps.intelligence.providers.sarvam_provider import SarvamProvider
from apps.intelligence.services.ocr import OCRService

logger = logging.getLogger(__name__)

class IntelligencePipeline:
    """Orchestrates the entire document parsing and analysis pipeline end-to-end."""

    @classmethod
    def run(cls, record_id: str) -> bool:
        try:
            record = MedicalRecord.objects.get(id=record_id)
        except MedicalRecord.DoesNotExist:
            logger.error(f"MedicalRecord {record_id} not found.")
            return False

        # Transition status to processing
        record.processing_status = 'processing'
        record.save()
        
        ProcessingLog.objects.create(record=record, stage="Pipeline Start", status="Success")

        try:
            # 1. OCR Stage (Real text extraction)
            ocr_text, ocr_conf, ocr_time = OCRService.extract_text(record)
            ProcessingLog.objects.create(
                record=record, 
                stage="OCR", 
                status="Success", 
                error_message=f"Text extracted length: {len(ocr_text)}, conf: {ocr_conf}, time: {ocr_time:.2f}s"
            )
            
            # 2. Classification Stage
            document_subtype = DocumentClassifier.classify(ocr_text, record.record_type)
            ProcessingLog.objects.create(
                record=record, 
                stage="Classification", 
                status="Success", 
                error_message=f"Subtype: {document_subtype}"
            )

            # 3. Prompt Mapping Stage
            prompt = PromptFactory.get_prompt(record.record_type, document_subtype)
            ProcessingLog.objects.create(record=record, stage="Prompt Selection", status="Success")

            # 4. AI Gateway Execution
            provider = SarvamProvider()
            gateway = AIGateway(provider)
            
            structured_data = gateway.process_report_analysis(
                prompt=prompt,
                ocr_text=ocr_text,
                user=record.user,
                metadata=record.metadata
            )
            ProcessingLog.objects.create(record=record, stage="AI Analysis", status="Success")

            # 5. Database Save & Complete
            with transaction.atomic():
                # Clear existing analysis if present
                DocumentAnalysis.objects.filter(record=record).delete()

                # Determine float confidence mapping
                raw_conf = structured_data.get('confidence', 'MEDIUM')
                confidence_score = 1.0 if raw_conf == 'HIGH' else (0.5 if raw_conf == 'MEDIUM' else 0.2)

                # Save analysis metrics
                DocumentAnalysis.objects.create(
                    record=record,
                    ocr_text=ocr_text,
                    structured_ai_json=structured_data,
                    ai_summary=structured_data.get('summary', ''),
                    diagnoses=structured_data.get('diagnoses', []),
                    medicines=structured_data.get('medicines', []),
                    recommendations=structured_data.get('recommendations', []),
                    doctor_questions=structured_data.get('doctor_questions', []),
                    confidence=confidence_score
                )
                
                record.processing_status = 'completed'
                record.save()

            ProcessingLog.objects.create(record=record, stage="Pipeline End", status="Success")
            return True

        except Exception as e:
            logger.exception(f"Intelligence pipeline failed for record {record_id}")
            record.processing_status = 'failed'
            record.save()
            ProcessingLog.objects.create(
                record=record, 
                stage="Pipeline Failed", 
                status="Failed", 
                error_message=str(e)
            )
            return False
