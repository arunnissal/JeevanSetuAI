from abc import ABC, abstractmethod

class BaseAIProvider(ABC):
    """Abstract interface defining required methods for AI providers."""
    
    @abstractmethod
    def analyze_medical_report(self, prompt: str, ocr_text: str, metadata: dict = None) -> str:
        """
        Sends medical report analysis request to provider.
        
        Args:
            prompt (str): Prompt template instructions.
            ocr_text (str): The raw text extracted from report.
            metadata (dict): Optional extra metadata fields.
            
        Returns:
            str: Raw text/JSON response from provider.
        """
        pass

    @abstractmethod
    def health_assistant_chat(self, chat_history: list, user_message: str) -> str:
        """
        Sends conversational chat messages to helper health assistant.
        
        Args:
            chat_history (list): List of past message dictionaries (role/content).
            user_message (str): New user message.
            
        Returns:
            str: Assistant response message.
        """
        pass
