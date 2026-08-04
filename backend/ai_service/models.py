"""
AI Service Layer - Configuration Management
Handles secure configuration and validation for AI providers
"""
import os
from typing import Dict, Optional, List
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class AIProviderConfig:
    """Configuration for an AI provider"""
    name: str
    api_key: str
    base_url: Optional[str] = None
    model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None


class AIConfigurationManager:
    """
    Manages AI provider configurations and validation
    Provides secure configuration loading without hardcoded secrets
    """
    
    SUPPORTED_PROVIDERS = ['gemini', 'openai', 'claude']
    
    def __init__(self):
        """Initialize configuration manager"""
        self._providers: Dict[str, AIProviderConfig] = {}
        self._active_provider: Optional[str] = None
        self._load_configurations()
    
    def _load_configurations(self) -> None:
        """Load AI provider configurations from environment variables"""
        logger.info("Loading AI provider configurations...")
        
        # Load Gemini configuration
        gemini_key = os.getenv('GEMINI_API_KEY')
        if gemini_key:
            self._providers['gemini'] = AIProviderConfig(
                name='gemini',
                api_key=gemini_key,
                model=os.getenv('GEMINI_MODEL', 'gemini-pro'),
                max_tokens=int(os.getenv('GEMINI_MAX_TOKENS', '2048')),
                temperature=float(os.getenv('GEMINI_TEMPERATURE', '0.7'))
            )
            logger.info("Gemini configuration loaded")
        
        # Load OpenAI configuration  
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key:
            self._providers['openai'] = AIProviderConfig(
                name='openai',
                api_key=openai_key,
                base_url=os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
                model=os.getenv('OPENAI_MODEL', 'gpt-4'),
                max_tokens=int(os.getenv('OPENAI_MAX_TOKENS', '2048')),
                temperature=float(os.getenv('OPENAI_TEMPERATURE', '0.7'))
            )
            logger.info("OpenAI configuration loaded")
        
        # Load Claude configuration
        claude_key = os.getenv('CLAUDE_API_KEY')  
        if claude_key:
            self._providers['claude'] = AIProviderConfig(
                name='claude',
                api_key=claude_key,
                base_url=os.getenv('CLAUDE_BASE_URL', 'https://api.anthropic.com/v1'),
                model=os.getenv('CLAUDE_MODEL', 'claude-3-sonnet-20240229'),
                max_tokens=int(os.getenv('CLAUDE_MAX_TOKENS', '2048')),
                temperature=float(os.getenv('CLAUDE_TEMPERATURE', '0.7'))
            )
            logger.info("Claude configuration loaded")
        
        # Set active provider
        self._active_provider = os.getenv('AI_PROVIDER', 'gemini')
        
        if not self._providers:
            logger.warning("No AI providers configured. Set environment variables for at least one provider.")
    
    def get_active_provider(self) -> Optional[AIProviderConfig]:
        """Get the currently active AI provider configuration"""
        if self._active_provider and self._active_provider in self._providers:
            return self._providers[self._active_provider]
        return None
    
    def get_provider(self, provider_name: str) -> Optional[AIProviderConfig]:
        """Get configuration for a specific provider"""
        return self._providers.get(provider_name)
    
    def list_available_providers(self) -> List[str]:
        """List all configured providers"""
        return list(self._providers.keys())
    
    def set_active_provider(self, provider_name: str) -> bool:
        """
        Set the active AI provider
        
        Args:
            provider_name: Name of the provider to activate
            
        Returns:
            True if successful, False if provider not available
        """
        if provider_name in self._providers:
            self._active_provider = provider_name
            logger.info(f"Active AI provider changed to: {provider_name}")
            return True
        
        logger.error(f"Provider '{provider_name}' not configured")
        return False
    
    def validate_configuration(self) -> Dict[str, bool]:
        """
        Validate all provider configurations
        
        Returns:
            Dictionary mapping provider names to validation status
        """
        validation_results = {}
        
        for provider_name, config in self._providers.items():
            try:
                # Basic validation
                is_valid = (
                    bool(config.api_key) and
                    len(config.api_key.strip()) > 10 and  # Reasonable API key length
                    bool(config.model)
                )
                validation_results[provider_name] = is_valid
                
                if is_valid:
                    logger.info(f"Provider '{provider_name}' configuration valid")
                else:
                    logger.warning(f"Provider '{provider_name}' configuration invalid")
                    
            except Exception as e:
                logger.error(f"Error validating provider '{provider_name}': {e}")
                validation_results[provider_name] = False
        
        return validation_results


# Global configuration manager instance
config_manager = AIConfigurationManager()
