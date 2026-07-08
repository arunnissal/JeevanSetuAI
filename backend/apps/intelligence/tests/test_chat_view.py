from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from apps.vault.models import MedicalRecord, MedicalFile
from apps.intelligence.models import ChatMessage

User = get_user_model()

class HealthAssistantChatAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='chatuser@example.com',
            password='testpassword123',
            full_name='Chat User'
        )
        self.client.force_authenticate(user=self.user)
        self.chat_url = reverse('health_assistant_chat')

    def test_chat_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(self.chat_url, {"message": "hello"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_chat_empty_history(self):
        response = self.client.get(self.chat_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data'], [])

    @patch('apps.intelligence.providers.sarvam_provider.SarvamProvider.chat')
    def test_chat_submit_and_persistence(self, mock_chat):
        mock_chat.return_value = "Hello, I am your assistant."
        
        # 1. Post message
        response = self.client.post(self.chat_url, {"message": "hello assistant"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['response'], "Hello, I am your assistant.")
        
        # 2. Check persistence in db
        chat_logs = ChatMessage.objects.filter(user=self.user).order_by('created_at')
        self.assertEqual(chat_logs.count(), 2)
        self.assertEqual(chat_logs[0].role, 'user')
        self.assertEqual(chat_logs[0].content, 'hello assistant')
        self.assertEqual(chat_logs[1].role, 'assistant')
        self.assertEqual(chat_logs[1].content, 'Hello, I am your assistant.')

        # 3. Get history endpoint
        get_response = self.client.get(self.chat_url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(get_response.data['data']), 2)

        # 4. Clear history (DELETE)
        delete_response = self.client.delete(self.chat_url)
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        self.assertEqual(ChatMessage.objects.filter(user=self.user).count(), 0)
