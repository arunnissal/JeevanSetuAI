class AIBaseException(Exception):
    """Base exception class for all AI Gateway operations."""
    def __init__(self, message="AI operation failed", details=None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

class AIProviderUnavailable(AIBaseException):
    """Raised when the underlying AI provider is unreachable or returns 5xx."""
    def __init__(self, message="AI provider is currently unavailable", details=None):
        super().__init__(message, details)

class AIRateLimited(AIBaseException):
    """Raised when the AI provider rate limits our requests (429)."""
    def __init__(self, message="AI provider rate limit reached", details=None):
        super().__init__(message, details)

class AIInvalidResponse(AIBaseException):
    """Raised when the AI provider returns a malformed or invalid response body."""
    def __init__(self, message="AI provider returned an invalid response", details=None):
        super().__init__(message, details)

class AIParsingError(AIBaseException):
    """Raised when the response text cannot be parsed into the required structured format."""
    def __init__(self, message="Failed to parse structured JSON from AI response", details=None):
        super().__init__(message, details)

class AITimeout(AIBaseException):
    """Raised when the AI provider request times out."""
    def __init__(self, message="AI provider request timed out", details=None):
        super().__init__(message, details)

class OCRBaseException(Exception):
    """Base exception for all OCR errors."""
    def __init__(self, message="OCR operation failed", details=None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

class OCRFailedException(OCRBaseException):
    """Raised when OCR execution itself crashes or fails."""
    def __init__(self, message="OCR processing failed", details=None):
        super().__init__(message, details)

class OCRValidationException(OCRBaseException):
    """Raised when extracted text does not pass quality or length thresholds."""
    def __init__(self, message="Blank or unreadable document rejected", details=None):
        super().__init__(message, details)
