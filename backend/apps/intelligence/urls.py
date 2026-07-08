from django.urls import path
from apps.intelligence.views import IntelligenceStatusView, IntelligenceInsightsView, HealthAssistantChatView

urlpatterns = [
    path('intelligence/status/<uuid:record_id>', IntelligenceStatusView.as_view(), name='intelligence_status'),
    path('intelligence/insights', IntelligenceInsightsView.as_view(), name='intelligence_insights'),
    path('health-assistant/chat', HealthAssistantChatView.as_view(), name='health_assistant_chat'),
]
