"""
AI Service Layer - Main Service Manager
Coordinates AI provider operations and manages the service layer
"""
from typing import Optional, Dict, Any
import logging
from .models import config_manager, AIProviderConfig
from .views import AIProviderInterface, AIRequest, AIResponse, AIProviderError, MockAIProvider

logger = logging.getLogger(__name__)


class AIServiceManager:
    """
    Main AI service coordinator
    Manages AI providers and handles service-level operations
    """
    
    def __init__(self):
        """Initialize the AI service manager"""
        self.config = config_manager
        self._providers: Dict[str, AIProviderInterface] = {}
        self._initialize_providers()
    
    def _initialize_providers(self) -> None:
        """Initialize available AI providers"""
        logger.info("Initializing AI providers...")
        
        # Always initialize mock provider for testing
        self._providers['mock'] = MockAIProvider()
        
        # Initialize real providers based on configuration
        available_providers = self.config.list_available_providers()
        
        if not available_providers:
            logger.warning("No AI providers configured. Only mock provider available.")
            return
        
        for provider_name in available_providers:
            try:
                # For now, we'll use mock providers since real implementations aren't ready
                # This will be replaced with actual provider implementations in Phase 3.2+
                self._providers[provider_name] = MockAIProvider(provider_name)
                logger.info(f"Initialized mock provider for: {provider_name}")
                
            except Exception as e:
                logger.error(f"Failed to initialize provider '{provider_name}': {e}")
    
    def get_active_provider(self) -> Optional[AIProviderInterface]:
        """Get the currently active AI provider"""
        active_config = self.config.get_active_provider()
        
        if not active_config:
            # Fallback to mock provider
            logger.info("No active provider configured, using mock provider")
            return self._providers.get('mock')
        
        return self._providers.get(active_config.name)
    
    def generate_text(
        self, 
        prompt: str,
        system_message: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        provider: Optional[str] = None
    ) -> AIResponse:
        """
        Generate text using AI provider
        
        Args:
            prompt: The text prompt for generation
            system_message: Optional system message
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            provider: Specific provider to use (optional)
            
        Returns:
            AI response with generated content
            
        Raises:
            AIProviderError: If generation fails
        """
        # Select provider
        if provider:
            ai_provider = self._providers.get(provider)
            if not ai_provider:
                raise AIProviderError(f"Provider '{provider}' not available", provider)
        else:
            ai_provider = self.get_active_provider()
            if not ai_provider:
                raise AIProviderError("No AI provider available", "none")
        
        # Create request
        request = AIRequest(
            prompt=prompt,
            system_message=system_message,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        # Generate response
        try:
            logger.info(f"Generating AI response using provider: {ai_provider.get_provider_info()['provider']}")
            response = ai_provider.generate_text(request)
            logger.info("AI response generated successfully")
            return response
            
        except Exception as e:
            logger.error(f"AI generation failed: {e}")
            raise AIProviderError(str(e), ai_provider.get_provider_info()['provider'])
    
    def validate_providers(self) -> Dict[str, bool]:
        """
        Validate all configured providers
        
        Returns:
            Dictionary mapping provider names to validation status
        """
        validation_results = {}
        
        for provider_name, provider in self._providers.items():
            try:
                is_valid = provider.validate_connection()
                validation_results[provider_name] = is_valid
                logger.info(f"Provider '{provider_name}' validation: {'✅ PASS' if is_valid else '❌ FAIL'}")
                
            except Exception as e:
                logger.error(f"Provider '{provider_name}' validation failed: {e}")
                validation_results[provider_name] = False
        
        return validation_results
    
    def get_provider_info(self, provider_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get information about providers
        
        Args:
            provider_name: Specific provider name (optional)
            
        Returns:
            Provider information dictionary
        """
        if provider_name:
            provider = self._providers.get(provider_name)
            if provider:
                return provider.get_provider_info()
            else:
                return {"error": f"Provider '{provider_name}' not found"}
        
        # Return info for all providers
        providers_info = {}
        for name, provider in self._providers.items():
            try:
                providers_info[name] = provider.get_provider_info()
            except Exception as e:
                providers_info[name] = {"error": str(e)}
        
        return {
            "active_provider": self.config._active_provider,
            "available_providers": providers_info,
            "configuration_status": self.config.validate_configuration()
        }
    
    def switch_provider(self, provider_name: str) -> bool:
        """
        Switch to a different AI provider
        
        Args:
            provider_name: Name of provider to switch to
            
        Returns:
            True if successful, False otherwise
        """
        if provider_name not in self._providers:
            logger.error(f"Cannot switch to '{provider_name}': provider not available")
            return False
        
        success = self.config.set_active_provider(provider_name)
        if success:
            logger.info(f"Successfully switched to provider: {provider_name}")
        
        return success


# Global AI service manager instance
ai_service = AIServiceManager()