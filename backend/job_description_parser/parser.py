"""
Job Description Parser Engine
Extracts structured information from job description text
"""
import re
from typing import Dict, List, Tuple
from dataclasses import dataclass


@dataclass
class ParsedJobDescription:
    """Structure for parsed job description data"""
    job_title: str
    company_name: str
    required_skills: List[str]
    preferred_skills: List[str]
    technologies: List[str]
    experience_required: str
    education_requirements: List[str]
    soft_skills: List[str]
    responsibilities: List[str]
    benefits: List[str]


class JobDescriptionParser:
    """
    Parses job descriptions to extract structured information
    Uses rule-based pattern matching without NLTK dependency
    """
    
    def __init__(self):
        # Technical skills and technologies keywords
        self.tech_keywords = {
            'programming_languages': [
                'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
                'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql', 'html', 'css', 'dart', 'perl'
            ],
            'frameworks': [
                'react', 'angular', 'vue', 'django', 'flask', 'spring', 'express', 'nodejs', 'laravel',
                'rails', 'asp.net', '.net', 'symfony', 'nextjs', 'nuxt', 'gatsby', 'svelte'
            ],
            'databases': [
                'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'sqlite',
                'cassandra', 'dynamodb', 'firebase', 'mariadb', 'neo4j', 'couchdb'
            ],
            'cloud_platforms': [
                'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'jenkins', 'terraform',
                'ansible', 'chef', 'puppet', 'vagrant', 'heroku', 'digitalocean', 'linode'
            ],
            'tools': [
                'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'slack', 'teams',
                'figma', 'sketch', 'adobe', 'postman', 'swagger', 'jenkins', 'circleci', 'travis'
            ]
        }
        
        # Soft skills keywords
        self.soft_skills = [
            'leadership', 'communication', 'teamwork', 'problem solving', 'analytical',
            'creative', 'adaptable', 'organized', 'detail oriented', 'time management',
            'project management', 'collaboration', 'mentoring', 'presentation skills'
        ]
        
        # Education keywords
        self.education_keywords = [
            'bachelor', 'master', 'phd', 'degree', 'computer science', 'engineering',
            'mathematics', 'statistics', 'mba', 'certification', 'diploma'
        ]
        
        # Experience patterns
        self.experience_patterns = [
            r'(\d+)[\+\-\s]*years?\s+(?:of\s+)?experience',
            r'(\d+)[\+\-\s]*yrs?\s+(?:of\s+)?experience',
            r'minimum\s+(\d+)\s+years?',
            r'at least\s+(\d+)\s+years?',
            r'(\d+)\s*to\s*(\d+)\s+years?',
            r'entry[\s\-]level',
            r'junior',
            r'mid[\s\-]level',
            r'senior',
            r'lead',
            r'principal'
        ]
        
    def parse(self, job_description: str) -> ParsedJobDescription:
        """
        Parse job description text and extract structured information
        
        Args:
            job_description: Raw job description text
            
        Returns:
            ParsedJobDescription: Structured job data
        """
        # Clean and normalize text
        clean_text = self._clean_text(job_description)
        
        # Extract different components
        job_title = self._extract_job_title(clean_text)
        company_name = self._extract_company_name(clean_text)
        
        # Extract skills and technologies
        all_skills = self._extract_technical_skills(clean_text)
        required_skills, preferred_skills = self._categorize_skills(clean_text, all_skills)
        technologies = self._extract_technologies(clean_text)
        
        # Extract experience and education requirements
        experience_required = self._extract_experience_requirements(clean_text)
        education_requirements = self._extract_education_requirements(clean_text)
        
        # Extract soft skills
        soft_skills = self._extract_soft_skills(clean_text)
        
        # Extract responsibilities and benefits
        responsibilities = self._extract_responsibilities(clean_text)
        benefits = self._extract_benefits(clean_text)
        
        return ParsedJobDescription(
            job_title=job_title,
            company_name=company_name,
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            technologies=technologies,
            experience_required=experience_required,
            education_requirements=education_requirements,
            soft_skills=soft_skills,
            responsibilities=responsibilities,
            benefits=benefits
        )
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize job description text"""
        # Remove excessive whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())
        # Remove bullet points and formatting
        text = re.sub(r'[•\-\*]\s*', '', text)
        return text
    
    def _extract_job_title(self, text: str) -> str:
        """Extract job title from the beginning of the text"""
        # Look for common job title patterns at the start
        lines = text.split('\n')[:5]  # Check first 5 lines
        
        for line in lines:
            line = line.strip()
            # Skip very short lines or lines with too many special chars
            if len(line) < 5 or len(re.findall(r'[^\w\s]', line)) > len(line) * 0.3:
                continue
                
            # Common job title patterns
            if any(keyword in line.lower() for keyword in [
                'engineer', 'developer', 'analyst', 'manager', 'designer', 
                'scientist', 'architect', 'consultant', 'specialist', 'lead'
            ]):
                return line.strip()
        
        return "Software Engineer"  # Default fallback
    
    def _extract_company_name(self, text: str) -> str:
        """Extract company name (basic implementation)"""
        # Look for patterns like "Company Name is looking for" or "Join Company Name"
        company_patterns = [
            r'(\w+(?:\s+\w+)*)\s+is\s+(?:looking|seeking)',
            r'join\s+(\w+(?:\s+\w+)*)',
            r'about\s+(\w+(?:\s+\w+)*):',
            r'(\w+(?:\s+\w+)*)\s+team'
        ]
        
        for pattern in company_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return ""
    
    def _extract_technical_skills(self, text: str) -> List[str]:
        """Extract technical skills and technologies"""
        text_lower = text.lower()
        found_skills = []
        
        # Check each category of technical keywords
        for category, keywords in self.tech_keywords.items():
            for keyword in keywords:
                # Use word boundaries to avoid partial matches
                pattern = r'\b' + re.escape(keyword) + r'\b'
                if re.search(pattern, text_lower):
                    found_skills.append(keyword.title())
        
        # Remove duplicates and sort
        return sorted(list(set(found_skills)))
    
    def _categorize_skills(self, text: str, all_skills: List[str]) -> Tuple[List[str], List[str]]:
        """Categorize skills as required vs preferred"""
        text_lower = text.lower()
        
        # Find sections that indicate requirements vs preferences
        required_indicators = ['required', 'must have', 'essential', 'mandatory', 'minimum']
        preferred_indicators = ['preferred', 'nice to have', 'bonus', 'plus', 'desirable']
        
        required_skills = []
        preferred_skills = []
        
        # Split text into sections and analyze context
        sentences = self._split_sentences(text)
        
        for skill in all_skills:
            skill_context = []
            skill_lower = skill.lower()
            
            # Find sentences containing this skill
            for sentence in sentences:
                if skill_lower in sentence.lower():
                    skill_context.append(sentence.lower())
            
            # Determine if skill is required or preferred based on context
            is_required = False
            is_preferred = False
            
            for context in skill_context:
                if any(indicator in context for indicator in required_indicators):
                    is_required = True
                if any(indicator in context for indicator in preferred_indicators):
                    is_preferred = True
            
            # Default to required if no clear indication
            if is_required or (not is_required and not is_preferred):
                required_skills.append(skill)
            else:
                preferred_skills.append(skill)
        
        return required_skills, preferred_skills
    
    def _split_sentences(self, text: str) -> List[str]:
        """Simple sentence splitting without NLTK"""
        # Split on common sentence endings
        sentences = re.split(r'[.!?]+\s+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _extract_technologies(self, text: str) -> List[str]:
        """Extract specific technologies mentioned"""
        # This is similar to technical skills but focuses on tools/platforms
        technologies = []
        text_lower = text.lower()
        
        # Combine all tech keywords
        all_tech = []
        for category in ['frameworks', 'databases', 'cloud_platforms', 'tools']:
            all_tech.extend(self.tech_keywords[category])
        
        for tech in all_tech:
            pattern = r'\b' + re.escape(tech) + r'\b'
            if re.search(pattern, text_lower):
                technologies.append(tech.title())
        
        return sorted(list(set(technologies)))
    
    def _extract_experience_requirements(self, text: str) -> str:
        """Extract experience requirements"""
        text_lower = text.lower()
        
        for pattern in self.experience_patterns:
            match = re.search(pattern, text_lower)
            if match:
                return match.group(0)
        
        # Look for level indicators
        if 'entry level' in text_lower or 'entry-level' in text_lower:
            return 'Entry Level'
        elif 'junior' in text_lower:
            return 'Junior Level'
        elif 'senior' in text_lower:
            return 'Senior Level'
        elif 'lead' in text_lower:
            return 'Lead Level'
        elif 'principal' in text_lower:
            return 'Principal Level'
        
        return ""
    
    def _extract_education_requirements(self, text: str) -> List[str]:
        """Extract education requirements"""
        text_lower = text.lower()
        education_reqs = []
        
        for keyword in self.education_keywords:
            if keyword in text_lower:
                # Try to get more context around the keyword
                pattern = r'[^.]*' + re.escape(keyword) + r'[^.]*'
                match = re.search(pattern, text_lower)
                if match:
                    education_reqs.append(match.group(0).strip())
        
        return education_reqs
    
    def _extract_soft_skills(self, text: str) -> List[str]:
        """Extract soft skills"""
        text_lower = text.lower()
        found_soft_skills = []
        
        for skill in self.soft_skills:
            if skill in text_lower:
                found_soft_skills.append(skill.title())
        
        return sorted(list(set(found_soft_skills)))
    
    def _extract_responsibilities(self, text: str) -> List[str]:
        """Extract job responsibilities"""
        # Look for bullet points or numbered lists
        bullet_patterns = [
            r'[•\-\*]\s*([^\n\r]+)',
            r'\d+\.\s*([^\n\r]+)'
        ]
        
        responsibilities = []
        for pattern in bullet_patterns:
            matches = re.findall(pattern, text)
            responsibilities.extend([match.strip() for match in matches if len(match.strip()) > 10])
        
        return responsibilities[:10]  # Limit to top 10
    
    def _extract_benefits(self, text: str) -> List[str]:
        """Extract benefits and perks"""
        benefit_keywords = [
            'health insurance', 'dental', 'vision', '401k', 'retirement',
            'vacation', 'pto', 'flexible', 'remote', 'work from home',
            'bonus', 'stock options', 'equity', 'gym', 'wellness'
        ]
        
        text_lower = text.lower()
        found_benefits = []
        
        for benefit in benefit_keywords:
            if benefit in text_lower:
                found_benefits.append(benefit.title())
        
        return sorted(list(set(found_benefits)))