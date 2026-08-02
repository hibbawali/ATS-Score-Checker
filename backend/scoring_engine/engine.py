"""
Phase 2 Advanced ATS Scoring Engine
Implements the new scoring formula: 35% JD Match, 20% Skills, 15% Experience, 10% Projects, 10% Education, 5% Grammar, 5% Formatting
"""
import re
from typing import Dict, List, Optional
from dataclasses import dataclass

# Import Phase 1 check engines
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    from lib.parseabilityCheck import checkParseability
    from lib.structureCheck import checkStructure
    from lib.formattingCheck import checkFormatting
    from lib.contentQualityCheck import checkContentQuality
except ImportError:
    # Fallback for testing
    checkParseability = lambda text, meta: {'score': 85, 'issues': []}
    checkStructure = lambda text: {'score': 80, 'issues': []}
    checkFormatting = lambda text: {'score': 90, 'issues': []}
    checkContentQuality = lambda text: {'score': 75, 'issues': []}


@dataclass
class ScoringResult:
    """Result structure for Phase 2 advanced scoring"""
    overall_score: int
    jd_match_score: int
    skills_score: int
    experience_score: int
    projects_score: int
    education_score: int
    grammar_score: int
    formatting_score: int
    recommendations: List[str]
    category_feedback: Dict[str, List[str]]


class AdvancedScoringEngine:
    """
    Phase 2 Advanced ATS Scoring Engine
    
    New scoring formula:
    - JD Match: 35%
    - Skills: 20% 
    - Experience: 15%
    - Projects: 10%
    - Education: 10%
    - Grammar: 5%
    - Formatting: 5%
    """
    
    # Scoring weights (must sum to 1.0)
    WEIGHTS = {
        'jd_match': 0.35,
        'skills': 0.20,
        'experience': 0.15,
        'projects': 0.10,
        'education': 0.10,
        'grammar': 0.05,
        'formatting': 0.05
    }
    
    def __init__(self):
        """Initialize the advanced scoring engine"""
        pass
    
    def calculate_advanced_score(
        self,
        resume_text: str,
        semantic_match_result: Optional[object] = None,
        job_description: Optional[str] = None,
        file_metadata: Optional[Dict] = None
    ) -> ScoringResult:
        """
        Calculate advanced ATS score using Phase 2 formula
        
        Args:
            resume_text: Extracted resume text
            semantic_match_result: Result from semantic matching (if available)
            job_description: Job description text (if available)
            file_metadata: File metadata for legacy checks
            
        Returns:
            ScoringResult: Complete scoring analysis
        """
        # Calculate individual category scores
        jd_match_score = self._calculate_jd_match_score(semantic_match_result, resume_text, job_description)
        skills_score = self._calculate_skills_score(resume_text, semantic_match_result)
        experience_score = self._calculate_experience_score(resume_text)
        projects_score = self._calculate_projects_score(resume_text)
        education_score = self._calculate_education_score(resume_text)
        grammar_score = self._calculate_grammar_score(resume_text)
        formatting_score = self._calculate_formatting_score(resume_text, file_metadata or {})
        
        # Calculate weighted overall score
        overall_score = round(
            jd_match_score * self.WEIGHTS['jd_match'] +
            skills_score * self.WEIGHTS['skills'] +
            experience_score * self.WEIGHTS['experience'] +
            projects_score * self.WEIGHTS['projects'] +
            education_score * self.WEIGHTS['education'] +
            grammar_score * self.WEIGHTS['grammar'] +
            formatting_score * self.WEIGHTS['formatting']
        )
        
        # Generate recommendations and feedback
        recommendations = self._generate_recommendations(
            jd_match_score, skills_score, experience_score, projects_score,
            education_score, grammar_score, formatting_score, semantic_match_result
        )
        
        category_feedback = self._generate_category_feedback(
            jd_match_score, skills_score, experience_score, projects_score,
            education_score, grammar_score, formatting_score
        )
        
        return ScoringResult(
            overall_score=overall_score,
            jd_match_score=jd_match_score,
            skills_score=skills_score,
            experience_score=experience_score,
            projects_score=projects_score,
            education_score=education_score,
            grammar_score=grammar_score,
            formatting_score=formatting_score,
            recommendations=recommendations,
            category_feedback=category_feedback
        )
    
    def _calculate_jd_match_score(self, semantic_match_result, resume_text: str, job_description: Optional[str]) -> int:
        """Calculate Job Description Match Score (35% weight)"""
        if not semantic_match_result or not job_description:
            # Fallback: basic keyword matching
            return self._basic_jd_matching(resume_text, job_description or "")
        
        # Use semantic matching results
        overall_similarity = getattr(semantic_match_result, 'overall_similarity', 0.0)
        skills_similarity = getattr(semantic_match_result, 'skills_similarity', 0.0)
        
        # Convert similarity scores (0-1) to percentage (0-100)
        semantic_score = int((overall_similarity * 0.7 + skills_similarity * 0.3) * 100)
        
        return max(0, min(100, semantic_score))
    
    def _basic_jd_matching(self, resume_text: str, job_description: str) -> int:
        """Basic keyword matching fallback when no semantic analysis available"""
        if not job_description:
            return 70  # Default neutral score
        
        resume_lower = resume_text.lower()
        jd_lower = job_description.lower()
        
        # Extract keywords from job description
        jd_keywords = self._extract_keywords(jd_lower)
        
        # Count matches in resume
        matches = 0
        total_keywords = len(jd_keywords)
        
        for keyword in jd_keywords:
            if keyword in resume_lower:
                matches += 1
        
        if total_keywords == 0:
            return 70
        
        match_percentage = (matches / total_keywords) * 100
        return max(30, min(100, int(match_percentage)))
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract important keywords from text"""
        # Simple keyword extraction - could be enhanced with NLP
        tech_keywords = [
            'python', 'java', 'javascript', 'react', 'angular', 'vue', 'django', 'flask',
            'node', 'sql', 'mongodb', 'aws', 'docker', 'kubernetes', 'git', 'api',
            'html', 'css', 'typescript', 'postgresql', 'mysql', 'redis', 'elasticsearch'
        ]
        
        found_keywords = []
        for keyword in tech_keywords:
            if keyword in text:
                found_keywords.append(keyword)
        
        return found_keywords
    
    def _calculate_skills_score(self, resume_text: str, semantic_match_result) -> int:
        """Calculate Skills Score (20% weight)"""
        resume_lower = resume_text.lower()
        
        # Technical skills indicators
        tech_indicators = [
            'programming', 'development', 'software', 'web development', 'mobile development',
            'database', 'api', 'framework', 'library', 'tool', 'technology', 'platform'
        ]
        
        # Programming languages
        languages = [
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby', 'go'
        ]
        
        # Frameworks and technologies
        frameworks = [
            'react', 'angular', 'vue', 'django', 'flask', 'spring', 'express', 'laravel'
        ]
        
        score = 50  # Base score
        
        # Technical skills presence
        tech_score = sum(1 for indicator in tech_indicators if indicator in resume_lower)
        score += min(20, tech_score * 3)
        
        # Programming languages
        lang_score = sum(1 for lang in languages if lang in resume_lower)
        score += min(15, lang_score * 2)
        
        # Frameworks
        framework_score = sum(1 for fw in frameworks if fw in resume_lower)
        score += min(15, framework_score * 2)
        
        # Use semantic matching if available
        if semantic_match_result:
            matching_skills = getattr(semantic_match_result, 'matching_skills', [])
            if matching_skills:
                semantic_bonus = min(20, len(matching_skills) * 2)
                score += semantic_bonus
        
        return max(0, min(100, score))
    
    def _calculate_experience_score(self, resume_text: str) -> int:
        """Calculate Experience Score (15% weight)"""
        resume_lower = resume_text.lower()
        
        score = 30  # Base score
        
        # Experience indicators
        exp_indicators = [
            'years', 'experience', 'worked', 'employed', 'position', 'role',
            'responsibility', 'managed', 'led', 'developed', 'implemented'
        ]
        
        # Count experience indicators
        exp_count = sum(1 for indicator in exp_indicators if indicator in resume_lower)
        score += min(30, exp_count * 3)
        
        # Look for quantified experience
        year_patterns = [
            r'\d+\s*\+?\s*years?',
            r'\d+\s*yrs?',
            r'(\d{4})\s*[-–]\s*(\d{4})',
            r'(\d{4})\s*[-–]\s*present'
        ]
        
        quantified_exp = 0
        for pattern in year_patterns:
            matches = re.findall(pattern, resume_lower)
            quantified_exp += len(matches)
        
        if quantified_exp > 0:
            score += min(25, quantified_exp * 8)
        
        # Achievement indicators
        achievement_indicators = [
            'achieved', 'improved', 'increased', 'reduced', 'optimized',
            'delivered', 'successful', 'award', 'recognition'
        ]
        
        achievement_count = sum(1 for indicator in achievement_indicators if indicator in resume_lower)
        score += min(15, achievement_count * 2)
        
        return max(0, min(100, score))
    
    def _calculate_projects_score(self, resume_text: str) -> int:
        """Calculate Projects Score (10% weight)"""
        resume_lower = resume_text.lower()
        
        score = 40  # Base score
        
        # Project indicators
        project_indicators = [
            'project', 'built', 'created', 'developed', 'designed', 'implemented',
            'application', 'website', 'system', 'platform', 'tool'
        ]
        
        # Count project mentions
        project_count = sum(1 for indicator in project_indicators if indicator in resume_lower)
        score += min(35, project_count * 4)
        
        # Technical project indicators
        tech_project_indicators = [
            'github', 'repository', 'open source', 'deployed', 'live', 'production',
            'api', 'database', 'frontend', 'backend', 'full stack'
        ]
        
        tech_count = sum(1 for indicator in tech_project_indicators if indicator in resume_lower)
        score += min(25, tech_count * 5)
        
        return max(0, min(100, score))
    
    def _calculate_education_score(self, resume_text: str) -> int:
        """Calculate Education Score (10% weight)"""
        resume_lower = resume_text.lower()
        
        score = 50  # Base score for having any education section
        
        # Degree indicators
        degree_indicators = [
            'bachelor', 'master', 'phd', 'doctorate', 'degree', 'university',
            'college', 'institute', 'school'
        ]
        
        degree_count = sum(1 for degree in degree_indicators if degree in resume_lower)
        if degree_count > 0:
            score += min(30, degree_count * 10)
        
        # Relevant field indicators
        relevant_fields = [
            'computer science', 'software engineering', 'information technology',
            'computer engineering', 'mathematics', 'statistics', 'data science'
        ]
        
        field_count = sum(1 for field in relevant_fields if field in resume_lower)
        if field_count > 0:
            score += min(20, field_count * 10)
        
        # Certifications
        cert_indicators = [
            'certification', 'certified', 'certificate', 'license', 'credential'
        ]
        
        cert_count = sum(1 for cert in cert_indicators if cert in resume_lower)
        score += min(15, cert_count * 5)
        
        return max(0, min(100, score))
    
    def _calculate_grammar_score(self, resume_text: str) -> int:
        """Calculate Grammar Score (5% weight) - Enhanced from Phase 1"""
        # Use Phase 1 content quality check as base
        content_result = checkContentQuality(resume_text)
        base_score = content_result['score']
        
        # Additional grammar checks
        grammar_issues = 0
        
        # Check for common grammar issues
        text_lower = resume_text.lower()
        
        # Spelling indicators (simplified)
        common_typos = [
            'recieve', 'seperate', 'occured', 'developement', 'managment',
            'experiance', 'responsable', 'sucessful'
        ]
        
        for typo in common_typos:
            if typo in text_lower:
                grammar_issues += 1
        
        # Sentence structure checks (simplified)
        sentences = re.split(r'[.!?]+', resume_text)
        very_long_sentences = [s for s in sentences if len(s.split()) > 40]
        grammar_issues += len(very_long_sentences)
        
        # Apply penalties
        penalty = min(25, grammar_issues * 5)
        final_score = max(0, base_score - penalty)
        
        return min(100, final_score)
    
    def _calculate_formatting_score(self, resume_text: str, file_metadata: Dict) -> int:
        """Calculate Formatting Score (5% weight) - Enhanced from Phase 1"""
        # Use Phase 1 formatting check as base
        formatting_result = checkFormatting(resume_text)
        base_score = formatting_result['score']
        
        # Additional formatting improvements for ATS
        bonus_points = 0
        
        # Consistent formatting indicators
        lines = resume_text.split('\n')
        
        # Check for consistent bullet points
        bullet_lines = [line for line in lines if re.match(r'^[\s]*[•\-\*]\s', line)]
        if len(bullet_lines) > 3:  # Has bullet points
            bonus_points += 10
        
        # Check for section headers
        header_patterns = [
            r'^[A-Z][A-Z\s]+$',  # ALL CAPS headers
            r'^[A-Z][a-z\s]+:?$'  # Title Case headers
        ]
        
        headers_found = 0
        for line in lines:
            line = line.strip()
            if line and any(re.match(pattern, line) for pattern in header_patterns):
                headers_found += 1
        
        if headers_found >= 3:  # Multiple clear sections
            bonus_points += 10
        
        # File type bonus (from metadata)
        file_type = file_metadata.get('fileType', 'unknown')
        if file_type == 'pdf':
            bonus_points += 5  # PDF generally better for ATS
        
        final_score = min(100, base_score + bonus_points)
        return final_score
    
    def _generate_recommendations(self, *scores, semantic_match_result=None) -> List[str]:
        """Generate overall recommendations based on all scores"""
        jd_match, skills, experience, projects, education, grammar, formatting = scores
        recommendations = []
        
        # JD Match recommendations
        if jd_match < 60:
            recommendations.append("Tailor your resume more closely to the job description keywords and requirements")
        elif jd_match < 80:
            recommendations.append("Good job description alignment. Consider emphasizing relevant skills more prominently")
        
        # Skills recommendations
        if skills < 70:
            recommendations.append("Highlight more technical skills and technologies relevant to the role")
        
        # Experience recommendations
        if experience < 70:
            recommendations.append("Add more quantified achievements and specific accomplishments to your experience section")
        
        # Projects recommendations
        if projects < 60:
            recommendations.append("Include more project details and technical implementations to showcase your abilities")
        
        # Education recommendations
        if education < 60:
            recommendations.append("Ensure your education section clearly lists relevant degrees and certifications")
        
        # Grammar recommendations
        if grammar < 80:
            recommendations.append("Review your resume for spelling and grammar errors")
        
        # Formatting recommendations
        if formatting < 80:
            recommendations.append("Improve resume formatting with consistent bullet points and clear section headers")
        
        # Use semantic matching recommendations if available
        if semantic_match_result:
            semantic_recommendations = getattr(semantic_match_result, 'recommendations', [])
            recommendations.extend(semantic_recommendations[:2])  # Add top 2 semantic recommendations
        
        return recommendations[:8]  # Limit to top 8 recommendations
    
    def _generate_category_feedback(self, *scores) -> Dict[str, List[str]]:
        """Generate detailed feedback for each scoring category"""
        jd_match, skills, experience, projects, education, grammar, formatting = scores
        
        feedback = {}
        
        # JD Match feedback
        if jd_match >= 90:
            feedback['jd_match'] = ["Excellent alignment with job requirements"]
        elif jd_match >= 70:
            feedback['jd_match'] = ["Good match with job description", "Consider adding more relevant keywords"]
        else:
            feedback['jd_match'] = ["Low match with job requirements", "Significantly customize resume for this role"]
        
        # Skills feedback  
        if skills >= 85:
            feedback['skills'] = ["Strong technical skills demonstrated"]
        elif skills >= 70:
            feedback['skills'] = ["Good technical foundation", "Consider adding more specific technologies"]
        else:
            feedback['skills'] = ["Limited technical skills shown", "Highlight relevant programming languages and tools"]
        
        # Experience feedback
        if experience >= 85:
            feedback['experience'] = ["Excellent experience section with quantified achievements"]
        elif experience >= 70:
            feedback['experience'] = ["Good experience details", "Add more specific metrics and results"]
        else:
            feedback['experience'] = ["Experience section needs improvement", "Include quantified accomplishments and impact"]
        
        # Projects feedback
        if projects >= 80:
            feedback['projects'] = ["Strong project portfolio demonstrated"]
        elif projects >= 60:
            feedback['projects'] = ["Some projects shown", "Add more technical project details"]
        else:
            feedback['projects'] = ["Limited project information", "Include personal or professional projects with technical details"]
        
        # Education feedback
        if education >= 80:
            feedback['education'] = ["Strong educational background"]
        elif education >= 60:
            feedback['education'] = ["Adequate education section", "Consider adding relevant certifications"]
        else:
            feedback['education'] = ["Education section could be enhanced", "Add relevant degrees and certifications"]
        
        # Grammar feedback
        if grammar >= 90:
            feedback['grammar'] = ["Excellent grammar and writing quality"]
        elif grammar >= 80:
            feedback['grammar'] = ["Good writing quality", "Minor grammar improvements possible"]
        else:
            feedback['grammar'] = ["Grammar and writing needs improvement", "Proofread carefully for errors"]
        
        # Formatting feedback
        if formatting >= 90:
            feedback['formatting'] = ["Excellent ATS-friendly formatting"]
        elif formatting >= 80:
            feedback['formatting'] = ["Good formatting", "Minor layout improvements possible"]
        else:
            feedback['formatting'] = ["Formatting needs improvement", "Use consistent bullets and clear section headers"]
        
        return feedback