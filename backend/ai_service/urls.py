"""
AI Service URL Configuration
Future endpoints for AI service management and testing
"""
from django.urls import path
from . import admin_views

app_name = 'ai_service'

urlpatterns = [
    # AI service status and configuration endpoints (for Phase 3.2+)
    # path('status/', admin_views.ai_service_status, name='ai_service_status'),
    # path('validate/', admin_views.validate_providers, name='validate_providers'),
    # path('switch-provider/', admin_views.switch_provider, name='switch_provider'),
    
    # Note: No AI generation endpoints yet - those will be added in Phase 3.2+
]