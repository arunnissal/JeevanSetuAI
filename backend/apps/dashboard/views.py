from rest_framework.views import APIView
from rest_framework import permissions
from apps.common.responses import success_response
from apps.timeline.models import TimelineEvent
from apps.timeline.serializers import TimelineEventSerializer
from apps.intelligence.models import DocumentAnalysis
from apps.emergency.models import EmergencyProfile

class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # 1. Latest AI Insight (lightweight preview)
        latest_analysis = DocumentAnalysis.objects.filter(
            record__user=user
        ).order_by('-created_at').first()

        latest_insight = None
        if latest_analysis:
            latest_insight = {
                "title": f"Recent {latest_analysis.record.get_record_type_display()}",
                "summary": latest_analysis.ai_summary or "",
                "record_id": str(latest_analysis.record.id),
                "created_at": latest_analysis.created_at.isoformat()
            }

        # 2. Recent Activity (latest 3 timeline events)
        recent_events = TimelineEvent.objects.filter(user=user).order_by('-created_at')[:3]
        recent_activity = TimelineEventSerializer(recent_events, many=True).data

        # 3. Emergency Card Info
        missing_fields = []
        try:
            em_profile = user.emergency_profile
            if not em_profile.emergency_contact_name or not em_profile.emergency_contact_phone:
                missing_fields.append("Emergency Contact")
            if not em_profile.blood_group:
                missing_fields.append("Blood Group")
        except EmergencyProfile.DoesNotExist:
            missing_fields.extend(["Emergency Contact", "Blood Group"])

        # Emergency is ready only if we have the critical contact details filled out
        emergency_ready = "Emergency Contact" not in missing_fields

        response_data = {
            "full_name": user.full_name,
            "profile_progress": user.profile_progress,
            "latest_insight": latest_insight,
            "recent_activity": recent_activity,
            "emergency_ready": emergency_ready,
            "missing_fields": missing_fields
        }

        return success_response(data=response_data)
