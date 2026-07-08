import re
from django.core.exceptions import ValidationError

def validate_phone_number(value):
    # Standard Indian phone validation (+91xxxxxxxxxx or 10 digits starting with 6-9)
    pattern = re.compile(r'^(?:\+91|0)?[6-9]\d{9}$')
    if not pattern.match(value):
        raise ValidationError('Invalid phone number. Must be a valid 10-digit number optionally prefixed with +91.')
