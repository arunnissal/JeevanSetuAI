from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.users.models import HealthProfile
from apps.emergency.models import EmergencyProfile

User = get_user_model()

class HealthProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthProfile
        fields = ['blood_group', 'allergies', 'medical_conditions']

class EmergencyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyProfile
        fields = ['emergency_contact_name', 'emergency_contact_phone', 'blood_group', 'allergies']
        read_only_fields = ['blood_group', 'allergies'] # Synced from HealthProfile

class UserSerializer(serializers.ModelSerializer):
    health_profile = HealthProfileSerializer(required=False)
    emergency_profile = EmergencyProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'dob', 'profile_progress', 'health_profile', 'emergency_profile']
        read_only_fields = ['id', 'profile_progress']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'full_name', 'dob']

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            dob=validated_data.get('dob')
        )
        # Create empty profiles
        HealthProfile.objects.create(user=user)
        EmergencyProfile.objects.create(user=user)
        return user
