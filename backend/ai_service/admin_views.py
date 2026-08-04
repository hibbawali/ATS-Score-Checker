"""
AI Service Administrative Views
Views for managing and monitoring AI service layer
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import logging

from .service import ai_service

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_service_status(request):
    """
    Get AI service status and configuration
    Future endpoint for Phase 3.2+
    """
    try:
        service_info = ai_service.get_provider_info()
        validation_results = ai_service.validate_providers()
        
        return Response({
            'status': 'operational',
            'service_info': service_info,
            'validation_results': validation_results,
            'message': 'AI service layer ready (Phase 3.1 - Foundation only)'
        })
        
    except Exception as e:
        logger.error(f"Error getting AI service status: {e}")
        return Response({
            'status': 'error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated]) 
def validate_providers(request):
    """
    Validate all configured AI providers
    Future endpoint for Phase 3.2+
    """
    try:
        validation_results = ai_service.validate_providers()
        
        return Response({
            'validation_results': validation_results,
            'message': 'Provider validation completed'
        })
        
    except Exception as e:
        logger.error(f"Error validating providers: {e}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def switch_provider(request):
    """
    Switch active AI provider
    Future endpoint for Phase 3.2+
    """
    provider_name = request.data.get('provider')
    
    if not provider_name:
        return Response({
            'error': 'Provider name required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        success = ai_service.switch_provider(provider_name)
        
        if success:
            return Response({
                'message': f'Successfully switched to provider: {provider_name}',
                'active_provider': provider_name
            })
        else:
            return Response({
                'error': f'Failed to switch to provider: {provider_name}'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error switching provider: {e}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)