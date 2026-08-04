from django.shortcuts import render
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
import os
import logging
import uuid
from pathlib import Path

from .models import UploadedResume, StructuredResumeData
from .parser import ResumeAnalysisEngine, ResumeParsingError

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_resume(request):
    """
    Upload and analyze a resume file (PDF or DOCX)
    Phase 3.2 - Resume Analysis Engine
    """
    try:
        # Validate file upload
        if 'resume_file' not in request.FILES:
            return Response({
                'error': 'No resume file provided',
                'code': 'NO_FILE'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['resume_file']
        
        # Validate file type
        file_extension = Path(uploaded_file.name).suffix.lower()
        if file_extension not in ['.pdf', '.docx']:
            return Response({
                'error': 'Unsupported file type. Please upload PDF or DOCX files only.',
                'code': 'INVALID_FILE_TYPE'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size (10MB limit)
        if uploaded_file.size > 10 * 1024 * 1024:
            return Response({
                'error': 'File too large. Maximum size is 10MB.',
                'code': 'FILE_TOO_LARGE'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension_clean = file_extension.lstrip('.')
        filename = f"{file_id}.{file_extension_clean}"
        
        # Save file to media directory
        media_path = os.path.join('resumes', request.user.id.hex, filename)
        file_path = default_storage.save(media_path, ContentFile(uploaded_file.read()))
        full_file_path = os.path.join(settings.MEDIA_ROOT, file_path)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(full_file_path), exist_ok=True)
        
        # Create initial resume record
        resume = UploadedResume.objects.create(
            user=request.user,
            original_filename=uploaded_file.name,
            file_path=full_file_path,
            file_size=uploaded_file.size,
            file_type=file_extension_clean,
            extracted_text="",  # Will be populated by analysis
            text_length=0,
            job_title_context=request.data.get('job_title_context', ''),
            is_processed=False
        )
        
        # Analyze the resume
        try:
            engine = ResumeAnalysisEngine()
            extracted_data = engine.analyze_resume_file(full_file_path, file_extension_clean)
            
            # Update resume with extracted text (reconstruct from structured data)
            resume.extracted_text = _reconstruct_text_from_data(extracted_data)
            resume.text_length = len(resume.extracted_text)
            resume.is_processed = True
            resume.save()
            
            # Create structured resume data
            structured_data = StructuredResumeData.objects.create(
                resume=resume,
                user=request.user,
                full_name=extracted_data.full_name,
                email=extracted_data.email,
                phone=extracted_data.phone,
                linkedin_url=extracted_data.linkedin_url,
                github_url=extracted_data.github_url,
                portfolio_url=extracted_data.portfolio_url,
                location=extracted_data.location,
                professional_summary=extracted_data.professional_summary,
                technical_skills=extracted_data.technical_skills,
                soft_skills=extracted_data.soft_skills,
                programming_languages=extracted_data.programming_languages,
                frameworks=extracted_data.frameworks,
                databases=extracted_data.databases,
                cloud_platforms=extracted_data.cloud_platforms,
                tools=extracted_data.tools,
                work_experience=extracted_data.work_experience,
                projects=extracted_data.projects,
                education=extracted_data.education,
                certifications=extracted_data.certifications,
                languages=extracted_data.languages,
                achievements=extracted_data.achievements,
                publications=extracted_data.publications,
                volunteer_experience=extracted_data.volunteer_experience,
                extraction_confidence=extracted_data.extraction_confidence,
                sections_found=extracted_data.sections_found,
                processing_notes=extracted_data.processing_notes
            )
            
            # Prepare response data
            response_data = {
                'resume_id': str(resume.id),
                'filename': uploaded_file.name,
                'file_size': uploaded_file.size,
                'extraction_confidence': extracted_data.extraction_confidence,
                'structured_data': {
                    'personal_info': {
                        'full_name': extracted_data.full_name,
                        'email': extracted_data.email,
                        'phone': extracted_data.phone,
                        'linkedin_url': extracted_data.linkedin_url,
                        'github_url': extracted_data.github_url,
                        'portfolio_url': extracted_data.portfolio_url,
                        'location': extracted_data.location,
                    },
                    'professional_summary': extracted_data.professional_summary,
                    'skills': {
                        'technical_skills': extracted_data.technical_skills,
                        'soft_skills': extracted_data.soft_skills,
                        'programming_languages': extracted_data.programming_languages,
                        'frameworks': extracted_data.frameworks,
                        'databases': extracted_data.databases,
                        'cloud_platforms': extracted_data.cloud_platforms,
                        'tools': extracted_data.tools,
                    },
                    'work_experience': extracted_data.work_experience,
                    'projects': extracted_data.projects,
                    'education': extracted_data.education,
                    'certifications': extracted_data.certifications,
                    'languages': extracted_data.languages,
                    'achievements': extracted_data.achievements,
                    'publications': extracted_data.publications,
                    'volunteer_experience': extracted_data.volunteer_experience,
                },
                'analysis_metadata': {
                    'sections_found': extracted_data.sections_found,
                    'processing_notes': extracted_data.processing_notes,
                    'total_experience_years': structured_data.total_experience_years,
                    'total_skills_count': structured_data.total_skills_count,
                    'has_complete_profile': structured_data.has_complete_profile,
                },
                'message': 'Resume uploaded and analyzed successfully'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except ResumeParsingError as e:
            # Update resume with error
            resume.processing_error = str(e)
            resume.save()
            
            return Response({
                'resume_id': str(resume.id),
                'error': f'Resume analysis failed: {str(e)}',
                'code': 'ANALYSIS_FAILED'
            }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        
    except Exception as e:
        logger.error(f"Resume upload failed: {e}", exc_info=True)
        return Response({
            'error': 'Resume upload failed due to unexpected error',
            'code': 'UPLOAD_FAILED'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_resume_data(request, resume_id):
    """
    Get structured resume data for a specific resume
    """
    try:
        # Get the resume
        resume = UploadedResume.objects.get(id=resume_id, user=request.user)
        
        # Get structured data if available
        try:
            structured_data = StructuredResumeData.objects.get(resume=resume)
            
            response_data = {
                'resume_id': str(resume.id),
                'filename': resume.original_filename,
                'uploaded_at': resume.uploaded_at.isoformat(),
                'is_processed': resume.is_processed,
                'extraction_confidence': structured_data.extraction_confidence,
                'structured_data': {
                    'personal_info': {
                        'full_name': structured_data.full_name,
                        'email': structured_data.email,
                        'phone': structured_data.phone,
                        'linkedin_url': structured_data.linkedin_url,
                        'github_url': structured_data.github_url,
                        'portfolio_url': structured_data.portfolio_url,
                        'location': structured_data.location,
                    },
                    'professional_summary': structured_data.professional_summary,
                    'skills': {
                        'technical_skills': structured_data.technical_skills,
                        'soft_skills': structured_data.soft_skills,
                        'programming_languages': structured_data.programming_languages,
                        'frameworks': structured_data.frameworks,
                        'databases': structured_data.databases,
                        'cloud_platforms': structured_data.cloud_platforms,
                        'tools': structured_data.tools,
                    },
                    'work_experience': structured_data.work_experience,
                    'projects': structured_data.projects,
                    'education': structured_data.education,
                    'certifications': structured_data.certifications,
                    'languages': structured_data.languages,
                    'achievements': structured_data.achievements,
                    'publications': structured_data.publications,
                    'volunteer_experience': structured_data.volunteer_experience,
                },
                'analysis_metadata': {
                    'sections_found': structured_data.sections_found,
                    'processing_notes': structured_data.processing_notes,
                    'total_experience_years': structured_data.total_experience_years,
                    'total_skills_count': structured_data.total_skills_count,
                    'has_complete_profile': structured_data.has_complete_profile,
                },
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except StructuredResumeData.DoesNotExist:
            return Response({
                'resume_id': str(resume.id),
                'filename': resume.original_filename,
                'uploaded_at': resume.uploaded_at.isoformat(),
                'is_processed': resume.is_processed,
                'error': 'Structured data not available',
                'processing_error': resume.processing_error
            }, status=status.HTTP_404_NOT_FOUND)
        
    except UploadedResume.DoesNotExist:
        return Response({
            'error': 'Resume not found',
            'code': 'RESUME_NOT_FOUND'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Get resume data failed: {e}")
        return Response({
            'error': 'Failed to retrieve resume data',
            'code': 'RETRIEVAL_FAILED'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_user_resumes(request):
    """
    List all resumes for the current user
    """
    try:
        resumes = UploadedResume.objects.filter(user=request.user).order_by('-uploaded_at')
        
        resume_list = []
        for resume in resumes:
            resume_data = {
                'resume_id': str(resume.id),
                'filename': resume.original_filename,
                'file_size': resume.file_size,
                'file_type': resume.file_type,
                'uploaded_at': resume.uploaded_at.isoformat(),
                'is_processed': resume.is_processed,
                'has_error': bool(resume.processing_error),
            }
            
            # Add structured data summary if available
            try:
                structured_data = StructuredResumeData.objects.get(resume=resume)
                resume_data.update({
                    'extraction_confidence': structured_data.extraction_confidence,
                    'full_name': structured_data.full_name,
                    'total_skills_count': structured_data.total_skills_count,
                    'total_experience_years': structured_data.total_experience_years,
                    'has_complete_profile': structured_data.has_complete_profile,
                })
            except StructuredResumeData.DoesNotExist:
                resume_data.update({
                    'extraction_confidence': 0.0,
                    'full_name': '',
                    'total_skills_count': 0,
                    'total_experience_years': 0,
                    'has_complete_profile': False,
                })
            
            resume_list.append(resume_data)
        
        return Response({
            'resumes': resume_list,
            'total_count': len(resume_list)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"List resumes failed: {e}")
        return Response({
            'error': 'Failed to list resumes',
            'code': 'LIST_FAILED'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _reconstruct_text_from_data(extracted_data) -> str:
    """
    Reconstruct plain text from extracted structured data
    This ensures compatibility with existing Phase 2 components
    """
    text_parts = []
    
    # Personal info
    if extracted_data.full_name:
        text_parts.append(extracted_data.full_name)
    if extracted_data.email:
        text_parts.append(extracted_data.email)
    if extracted_data.phone:
        text_parts.append(extracted_data.phone)
    
    # Professional summary
    if extracted_data.professional_summary:
        text_parts.append(f"\nProfessional Summary:\n{extracted_data.professional_summary}")
    
    # Skills
    all_skills = (extracted_data.technical_skills + extracted_data.soft_skills + 
                 extracted_data.programming_languages + extracted_data.frameworks +
                 extracted_data.databases + extracted_data.cloud_platforms + extracted_data.tools)
    
    if all_skills:
        text_parts.append(f"\nSkills:\n{', '.join(all_skills)}")
    
    # Work experience
    if extracted_data.work_experience:
        text_parts.append("\nWork Experience:")
        for exp in extracted_data.work_experience:
            exp_text = f"\n{exp.get('job_title', '')} at {exp.get('company', '')}"
            if exp.get('duration'):
                exp_text += f" ({exp['duration']})"
            
            if exp.get('responsibilities'):
                for resp in exp['responsibilities']:
                    exp_text += f"\n• {resp}"
            
            text_parts.append(exp_text)
    
    # Projects
    if extracted_data.projects:
        text_parts.append("\nProjects:")
        for proj in extracted_data.projects:
            proj_text = f"\n{proj.get('name', '')}"
            if proj.get('description'):
                proj_text += f": {proj['description']}"
            text_parts.append(proj_text)
    
    # Education
    if extracted_data.education:
        text_parts.append("\nEducation:")
        for edu in extracted_data.education:
            edu_text = f"\n{edu.get('degree', '')} - {edu.get('institution', '')}"
            if edu.get('graduation_year'):
                edu_text += f" ({edu['graduation_year']})"
            text_parts.append(edu_text)
    
    return '\n'.join(text_parts)