from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from apps.users.serializers import RegisterSerializer

User = get_user_model()

class UserRegistrationTests(APITestCase):
    def test_registration_endpoint(self):
        url = reverse('register')
        data = {
            'email': 'newuser@example.com',
            'password': 'Password123',
            'full_name': 'New User',
            'dob': '1990-01-01'
        }
        response = self.client.post(url, data)
        print("Response status:", response.status_code)
        print("Response data:", response.data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
