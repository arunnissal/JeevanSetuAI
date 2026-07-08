from rest_framework.permissions import BasePermission

class IsProfileCompleted(BasePermission):
    message = "You must complete onboarding before accessing this resource."

    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.profile_progress == 100
        )
