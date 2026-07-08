from django.urls import path
from apps.vault.views import UploadRecordView, RecordListView, RecordDetailView

urlpatterns = [
    path('vault/upload', UploadRecordView.as_view(), name='vault_upload'),
    path('vault/records', RecordListView.as_view(), name='vault_records'),
    path('vault/records/<uuid:id>', RecordDetailView.as_view(), name='vault_record_detail'),
]
