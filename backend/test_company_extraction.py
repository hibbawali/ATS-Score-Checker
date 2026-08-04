#!/usr/bin/env python3
"""
Test company name extraction to identify duplication issues
"""
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ats_backend.settings')
django.setup()

from job_description_parser.parser import JobDescriptionParser

def test_company_extraction():
    parser = JobDescriptionParser()
    
    test_cases = [
        {
            'text': '''Senior Software Engineer - React Developer

ABC Tech Company is looking for a Senior Software Engineer to join our team.''',
            'expected_title': 'Senior Software Engineer',
            'expected_company': 'ABC Tech Company'
        },
        {
            'text': '''Senior Python Developer - ABC Tech Company ABC Tech Company
            
We are hiring for a senior role.''',
            'expected_title': 'Senior Python Developer',
            'expected_company': 'ABC Tech Company'
        },
        {
            'text': '''Full Stack Developer @ TechCorp Technologies
            
Join our amazing team.''',
            'expected_title': 'Full Stack Developer',
            'expected_company': 'TechCorp Technologies'
        }
    ]
    
    print("🔍 Testing Company Name Extraction and Deduplication")
    print("=" * 60)
    
    for i, case in enumerate(test_cases, 1):
        print(f"\nTest Case {i}:")
        result = parser.parse(case['text'])
        
        print(f"Extracted Title: '{result.job_title}'")
        print(f"Expected Title:  '{case['expected_title']}'")
        title_ok = result.job_title == case['expected_title']
        print(f"Title Match: {'✅' if title_ok else '❌'}")
        
        print(f"Extracted Company: '{result.company_name}'")
        print(f"Expected Company:  '{case['expected_company']}'")
        company_ok = result.company_name == case['expected_company']
        print(f"Company Match: {'✅' if company_ok else '❌'}")
        
        if not title_ok or not company_ok:
            print("🔧 Issue detected - needs fixing!")

if __name__ == '__main__':
    test_company_extraction()