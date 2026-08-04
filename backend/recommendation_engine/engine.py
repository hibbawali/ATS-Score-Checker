"""
Enhanced Recommendation Engine for Phase 2
Generates intelligent recommendations based on semantic matching and advanced scoring
"""
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass 
class RecommendationResult:
    """Structure for recommendation results"""
    priority_recommendations: List[Dict[str, any]]
    skill_recommendations: List[Dict[str, any]]
    content_recommendations: List[Dict[str, any]]
    formatting_recommendations: List[Dict[str, any]]
    overall_advice: str


class EnhancedRecommendationEngine:
    """
    Enhanced recommendation engine that provides intelligent, actionable suggestions
    based on semantic matching results and advanced scoring analysis
    """
    
    def __init__(self):
        """Initialize the recommendation engine"""
        self.skill_priority_map = {
            'python': 'high',
            'javascript': 'high', 
            'react': 'high',
            'java': 'high',
            'sql': 'high',
            'aws': 'medium',
            'docker': 'medium',
            'git': 'medium',
            'html': 'low',
            'css': 'low'
        }
        
    def generate_recommendations(
        self,
        scoring_result: object,
        semantic_match_result: Optional[object] = None,
        resume_text: str = "",
        job_description: str = ""
    ) -> RecommendationResult:
        """
        Generate comprehensive recommendations based on analysis results
        
        Args:
            scoring_result: Result from advanced scoring engine
            semantic_match_result: Result from semantic matching (optional)
            resume_text: Original resume text
            job_description: Job description text (optional)
            
        Returns:
            RecommendationResult: Structured recommendations
        """
        # Generate different types of recommendations
        priority_recommendations = self._generate_priority_recommendations(scoring_result, semantic_match_result)
        skill_recommendations = self._generate_skill_recommendations(semantic_match_result, resume_text)
        content_recommendations = self._generate_content_recommendations(scoring_result, resume_text)
        formatting_recommendations = self._generate_formatting_recommendations(scoring_result)
        overall_advice = self._generate_overall_advice(scoring_result, semantic_match_result)
        
        return RecommendationResult(
            priority_recommendations=priority_recommendations,
            skill_recommendations=skill_recommendations,
            content_recommendations=content_recommendations,
            formatting_recommendations=formatting_recommendations,
            overall_advice=overall_advice
        )
    
    def _generate_priority_recommendations(
        self, 
        scoring_result: object, 
        semantic_match_result: Optional[object]
    ) -> List[Dict[str, any]]:
        """Generate high-priority recommendations based on lowest scores with improved logic"""
        recommendations = []
        
        # Get individual scores with their weights for impact calculation
        scores_with_weights = {
            'JD Match': (getattr(scoring_result, 'jd_match_score', 0), 0.35),
            'Skills': (getattr(scoring_result, 'skills_score', 0), 0.20),
            'Experience': (getattr(scoring_result, 'experience_score', 0), 0.15),
            'Projects': (getattr(scoring_result, 'projects_score', 0), 0.10),
            'Education': (getattr(scoring_result, 'education_score', 0), 0.10),
            'Grammar': (getattr(scoring_result, 'grammar_score', 0), 0.05),
            'Formatting': (getattr(scoring_result, 'formatting_score', 0), 0.05)
        }
        
        # Calculate impact potential (low score * high weight = high impact opportunity)
        impact_opportunities = []
        for category, (score, weight) in scores_with_weights.items():
            if score < 80:  # Only consider categories that have room for improvement
                # Impact = potential improvement * weight
                potential_improvement = 85 - score  # Target score of 85
                impact = potential_improvement * weight
                impact_opportunities.append((category, score, impact))
        
        # Sort by impact potential (highest impact first)
        impact_opportunities.sort(key=lambda x: x[2], reverse=True)
        
        # Generate recommendations for top 3 highest impact opportunities
        for category, score, impact in impact_opportunities[:3]:
            recommendation = self._get_priority_recommendation(category, score, semantic_match_result, impact)
            if recommendation:
                recommendations.append(recommendation)
        
        # Remove duplicate recommendations by type and title
        unique_recommendations = []
        seen_types = set()
        
        for recommendation in recommendations:
            rec_type = recommendation.get('category', '')
            rec_title = recommendation.get('title', '')
            unique_key = f"{rec_type}_{rec_title}"
            
            if unique_key not in seen_types:
                seen_types.add(unique_key)
                unique_recommendations.append(recommendation)
        
        return unique_recommendations
    
    def _get_priority_recommendation(
        self, 
        category: str, 
        score: int, 
        semantic_match_result: Optional[object],
        impact: float
    ) -> Dict[str, any]:
        """Get specific priority recommendation for a category with impact-based priority"""
        
        # Determine priority level based on impact
        if impact > 10:
            priority = 'critical'
        elif impact > 5:
            priority = 'high'
        else:
            priority = 'medium'
        
        recommendations_map = {
            'JD Match': {
                'title': 'Improve Job Description Alignment',
                'priority': priority,
                'impact': 'high',
                'effort': 'medium',
                'action': 'Customize your resume to better match the job posting requirements',
                'explanation': f'Your JD match score is {score}/100. This category has 35% weight in ATS scoring, making it the most impactful area to improve.',
                'specifics': self._get_jd_match_specifics(semantic_match_result)
            },
            'Skills': {
                'title': 'Strengthen Technical Skills Section',
                'priority': priority,
                'impact': 'high', 
                'effort': 'low',
                'action': 'Add more relevant technical skills and demonstrate proficiency levels',
                'explanation': f'Your skills score is {score}/100. This category represents 20% of your overall score and is relatively easy to improve.',
                'specifics': ['List specific programming languages you know', 'Include frameworks and tools you\'ve used', 'Add relevant certifications or courses']
            },
            'Experience': {
                'title': 'Enhance Work Experience Descriptions',
                'priority': priority,
                'impact': 'medium',
                'effort': 'medium',
                'action': 'Add quantified achievements and specific accomplishments to your work experience',
                'explanation': f'Your experience score is {score}/100. This category is worth 15% and greatly benefits from specific metrics and results.',
                'specifics': ['Include numbers, percentages, and dollar amounts', 'Use strong action verbs to start bullet points', 'Describe the impact and results of your work']
            },
            'Projects': {
                'title': 'Showcase Technical Projects',
                'priority': priority,
                'impact': 'medium',
                'effort': 'medium',
                'action': 'Add a dedicated projects section highlighting technical implementations',
                'explanation': f'Your projects score is {score}/100. This 10% category demonstrates practical application of your skills.',
                'specifics': ['Include personal coding projects or portfolio work', 'Mention technologies used and problems solved', 'Add GitHub links or live project URLs if available']
            },
            'Education': {
                'title': 'Optimize Education Section',
                'priority': 'low',  # Education is often harder to change
                'impact': 'low',
                'effort': 'low',
                'action': 'Enhance your education section with relevant details and achievements',
                'explanation': f'Your education score is {score}/100. While this is 10% of your score, focus on highlighting relevant coursework and achievements.',
                'specifics': ['List relevant coursework and academic projects', 'Add certifications and professional development', 'Include GPA if above 3.5 and recent graduate']
            },
            'Grammar': {
                'title': 'Improve Writing Quality and Clarity',
                'priority': priority,
                'impact': 'medium',
                'effort': 'low',
                'action': 'Review and improve grammar, spelling, and writing quality throughout your resume',
                'explanation': f'Your grammar score is {score}/100. Poor grammar can immediately disqualify candidates despite this being only 5% of the score.',
                'specifics': ['Use Grammarly or similar tools to check for errors', 'Ensure consistent verb tense throughout', 'Avoid first-person pronouns (I, my, our)', 'Keep bullet points concise and parallel']
            },
            'Formatting': {
                'title': 'Optimize ATS-Friendly Formatting',
                'priority': priority,
                'impact': 'medium',
                'effort': 'low',
                'action': 'Improve resume formatting for better ATS compatibility and readability',
                'explanation': f'Your formatting score is {score}/100. Poor formatting can prevent ATS systems from parsing your resume correctly.',
                'specifics': ['Use consistent bullet points and clear section headers', 'Avoid complex layouts, tables, and graphics', 'Save as PDF to preserve formatting', 'Use standard fonts like Arial or Calibri']
            }
        }
        
        rec = recommendations_map.get(category)
        if rec:
            rec['category'] = category
            rec['current_score'] = score
            rec['potential_improvement'] = min(25, 85 - score)
            rec['estimated_impact'] = round(impact, 1)
            
        return rec
    
    def _get_jd_match_specifics(self, semantic_match_result: Optional[object]) -> List[str]:
        """Get specific recommendations for improving JD match"""
        specifics = []
        
        if semantic_match_result:
            missing_skills = getattr(semantic_match_result, 'missing_skills', [])
            if missing_skills:
                high_priority_missing = [skill for skill in missing_skills[:5] 
                                       if self.skill_priority_map.get(skill.lower(), 'medium') in ['high', 'medium']]
                if high_priority_missing:
                    specifics.append(f"Add experience with: {', '.join(high_priority_missing)}")
                
            matching_skills = getattr(semantic_match_result, 'matching_skills', [])
            weak_matches = [skill for skill in matching_skills 
                          if isinstance(skill, dict) and skill.get('similarity', 1.0) < 0.7]
            if weak_matches:
                specifics.append("Strengthen descriptions of your existing relevant skills")
        
        if not specifics:
            specifics = [
                'Include more keywords from the job posting',
                'Match the job requirements more closely',
                'Emphasize relevant experience for this role'
            ]
        
        return specifics
    
    def _generate_skill_recommendations(
        self, 
        semantic_match_result: Optional[object], 
        resume_text: str
    ) -> List[Dict[str, any]]:
        """Generate skill-specific recommendations"""
        recommendations = []
        
        if not semantic_match_result:
            return self._generate_generic_skill_recommendations(resume_text)
        
        missing_skills = getattr(semantic_match_result, 'missing_skills', [])
        matching_skills = getattr(semantic_match_result, 'matching_skills', [])
        
        # Recommendations for missing high-priority skills
        high_priority_missing = []
        medium_priority_missing = []
        
        for skill in missing_skills[:10]:  # Limit to top 10
            priority = self.skill_priority_map.get(skill.lower(), 'medium')
            if priority == 'high':
                high_priority_missing.append(skill)
            elif priority == 'medium':
                medium_priority_missing.append(skill)
        
        if high_priority_missing:
            recommendations.append({
                'type': 'missing_critical_skills',
                'title': 'Critical Missing Skills',
                'priority': 'high',
                'skills': high_priority_missing,
                'action': f"Consider gaining experience in these high-demand skills: {', '.join(high_priority_missing)}",
                'timeline': 'Immediate focus (1-3 months)'
            })
        
        if medium_priority_missing:
            recommendations.append({
                'type': 'missing_preferred_skills', 
                'title': 'Preferred Skills to Add',
                'priority': 'medium',
                'skills': medium_priority_missing,
                'action': f"These skills would strengthen your profile: {', '.join(medium_priority_missing)}",
                'timeline': 'Medium-term goal (3-6 months)'
            })
        
        # Recommendations for weak matches
        weak_matches = [
            skill for skill in matching_skills 
            if isinstance(skill, dict) and skill.get('similarity', 1.0) < 0.6
        ]
        
        if weak_matches:
            weak_skill_names = [skill.get('skill', '') for skill in weak_matches[:3]]
            recommendations.append({
                'type': 'strengthen_existing',
                'title': 'Strengthen Existing Skills',
                'priority': 'medium',
                'skills': weak_skill_names,
                'action': f"Provide more detailed examples of your experience with: {', '.join(weak_skill_names)}",
                'timeline': 'Quick improvement (immediate)'
            })
        
        return recommendations
    
    def _generate_generic_skill_recommendations(self, resume_text: str) -> List[Dict[str, any]]:
        """Generate generic skill recommendations when no semantic analysis is available"""
        resume_lower = resume_text.lower()
        recommendations = []
        
        # Check for common skill gaps
        missing_fundamentals = []
        
        fundamental_skills = {
            'git': 'version control',
            'sql': 'database querying', 
            'api': 'API development/integration',
            'testing': 'software testing',
            'agile': 'agile methodologies'
        }
        
        for skill, description in fundamental_skills.items():
            if skill not in resume_lower:
                missing_fundamentals.append(f"{skill.upper()} ({description})")
        
        if missing_fundamentals:
            recommendations.append({
                'type': 'fundamental_skills',
                'title': 'Add Fundamental Technical Skills',
                'priority': 'medium',
                'skills': list(fundamental_skills.keys()),
                'action': f"Consider adding these essential skills: {', '.join(missing_fundamentals[:3])}",
                'timeline': 'Short-term improvement (1-2 months)'
            })
        
        return recommendations
    
    def _generate_content_recommendations(
        self, 
        scoring_result: object, 
        resume_text: str
    ) -> List[Dict[str, any]]:
        """Generate content improvement recommendations"""
        recommendations = []
        
        experience_score = getattr(scoring_result, 'experience_score', 0)
        projects_score = getattr(scoring_result, 'projects_score', 0)
        
        # Experience content recommendations
        if experience_score < 75:
            recommendations.append({
                'type': 'experience_content',
                'title': 'Enhance Experience Descriptions', 
                'priority': 'high',
                'action': 'Add quantified achievements and specific results to your work experience',
                'examples': [
                    'Instead of "Worked on web development" → "Developed 3 customer-facing web applications serving 10,000+ users"',
                    'Instead of "Improved system performance" → "Optimized database queries, reducing load time by 40%"',
                    'Add metrics: percentages, dollar amounts, team sizes, timeframes'
                ]
            })
        
        # Project content recommendations  
        if projects_score < 70:
            recommendations.append({
                'type': 'project_content',
                'title': 'Showcase Technical Projects',
                'priority': 'medium', 
                'action': 'Add detailed project descriptions with technical implementations',
                'examples': [
                    'Include personal coding projects from GitHub',
                    'Describe technologies used and problems solved',
                    'Add links to live projects or repositories',
                    'Mention project outcomes and impact'
                ]
            })
        
        # Check for weak phrases in resume
        weak_phrases_found = self._detect_weak_phrases(resume_text)
        if weak_phrases_found:
            recommendations.append({
                'type': 'weak_phrases',
                'title': 'Replace Weak Phrases',
                'priority': 'medium',
                'action': 'Replace passive language with strong action verbs',
                'examples': [
                    f'Found weak phrases: {", ".join(weak_phrases_found[:3])}',
                    'Use "Led", "Developed", "Implemented" instead of "Responsible for", "Worked on"',
                    'Start bullet points with past-tense action verbs'
                ]
            })
        
        return recommendations
    
    def _detect_weak_phrases(self, resume_text: str) -> List[str]:
        """Detect weak phrases in resume text"""
        weak_phrases = [
            'responsible for', 'duties included', 'worked on', 'assisted with',
            'helped with', 'involved in', 'tasked with', 'experience in'
        ]
        
        resume_lower = resume_text.lower()
        found_phrases = []
        
        for phrase in weak_phrases:
            if phrase in resume_lower:
                found_phrases.append(phrase)
        
        return found_phrases
    
    def _generate_formatting_recommendations(self, scoring_result: object) -> List[Dict[str, any]]:
        """Generate formatting improvement recommendations"""
        recommendations = []
        
        formatting_score = getattr(scoring_result, 'formatting_score', 0)
        grammar_score = getattr(scoring_result, 'grammar_score', 0)
        
        if formatting_score < 80:
            recommendations.append({
                'type': 'ats_formatting',
                'title': 'Optimize for ATS Systems',
                'priority': 'medium',
                'action': 'Improve resume formatting for better ATS compatibility',
                'specifics': [
                    'Use consistent bullet points (• or -)',
                    'Add clear section headers (EXPERIENCE, SKILLS, EDUCATION)',
                    'Avoid tables, images, and complex formatting',
                    'Use standard fonts (Arial, Calibri, Times New Roman)',
                    'Save as PDF to preserve formatting'
                ]
            })
        
        if grammar_score < 85:
            recommendations.append({
                'type': 'grammar_quality',
                'title': 'Improve Writing Quality',
                'priority': 'high',
                'action': 'Proofread and improve grammar throughout your resume',
                'specifics': [
                    'Check spelling and grammar errors',
                    'Use consistent verb tense (past tense for previous roles)',
                    'Avoid first-person pronouns (I, my, our)',
                    'Keep bullet points concise (under 2 lines)',
                    'Use parallel structure in bullet points'
                ]
            })
        
        return recommendations
    
    def _generate_overall_advice(
        self, 
        scoring_result: object, 
        semantic_match_result: Optional[object]
    ) -> str:
        """Generate overall strategic advice based on complete analysis"""
        overall_score = getattr(scoring_result, 'overall_score', 0)
        
        if overall_score >= 85:
            advice = ("Excellent! Your resume is well-optimized for this role. "
                     "Consider fine-tuning based on the specific recommendations above, "
                     "and you should be ready to apply with confidence.")
        
        elif overall_score >= 70:
            advice = ("Good foundation! Your resume has strong elements but could benefit from targeted improvements. "
                     "Focus on the high-priority recommendations to boost your ATS compatibility and appeal to recruiters.")
        
        elif overall_score >= 50:
            advice = ("Your resume needs significant improvement to be competitive for this role. "
                     "Prioritize the critical recommendations, especially job description alignment and quantified achievements. "
                     "Consider this an opportunity to strengthen your professional presentation.")
        
        else:
            advice = ("Your resume requires substantial revision to meet modern ATS and recruiter expectations. "
                     "Focus on fundamentals: clear formatting, quantified achievements, and relevant keywords. "
                     "Take time to thoroughly address the recommendations before applying.")
        
        # Add specific advice based on semantic matching
        if semantic_match_result:
            match_percentage = getattr(semantic_match_result, 'overall_similarity', 0) * 100
            if match_percentage < 30:
                advice += (" Additionally, your resume appears to be a poor match for this specific role. "
                          "Consider whether this position aligns with your background, or significantly tailor your resume.")
            elif match_percentage > 80:
                advice += (" Your background aligns excellently with this role - focus on presentation improvements "
                          "to ensure you stand out to recruiters.")
        
        return advice