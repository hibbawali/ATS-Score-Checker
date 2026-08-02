"""
ATS Intelligence URL Configuration
"""
from django.urls import path
from . import views

app_name = 'ats_intelligence'

urlpatterns = [
    path('analyze/', views.analyze_advanced, name='analyze_advanced'),
    path('parse-job-description/', views.parse_job_description, name='parse_job_description'),
    path('semantic-match/', views.semantic_match, name='semantic_match'),
    path('history/', views.analysis_history, name='analysis_history'),
]