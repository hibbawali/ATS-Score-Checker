"""
AI Service Layer Configuration
Handles AI provider abstraction and configuration management
"""
from django.apps import AppConfig


class AiServiceConfig(AppConfig):
    """Configuration for AI Service app"""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_service'
    verbose_name = 'AI Service Layer'
