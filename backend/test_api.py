#!/usr/bin/env python3
"""
Test the Phase 2 API endpoints
"""
import os
import json

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ats_backend.settings')

import django
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()

def create_test_resume_file():
    """Create a test resume file"""
    resume_content = """
    John Doe
    Senior Software Developer
    
    Professional Experience:
    • 5 years developing web applications with React and JavaScript
    • Built RESTful APIs using Python and Django
    • Improved application performance by 30%
    • Led a team of 3 junior developers
    • Deployed applications on AWS using Docker
    
    Technical Skills:
    Python, JavaScript, React, Django, Node.js, PostgreSQL, AWS, Docker, Git
    
    Projects:
    • E-commerce Platform: Built with React and Django, serving 5000+ users
    • Data Analytics Dashboard: Real-time visualization with D3.js
    
    Education:
    Bachelor of Science in Computer Science
    University of Technology, 2018
    """
    
    # Create a simple text file (in real scenario would be PDF/DOCX)
    return SimpleUploadedFile(
        "test_resume.txt",
        resume_content.encode('utf-8'),
        content_type="text/plain"
    )

def test_phase2_api():
    """Test Phase 2 API functionality"""
    print("🧪 Testing Phase 2 API Endpoints")
    print("=" * 50)
    
    # Create test client
    client = Client()
    
    # Create test user (or get existing)
    try:
        user = User.objects.get(email='testuser@example.com')
    except User.DoesNotExist:
        user = User.objects.create_user(
            email='testuser@example.com',
            password='testpass123',
            full_name='Test User'
        )
    
    # Login to get JWT token
    login_response = client.post('/api/auth/login/', {
        'email': 'testuser@example.com',
        'password': 'testpass123'
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    login_data = login_response.json()
    token = login_data.get('access_token')
    
    if not token:
        print("❌ No access token received")
        return
        
    print("✅ User authentication successful")
    
    # Test Job Description Parser endpoint
    print("\n🔍 Testing Job Description Parser...")
    
    job_description = """
    Senior Python Developer Position
    
    We are looking for an experienced Python developer to join our team.
    
    Requirements:
    - 3+ years of Python development experience
    - Strong knowledge of Django framework
    - Experience with PostgreSQL databases
    - Familiarity with AWS cloud services
    - Bachelor's degree in Computer Science
    
    Preferred Skills:
    - Docker containerization
    - React frontend development
    - CI/CD pipeline experience
    """
    
    jd_response = client.post(
        '/api/ats/parse-job-description/',
        data=json.dumps({'job_description': job_description}),
        content_type='application/json',
        HTTP_AUTHORIZATION=f'Bearer {token}'
    )
    
    if jd_response.status_code == 200:
        jd_data = jd_response.json()
        print(f"✅ Job Description Parsed Successfully")
        print(f"   Job Title: {jd_data.get('job_title', 'N/A')[:50]}...")
        print(f"   Technologies Found: {len(jd_data.get('technologies', []))}")
        print(f"   Required Skills: {len(jd_data.get('required_skills', []))}")
    else:
        print(f"❌ Job Description parsing failed: {jd_response.status_code}")
    
    print("\n🧠 Testing Django Model Creation...")
    
    # Test creating models programmatically
    try:
        from ats_intelligence.models import JobDescription, AdvancedAnalysis
        from resume.models import UploadedResume
        
        # Create a job description record
        jd = JobDescription.objects.create(
            user=user,
            raw_text=job_description,
            job_title="Senior Python Developer",
            company_name="Test Company",
            required_skills=["Python", "Django", "PostgreSQL"],
            technologies=["Python", "Django", "AWS"],
            experience_required="3+ years"
        )
        print(f"✅ JobDescription created: {jd.id}")
        
        # Create an uploaded resume record (simulated)
        resume = UploadedResume.objects.create(
            user=user,
            original_filename="test_resume.pdf",
            file_path="/tmp/test_resume.pdf",
            file_size=1024,
            file_type="pdf",
            extracted_text="Sample resume text with Python and Django experience",
            text_length=100,
            is_processed=True
        )
        print(f"✅ UploadedResume created: {resume.id}")
        
        # Create an advanced analysis record
        analysis = AdvancedAnalysis.objects.create(
            user=user,
            resume=resume,
            job_description=jd,
            overall_score=85,
            jd_match_score=80,
            skills_score=90,
            experience_score=85,
            projects_score=75,
            education_score=80,
            grammar_score=90,
            formatting_score=85,
            recommendations=["Great match!", "Consider adding more projects"],
            analysis_version="2.0"
        )
        print(f"✅ AdvancedAnalysis created: {analysis.id}")
        print(f"   Performance Band: {analysis.performance_band}")
        
    except Exception as e:
        print(f"❌ Model creation failed: {e}")
    
    print("\n📊 Testing Phase 2 Scoring Logic...")
    
    # Test the scoring engine directly
    try:
        from scoring_engine.engine import AdvancedScoringEngine
        
        sample_resume = """
        Jane Smith - Full Stack Developer
        
        Experience:
        • 4 years developing Python web applications
        • Built 10+ Django applications serving 50,000+ users
        • Improved database performance by 60% through optimization
        • Led development team of 5 engineers
        • Deployed applications on AWS with Docker containers
        
        Skills: Python, Django, JavaScript, React, PostgreSQL, AWS, Docker
        
        Projects:
        • E-commerce Platform: 100,000+ transactions processed monthly
        • Real-time Analytics: Live data dashboard with 99.9% uptime
        
        Education: BS Computer Science, MIT 2019
        """
        
        engine = AdvancedScoringEngine()
        scoring_result = engine.calculate_advanced_score(
            resume_text=sample_resume,
            job_description=job_description,
            semantic_match_result=None
        )
        
        print(f"✅ Advanced Scoring Complete")
        print(f"   Overall Score: {scoring_result.overall_score}/100")
        print(f"   JD Match: {scoring_result.jd_match_score}/100 (35% weight)")
        print(f"   Skills: {scoring_result.skills_score}/100 (20% weight)")
        print(f"   Experience: {scoring_result.experience_score}/100 (15% weight)")
        print(f"   Projects: {scoring_result.projects_score}/100 (10% weight)")
        print(f"   Education: {scoring_result.education_score}/100 (10% weight)")
        print(f"   Grammar: {scoring_result.grammar_score}/100 (5% weight)")
        print(f"   Formatting: {scoring_result.formatting_score}/100 (5% weight)")
        print(f"   Recommendations: {len(scoring_result.recommendations)} generated")
        
    except Exception as e:
        print(f"❌ Scoring engine test failed: {e}")
    
    print("\n🎯 Phase 2 API Testing Complete!")
    print("=" * 50)
    
    # Cleanup
    try:
        user.delete()
        print("✅ Test data cleaned up")
    except:
        pass

if __name__ == '__main__':
    test_phase2_api()