class ConfidenceValidator:
    ALLOWED_VALUES = {'HIGH', 'MEDIUM', 'LOW'}

    @classmethod
    def validate(cls, value: str) -> str:
        if not value:
            return 'MEDIUM'
        
        normalized = str(value).strip().upper()
        if normalized in cls.ALLOWED_VALUES:
            return normalized
            
        return 'MEDIUM'
