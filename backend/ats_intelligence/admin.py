from django.contrib import admin
from .models import JobDescription, SemanticAnalysis, AdvancedAnalysis


@admin.register(JobDescription)
class JobDescriptionAdmin(admin.ModelAdmin):
    list_display = ['job_title', 'company_name', 'user', 'created_at', 'processed_at']
    list_filter = ['created_at', 'processed_at']
    search_fields = ['job_title', 'company_name', 'user__email', 'user__full_name']
    readonly_fields = ['id', 'created_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'user', 'job_title', 'company_name', 'created_at', 'processed_at')
        }),
        ('Job Description', {
            'fields': ('raw_text',)
        }),
        ('Parsed Data', {
            'fields': ('required_skills', 'preferred_skills', 'technologies', 'experience_required', 'education_requirements'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SemanticAnalysis)
class SemanticAnalysisAdmin(admin.ModelAdmin):
    list_display = ['user', 'resume', 'overall_semantic_match', 'skills_match_score', 'created_at']
    list_filter = ['created_at', 'model_version']
    search_fields = ['user__email', 'resume__original_filename', 'job_description__job_title']
    readonly_fields = ['id', 'created_at']


@admin.register(AdvancedAnalysis)
class AdvancedAnalysisAdmin(admin.ModelAdmin):
    list_display = ['user', 'resume', 'overall_score', 'performance_band', 'analysis_version', 'created_at']
    list_filter = ['analysis_version', 'created_at', 'overall_score']
    search_fields = ['user__email', 'resume__original_filename']
    readonly_fields = ['id', 'created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'user', 'resume', 'job_description', 'semantic_analysis', 'created_at')
        }),
        ('Scoring Results', {
            'fields': ('overall_score', 'analysis_version')
        }),
        ('Category Scores', {
            'fields': ('jd_match_score', 'skills_score', 'experience_score', 'projects_score', 'education_score', 'grammar_score', 'formatting_score'),
            'classes': ('collapse',)
        }),
        ('Analysis Results', {
            'fields': ('recommendations', 'missing_keywords', 'improvement_suggestions'),
            'classes': ('collapse',)
        }),
    )