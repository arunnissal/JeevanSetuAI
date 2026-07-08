from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from apps.vault.models import MedicalRecord, MedicalFile
from apps.intelligence.models import DocumentAnalysis
from apps.timeline.models import TimelineEvent
from apps.emergency.models import EmergencyProfile

User = get_user_model()

class IntelligenceInsightsAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='insightsuser@example.com',
            password='testpassword123',
            full_name='Insights User'
        )
        self.client.force_authenticate(user=self.user)
        self.insights_url = reverse('intelligence_insights')

    def test_insights_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(self.insights_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_insights_empty_state(self):
        response = self.client.get(self.insights_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertEqual(data['journey']['reports_count'], 0)
        self.assertEqual(data['journey']['ai_summaries'], 0)
        self.assertEqual(data['journey']['timeline_events'], 0)
        self.assertEqual(data['journey']['journey_started'], "Not started yet")
        self.assertEqual(data['trends'], [])
        self.assertIn("No health story available", data['health_story'])

    def test_insights_populated_state(self):
        # 1. Create a few completed medical reports
        med_file1 = MedicalFile.objects.create(file_url='http://cloudinary.com/test1.pdf')
        
        # Report 1
        record1 = MedicalRecord.objects.create(
            user=self.user,
            file=med_file1,
            record_type='blood_test',
            processing_status='completed'
        )
        DocumentAnalysis.objects.create(
            record=record1,
            diagnoses=["Vitamin D: low", "Hemoglobin: normal"],
            ai_summary="Vitamin D deficiency identified. Otherwise normal."
        )

        # Report 2
        med_file2 = MedicalFile.objects.create(file_url='http://cloudinary.com/test2.pdf')
        record2 = MedicalRecord.objects.create(
            user=self.user,
            file=med_file2,
            record_type='blood_test',
            processing_status='completed'
        )
        DocumentAnalysis.objects.create(
            record=record2,
            diagnoses=["Vitamin D: low", "Hemoglobin: normal"],
            ai_summary="Follow up showing Vitamin D remains low."
        )

        # Emergency Profile
        EmergencyProfile.objects.create(
            user=self.user,
            emergency_contact_name="Emergency Name",
            emergency_contact_phone="1234567890"
        )

        # Timeline Event
        TimelineEvent.objects.create(
            user=self.user,
            title="Document Added",
            event_type="UPLOAD"
        )

        response = self.client.get(self.insights_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertEqual(data['journey']['reports_count'], 2)
        self.assertEqual(data['journey']['ai_summaries'], 2)
        self.assertEqual(data['journey']['timeline_events'], 5)
        
        self.assertTrue(len(data['trends']) > 0)
        self.assertEqual(data['trends'][0]['title'], "Hemoglobin")
        self.assertEqual(data['trends'][0]['status'], "🟢 Stable")
        
        self.assertEqual(data['trends'][1]['title'], "Vitamin D")
        self.assertEqual(data['trends'][1]['status'], "🟡 Slight Change")
        
        # Check milestones
        milestones = {m['title']: m['completed'] for m in data['milestones']}
        self.assertTrue(milestones['Welcome to JeevanSetu AI'])
        self.assertTrue(milestones['First Medical Report Added'])
        self.assertTrue(milestones['Emergency Profile Completed'])
        self.assertFalse(milestones['Five Reports Organized'])
