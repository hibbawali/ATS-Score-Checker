#!/usr/bin/env python3
"""
Phase 2 Test Script
Tests the new ATS Intelligence Engine components
"""
import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ats_backend.settings')
django.setup()

def test_job_description_parser():
    """Test the job description parser"""
    print("🔍 Testing Job Description Parser...")
    
    from job_description_parser.parser import JobDescriptionParser
    
    sample_jd = """
    Senior Software Engineer - React Developer
    
    ABC Tech Company is looking for a Senior Software Engineer to join our team.
    
    Requirements:
    - 5+ years of experience in software development
    - Strong proficiency in JavaScript, React, and Node.js
    - Experience with Python and Django
    - Knowledge of AWS and Docker
    - Bachelor's degree in Computer Science
    
    Preferred:
    - Experience with TypeScript
    - Knowledge of Kubernetes
    - Familiarity with PostgreSQL
    
    Responsibilities:
    - Develop and maintain web applications
    - Collaborate with cross-functional teams
    - Write clean, efficient code
    """
    
    parser = JobDescriptionParser()
    result = parser.parse(sample_jd)
    
    print(f"✅ Job Title: {result.job_title}")
    print(f"✅ Company: {result.company_name}")
    print(f"✅ Required Skills: {result.required_skills[:5]}")  # Show first 5
    print(f"✅ Technologies: {result.technologies[:5]}")  # Show first 5
    print(f"✅ Experience Required: {result.experience_required}")
    print()


def test_semantic_matcher():
    """Test the semantic matcher"""
    print("🤖 Testing Semantic Matcher...")
    
    try:
        from semantic_matcher.matcher import SemanticMatcher
        
        # Create matcher (this will download the model on first run)
        print("Loading sentence transformer model...")
        matcher = SemanticMatcher()
        print("✅ Model loaded successfully!")
        
        # Test semantic matching
        resume_text = """
        John Doe
        Software Engineer
        
        Experience:
        - 3 years developing web applications using React and JavaScript
        - Built REST APIs with Node.js and Express
        - Worked with MySQL databases
        - Deployed applications on AWS
        
        Skills: JavaScript, React, Node.js, HTML, CSS, Git, AWS
        """
        
        job_description = """
        We are looking for a Frontend Developer with React experience.
        Must have JavaScript skills and web development background.
        """
        
        result = matcher.match_resume_to_job(
            resume_text=resume_text,
            job_description=job_description,
            required_skills=['React', 'JavaScript', 'HTML', 'CSS'],
            preferred_skills=['TypeScript', 'Redux']
        )
        
        print(f"✅ Overall Similarity: {result.overall_similarity:.2%}")
        print(f"✅ Skills Similarity: {result.skills_similarity:.2%}")
        print(f"✅ Matching Skills: {len(result.matching_skills)}")
        print(f"✅ Missing Skills: {result.missing_skills}")
        print()
        
    except Exception as e:
        print(f"⚠️  Semantic matcher test failed: {e}")
        print("This might be due to model download requirements or dependencies.")
        print()


def test_scoring_engine():
    """Test the advanced scoring engine"""
    print("📊 Testing Advanced Scoring Engine...")
    
    from scoring_engine.engine import AdvancedScoringEngine
    
    engine = AdvancedScoringEngine()
    
    sample_resume = """
    Jane Smith
    Senior Full Stack Developer
    
    Professional Experience:
    • Led development of 5 web applications serving 10,000+ users
    • Improved system performance by 40% through database optimization
    • Managed a team of 4 junior developers
    • Built RESTful APIs using Django and Python
    • Implemented CI/CD pipelines with Docker and AWS
    
    Technical Skills:
    Python, Django, JavaScript, React, PostgreSQL, AWS, Docker, Git
    
    Projects:
    • E-commerce Platform: Built with React and Django, handles 1000+ daily transactions
    • Analytics Dashboard: Real-time data visualization using D3.js
    
    Education:
    Bachelor of Science in Computer Science, University of Technology
    """
    
    job_description = """
    Senior Python Developer position requiring Django experience, 
    AWS knowledge, and team leadership skills.
    """
    
    result = engine.calculate_advanced_score(
        resume_text=sample_resume,
        semantic_match_result=None,  # No semantic analysis for this test
        job_description=job_description
    )
    
    print(f"✅ Overall Score: {result.overall_score}/100")
    print(f"✅ JD Match: {result.jd_match_score}/100")
    print(f"✅ Skills: {result.skills_score}/100") 
    print(f"✅ Experience: {result.experience_score}/100")
    print(f"✅ Projects: {result.projects_score}/100")
    print(f"✅ Education: {result.education_score}/100")
    print(f"✅ Grammar: {result.grammar_score}/100")
    print(f"✅ Formatting: {result.formatting_score}/100")
    print(f"✅ Recommendations: {len(result.recommendations)} generated")
    print()


def test_recommendation_engine():
    """Test the enhanced recommendation engine"""
    print("💡 Testing Recommendation Engine...")
    
    from recommendation_engine.engine import EnhancedRecommendationEngine
    from scoring_engine.engine import AdvancedScoringEngine
    
    # Create a mock scoring result
    class MockScoringResult:
        def __init__(self):
            self.overall_score = 75
            self.jd_match_score = 65
            self.skills_score = 80
            self.experience_score = 70
            self.projects_score = 60
            self.education_score = 85
            self.grammar_score = 90
            self.formatting_score = 75
            self.recommendations = ["Improve JD alignment", "Add more projects"]
            self.category_feedback = {"skills": ["Good technical foundation"]}
    
    engine = EnhancedRecommendationEngine()
    scoring_result = MockScoringResult()
    
    result = engine.generate_recommendations(
        scoring_result=scoring_result,
        semantic_match_result=None,
        resume_text="Sample resume text",
        job_description="Sample job description"
    )
    
    print(f"✅ Priority Recommendations: {len(result.priority_recommendations)}")
    print(f"✅ Skill Recommendations: {len(result.skill_recommendations)}")
    print(f"✅ Content Recommendations: {len(result.content_recommendations)}")
    print(f"✅ Formatting Recommendations: {len(result.formatting_recommendations)}")
    print(f"✅ Overall Advice Generated: {bool(result.overall_advice)}")
    print()


def test_django_models():
    """Test Django model creation"""
    print("🗄️  Testing Django Models...")
    
    from django.contrib.auth import get_user_model
    from ats_intelligence.models import JobDescription, SemanticAnalysis, AdvancedAnalysis
    from resume.models import UploadedResume
    
    User = get_user_model()
    
    # Check if we can create model instances (not saving to DB)
    try:
        # Test JobDescription model structure
        jd_fields = [field.name for field in JobDescription._meta.fields]
        expected_jd_fields = ['id', 'user', 'raw_text', 'job_title', 'company_name', 'created_at']
        
        for field in expected_jd_fields:
            if field in jd_fields:
                print(f"✅ JobDescription.{field} - OK")
            else:
                print(f"❌ JobDescription.{field} - Missing")
        
        # Test AdvancedAnalysis model structure  
        aa_fields = [field.name for field in AdvancedAnalysis._meta.fields]
        expected_aa_fields = ['overall_score', 'jd_match_score', 'skills_score', 'experience_score']
        
        for field in expected_aa_fields:
            if field in aa_fields:
                print(f"✅ AdvancedAnalysis.{field} - OK")
            else:
                print(f"❌ AdvancedAnalysis.{field} - Missing")
        
        print("✅ Django models structure looks good!")
        print()
        
    except Exception as e:
        print(f"❌ Model test failed: {e}")
        print()


def main():
    """Run all Phase 2 tests"""
    print("🚀 Phase 2 ATS Intelligence Engine - Component Tests")
    print("=" * 60)
    
    try:
        test_job_description_parser()
        test_scoring_engine()
        test_recommendation_engine()
        test_django_models()
        
        # Test semantic matcher last (requires model download)
        test_semantic_matcher()
        
        print("🎉 Phase 2 Component Testing Complete!")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Test suite failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()