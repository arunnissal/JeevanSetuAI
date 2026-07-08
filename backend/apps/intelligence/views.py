from rest_framework.views import APIView
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from django.utils import timezone
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

class IntelligenceInsightsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # 1. Fetch completed records and analyses
        completed_records = MedicalRecord.objects.filter(user=user, processing_status='completed').order_by('created_at')
        reports_count = completed_records.count()

        from apps.intelligence.models import DocumentAnalysis
        analyses = DocumentAnalysis.objects.filter(record__user=user).order_by('record__created_at')
        ai_summaries = analyses.count()

        # 2. Fetch timeline count
        from apps.timeline.models import TimelineEvent
        timeline_events = TimelineEvent.objects.filter(user=user).count()

        # 3. Calculate journey duration
        journey_started = "Not started yet"
        if completed_records.exists():
            first_record = completed_records.first()
            delta = timezone.now() - first_record.created_at
            days = delta.days
            if days <= 0:
                journey_started = "Today"
            elif days < 7:
                journey_started = f"{days} Days Ago"
            elif days < 30:
                weeks = int(days / 7)
                journey_started = f"{weeks} Week{'s' if weeks > 1 else ''} Ago"
            else:
                months = int(days / 30)
                journey_started = f"{months} Month{'s' if months > 1 else ''} Ago"

        # 4. Generate Health Story & Trends
        health_story = "No health story available yet. Please upload more reports to track changes."
        trends = []
        discussion_points = [
            "Confirm if current health habits are supporting your goals.",
            "Discuss scheduling your next routine screening."
        ]

        # Scan for common findings to build simple trends
        def get_finding_status(finding_str):
            check = finding_str.lower()
            if any(k in check for k in ['low', 'high', 'deficien', 'attention', 'abnormal', 'concern', 'decreased', 'increased', 'alert']):
                return 'attention'
            return 'normal'

        if ai_summaries > 0:
            latest_analysis = analyses.last()
            latest_findings = latest_analysis.diagnoses if isinstance(latest_analysis.diagnoses, list) else []

            # Determine health story narrative dynamically
            attention_findings = []
            for f in latest_findings:
                if get_finding_status(f) == 'attention':
                    attention_findings.append(f.split(':')[0] if ':' in f else f)

            if attention_findings:
                health_story = (
                    f"Based on your recent reports, some parameters such as {', '.join(attention_findings[:2])} "
                    "appear slightly outside the expected range. Most of your other values remain stable. "
                    "We recommend discussing these items with your physician to see if monitoring is required. "
                    "Your health journey is a progression, and regular tracking helps observe these changes."
                )
            else:
                health_story = (
                    "Based on your recent reports, your health parameters appear stable and within the expected range. "
                    "Your body is maintaining good balance. Continue keeping up with your wellness habits "
                    "and discuss these results with your healthcare provider during your next routine checkup."
                )

            # Build trends if historical data exists (at least 2 completed reports)
            if ai_summaries >= 2:
                # Find metrics in latest vs previous
                prev_analysis = list(analyses)[-2]
                prev_findings = prev_analysis.diagnoses if isinstance(prev_analysis.diagnoses, list) else []

                # Trace keys: Hemoglobin, Vitamin D, Blood Sugar, Thyroid
                tracked_metrics = [
                    {"key": "hemoglobin", "name": "Hemoglobin", "icon": "🩸"},
                    {"key": "vitamin d", "name": "Vitamin D", "icon": "☀️"},
                    {"key": "glucose", "name": "Blood Sugar", "icon": "🍬"},
                    {"key": "sugar", "name": "Blood Sugar", "icon": "🍬"},
                    {"key": "thyroid", "name": "Thyroid", "icon": "🦋"},
                    {"key": "tsh", "name": "Thyroid", "icon": "🦋"},
                ]

                seen_names = set()
                for metric in tracked_metrics:
                    curr_item = next((f for f in latest_findings if metric["key"] in f.lower()), None)
                    prev_item = next((f for f in prev_findings if metric["key"] in f.lower()), None)

                    if curr_item and prev_item and metric["name"] not in seen_names:
                        seen_names.add(metric["name"])
                        curr_status = get_finding_status(curr_item)
                        prev_status = get_finding_status(prev_item)

                        if curr_status == 'normal' and prev_status == 'normal':
                            status_label = "Stable"
                            icon_prefix = "🟢"
                            explanation = f"{metric['name']} levels are consistent and within expected limits."
                        elif curr_status == 'normal' and prev_status == 'attention':
                            status_label = "Improved"
                            icon_prefix = "🟢"
                            explanation = f"{metric['name']} has returned to the expected range."
                        elif curr_status == 'attention' and prev_status == 'normal':
                            status_label = "Slight Change"
                            icon_prefix = "🟡"
                            explanation = f"{metric['name']} shows a minor shift compared to your previous report."
                        else:
                            status_label = "Slight Change"
                            icon_prefix = "🟡"
                            explanation = f"{metric['name']} remains outside expected ranges for monitoring."

                        trends.append({
                            "icon": metric["icon"],
                            "title": metric["name"],
                            "status": f"{icon_prefix} {status_label}",
                            "explanation": explanation
                        })

                if seen_names:
                    # Update discussion points dynamically based on trends
                    discussion_points = []
                    for t in trends:
                        if "Change" in t["status"]:
                            discussion_points.append(f"Discuss why {t['title']} has changed recently.")
                        else:
                            discussion_points.append(f"Review if {t['title']} levels require ongoing monitoring.")
                    discussion_points.append("Ask if any dietary or routine adjustments are recommended.")

        # 5. Doctor Questions
        doctor_questions = [
            "Should I repeat this test in the future?",
            "Are these values improving compared to my older records?",
            "Is any follow-up testing or specialist referral required?",
            "Are there any specific lifestyle or diet modifications you suggest?",
            "How often should I monitor these parameters?"
        ]

        # 6. Milestones (Product achievements only)
        from apps.emergency.models import EmergencyProfile
        emergency_done = False
        try:
            profile = user.emergency_profile
            if profile and profile.emergency_contact_name:
                emergency_done = True
        except EmergencyProfile.DoesNotExist:
            pass

        milestones = [
            {"title": "Welcome to JeevanSetu AI", "completed": True},
            {"title": "First Medical Report Added", "completed": reports_count >= 1},
            {"title": "First AI Summary Generated", "completed": ai_summaries >= 1},
            {"title": "Emergency Profile Completed", "completed": emergency_done},
            {"title": "Five Reports Organized", "completed": reports_count >= 5}
        ]

        data = {
            "journey": {
                "reports_count": reports_count,
                "ai_summaries": ai_summaries,
                "timeline_events": timeline_events,
                "journey_started": journey_started
            },
            "health_story": health_story,
            "trends": trends,
            "discussion_points": discussion_points[:5],
            "doctor_questions": doctor_questions[:5],
            "milestones": milestones
        }

        return success_response(data=data, message="AI health insights retrieved successfully")

class HealthAssistantChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.intelligence.models import ChatMessage
        messages = ChatMessage.objects.filter(user=request.user).order_by('created_at')[:50]
        data = [
            {
                "id": str(msg.id),
                "role": msg.role,
                "content": msg.content,
                "record_id": str(msg.record_id) if msg.record_id else None,
                "created_at": msg.created_at.isoformat()
            }
            for msg in messages
        ]
        return success_response(data=data, message="Chat history retrieved successfully")

    def post(self, request):
        user = request.user
        message = request.data.get('message')
        record_id = request.data.get('record_id')

        if not message:
            return error_response(message="Message content is required.", status_code=status.HTTP_400_BAD_REQUEST)

        # 1. Retrieve medical records and analyses
        completed_records = MedicalRecord.objects.filter(user=user, processing_status='completed').order_by('-created_at')
        
        from apps.intelligence.models import DocumentAnalysis, ChatMessage
        analyses = DocumentAnalysis.objects.filter(record__user=user).order_by('-record__created_at')

        # 2. Build prioritized report context
        prioritized_context = ""
        if record_id:
            try:
                p_record = MedicalRecord.objects.get(id=record_id, user=user, processing_status='completed')
                p_analysis = DocumentAnalysis.objects.get(record=p_record)
                prioritized_context = (
                    f"\n[USER IS SPECIFICALLY ASKING ABOUT THIS REPORT]:\n"
                    f"Report Type: {p_record.get_record_type_display()}\n"
                    f"Original Filename: {p_record.metadata.get('original_filename', 'medical_report.pdf')}\n"
                    f"Findings: {', '.join(p_analysis.diagnoses) if isinstance(p_analysis.diagnoses, list) else p_analysis.diagnoses}\n"
                    f"Summary: {p_analysis.ai_summary}\n"
                )
            except (MedicalRecord.DoesNotExist, DocumentAnalysis.DoesNotExist):
                pass

        # 3. Build general summaries context
        summaries_list = []
        for analysis in analyses[:3]:  # Top 3 latest completed reports
            findings = ', '.join(analysis.diagnoses) if isinstance(analysis.diagnoses, list) else analysis.diagnoses
            summaries_list.append(
                f"- Type: {analysis.record.get_record_type_display()}, File: {analysis.record.metadata.get('original_filename')}\n"
                f"  Findings: {findings}\n"
                f"  Summary: {analysis.ai_summary}"
            )
        summaries_context = "\n".join(summaries_list)

        # 4. Fetch recent timeline summaries
        from apps.timeline.models import TimelineEvent
        timeline_events = TimelineEvent.objects.filter(user=user).order_by('-created_at')[:5]
        timeline_list = [f"- {t.title} at {t.created_at.strftime('%Y-%m-%d %H:%M')}" for t in timeline_events]
        timeline_context = "\n".join(timeline_list)

        # 5. Retrieve previous database chat history
        db_history = ChatMessage.objects.filter(user=user).order_by('-created_at')[:8]
        db_history = reversed(db_history)

        # 6. Compose system instruction prompt
        system_prompt = (
            "You are JeevanSetu AI's Personal AI Health Assistant. "
            "Your objective is to help the user understand their own medical reports and health journey in simple, layman, friendly language.\n\n"
            "Here is the user's medical background context:\n"
            f"[RECENT SUMMARIES]:\n{summaries_context}\n\n"
            f"[TIMELINE EVENTS]:\n{timeline_context}\n"
            f"{prioritized_context}\n"
            "AI Safety Guidelines:\n"
            "1. Answer using the provided medical reports, timeline, and insights. If the answer is unavailable in the records, say so honestly. Do not make up or hallucinate details.\n"
            "2. You must NEVER diagnose, NEVER prescribe medicine, and NEVER recommend changing or stopping active dosages.\n"
            "3. If the user requests diagnostic claims, medications, self-harm, or emergency treatment advice, politely decline and instruct them to consult a qualified physician or emergency services immediately.\n"
            "4. Keep explanations short, simple, reassuring, and educational. Avoid medical textbook terminology."
        )

        # 7. Formulate completion messages payload
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        for msg in db_history:
            messages.append({"role": msg.role, "content": msg.content})

        # 8. Save user query message to database
        ChatMessage.objects.create(user=user, role='user', content=message, record_id=record_id)

        # 9. Call Sarvam AI provider
        try:
            from apps.intelligence.providers.sarvam_provider import SarvamProvider
            provider = SarvamProvider()
            response_content = provider.chat(messages, message)
        except Exception as e:
            # Fallback reassurance if provider is unavailable
            response_content = "I'm having trouble connecting to my knowledge base right now. Please try asking again in a few moments."

        # 10. Save assistant response to database
        ChatMessage.objects.create(user=user, role='assistant', content=response_content, record_id=record_id)

        return success_response(data={"response": response_content}, message="Response generated successfully")

    def delete(self, request):
        from apps.intelligence.models import ChatMessage
        ChatMessage.objects.filter(user=request.user).delete()
        return success_response(message="Conversation history cleared successfully")

