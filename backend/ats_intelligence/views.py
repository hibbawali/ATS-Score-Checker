"""
ATS Intelligence API Views
Main API endpoints for Phase 2 functionality
"""
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import json

from .models import JobDescription, SemanticAnalysis, AdvancedAnalysis
from resume.models import UploadedResume
from job_description_parser.parser import JobDescriptionParser
from semantic_matcher.matcher import SemanticMatcher
from scoring_engine.engine import AdvancedScoringEngine
from recommendation_engine.engine import EnhancedRecommendationEngine

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_advanced(request):
    """
    Advanced ATS Analysis API endpoint
    Combines resume analysis with job description matching using Phase 2 intelligence
    """
    try:
        # Enhanced request validation
        if not request.body:
            return Response({
                'error': 'Request body is required',
                'code': 'MISSING_BODY'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return Response({
                'error': 'Invalid JSON format',
                'code': 'INVALID_JSON'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Required field validation
        resume_id = data.get('resume_id')
        if not resume_id:
            return Response({
                'error': 'resume_id is required',
                'code': 'MISSING_RESUME_ID'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate resume_id format (should be UUID)
        try:
            import uuid
            uuid.UUID(str(resume_id))
        except (ValueError, TypeError):
            return Response({
                'error': 'Invalid resume_id format',
                'code': 'INVALID_RESUME_ID'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Optional field validation
        job_description_text = data.get('job_description', '').strip()
        job_title = data.get('job_title', '').strip()
        
        # Validate job description length if provided with minimum length check
        if job_description_text:
            if len(job_description_text) < 10:
                return Response({
                    'error': 'Job description too short (minimum 10 characters)',
                    'code': 'JD_TOO_SHORT'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if len(job_description_text) > 50000:
                return Response({
                    'error': 'Job description too long (max 50,000 characters)',
                    'code': 'JD_TOO_LONG'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the uploaded resume with enhanced error handling
        try:
            resume = UploadedResume.objects.get(id=resume_id, user=request.user)
        except UploadedResume.DoesNotExist:
            return Response({
                'error': 'Resume not found or access denied',
                'code': 'RESUME_NOT_FOUND'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if resume has extracted text
        if not resume.extracted_text or len(resume.extracted_text.strip()) < 10:
            return Response({
                'error': 'Resume text is empty or too short for analysis',
                'code': 'INSUFFICIENT_TEXT'
            }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        # Initialize engines with error handling
        try:
            jd_parser = JobDescriptionParser()
            semantic_matcher = SemanticMatcher()
            scoring_engine = AdvancedScoringEngine()
            recommendation_engine = EnhancedRecommendationEngine()
        except Exception as e:
            logger.error(f"Engine initialization failed: {e}")
            return Response({
                'error': 'Analysis engines initialization failed',
                'code': 'ENGINE_INIT_FAILED'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Process job description if provided
        job_description = None
        semantic_analysis = None
        match_result = None
        
        if job_description_text:
            try:
                # Parse job description
                parsed_jd = jd_parser.parse(job_description_text)
                
                # Create or update JobDescription record
                job_description, created = JobDescription.objects.get_or_create(
                    user=request.user,
                    raw_text=job_description_text,
                    defaults={
                        'job_title': job_title or parsed_jd.job_title,
                        'company_name': parsed_jd.company_name,
                        'required_skills': parsed_jd.required_skills,
                        'preferred_skills': parsed_jd.preferred_skills,
                        'technologies': parsed_jd.technologies,
                        'experience_required': parsed_jd.experience_required,
                        'education_requirements': parsed_jd.education_requirements,
                    }
                )
                
                # Perform semantic matching
                try:
                    match_result = semantic_matcher.match_resume_to_job(
                        resume_text=resume.extracted_text,
                        job_description=job_description_text,
                        required_skills=parsed_jd.required_skills,
                        preferred_skills=parsed_jd.preferred_skills
                    )
                    
                    # Create or update semantic analysis record
                    semantic_analysis, created = SemanticAnalysis.objects.get_or_create(
                        user=request.user,
                        resume=resume,
                        job_description=job_description,
                        defaults={
                            'overall_semantic_match': match_result.overall_similarity,
                            'skills_match_score': match_result.skills_similarity,
                            'experience_match_score': match_result.experience_similarity,
                            'matching_skills': [skill.get('skill', '') if isinstance(skill, dict) else str(skill) for skill in match_result.matching_skills],
                            'missing_skills': match_result.missing_skills,
                            'skill_gaps': match_result.skill_gaps,
                        }
                    )
                    
                except Exception as e:
                    logger.warning(f"Semantic matching failed, continuing without it: {e}")
                    # Continue without semantic analysis - this is not a fatal error
                    match_result = None
                    
            except Exception as e:
                logger.error(f"Job description parsing failed: {e}")
                return Response({
                    'error': 'Job description processing failed',
                    'code': 'JD_PROCESSING_FAILED'
                }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        # Perform advanced scoring
        try:
            scoring_result = scoring_engine.calculate_advanced_score(
                resume_text=resume.extracted_text,
                semantic_match_result=match_result,
                job_description=job_description_text,
                file_metadata={
                    'fileType': getattr(resume, 'file_type', 'pdf'),
                    'pageCount': getattr(resume, 'page_count', 1)
                }
            )
            
            # Create advanced analysis record
            advanced_analysis = AdvancedAnalysis.objects.create(
                user=request.user,
                resume=resume,
                job_description=job_description,
                semantic_analysis=semantic_analysis,
                overall_score=scoring_result.overall_score,
                jd_match_score=scoring_result.jd_match_score,
                skills_score=scoring_result.skills_score,
                experience_score=scoring_result.experience_score,
                projects_score=scoring_result.projects_score,
                education_score=scoring_result.education_score,
                grammar_score=scoring_result.grammar_score,
                formatting_score=scoring_result.formatting_score,
                recommendations=scoring_result.recommendations,
                improvement_suggestions=scoring_result.category_feedback,
            )
            
        except Exception as e:
            logger.error(f"Advanced scoring failed: {e}")
            return Response({
                'error': 'Scoring analysis failed. Please try again.',
                'code': 'SCORING_FAILED'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Generate enhanced recommendations
        recommendation_result = None
        try:
            recommendation_result = recommendation_engine.generate_recommendations(
                scoring_result=scoring_result,
                semantic_match_result=match_result,
                resume_text=resume.extracted_text,
                job_description=job_description_text
            )
        except Exception as e:
            logger.warning(f"Enhanced recommendation generation failed, using basic recommendations: {e}")
            # Continue without enhanced recommendations - basic ones are available from scoring_result
        
        # Prepare response data with validation
        try:
            response_data = {
                'analysis_id': str(advanced_analysis.id),
                'overall_score': scoring_result.overall_score,
                'category_scores': {
                    'jd_match': scoring_result.jd_match_score,
                    'skills': scoring_result.skills_score,
                    'experience': scoring_result.experience_score,
                    'projects': scoring_result.projects_score,
                    'education': scoring_result.education_score,
                    'grammar': scoring_result.grammar_score,
                    'formatting': scoring_result.formatting_score,
                },
                'recommendations': scoring_result.recommendations or [],
                'category_feedback': scoring_result.category_feedback or {},
                'has_job_description': bool(job_description_text),
                'analysis_version': '2.0',
                'created_at': advanced_analysis.created_at.isoformat() if hasattr(advanced_analysis, 'created_at') else None,
            }
            
            # Add semantic analysis results if available
            if semantic_analysis:
                response_data['semantic_analysis'] = {
                    'overall_match': round(semantic_analysis.overall_semantic_match, 4),
                    'skills_match': round(semantic_analysis.skills_match_score, 4),
                    'experience_match': round(semantic_analysis.experience_match_score, 4),
                    'matching_skills': semantic_analysis.matching_skills or [],
                    'missing_skills': semantic_analysis.missing_skills or [],
                    'skill_gaps': semantic_analysis.skill_gaps or {},
                }
            
            # Add enhanced recommendations if available
            if recommendation_result:
                response_data['enhanced_recommendations'] = {
                    'priority_recommendations': getattr(recommendation_result, 'priority_recommendations', []),
                    'skill_recommendations': getattr(recommendation_result, 'skill_recommendations', []),
                    'content_recommendations': getattr(recommendation_result, 'content_recommendations', []),
                    'formatting_recommendations': getattr(recommendation_result, 'formatting_recommendations', []),
                    'overall_advice': getattr(recommendation_result, 'overall_advice', ''),
                }
            
        except Exception as e:
            logger.error(f"Response data preparation failed: {e}")
            # Fallback to minimal response
            response_data = {
                'analysis_id': str(advanced_analysis.id) if 'advanced_analysis' in locals() else None,
                'overall_score': getattr(scoring_result, 'overall_score', 0) if 'scoring_result' in locals() else 0,
                'error': 'Analysis completed but response formatting failed',
                'code': 'RESPONSE_FORMAT_ERROR'
            }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Advanced analysis failed with unexpected error: {e}", exc_info=True)
        return Response({
            'error': 'Analysis failed due to an unexpected error. Please try again.',
            'code': 'UNEXPECTED_ERROR'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parse_job_description(request):
    """
    Parse job description text and extract structured information
    """
    try:
        # Enhanced request validation
        if not request.body:
            return Response({
                'error': 'Request body is required',
                'code': 'MISSING_BODY'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return Response({
                'error': 'Invalid JSON format',
                'code': 'INVALID_JSON'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        job_description_text = data.get('job_description', '').strip()
        
        # Validation with minimum length check moved from database constraint
        if not job_description_text:
            return Response({
                'error': 'job_description field is required and cannot be empty',
                'code': 'MISSING_JD_TEXT'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(job_description_text) < 10:
            return Response({
                'error': 'Job description too short (minimum 10 characters)',
                'code': 'JD_TOO_SHORT'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(job_description_text) < 10:
            return Response({
                'error': 'Job description too short (minimum 10 characters)',
                'code': 'JD_TOO_SHORT'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(job_description_text) > 50000:
            return Response({
                'error': 'Job description too short (minimum 10 characters)',
                'code': 'JD_TOO_SHORT'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(job_description_text) > 50000:
            return Response({
                'error': 'Job description too long (maximum 50,000 characters)',
                'code': 'JD_TOO_LONG'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse the job description
        try:
            parser = JobDescriptionParser()
            parsed_result = parser.parse(job_description_text)
        except Exception as e:
            logger.error(f"Job description parsing failed: {e}")
            return Response({
                'error': 'Failed to parse job description',
                'code': 'PARSING_FAILED'
            }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        # Return parsed data with validation
        try:
            response_data = {
                'success': True,
                'job_title': parsed_result.job_title or '',
                'company_name': parsed_result.company_name or '',
                'required_skills': parsed_result.required_skills or [],
                'preferred_skills': parsed_result.preferred_skills or [],
                'technologies': parsed_result.technologies or [],
                'experience_required': parsed_result.experience_required or '',
                'education_requirements': parsed_result.education_requirements or [],
                'soft_skills': parsed_result.soft_skills or [],
                'responsibilities': parsed_result.responsibilities or [],
                'benefits': parsed_result.benefits or [],
                'parsing_stats': {
                    'total_skills_found': len((parsed_result.required_skills or []) + (parsed_result.preferred_skills or [])),
                    'technologies_found': len(parsed_result.technologies or []),
                    'has_experience_req': bool(parsed_result.experience_required),
                    'has_education_req': bool(parsed_result.education_requirements),
                }
            }
        except Exception as e:
            logger.error(f"Response formatting failed: {e}")
            return Response({
                'error': 'Parsing completed but response formatting failed',
                'code': 'RESPONSE_FORMAT_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Job description parsing endpoint failed: {e}", exc_info=True)
        return Response({
            'error': 'Job description parsing failed due to unexpected error',
            'code': 'UNEXPECTED_ERROR'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def semantic_match(request):
    """
    Perform semantic matching between resume and job description
    """
    try:
        data = json.loads(request.body) if request.body else {}
        resume_id = data.get('resume_id')
        job_description_text = data.get('job_description', '')
        
        if not resume_id or not job_description_text:
            return Response({
                'error': 'Both resume_id and job_description are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the uploaded resume
        try:
            resume = UploadedResume.objects.get(id=resume_id, user=request.user)
        except UploadedResume.DoesNotExist:
            return Response({
                'error': 'Resume not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Perform semantic matching
        semantic_matcher = SemanticMatcher()
        match_result = semantic_matcher.match_resume_to_job(
            resume_text=resume.extracted_text,
            job_description=job_description_text
        )
        
        # Return matching results
        response_data = {
            'overall_similarity': match_result.overall_similarity,
            'skills_similarity': match_result.skills_similarity,
            'experience_similarity': match_result.experience_similarity,
            'matching_skills': match_result.matching_skills,
            'missing_skills': match_result.missing_skills,
            'skill_gaps': match_result.skill_gaps,
            'recommendations': match_result.recommendations,
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Semantic matching failed: {e}")
        return Response({
            'error': 'Semantic matching failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analysis_history(request):
    """
    Get user's analysis history
    """
    try:
        # Get recent advanced analyses
        analyses = AdvancedAnalysis.objects.filter(
            user=request.user
        ).order_by('-created_at')[:10]
        
        history_data = []
        for analysis in analyses:
            history_data.append({
                'id': str(analysis.id),
                'resume_filename': analysis.resume.original_filename,
                'overall_score': analysis.overall_score,
                'performance_band': analysis.performance_band,
                'has_job_description': bool(analysis.job_description),
                'job_title': analysis.job_description.job_title if analysis.job_description else '',
                'created_at': analysis.created_at.isoformat(),
                'analysis_version': analysis.analysis_version,
            })
        
        return Response({
            'analyses': history_data,
            'total_count': analyses.count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Failed to get analysis history: {e}")
        return Response({
            'error': 'Failed to retrieve analysis history'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)