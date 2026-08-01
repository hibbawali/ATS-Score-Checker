from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()


class UploadedResume(models.Model):
    """Store information about uploaded resume files"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='resumes')
    
    # File information
    original_filename = models.CharField(max_length=255, verbose_name='Original Filename')
    file_path = models.CharField(max_length=500, verbose_name='File Path')
    file_size = models.PositiveIntegerField(verbose_name='File Size (bytes)')
    file_type = models.CharField(max_length=10, choices=[
        ('pdf', 'PDF'),
        ('docx', 'DOCX'),
    ], verbose_name='File Type')
    
    # Extracted content
    extracted_text = models.TextField(verbose_name='Extracted Text')
    text_length = models.PositiveIntegerField(verbose_name='Text Length')
    
    # Upload metadata
    uploaded_at = models.DateTimeField(default=timezone.now, verbose_name='Uploaded At')
    job_title_context = models.CharField(max_length=255, blank=True, verbose_name='Job Title Context')
    
    # Processing status
    is_processed = models.BooleanField(default=False, verbose_name='Is Processed')
    processing_error = models.TextField(blank=True, verbose_name='Processing Error')
    
    class Meta:
        verbose_name = 'Uploaded Resume'
        verbose_name_plural = 'Uploaded Resumes'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.user.full_name} - {self.original_filename}"


class ResumeAnalysis(models.Model):
    """Store ATS analysis results for resumes"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resume = models.ForeignKey(UploadedResume, on_delete=models.CASCADE, related_name='analyses')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='analyses')
    
    # Overall score
    overall_score = models.PositiveSmallIntegerField(verbose_name='Overall ATS Score')
    
    # Category scores
    parseability_score = models.PositiveSmallIntegerField(verbose_name='Parseability Score')
    structure_score = models.PositiveSmallIntegerField(verbose_name='Structure Score')
    formatting_score = models.PositiveSmallIntegerField(verbose_name='Formatting Score')
    content_quality_score = models.PositiveSmallIntegerField(verbose_name='Content Quality Score')
    
    # Analysis details
    issues_found = models.JSONField(default=list, verbose_name='Issues Found')
    ai_suggestions = models.JSONField(default=dict, blank=True, verbose_name='AI Suggestions')
    
    # Analysis context
    job_title_context = models.CharField(max_length=255, blank=True, verbose_name='Job Title Context')
    analysis_version = models.CharField(max_length=10, default='1.0', verbose_name='Analysis Version')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Analyzed At')
    
    class Meta:
        verbose_name = 'Resume Analysis'
        verbose_name_plural = 'Resume Analyses'
        ordering = ['-created_at']
        unique_together = ['resume', 'analysis_version']
    
    def __str__(self):
        return f"Analysis for {self.resume.original_filename} (Score: {self.overall_score})"
    
    @property
    def performance_band(self):
        """Get performance band based on overall score"""
        if self.overall_score >= 90:
            return 'EXCELLENT'
        elif self.overall_score >= 75:
            return 'GOOD'
        elif self.overall_score >= 50:
            return 'NEEDS WORK'
        else:
            return 'POOR'
