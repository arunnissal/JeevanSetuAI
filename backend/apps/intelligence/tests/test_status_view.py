from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from apps.vault.models import MedicalRecord, MedicalFile
from apps.intelligence.models import ProcessingLog

User = get_user_model()

class IntelligenceStatusAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='statususer@example.com',
            password='testpassword123',
            full_name='Status User'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create a mock record
        self.med_file = MedicalFile.objects.create(file_url='http://cloudinary.com/test.pdf')
        self.record = MedicalRecord.objects.create(
            user=self.user,
            file=self.med_file,
            record_type='blood_test',
            processing_status='processing'
        )
        self.status_url = reverse('intelligence_status', args=[self.record.id])

    def test_status_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_status_authenticated_flow(self):
        # 1. Start state (no logs yet, status is 'processing')
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertEqual(data['processing_status'], 'processing')
        
        stages = {s['stage']: s['status'] for s in data['stages']}
        self.assertEqual(stages['UPLOAD'], 'completed')
        self.assertEqual(stages['READING'], 'active')
        self.assertEqual(stages['UNDERSTANDING'], 'idle')
        self.assertEqual(stages['COMPLETED'], 'idle')

        # 2. Add OCR log (Reading Completed)
        ProcessingLog.objects.create(record=self.record, stage="OCR", status="Success")
        response = self.client.get(self.status_url)
        data = response.data['data']
        stages = {s['stage']: s['status'] for s in data['stages']}
        self.assertEqual(stages['READING'], 'completed')
        self.assertEqual(stages['UNDERSTANDING'], 'active')
        self.assertEqual(stages['PREPARING'], 'idle')

        # 3. Add AI log (AI Completed)
        ProcessingLog.objects.create(record=self.record, stage="AI Analysis", status="Success")
        response = self.client.get(self.status_url)
        data = response.data['data']
        stages = {s['stage']: s['status'] for s in data['stages']}
        self.assertEqual(stages['UNDERSTANDING'], 'completed')
        self.assertEqual(stages['PREPARING'], 'active')
        self.assertEqual(stages['UPDATING'], 'idle')

        # 4. Mark record as completed
        self.record.processing_status = 'completed'
        self.record.save()
        response = self.client.get(self.status_url)
        data = response.data['data']
        stages = {s['stage']: s['status'] for s in data['stages']}
        self.assertEqual(stages['PREPARING'], 'completed')
        self.assertEqual(stages['UPDATING'], 'completed')
        self.assertEqual(stages['COMPLETED'], 'completed')
        self.assertEqual(data['processing_status'], 'completed')

    def test_status_failed_flow(self):
        # Trigger failure at OCR
        self.record.processing_status = 'failed'
        self.record.save()
        
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertEqual(data['processing_status'], 'failed')
        
        stages = {s['stage']: s['status'] for s in data['stages']}
        self.assertEqual(stages['READING'], 'failed')
        self.assertEqual(stages['UNDERSTANDING'], 'idle')
