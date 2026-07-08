from django.urls import path
from apps.intelligence.views import IntelligenceStatusView

urlpatterns = [
    path('intelligence/status/<uuid:record_id>', IntelligenceStatusView.as_view(), name='intelligence_status'),
]
