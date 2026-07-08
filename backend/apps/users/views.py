from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from apps.users.serializers import RegisterSerializer, UserSerializer, HealthProfileSerializer, EmergencyProfileSerializer
from apps.users.models import HealthProfile
from apps.emergency.models import EmergencyProfile
from apps.common.responses import success_response, error_response

User = get_user_model()

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            return success_response(
                data={
                    "user": user_data,
                    "tokens": tokens
                },
                message="User registered successfully",
                status_code=status.HTTP_201_CREATED
            )
        return error_response(errors=serializer.errors, message="Registration failed")

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            email = request.data.get('email')
            user = User.objects.get(email=email)
            user_data = UserSerializer(user).data
            return success_response(
                data={
                    "user": user_data,
                    "tokens": response.data
                },
                message="Login successful"
            )
        return response

class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return success_response(data=serializer.data, message="Profile retrieved")

    def put(self, request):
        user = request.user
        data = request.data

        # Update base user fields
        user.full_name = data.get('full_name', user.full_name)
        dob = data.get('dob')
        if dob:
            user.dob = dob
        user.save()

        # Update Health Profile
        health_data = data.get('health_profile', {})
        try:
            health_profile = user.health_profile
        except HealthProfile.DoesNotExist:
            health_profile = HealthProfile.objects.create(user=user)

        if 'blood_group' in health_data:
            health_profile.blood_group = health_data['blood_group']
        if 'allergies' in health_data:
            health_profile.allergies = health_data['allergies']
        if 'medical_conditions' in health_data:
            health_profile.medical_conditions = health_data['medical_conditions']
        health_profile.save()

        # Update Emergency Profile
        emergency_data = data.get('emergency_profile', {})
        try:
            emergency_profile = user.emergency_profile
        except EmergencyProfile.DoesNotExist:
            emergency_profile = EmergencyProfile.objects.create(user=user)

        if 'emergency_contact_name' in emergency_data:
            emergency_profile.emergency_contact_name = emergency_data['emergency_contact_name']
        if 'emergency_contact_phone' in emergency_data:
            emergency_profile.emergency_contact_phone = emergency_data['emergency_contact_phone']
        
        # Save emergency profile, which will automatically sync blood_group and allergies from health_profile
        emergency_profile.save()

        # Recalculate profile progress (completeness score)
        completed_fields = 0
        total_fields = 7

        if user.full_name: completed_fields += 1
        if user.dob: completed_fields += 1
        if health_profile.blood_group: completed_fields += 1
        if health_profile.allergies: completed_fields += 1
        if health_profile.medical_conditions: completed_fields += 1
        if emergency_profile.emergency_contact_name: completed_fields += 1
        if emergency_profile.emergency_contact_phone: completed_fields += 1

        user.profile_progress = int((completed_fields / total_fields) * 100)
        user.save()

        serializer = UserSerializer(user)
        return success_response(data=serializer.data, message="Profile updated successfully")

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return success_response(message="Logout successful")
        except Exception as e:
            # If token is invalid or already blacklisted
            return success_response(message="Logout completed")
