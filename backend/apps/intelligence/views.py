from rest_framework.views import APIView
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from apps.vault.models import MedicalRecord
from apps.intelligence.models import ProcessingLog
from apps.common.responses import success_response, error_response

class IntelligenceStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, record_id):
        # Retrieve medical record owned by the user
        try:
            record = MedicalRecord.objects.get(id=record_id, user=request.user)
        except MedicalRecord.DoesNotExist:
            return error_response(message="Medical report not found.", status_code=status.HTTP_404_NOT_FOUND)

        # Query all processing logs ordered by date
        logs = ProcessingLog.objects.filter(record=record)
        stages_logged = {log.stage: log.status for log in logs}

        # Check for success logs
        ocr_done = stages_logged.get("OCR") == "Success"
        classification_done = stages_logged.get("Classification") == "Success"
        prompt_done = stages_logged.get("Prompt Selection") == "Success"
        ai_done = stages_logged.get("AI Analysis") == "Success"
        pipeline_end = stages_logged.get("Pipeline End") == "Success"

        is_failed = record.processing_status == 'failed'
        is_completed = record.processing_status == 'completed'

        # Map to frontend-safe stages
        stages_response = []

        # 1. Upload stage (always completed)
        stages_response.append({
            "stage": "UPLOAD",
            "status": "completed",
            "label": "Report Uploaded"
        })

        # 2. Reading stage (OCR)
        if ocr_done:
            reading_status = "completed"
        elif is_failed and not ocr_done:
            reading_status = "failed"
        elif record.processing_status in ['pending', 'processing']:
            reading_status = "active"
        else:
            reading_status = "idle"
        stages_response.append({
            "stage": "READING",
            "status": reading_status,
            "label": "Reading Your Report..."
        })

        # 3. Understanding stage (Classification & Prompt & AI)
        if ai_done:
            understanding_status = "completed"
        elif is_failed and ocr_done and not ai_done:
            understanding_status = "failed"
        elif ocr_done and not ai_done and not is_failed:
            understanding_status = "active"
        else:
            understanding_status = "idle"
        stages_response.append({
            "stage": "UNDERSTANDING",
            "status": understanding_status,
            "label": "Understanding Medical Information..."
        })

        # 4. Preparing stage (Summary & DB formatting)
        if is_completed or pipeline_end:
            preparing_status = "completed"
        elif is_failed and ai_done and not pipeline_end:
            preparing_status = "failed"
        elif ai_done and not pipeline_end and not is_failed:
            preparing_status = "active"
        else:
            preparing_status = "idle"
        stages_response.append({
            "stage": "PREPARING",
            "status": preparing_status,
            "label": "Preparing AI Summary..."
        })

        # 5. Updating stage (Timeline logs)
        if is_completed:
            updating_status = "completed"
        elif is_failed and pipeline_end:
            updating_status = "failed"
        elif pipeline_end and not is_completed and not is_failed:
            updating_status = "active"
        else:
            updating_status = "idle"
        stages_response.append({
            "stage": "UPDATING",
            "status": updating_status,
            "label": "Updating Your Health Journey..."
        })

        # 6. Completed stage
        stages_response.append({
            "stage": "COMPLETED",
            "status": "completed" if is_completed else "idle",
            "label": "Completed"
        })

        data = {
            "record_id": str(record.id),
            "processing_status": record.processing_status,
            "stages": stages_response
        }

        return success_response(data=data, message="Processing status retrieved")
