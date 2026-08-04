"""
AI Service Layer - Provider Interface
Abstract interface for AI providers to enable easy switching between services
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class AIRequest:
    """Standardized AI request structure"""
    prompt: str
    system_message: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    context: Optional[Dict[str, Any]] = None


@dataclass 
class AIResponse:
    """Standardized AI response structure"""
    content: str
    provider: str
    model: str
    tokens_used: Optional[int] = None
    finish_reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AIProviderInterface(ABC):
    """
    Abstract base class for AI provider implementations
    All AI providers must implement this interface
    """
    
    @abstractmethod
    def generate_text(self, request: AIRequest) -> AIResponse:
        """
        Generate text using the AI provider
        
        Args:
            request: Standardized AI request
            
        Returns:
            Standardized AI response
            
        Raises:
            AIProviderError: If generation fails
        """
        pass
    
    @abstractmethod
    def validate_connection(self) -> bool:
        """
        Validate connection to the AI provider
        
        Returns:
            True if connection is valid, False otherwise
        """
        pass
    
    @abstractmethod
    def get_provider_info(self) -> Dict[str, Any]:
        """
        Get information about the provider
        
        Returns:
            Dictionary with provider metadata
        """
        pass


class AIProviderError(Exception):
    """Custom exception for AI provider errors"""
    
    def __init__(self, message: str, provider: str, error_code: Optional[str] = None):
        self.message = message
        self.provider = provider
        self.error_code = error_code
        super().__init__(self.message)


class MockAIProvider(AIProviderInterface):
    """
    Mock AI provider for testing and development
    Returns predefined responses without calling external APIs
    """
    
    def __init__(self, provider_name: str = "mock"):
        self.provider_name = provider_name
        self.model_name = "mock-model-v1"
    
    def generate_text(self, request: AIRequest) -> AIResponse:
        """Generate mock response for testing"""
        logger.info(f"Mock AI provider generating response for prompt: {request.prompt[:50]}...")
        
        # Mock response based on request type
        mock_content = self._generate_mock_content(request.prompt)
        
        return AIResponse(
            content=mock_content,
            provider=self.provider_name,
            model=self.model_name,
            tokens_used=len(mock_content.split()),
            finish_reason="mock_complete",
            metadata={"mock": True, "request_length": len(request.prompt)}
        )
    
    def validate_connection(self) -> bool:
        """Mock provider always validates successfully"""
        return True
    
    def get_provider_info(self) -> Dict[str, Any]:
        """Return mock provider information"""
        return {
            "provider": self.provider_name,
            "model": self.model_name,
            "type": "mock",
            "description": "Mock AI provider for testing and development"
        }
    
    def _generate_mock_content(self, prompt: str) -> str:
        """Generate appropriate mock content based on prompt keywords"""
        prompt_lower = prompt.lower()
        
        if "resume" in prompt_lower and "rewrite" in prompt_lower:
            return "This is a mock resume rewrite response. In a real implementation, this would contain an improved version of the resume."
        
        if "recommendation" in prompt_lower or "suggest" in prompt_lower:
            return "This is a mock recommendation response. In a real implementation, this would contain specific suggestions for resume improvement."
        
        if "skills" in prompt_lower:
            return "This is a mock skills analysis response. In a real implementation, this would analyze the skills gap and provide recommendations."
        
        return f"This is a mock AI response to: {prompt[:100]}..."


class AIServiceError(Exception):
    """General AI service error"""
    pass
