from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()


class JobDescription(models.Model):
    """Store job description text and parsed information"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='job_descriptions')
    
    # Raw job description data
    raw_text = models.TextField(verbose_name='Raw Job Description')
    job_title = models.CharField(max_length=255, verbose_name='Job Title')
    company_name = models.CharField(max_length=255, blank=True, verbose_name='Company Name')
    
    # Parsed structured data
    required_skills = models.JSONField(default=list, verbose_name='Required Skills')
    preferred_skills = models.JSONField(default=list, verbose_name='Preferred Skills')
    technologies = models.JSONField(default=list, verbose_name='Technologies')
    experience_required = models.CharField(max_length=100, blank=True, verbose_name='Experience Required')
    education_requirements = models.JSONField(default=list, verbose_name='Education Requirements')
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now, verbose_name='Created At')
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name='Processed At')
    
    class Meta:
        verbose_name = 'Job Description'
        verbose_name_plural = 'Job Descriptions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['job_title']),
            models.Index(fields=['company_name']),
        ]
        constraints = []
    
    def __str__(self):
        return f"{self.job_title} - {self.user.full_name}"


class SemanticAnalysis(models.Model):
    """Store semantic matching results between resume and job description"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='semantic_analyses')
    resume = models.ForeignKey('resume.UploadedResume', on_delete=models.CASCADE, related_name='semantic_analyses')
    job_description = models.ForeignKey(JobDescription, on_delete=models.CASCADE, related_name='semantic_analyses')
    
    # Semantic matching scores
    overall_semantic_match = models.FloatField(verbose_name='Overall Semantic Match Score')
    skills_match_score = models.FloatField(verbose_name='Skills Match Score')
    experience_match_score = models.FloatField(verbose_name='Experience Match Score')
    
    # Detailed matching results
    matching_skills = models.JSONField(default=list, verbose_name='Matching Skills')
    missing_skills = models.JSONField(default=list, verbose_name='Missing Skills')
    skill_gaps = models.JSONField(default=dict, verbose_name='Skill Gap Analysis')
    
    # Analysis metadata
    model_version = models.CharField(max_length=50, default='all-MiniLM-L6-v2', verbose_name='Model Version')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created At')
    
    class Meta:
        verbose_name = 'Semantic Analysis'
        verbose_name_plural = 'Semantic Analyses'
        ordering = ['-created_at']
        unique_together = ['resume', 'job_description']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['resume', '-created_at']),
            models.Index(fields=['job_description', '-created_at']),
            models.Index(fields=['overall_semantic_match']),
            models.Index(fields=['skills_match_score']),
            models.Index(fields=['model_version']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(overall_semantic_match__gte=0.0) & models.Q(overall_semantic_match__lte=1.0),
                name='semantic_overall_match_valid_range'
            ),
            models.CheckConstraint(
                check=models.Q(skills_match_score__gte=0.0) & models.Q(skills_match_score__lte=1.0),
                name='semantic_skills_match_valid_range'
            ),
            models.CheckConstraint(
                check=models.Q(experience_match_score__gte=0.0) & models.Q(experience_match_score__lte=1.0),
                name='semantic_experience_match_valid_range'
            ),
        ]
    
    def __str__(self):
        return f"Semantic Analysis: {self.overall_semantic_match:.1%} match"


class AdvancedAnalysis(models.Model):
    """Store Phase 2 advanced ATS analysis results with new scoring formula"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='advanced_analyses')
    resume = models.ForeignKey('resume.UploadedResume', on_delete=models.CASCADE, related_name='advanced_analyses')
    job_description = models.ForeignKey(JobDescription, on_delete=models.CASCADE, related_name='advanced_analyses', null=True, blank=True)
    semantic_analysis = models.ForeignKey(SemanticAnalysis, on_delete=models.CASCADE, null=True, blank=True, related_name='advanced_analyses')
    
    # New Phase 2 scoring formula (35% JD Match, 20% Skills, 15% Experience, 10% Projects, 10% Education, 5% Grammar, 5% Formatting)
    overall_score = models.PositiveSmallIntegerField(verbose_name='Overall ATS Score')
    
    # New category scores
    jd_match_score = models.PositiveSmallIntegerField(verbose_name='Job Description Match Score')
    skills_score = models.PositiveSmallIntegerField(verbose_name='Skills Score')
    experience_score = models.PositiveSmallIntegerField(verbose_name='Experience Score')
    projects_score = models.PositiveSmallIntegerField(verbose_name='Projects Score')
    education_score = models.PositiveSmallIntegerField(verbose_name='Education Score')
    grammar_score = models.PositiveSmallIntegerField(verbose_name='Grammar Score')
    formatting_score = models.PositiveSmallIntegerField(verbose_name='Formatting Score')
    
    # Enhanced analysis results
    recommendations = models.JSONField(default=list, verbose_name='Enhanced Recommendations')
    missing_keywords = models.JSONField(default=list, verbose_name='Missing Keywords')
    improvement_suggestions = models.JSONField(default=dict, verbose_name='Improvement Suggestions')
    
    # Analysis context
    analysis_version = models.CharField(max_length=10, default='2.0', verbose_name='Analysis Version')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Analyzed At')
    
    class Meta:
        verbose_name = 'Advanced Analysis'
        verbose_name_plural = 'Advanced Analyses'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['resume', '-created_at']),
            models.Index(fields=['job_description', '-created_at']),
            models.Index(fields=['overall_score']),
            models.Index(fields=['analysis_version', '-created_at']),
            models.Index(fields=['semantic_analysis']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(overall_score__gte=0) & models.Q(overall_score__lte=100),
                name='advanced_overall_score_valid_range'
            ),
            models.CheckConstraint(
                check=models.Q(jd_match_score__gte=0) & models.Q(jd_match_score__lte=100),
                name='advanced_jd_match_score_valid_range'
            ),
            models.CheckConstraint(
                check=models.Q(skills_score__gte=0) & models.Q(skills_score__lte=100),
                name='advanced_skills_score_valid_range'
            ),
            models.CheckConstraint(
                check=models.Q(experience_score__gte=0) & models.Q(experience_score__lte=100),
                name='advanced_experience_score_valid_range'
            ),
            models.CheckConstraint(
                check=models.Q(projects_score__gte=0) & models.Q(projects_score__lte=100),
                name='advanced_projects_score_valid_range'
            ),
            models.CheckConstraint(
                check=models.Q(education_score__gte=0) & models.Q(education_score__lte=100),
                name='advanced_education_score_valid_range'
            ),
            models.CheckConstraint(
                check=models.Q(grammar_score__gte=0) & models.Q(grammar_score__lte=100),
                name='advanced_grammar_score_valid_range'
            ),
            models.CheckConstraint(
                check=models.Q(formatting_score__gte=0) & models.Q(formatting_score__lte=100),
                name='advanced_formatting_score_valid_range'
            ),
        ]
    
    def __str__(self):
        return f"Advanced Analysis for {self.resume.original_filename} (Score: {self.overall_score})"
    
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