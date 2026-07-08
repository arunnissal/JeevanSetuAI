from rest_framework.views import APIView
from rest_framework import permissions
from apps.common.responses import success_response
from apps.timeline.models import TimelineEvent
from apps.timeline.serializers import TimelineEventSerializer

class TimelineEventListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        events = TimelineEvent.objects.filter(user=request.user).order_by('-created_at')
        serializer = TimelineEventSerializer(events, many=True)
        return success_response(data=serializer.data)
