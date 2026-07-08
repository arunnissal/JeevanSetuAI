from rest_framework import serializers
from apps.timeline.models import TimelineEvent

class TimelineEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimelineEvent
        fields = ['id', 'title', 'event_type', 'record_id', 'created_at']
        read_only_fields = ['id', 'created_at']
