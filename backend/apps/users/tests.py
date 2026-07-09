import datetime
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()

class UserRegistrationTests(APITestCase):
    def setUp(self):
        self.url = reverse('register')

    def test_registration_with_valid_dob(self):
        data = {
            'email': 'valid_dob@example.com',
            'password': 'Password123',
            'full_name': 'Valid DOB User',
            'dob': '1990-01-01'
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['success'], True)
        self.assertEqual(response.data['data']['user']['dob'], '1990-01-01')

    def test_registration_without_dob(self):
        data = {
            'email': 'no_dob@example.com',
            'password': 'Password123',
            'full_name': 'No DOB User'
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['success'], True)
        self.assertIsNone(response.data['data']['user']['dob'])

    def test_registration_with_empty_string_dob(self):
        data = {
            'email': 'empty_dob@example.com',
            'password': 'Password123',
            'full_name': 'Empty DOB User',
            'dob': ''
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['success'], True)
        self.assertIsNone(response.data['data']['user']['dob'])

    def test_registration_with_null_dob(self):
        data = {
            'email': 'null_dob@example.com',
            'password': 'Password123',
            'full_name': 'Null DOB User',
            'dob': None
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['success'], True)
        self.assertIsNone(response.data['data']['user']['dob'])

    def test_registration_with_future_dob(self):
        future_date = (datetime.date.today() + datetime.timedelta(days=1)).strftime('%Y-%m-%d')
        data = {
            'email': 'future_dob@example.com',
            'password': 'Password123',
            'full_name': 'Future DOB User',
            'dob': future_date
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['success'], False)
        self.assertIn('dob', response.data['errors'])

    def test_registration_with_duplicate_email(self):
        # Create a user first
        User.objects.create_user(
            email='duplicate@example.com',
            password='Password123',
            full_name='First User'
        )
        data = {
            'email': 'duplicate@example.com',
            'password': 'Password123',
            'full_name': 'Duplicate User'
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['success'], False)
        self.assertIn('email', response.data['errors'])
