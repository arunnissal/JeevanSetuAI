from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from apps.users.models import HealthProfile
from apps.emergency.models import EmergencyProfile
from apps.common.validators import validate_phone_number
import datetime

User = get_user_model()

class HealthProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthProfile
        fields = ['blood_group', 'allergies', 'medical_conditions', 'ai_personalization']

class EmergencyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyProfile
        fields = ['emergency_contact_name', 'emergency_contact_phone', 'blood_group', 'allergies']
        read_only_fields = ['blood_group', 'allergies']

    def validate_emergency_contact_phone(self, value):
        if value:
            try:
                validate_phone_number(value)
            except DjangoValidationError as e:
                raise serializers.ValidationError(list(e.messages))
        return value

class UserSerializer(serializers.ModelSerializer):
    health_profile = HealthProfileSerializer(required=False)
    emergency_profile = EmergencyProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'dob', 'profile_progress', 'language', 'health_profile', 'emergency_profile']
        read_only_fields = ['id', 'profile_progress']

    def validate_dob(self, value):
        if value and value > datetime.date.today():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(required=True)
    dob = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'full_name', 'dob']

    def to_internal_value(self, data):
        if 'dob' in data and data['dob'] == '':
            data = data.copy()
            data['dob'] = None
        return super().to_internal_value(data)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return value.lower()

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        if not any(char.isalpha() for char in value):
            raise serializers.ValidationError("Password must contain at least one letter.")
        return value

    def validate_dob(self, value):
        if value and value > datetime.date.today():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

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
