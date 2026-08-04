from django.contrib import admin
from .models import UploadedResume, ResumeAnalysis, StructuredResumeData


@admin.register(UploadedResume)
class UploadedResumeAdmin(admin.ModelAdmin):
    list_display = ('original_filename', 'user', 'file_type', 'file_size', 'is_processed', 'uploaded_at')
    list_filter = ('file_type', 'is_processed', 'uploaded_at')
    search_fields = ('original_filename', 'user__email', 'user__full_name')
    readonly_fields = ('id', 'uploaded_at', 'text_length')
    raw_id_fields = ('user',)
    
    fieldsets = (
        ('File Information', {
            'fields': ('original_filename', 'file_path', 'file_type', 'file_size')
        }),
        ('User & Context', {
            'fields': ('user', 'job_title_context')
        }),
        ('Processing', {
            'fields': ('is_processed', 'processing_error', 'text_length')
        }),
        ('Content', {
            'fields': ('extracted_text',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('id', 'uploaded_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ResumeAnalysis)
class ResumeAnalysisAdmin(admin.ModelAdmin):
    list_display = ('resume', 'user', 'overall_score', 'performance_band', 'created_at')
    list_filter = ('overall_score', 'created_at', 'analysis_version')
    search_fields = ('resume__original_filename', 'user__email', 'user__full_name')
    readonly_fields = ('id', 'created_at', 'performance_band')
    raw_id_fields = ('resume', 'user')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('resume', 'user', 'job_title_context', 'analysis_version')
        }),
        ('Scores', {
            'fields': ('overall_score', 'performance_band', 'parseability_score', 
                      'structure_score', 'formatting_score', 'content_quality_score')
        }),
        ('Analysis Results', {
            'fields': ('issues_found', 'ai_suggestions'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(StructuredResumeData)
class StructuredResumeDataAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'user', 'resume', 'extraction_confidence', 'total_skills_count', 'has_complete_profile', 'created_at')
    list_filter = ('extraction_version', 'has_complete_profile', 'created_at')
    search_fields = ('full_name', 'email', 'user__full_name', 'resume__original_filename')
    readonly_fields = ('id', 'created_at', 'updated_at', 'total_skills_count', 'total_experience_years', 'has_complete_profile')
    raw_id_fields = ('resume', 'user')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'resume', 'extraction_version', 'extraction_confidence')
        }),
        ('Personal Information', {
            'fields': ('full_name', 'email', 'phone', 'linkedin_url', 'github_url', 'portfolio_url', 'location')
        }),
        ('Professional Summary', {
            'fields': ('professional_summary',),
            'classes': ('collapse',)
        }),
        ('Skills', {
            'fields': ('technical_skills', 'soft_skills', 'programming_languages', 'frameworks', 'databases', 'cloud_platforms', 'tools'),
            'classes': ('collapse',)
        }),
        ('Experience & Projects', {
            'fields': ('work_experience', 'projects'),
            'classes': ('collapse',)
        }),
        ('Education & Certifications', {
            'fields': ('education', 'certifications'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('languages', 'achievements', 'publications', 'volunteer_experience'),
            'classes': ('collapse',)
        }),
        ('Analysis Metadata', {
            'fields': ('sections_found', 'processing_notes'),
            'classes': ('collapse',)
        }),
        ('Computed Properties', {
            'fields': ('total_skills_count', 'total_experience_years', 'has_complete_profile'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
