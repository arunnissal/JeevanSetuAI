from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework import status

class CustomValidationException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid input parameters.'
    default_code = 'invalid'

def custom_api_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "success": False,
            "message": response.data.get("detail", str(exc)),
            "errors": response.data if isinstance(response.data, dict) and "detail" not in response.data else None
        }
    return response
