from django.urls import path
from apps.timeline.views import TimelineEventListView

urlpatterns = [
    path('timeline/', TimelineEventListView.as_view(), name='timeline_event_list'),
]
