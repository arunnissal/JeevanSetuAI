from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from apps.timeline.models import TimelineEvent
from apps.vault.models import MedicalRecord, MedicalFile
from apps.intelligence.models import DocumentAnalysis
from apps.emergency.models import EmergencyProfile

User = get_user_model()

class DashboardAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='testpassword123',
            full_name='Test User'
        )
        self.client.force_authenticate(user=self.user)
        self.dashboard_url = reverse('dashboard_view')
        self.timeline_url = reverse('timeline_event_list')

    def test_dashboard_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_empty_state(self):
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify structure
        res_data = response.data
        self.assertTrue(res_data['success'])
        
        data = res_data['data']
        self.assertEqual(data['full_name'], 'Test User')
        self.assertEqual(data['profile_progress'], 0)
        self.assertNil = self.assertIsNone(data['latest_insight'])
        self.assertEqual(len(data['recent_activity']), 0)
        self.assertFalse(data['emergency_ready'])
        self.assertIn('Emergency Contact', data['missing_fields'])
        self.assertIn('Blood Group', data['missing_fields'])

    def test_timeline_signals_and_recent_activity(self):
        # 1. Create a medical file and record (which triggers the post_save signal for UPLOAD)
        med_file = MedicalFile.objects.create(file_url='http://cloudinary.com/test.pdf')
        record = MedicalRecord.objects.create(
            user=self.user,
            file=med_file,
            record_type='blood_test',
            processing_status='completed'
        )

        # Assert UPLOAD event is created via signals
        self.assertEqual(TimelineEvent.objects.count(), 1)
        upload_event = TimelineEvent.objects.first()
        self.assertEqual(upload_event.event_type, 'UPLOAD')
        self.assertEqual(upload_event.title, 'Blood Test Uploaded')

        # 2. Create DocumentAnalysis (which triggers AI signal)
        analysis = DocumentAnalysis.objects.create(
            record=record,
            ai_summary='Haemoglobin values look perfectly normal.',
            confidence=0.9
        )

        self.assertEqual(TimelineEvent.objects.count(), 2)
        ai_event = TimelineEvent.objects.filter(event_type='AI').first()
        self.assertEqual(ai_event.title, 'AI Summary Generated')

        # Fetch dashboard to verify recent activity and insight preview
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertEqual(len(data['recent_activity']), 2)
        self.assertEqual(data['recent_activity'][0]['event_type'], 'AI')
        self.assertEqual(data['recent_activity'][1]['event_type'], 'UPLOAD')

        # Verify latest insight preview format
        insight = data['latest_insight']
        self.assertIsNotNone(insight)
        self.assertEqual(insight['title'], 'Recent Blood Test')
        self.assertEqual(insight['summary'], 'Haemoglobin values look perfectly normal.')
        self.assertEqual(insight['record_id'], str(record.id))

    def test_emergency_profile_readiness(self):
        # Create an emergency profile with contact name and phone
        EmergencyProfile.objects.create(
            user=self.user,
            emergency_contact_name='Jane Doe',
            emergency_contact_phone='+1234567890',
            blood_group='O+'
        )

        response = self.client.get(self.dashboard_url)
        data = response.data['data']
        self.assertTrue(data['emergency_ready'])
        self.assertEqual(len(data['missing_fields']), 0)

    def test_timeline_endpoint(self):
        # Trigger an event
        med_file = MedicalFile.objects.create(file_url='http://cloudinary.com/test.pdf')
        MedicalRecord.objects.create(
            user=self.user,
            file=med_file,
            record_type='prescription'
        )

        response = self.client.get(self.timeline_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        res_data = response.data
        self.assertTrue(res_data['success'])
        self.assertEqual(len(res_data['data']), 1)
        self.assertEqual(res_data['data'][0]['event_type'], 'UPLOAD')
        self.assertEqual(res_data['data'][0]['title'], 'Prescription Uploaded')
