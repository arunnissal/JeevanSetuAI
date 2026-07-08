from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from django.db import transaction
import cloudinary.uploader
from apps.vault.models import MedicalFile, MedicalRecord
from apps.vault.serializers import MedicalRecordSerializer
from apps.common.responses import success_response, error_response

class RecordListView(generics.ListAPIView):
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MedicalRecord.objects.filter(user=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data, message="Vault records retrieved")

class RecordDetailView(generics.RetrieveAPIView):
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return MedicalRecord.objects.filter(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return success_response(data=serializer.data, message="Record details retrieved")
        except MedicalRecord.DoesNotExist:
            return error_response(message="Record not found", status_code=status.HTTP_404_NOT_FOUND)

class UploadRecordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return error_response(message="No file uploaded. Please upload a file with the key 'file'.")

        # Validate file type extension (images and pdfs)
        allowed_extensions = ['.png', '.jpg', '.jpeg', '.pdf']
        file_name = file_obj.name.lower()
        if not any(file_name.endswith(ext) for ext in allowed_extensions):
            return error_response(message="Unsupported file type. Only PNG, JPG, JPEG, and PDF are allowed.")

        try:
            with transaction.atomic():
                # 1. Upload file to Cloudinary
                upload_result = cloudinary.uploader.upload(
                    file_obj,
                    resource_type="auto",
                    folder=f"jeevansetu/{request.user.id}"
                )
                file_url = upload_result.get('secure_url')
                
                if not file_url:
                    return error_response(message="Failed to retrieve upload URL from Cloudinary.")

                # 2. Save MedicalFile
                medical_file = MedicalFile.objects.create(file_url=file_url)

                # 3. Save MedicalRecord
                medical_record = MedicalRecord.objects.create(
                    user=request.user,
                    file=medical_file,
                    processing_status='pending', # Prepared for Phase 4 processing
                    metadata={
                        "original_filename": file_obj.name,
                        "file_size": file_obj.size
                    }
                )

            serializer = MedicalRecordSerializer(medical_record)
            return success_response(
                data=serializer.data, 
                message="File uploaded successfully. Ready for processing.",
                status_code=status.HTTP_201_CREATED
            )

        except Exception as e:
            # Safe upload failure
            return error_response(
                message=f"Upload failed: {str(e)}", 
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
