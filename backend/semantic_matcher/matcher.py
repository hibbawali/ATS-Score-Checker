"""
Semantic Matching Engine using Sentence Transformers
Compares resume content with job descriptions using semantic similarity
"""
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import re
import logging

logger = logging.getLogger(__name__)


@dataclass
class MatchResult:
    """Structure for semantic matching results"""
    overall_similarity: float
    skills_similarity: float
    experience_similarity: float
    matching_skills: List[Dict[str, any]]
    missing_skills: List[str]
    skill_gaps: Dict[str, any]
    recommendations: List[str]


class SemanticMatcher:
    """
    Semantic matching engine using sentence transformers
    Compares resume content with job descriptions for intelligent matching
    """
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize the semantic matcher
        
        Args:
            model_name: Name of the sentence transformer model to use
        """
        self.model_name = model_name
        self._model = None
        self._load_model()
        
        # Similarity thresholds
        self.high_similarity_threshold = 0.75
        self.medium_similarity_threshold = 0.50
        self.low_similarity_threshold = 0.25
    
    def _load_model(self):
        """Lazy load the sentence transformer model"""
        try:
            if self._model is None:
                logger.info(f"Loading sentence transformer model: {self.model_name}")
                self._model = SentenceTransformer(self.model_name)
                logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model {self.model_name}: {e}")
            raise
    
    @property
    def model(self):
        """Get the loaded model"""
        if self._model is None:
            self._load_model()
        return self._model
    
    def match_resume_to_job(
        self, 
        resume_text: str, 
        job_description: str,
        required_skills: List[str] = None,
        preferred_skills: List[str] = None
    ) -> MatchResult:
        """
        Perform semantic matching between resume and job description
        
        Args:
            resume_text: Full resume text content
            job_description: Job description text
            required_skills: List of required skills from job posting
            preferred_skills: List of preferred skills from job posting
            
        Returns:
            MatchResult: Comprehensive matching analysis
        """
        # Extract sections from resume and job description
        resume_sections = self._extract_resume_sections(resume_text)
        jd_sections = self._extract_jd_sections(job_description)
        
        # Calculate overall similarity
        overall_similarity = self._calculate_overall_similarity(resume_text, job_description)
        
        # Calculate section-specific similarities
        skills_similarity = self._calculate_skills_similarity(
            resume_sections.get('skills', ''), 
            jd_sections.get('requirements', '')
        )
        
        experience_similarity = self._calculate_experience_similarity(
            resume_sections.get('experience', ''),
            jd_sections.get('requirements', '')
        )
        
        # Analyze skill matching
        matching_skills, missing_skills = self._analyze_skill_matching(
            resume_text,
            required_skills or [],
            preferred_skills or []
        )
        
        # Generate skill gap analysis
        skill_gaps = self._analyze_skill_gaps(matching_skills, missing_skills)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            overall_similarity,
            skills_similarity,
            matching_skills,
            missing_skills
        )
        
        return MatchResult(
            overall_similarity=overall_similarity,
            skills_similarity=skills_similarity,
            experience_similarity=experience_similarity,
            matching_skills=matching_skills,
            missing_skills=missing_skills,
            skill_gaps=skill_gaps,
            recommendations=recommendations
        )
    
    def _extract_resume_sections(self, resume_text: str) -> Dict[str, str]:
        """Extract different sections from resume text"""
        sections = {}
        text_lower = resume_text.lower()
        
        # Common section headers
        section_patterns = {
            'skills': r'(?:technical\s+)?skills?|competencies|technologies',
            'experience': r'(?:work\s+)?experience|employment|professional\s+experience',
            'education': r'education|academic|qualifications',
            'projects': r'projects?|portfolio'
        }
        
        for section_name, pattern in section_patterns.items():
            # Find section start
            section_match = re.search(f'({pattern}).*?(?=\\n\\s*[A-Z]|$)', text_lower, re.DOTALL | re.IGNORECASE)
            if section_match:
                sections[section_name] = section_match.group(0)
        
        # If no clear sections, use the whole text
        if not sections:
            sections['skills'] = resume_text
            sections['experience'] = resume_text
        
        return sections
    
    def _extract_jd_sections(self, job_description: str) -> Dict[str, str]:
        """Extract different sections from job description"""
        sections = {}
        text_lower = job_description.lower()
        
        # Common JD section patterns
        section_patterns = {
            'requirements': r'(?:requirements|qualifications|skills|must\s+have)',
            'responsibilities': r'(?:responsibilities|duties|you\s+will)',
            'preferred': r'(?:preferred|nice\s+to\s+have|bonus|plus)'
        }
        
        for section_name, pattern in section_patterns.items():
            section_match = re.search(f'({pattern}).*?(?=\\n\\s*[A-Z]|$)', text_lower, re.DOTALL | re.IGNORECASE)
            if section_match:
                sections[section_name] = section_match.group(0)
        
        # Use whole text as fallback
        if not sections:
            sections['requirements'] = job_description
        
        return sections
    
    def _calculate_overall_similarity(self, text1: str, text2: str) -> float:
        """Calculate overall semantic similarity between two texts"""
        try:
            # Encode both texts
            embeddings = self.model.encode([text1, text2])
            
            # Calculate cosine similarity
            similarity_matrix = cosine_similarity([embeddings[0]], [embeddings[1]])
            return float(similarity_matrix[0][0])
            
        except Exception as e:
            logger.error(f"Error calculating overall similarity: {e}")
            return 0.0
    
    def _calculate_skills_similarity(self, resume_skills: str, jd_requirements: str) -> float:
        """Calculate similarity between resume skills and job requirements"""
        if not resume_skills or not jd_requirements:
            return 0.0
        
        return self._calculate_overall_similarity(resume_skills, jd_requirements)
    
    def _calculate_experience_similarity(self, resume_experience: str, jd_requirements: str) -> float:
        """Calculate similarity between resume experience and job requirements"""
        if not resume_experience or not jd_requirements:
            return 0.0
        
        return self._calculate_overall_similarity(resume_experience, jd_requirements)
    
    def _analyze_skill_matching(
        self, 
        resume_text: str, 
        required_skills: List[str], 
        preferred_skills: List[str]
    ) -> Tuple[List[Dict[str, any]], List[str]]:
        """Analyze which skills match and which are missing"""
        matching_skills = []
        missing_skills = []
        
        all_skills = required_skills + preferred_skills
        resume_lower = resume_text.lower()
        
        for skill in all_skills:
            skill_lower = skill.lower()
            is_required = skill in required_skills
            
            # Check for exact matches first
            if skill_lower in resume_lower:
                matching_skills.append({
                    'skill': skill,
                    'match_type': 'exact',
                    'similarity': 1.0,
                    'is_required': is_required,
                    'context': self._extract_skill_context(resume_text, skill)
                })
            else:
                # Check for semantic similarity
                similarity = self._calculate_skill_similarity(resume_text, skill)
                
                if similarity > self.medium_similarity_threshold:
                    matching_skills.append({
                        'skill': skill,
                        'match_type': 'semantic',
                        'similarity': similarity,
                        'is_required': is_required,
                        'context': self._extract_skill_context(resume_text, skill)
                    })
                else:
                    missing_skills.append(skill)
        
        return matching_skills, missing_skills
    
    def _calculate_skill_similarity(self, resume_text: str, skill: str) -> float:
        """Calculate semantic similarity between resume and a specific skill"""
        try:
            # Create skill variations for better matching
            skill_variations = [
                skill,
                f"{skill} development",
                f"{skill} programming",
                f"experience with {skill}",
                f"{skill} framework"
            ]
            
            # Encode resume and skill variations
            all_texts = [resume_text] + skill_variations
            embeddings = self.model.encode(all_texts)
            
            # Calculate similarity between resume and each skill variation
            resume_embedding = embeddings[0:1]
            skill_embeddings = embeddings[1:]
            
            similarities = cosine_similarity(resume_embedding, skill_embeddings)
            return float(np.max(similarities))
            
        except Exception as e:
            logger.error(f"Error calculating skill similarity for {skill}: {e}")
            return 0.0
    
    def _extract_skill_context(self, resume_text: str, skill: str) -> str:
        """Extract context around where a skill is mentioned"""
        skill_lower = skill.lower()
        
        # Split into sentences and find mentions
        sentences = re.split(r'[.!?]\s+', resume_text)
        
        for sentence in sentences:
            if skill_lower in sentence.lower():
                return sentence.strip()
        
        return ""
    
    def _analyze_skill_gaps(self, matching_skills: List[Dict], missing_skills: List[str]) -> Dict[str, any]:
        """Analyze skill gaps and categorize them"""
        required_missing = []
        preferred_missing = []
        strong_matches = []
        weak_matches = []
        
        # Categorize matching skills by strength
        for skill_match in matching_skills:
            if skill_match['similarity'] > self.high_similarity_threshold:
                strong_matches.append(skill_match)
            else:
                weak_matches.append(skill_match)
        
        # Categorize missing skills by priority
        # Note: We'd need additional context to properly categorize missing skills
        # For now, assume all missing skills from required list are required_missing
        required_missing = missing_skills  # Simplified for now
        
        return {
            'strong_matches': strong_matches,
            'weak_matches': weak_matches,
            'required_missing': required_missing,
            'preferred_missing': preferred_missing,
            'match_percentage': len(matching_skills) / (len(matching_skills) + len(missing_skills)) * 100 if (matching_skills or missing_skills) else 0
        }
    
    def _generate_recommendations(
        self,
        overall_similarity: float,
        skills_similarity: float,
        matching_skills: List[Dict],
        missing_skills: List[str]
    ) -> List[str]:
        """Generate recommendations based on matching analysis"""
        recommendations = []
        
        # Overall similarity recommendations
        if overall_similarity < 0.3:
            recommendations.append("Consider tailoring your resume more closely to this job description")
        elif overall_similarity < 0.6:
            recommendations.append("Good alignment with job requirements. Consider highlighting relevant experience more prominently")
        else:
            recommendations.append("Excellent match! Your resume aligns well with the job requirements")
        
        # Skills-specific recommendations
        if skills_similarity < 0.4:
            recommendations.append("Focus on highlighting technical skills that match the job requirements")
        
        # Missing skills recommendations
        if missing_skills:
            high_priority_missing = missing_skills[:3]  # Top 3 missing skills
            if len(high_priority_missing) == 1:
                recommendations.append(f"Consider adding experience with {high_priority_missing[0]} to strengthen your profile")
            else:
                skills_str = ", ".join(high_priority_missing)
                recommendations.append(f"Consider gaining experience in: {skills_str}")
        
        # Matching skills recommendations
        strong_matches = [s for s in matching_skills if s['similarity'] > self.high_similarity_threshold]
        if strong_matches:
            recommendations.append(f"Excellent! You have strong matches in {len(strong_matches)} key areas")
        
        return recommendations