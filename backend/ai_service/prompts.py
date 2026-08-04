"""
AI Service Layer - Prompt Management System
Manages AI prompts and templates for consistent AI interactions
"""
from typing import Dict, Optional, List, Any
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PromptType(Enum):
    """Enumeration of available prompt types"""
    RESUME_REWRITE = "resume_rewrite"
    SKILLS_ANALYSIS = "skills_analysis"  
    RECOMMENDATION_GENERATION = "recommendation_generation"
    COVER_LETTER = "cover_letter"
    INTERVIEW_QUESTIONS = "interview_questions"


@dataclass
class PromptTemplate:
    """Structure for prompt templates"""
    name: str
    type: PromptType
    system_message: Optional[str]
    user_template: str
    required_variables: List[str]
    optional_variables: List[str]
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None


class PromptManager:
    """
    Manages AI prompts and templates
    Provides structured prompt generation and validation
    """
    
    def __init__(self):
        """Initialize prompt manager with templates"""
        self.templates: Dict[str, PromptTemplate] = {}
        self._initialize_templates()
    
    def _initialize_templates(self) -> None:
        """Initialize default prompt templates"""
        logger.info("Initializing AI prompt templates...")
        
        # Resume rewrite prompts (Phase 3.2)
        self.templates["resume_rewrite_basic"] = PromptTemplate(
            name="resume_rewrite_basic",
            type=PromptType.RESUME_REWRITE,
            system_message=(
                "You are an expert resume writer and ATS optimization specialist. "
                "Your task is to rewrite resumes to improve ATS compatibility, "
                "professional language, and overall impact while maintaining accuracy."
            ),
            user_template=(
                "Please rewrite the following resume to improve its ATS score and professional impact:\n\n"
                "Original Resume:\n{resume_text}\n\n"
                "Job Description (for context):\n{job_description}\n\n"
                "Focus on:\n{focus_areas}\n\n"
                "Please provide an improved version that maintains all factual information "
                "while enhancing language, keywords, and ATS compatibility."
            ),
            required_variables=["resume_text"],
            optional_variables=["job_description", "focus_areas"],
            max_tokens=3000,
            temperature=0.7
        )
        
        # Skills analysis prompts (Phase 3.2)
        self.templates["skills_gap_analysis"] = PromptTemplate(
            name="skills_gap_analysis", 
            type=PromptType.SKILLS_ANALYSIS,
            system_message=(
                "You are a career development specialist focused on skills analysis. "
                "Analyze skill gaps between resumes and job requirements, providing "
                "actionable recommendations for improvement."
            ),
            user_template=(
                "Analyze the skills gap between this resume and job description:\n\n"
                "Resume Skills: {resume_skills}\n\n"
                "Job Requirements: {job_requirements}\n\n"
                "Provide:\n"
                "1. Missing critical skills\n"
                "2. Skills to emphasize more\n"
                "3. Learning roadmap recommendations\n"
                "4. Specific action items"
            ),
            required_variables=["resume_skills", "job_requirements"],
            optional_variables=[],
            max_tokens=2000,
            temperature=0.6
        )
        
        # Recommendation generation prompts
        self.templates["improvement_recommendations"] = PromptTemplate(
            name="improvement_recommendations",
            type=PromptType.RECOMMENDATION_GENERATION,
            system_message=(
                "You are an AI resume optimization expert. Generate specific, "
                "actionable recommendations to improve resume quality and ATS scores."
            ),
            user_template=(
                "Based on this analysis, provide specific recommendations:\n\n"
                "Resume Content: {resume_text}\n\n"
                "Current Scores: {scores}\n\n"
                "Identified Issues: {issues}\n\n"
                "Provide prioritized, actionable recommendations with examples."
            ),
            required_variables=["resume_text", "scores"],
            optional_variables=["issues"],
            max_tokens=2500,
            temperature=0.6
        )
        
        # Cover letter prompts (Phase 4)
        self.templates["cover_letter_generation"] = PromptTemplate(
            name="cover_letter_generation",
            type=PromptType.COVER_LETTER,
            system_message=(
                "You are a professional cover letter writer. Create personalized, "
                "compelling cover letters that highlight relevant experience and "
                "match job requirements."
            ),
            user_template=(
                "Create a professional cover letter for:\n\n"
                "Resume: {resume_text}\n\n"
                "Job Description: {job_description}\n\n"
                "Company: {company_name}\n\n"
                "Position: {position_title}\n\n"
                "Create a compelling, personalized cover letter that highlights "
                "relevant experience and demonstrates fit for the role."
            ),
            required_variables=["resume_text", "job_description"],
            optional_variables=["company_name", "position_title"],
            max_tokens=2000,
            temperature=0.7
        )
        
        logger.info(f"Initialized {len(self.templates)} prompt templates")
    
    def get_template(self, template_name: str) -> Optional[PromptTemplate]:
        """
        Get a specific prompt template
        
        Args:
            template_name: Name of the template
            
        Returns:
            PromptTemplate if found, None otherwise
        """
        return self.templates.get(template_name)
    
    def list_templates(self, prompt_type: Optional[PromptType] = None) -> List[str]:
        """
        List available templates, optionally filtered by type
        
        Args:
            prompt_type: Optional filter by prompt type
            
        Returns:
            List of template names
        """
        if prompt_type:
            return [
                name for name, template in self.templates.items() 
                if template.type == prompt_type
            ]
        
        return list(self.templates.keys())
    
    def generate_prompt(
        self, 
        template_name: str, 
        variables: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a prompt from a template with provided variables
        
        Args:
            template_name: Name of the template to use
            variables: Dictionary of variables to substitute
            
        Returns:
            Dictionary with generated prompt components, None if error
        """
        template = self.get_template(template_name)
        if not template:
            logger.error(f"Template '{template_name}' not found")
            return None
        
        # Validate required variables
        missing_vars = [
            var for var in template.required_variables 
            if var not in variables
        ]
        
        if missing_vars:
            logger.error(f"Missing required variables for template '{template_name}': {missing_vars}")
            return None
        
        try:
            # Generate user prompt by substituting variables
            user_prompt = template.user_template.format(**variables)
            
            return {
                "system_message": template.system_message,
                "user_prompt": user_prompt,
                "max_tokens": template.max_tokens,
                "temperature": template.temperature,
                "template_name": template_name,
                "template_type": template.type.value
            }
            
        except KeyError as e:
            logger.error(f"Variable substitution failed for template '{template_name}': {e}")
            return None
        except Exception as e:
            logger.error(f"Error generating prompt from template '{template_name}': {e}")
            return None
    
    def validate_template(self, template_name: str) -> Dict[str, Any]:
        """
        Validate a prompt template
        
        Args:
            template_name: Name of template to validate
            
        Returns:
            Validation results dictionary
        """
        template = self.get_template(template_name)
        if not template:
            return {"valid": False, "error": "Template not found"}
        
        validation_result = {
            "valid": True,
            "template_name": template.name,
            "type": template.type.value,
            "required_variables": template.required_variables,
            "optional_variables": template.optional_variables,
            "has_system_message": bool(template.system_message),
            "template_length": len(template.user_template)
        }
        
        # Basic validation checks
        issues = []
        
        if not template.user_template.strip():
            issues.append("Empty user template")
        
        if len(template.user_template) > 5000:
            issues.append("Template very long (>5000 chars)")
        
        if template.max_tokens and template.max_tokens > 4000:
            issues.append("Max tokens very high (>4000)")
        
        if issues:
            validation_result["issues"] = issues
        
        return validation_result
    
    def add_custom_template(self, template: PromptTemplate) -> bool:
        """
        Add a custom prompt template
        
        Args:
            template: PromptTemplate to add
            
        Returns:
            True if successful, False otherwise
        """
        if template.name in self.templates:
            logger.warning(f"Template '{template.name}' already exists, overwriting")
        
        try:
            self.templates[template.name] = template
            logger.info(f"Added custom template: {template.name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add custom template '{template.name}': {e}")
            return False


# Global prompt manager instance
prompt_manager = PromptManager()