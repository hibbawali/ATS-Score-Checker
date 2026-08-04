"""
Job Description Parser Engine - FIXED VERSION
Extracts structured information from job description text with proper filtering and normalization
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
    Uses rule-based pattern matching with proper filtering and normalization
    """
    
    def __init__(self):
        # TASK 2 - Create whitelist system for valid technical skills
        self.skills_whitelist = {
            # Programming Languages
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
            'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql', 'html', 'css', 'dart', 'perl',
            'c', 'objective-c', 'shell', 'bash', 'powershell', 'vb.net', 'f#', 'clojure', 'erlang',
            
            # Frontend Frameworks & Libraries
            'react', 'angular', 'vue', 'next.js', 'nuxt', 'gatsby', 'svelte', 'ember', 'backbone',
            'jquery', 'bootstrap', 'tailwind', 'material-ui', 'ant design', 'redux', 'mobx', 'vuex',
            'nextjs', 'vuejs', 'reactjs', 'angularjs',
            
            # Backend Frameworks
            'django', 'flask', 'fastapi', 'spring', 'express', 'node.js', 'laravel', 'rails',
            'asp.net', '.net', 'symfony', 'tornado', 'gin', 'echo', 'fiber', 'nestjs', 'nodejs',
            
            # Databases
            'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'sqlite',
            'cassandra', 'dynamodb', 'firebase', 'mariadb', 'neo4j', 'couchdb', 'influxdb',
            'clickhouse', 'snowflake', 'bigquery', 'redshift', 'cosmos db', 'aurora', 'postgres',
            
            # Cloud & DevOps
            'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'jenkins', 'terraform',
            'ansible', 'chef', 'puppet', 'vagrant', 'heroku', 'digitalocean', 'linode',
            'cloudformation', 'helm', 'istio', 'prometheus', 'grafana', 'elastic stack',
            
            # Tools & Technologies
            'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'postman', 'swagger',
            'circleci', 'travis', 'webpack', 'vite', 'gulp', 'grunt', 'npm', 'yarn', 'pip',
            'maven', 'gradle', 'vs code', 'intellij', 'eclipse', 'vim', 'emacs',
            
            # Data Science & AI
            'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'scipy', 'matplotlib',
            'jupyter', 'anaconda', 'spark', 'hadoop', 'airflow', 'dbt', 'tableau', 'powerbi',
            
            # Mobile
            'android', 'ios', 'react native', 'flutter', 'xamarin', 'ionic',
            
            # Testing
            'jest', 'pytest', 'junit', 'selenium', 'cypress', 'mocha', 'chai', 'rspec',
            
            # Operating Systems
            'linux', 'ubuntu', 'centos', 'windows', 'macos', 'unix',
            
            # Methodologies & Practices
            'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'tdd', 'bdd', 'microservices',
            'api design', 'rest api', 'graphql', 'soap', 'mvc', 'mvvm', 'clean architecture'
        }
        
        # TASK 2 - Blacklist common English words that should never be skills
        self.skills_blacklist = {
            'team', 'teams', 'company', 'candidate', 'role', 'work', 'working', 'worked',
            'preferred', 'requirements', 'benefits', 'responsibilities', 'experience',
            'knowledge', 'communication', 'skills', 'skill', 'ability', 'abilities',
            'strong', 'excellent', 'good', 'great', 'understanding', 'familiar',
            'familiarity', 'proficient', 'proficiency', 'expertise', 'expert',
            'degree', 'bachelor', 'master', 'phd', 'education', 'university', 'college',
            'years', 'year', 'minimum', 'maximum', 'plus', 'bonus', 'nice',
            'looking', 'seeking', 'hiring', 'join', 'position', 'job', 'career',
            'opportunity', 'opportunities', 'location', 'remote', 'office', 'onsite',
            'passionate', 'motivated', 'driven', 'dedicated', 'committed', 'focused',
            'environment', 'development', 'system', 'systems', 'application', 'applications',
            'technology', 'technologies', 'solution', 'solutions', 'business', 'industry',
            'process', 'processes', 'project', 'projects', 'customer', 'customers',
            'client', 'clients', 'service', 'services', 'product', 'products'
        }
        
        # Soft skills keywords (separate from technical skills)
        self.soft_skills = [
            'leadership', 'communication', 'teamwork', 'problem solving', 'analytical',
            'creative', 'adaptable', 'organized', 'detail oriented', 'time management',
            'project management', 'collaboration', 'mentoring', 'presentation skills',
            'critical thinking', 'decision making', 'conflict resolution', 'negotiation'
        ]
        
        # Experience patterns
        self.experience_patterns = [
            r'(\d+)[\+\-\s]*years?\s+(?:of\s+)?(?:experience|exp)',
            r'(\d+)[\+\-\s]*yrs?\s+(?:of\s+)?(?:experience|exp)',
            r'minimum\s+(\d+)\s+years?',
            r'at least\s+(\d+)\s+years?',
            r'(\d+)\s*to\s*(\d+)\s+years?',
            r'entry[\s\-]level',
            r'junior\s+(?:level)?',
            r'mid[\s\-]level',
            r'senior\s+(?:level)?',
            r'lead\s+(?:level)?',
            r'principal\s+(?:level)?'
        ]
        
    def parse(self, job_description: str) -> ParsedJobDescription:
        """Parse job description and extract structured information"""
        clean_text = self._clean_text(job_description)
        
        # Extract components with improved logic
        job_title = self._extract_job_title(clean_text)
        company_name = self._extract_company_name(clean_text)
        
        # Extract skills with filtering
        technical_skills = self._extract_technical_skills(clean_text)
        required_skills, preferred_skills = self._categorize_skills(clean_text, technical_skills)
        technologies = self._extract_technologies(clean_text)
        
        # Extract other requirements
        experience_required = self._extract_experience_requirements(clean_text)
        education_requirements = self._extract_education_requirements(clean_text)
        soft_skills = self._extract_soft_skills(clean_text)
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
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()
    
    def _extract_job_title(self, text: str) -> str:
        """Extract job title with improved normalization - TASK 1 FIX"""
        lines = text.split('\n')
        
        job_title_keywords = [
            'engineer', 'developer', 'analyst', 'manager', 'designer', 
            'scientist', 'architect', 'consultant', 'specialist', 'lead',
            'director', 'coordinator', 'administrator', 'technician',
            'intern', 'associate', 'senior', 'junior', 'principal'
        ]
        
        # Look for title in first few lines
        for line in lines[:8]:
            line = line.strip()
            if len(line) < 3 or len(line) > 100:
                continue
            
            # Skip obvious non-titles
            skip_indicators = [
                'company', 'corporation', 'inc', 'ltd', 'llc', 'looking for', 'seeking', 
                'we are', 'join us', 'about us', 'description', 'requirements', 
                'qualifications', 'responsibilities', 'benefits', 'location'
            ]
            
            if any(skip_word in line.lower() for skip_word in skip_indicators):
                continue
            
            # Check for job title keywords
            if any(keyword in line.lower() for keyword in job_title_keywords):
                # Clean title from patterns like "Title - Company"
                title = line.strip()
                title = re.sub(r'\s*[-@,]\s*.+$', '', title)  # Remove after -, @, or ,
                title = re.sub(r'\s+at\s+.+$', '', title, flags=re.IGNORECASE)
                title = re.sub(r'\s+for\s+.+$', '', title, flags=re.IGNORECASE)
                title = title.strip()
                
                # Validate cleaned title
                if (5 <= len(title) <= 80 and 
                    any(kw in title.lower() for kw in job_title_keywords)):
                    return title
        
        # Fallback patterns
        first_lines_text = ' '.join(lines[:3]).strip()
        
        # "Job Title - Company"
        dash_match = re.search(r'^([^-]+?)\s*-', first_lines_text)
        if dash_match:
            potential_title = dash_match.group(1).strip()
            if any(kw in potential_title.lower() for kw in job_title_keywords):
                return potential_title
        
        return "Software Engineer"
    
    def _extract_company_name(self, text: str) -> str:
        """Extract company name with deduplication - TASK 1 FIX"""
        lines = text.split('\n')
        
        # Pattern 1: Look for explicit company introductions (most reliable)
        company_intro_patterns = [
            r'\b([A-Z][A-Za-z\s&.,]{2,40}?)\s+is\s+(?:looking|seeking|hiring|a)',
            r'(?:at|join|about)\s+([A-Z][A-Za-z\s&.,]{2,40}?)\s+(?:we|,|\.|!)',
            r'(?:company|organization):\s*([A-Z][A-Za-z\s&.,]{2,40}?)(?:\s|$)',
            r'\b([A-Z][A-Za-z\s&.,]{2,40}?)\s+(?:seeks|wants|needs)\s+',
        ]
        
        # Pattern 1: Look for explicit company introductions (most reliable)
        company_intro_patterns = [
            r'\b([A-Z][A-Za-z\s&.,]{2,25})\s+is\s+(?:looking|seeking|hiring)',
            r'(?:at|join|about)\s+([A-Z][A-Za-z\s&.,]{2,25})\s+(?:we|,|\.|!)',
            r'(?:company|organization):\s*([A-Z][A-Za-z\s&.,]{2,25})(?:\s|$)',
            r'\b([A-Z][A-Za-z\s&.,]{2,25})\s+(?:seeks|wants|needs)\s+',
        ]
        
        # Search line by line first for better accuracy
        for line in lines[:5]:
            line = line.strip()
            if not line:
                continue
                
            for pattern in company_intro_patterns:
                matches = re.findall(pattern, line, re.IGNORECASE)
                for match in matches:
                    company = match.strip()
                    # Remove duplicated words - TASK 1 FIX
                    company = self._deduplicate_company_name(company)
                    # Clean up common false positives from company names
                    company = self._clean_company_name(company)
                    if self._is_valid_company_name(company):
                        return company
        
        # Fall back to searching joined text for patterns that might span lines
        text_to_search = ' '.join(lines[:5])  # Search first 5 lines
        
        for pattern in company_intro_patterns:
            matches = re.findall(pattern, text_to_search, re.IGNORECASE)
            for match in matches:
                company = match.strip()
                # Remove duplicated words - TASK 1 FIX
                company = self._deduplicate_company_name(company)
                # Clean up common false positives from company names
                company = self._clean_company_name(company)
                if self._is_valid_company_name(company):
                    return company
        
        # Pattern 2: Extract from structured formats like "Job Title - Company Name"
        for line in lines[:3]:
            line = line.strip()
            if not line:
                continue
                
            # Match patterns like "Senior Developer - ABC Tech Company"
            dash_match = re.search(r'-\s*([A-Z][A-Za-z\s&.,]{2,40}?)(?:\s*$)', line)
            if dash_match:
                company = dash_match.group(1).strip()
                # Skip if this looks like part of job title
                if any(kw in company.lower() for kw in ['developer', 'engineer', 'analyst', 'manager', 'specialist', 'designer', 'architect']):
                    continue
                company = self._deduplicate_company_name(company)
                company = self._clean_company_name(company)
                if self._is_valid_company_name(company) and len(company) > 3:
                    return company
                    
            # Match patterns like "Senior Developer @ ABC Tech Company"  
            at_match = re.search(r'@\s*([A-Z][A-Za-z\s&.,]{2,40}?)(?:\s*$)', line)
            if at_match:
                company = at_match.group(1).strip()
                company = self._deduplicate_company_name(company)
                company = self._clean_company_name(company)
                if self._is_valid_company_name(company) and len(company) > 3:
                    return company
        
        return ""
    
    def _clean_company_name(self, company: str) -> str:
        """Clean company name from job title fragments and other issues"""
        # Remove job title keywords that might have been included
        job_keywords = [
            'developer', 'engineer', 'analyst', 'manager', 'designer', 
            'architect', 'specialist', 'coordinator', 'lead', 'senior',
            'junior', 'intern', 'associate', 'principal', 'director'
        ]
        
        words = company.split()
        filtered_words = []
        
        for word in words:
            # Skip standalone job title keywords
            if word.lower() not in job_keywords:
                filtered_words.append(word)
        
        # If we filtered everything, return original
        if not filtered_words:
            return company
            
        return ' '.join(filtered_words).strip()
    
    def _deduplicate_company_name(self, company: str) -> str:
        """Remove duplicated words from company name - TASK 1 FIX"""
        words = company.split()
        if len(words) <= 1:
            return company
            
        # Simple deduplication: remove consecutive duplicate words
        deduplicated_words = []
        prev_word = None
        
        for word in words:
            word_lower = word.lower()
            if prev_word is None or word_lower != prev_word.lower():
                deduplicated_words.append(word)
                prev_word = word
        
        # Also check for full sequence repetition like "ABC Tech Company ABC Tech Company"
        result = ' '.join(deduplicated_words)
        
        # Split by common company suffixes and check for repetition
        # Look for patterns where the same sequence appears twice
        for separator in [' Inc ', ' Corp ', ' Company ', ' LLC ', ' Ltd ']:
            if separator in result:
                parts = result.split(separator)
                if len(parts) == 2 and parts[0].strip() and not parts[1].strip():
                    # Pattern like "ABC Tech Company "
                    result = parts[0].strip() + separator.strip()
                    break
        
        # Check for exact half-repetition (like "ABC Tech ABC Tech")
        if len(deduplicated_words) >= 4 and len(deduplicated_words) % 2 == 0:
            mid = len(deduplicated_words) // 2
            first_half = deduplicated_words[:mid]
            second_half = deduplicated_words[mid:]
            if [w.lower() for w in first_half] == [w.lower() for w in second_half]:
                result = ' '.join(first_half)
        
        return result
    
    def _is_valid_company_name(self, company: str) -> bool:
        """Check if extracted text is likely a valid company name"""
        if not company or len(company.strip()) < 2:
            return False
            
        company = company.strip()
        
        # Too long to be a company name
        if len(company) > 100:
            return False
        
        # Should start with capital letter
        if not company[0].isupper():
            return False
        
        # Exclude common false positives
        false_positives = [
            'requirements', 'qualifications', 'responsibilities', 'experience',
            'skills', 'education', 'benefits', 'description', 'overview',
            'we are', 'you will', 'the ideal', 'successful candidate',
            'software engineer', 'senior developer', 'data analyst'
        ]
        
        if any(fp in company.lower() for fp in false_positives):
            return False
            
        # Should not be all uppercase (likely a section header)
        if company.isupper() and len(company) > 10:
            return False
            
        return True
    
    def _extract_technical_skills(self, text: str) -> List[str]:
        """Extract technical skills using whitelist/blacklist - TASK 2"""
        text_lower = text.lower()
        found_skills = set()  # Use set to avoid duplicates
        
        # Extract potential skills using word boundaries
        for skill in self.skills_whitelist:
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, text_lower):
                # Only add if not in blacklist
                if skill.lower() not in self.skills_blacklist:
                    found_skills.add(self._normalize_skill_name(skill))
        
        # Additional skill variations
        skill_variations = {
            'JavaScript': ['js', 'javascript', 'ecmascript'],
            'TypeScript': ['ts', 'typescript'],
            'Node.js': ['nodejs', 'node js', 'node.js'],
            'React': ['react', 'reactjs', 'react.js'],
            'Vue': ['vue', 'vuejs', 'vue.js'],
            'Angular': ['angular', 'angularjs', 'angular js'],
            'ASP.NET': ['asp.net', 'aspnet', 'asp net'],
            'C#': ['c#', 'csharp', 'c sharp'],
            'C++': ['c++', 'cpp', 'cplusplus'],
            'PostgreSQL': ['postgresql', 'postgres', 'psql'],
            'MongoDB': ['mongodb', 'mongo db', 'mongo'],
        }
        
        # Check for skill variations (prevent duplicates by checking if already added)
        for standard_name, variations in skill_variations.items():
            if standard_name not in found_skills:  # Only add if not already present
                for variation in variations:
                    pattern = r'\b' + re.escape(variation.lower()) + r'\b'
                    if re.search(pattern, text_lower):
                        if variation.lower() not in self.skills_blacklist:
                            found_skills.add(standard_name)
                            break
        
        # Convert to sorted list and remove duplicates
        result = sorted(list(set(found_skills)))
        
        # Final normalization pass to ensure consistency
        normalized_result = []
        for skill in result:
            normalized_skill = self._normalize_skill_name(skill)
            if normalized_skill not in normalized_result:
                normalized_result.append(normalized_skill)
        
        return normalized_result
    
    def _normalize_skill_name(self, skill: str) -> str:
        """Normalize skill names for consistency"""
        normalizations = {
            'javascript': 'JavaScript',
            'typescript': 'TypeScript', 
            'nodejs': 'Node.js',
            'reactjs': 'React',
            'vuejs': 'Vue',
            'angularjs': 'Angular',
            'postgresql': 'PostgreSQL',
            'mongodb': 'MongoDB',
            'mysql': 'MySQL',
            'asp.net': 'ASP.NET',
            '.net': '.NET',
            'c#': 'C#',
            'c++': 'C++',
        }
        
        skill_lower = skill.lower()
        return normalizations.get(skill_lower, skill.title())
    
    def _categorize_skills(self, text: str, all_skills: List[str]) -> Tuple[List[str], List[str]]:
        """Categorize skills as required vs preferred"""
        text_lower = text.lower()
        
        required_skills = []
        preferred_skills = []
        
        # Find sections
        sections = self._identify_sections(text)
        
        for skill in all_skills:
            skill_lower = skill.lower()
            
            # Check context around skill mentions
            skill_contexts = self._find_skill_contexts(text, skill_lower)
            
            required_indicators = [
                'required', 'must have', 'essential', 'mandatory', 'minimum',
                'proficient', 'proficiency', 'expertise', 'experience with'
            ]
            
            preferred_indicators = [
                'preferred', 'nice to have', 'bonus', 'plus', 'desirable'
            ]
            
            is_preferred = False
            for context in skill_contexts:
                context_lower = context.lower()
                if any(indicator in context_lower for indicator in preferred_indicators):
                    is_preferred = True
                    break
            
            if is_preferred:
                preferred_skills.append(skill)
            else:
                required_skills.append(skill)
        
        return required_skills, preferred_skills
    
    def _identify_sections(self, text: str) -> Dict[str, str]:
        """Identify major sections in the job description"""
        sections = {}
        lines = text.split('\n')
        
        current_section = None
        section_content = []
        
        # Section header patterns
        section_headers = {
            'requirements': r'^(?:requirements?|qualifications?|must haves?|required skills?)[:]*\s*$',
            'preferred': r'^(?:preferred|nice to haves?|bonus|plus|ideal|desired)[:]*\s*$',
            'responsibilities': r'^(?:responsibilities?|duties|you will|role)[:]*\s*$',
            'skills': r'^(?:skills?|technical skills?)[:]*\s*$',
        }
        
        for line in lines:
            line_stripped = line.strip()
            
            found_section = None
            for section_name, pattern in section_headers.items():
                if re.match(pattern, line_stripped, re.IGNORECASE):
                    found_section = section_name
                    break
            
            if found_section:
                if current_section and section_content:
                    sections[current_section] = '\n'.join(section_content).strip()
                
                current_section = found_section
                section_content = []
            elif current_section:
                section_content.append(line_stripped)
        
        if current_section and section_content:
            sections[current_section] = '\n'.join(section_content).strip()
        
        return sections
    
    def _find_skill_contexts(self, text: str, skill: str) -> List[str]:
        """Find contexts where a skill is mentioned"""
        contexts = []
        sentences = re.split(r'[.!?]+\s+|[\n\r]+', text)
        
        for i, sentence in enumerate(sentences):
            if skill in sentence.lower():
                context_start = max(0, i - 1)
                context_end = min(len(sentences), i + 2)
                context = ' '.join(sentences[context_start:context_end])
                contexts.append(context)
        
        return contexts
    
    def _extract_technologies(self, text: str) -> List[str]:
        """Extract specific technologies (subset of skills focusing on tools/platforms)"""
        tech_categories = ['databases', 'cloud_platforms', 'tools', 'methodologies']
        technologies = set()
        text_lower = text.lower()
        
        # Map of technology categories from whitelist
        tech_mapping = {
            # Databases
            'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'sqlite',
            # Cloud & DevOps
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'terraform',
            # Tools
            'git', 'github', 'gitlab', 'jira', 'postman', 'webpack'
        }
        
        for tech in tech_mapping:
            if tech in self.skills_whitelist:
                pattern = r'\b' + re.escape(tech.lower()) + r'\b'
                if re.search(pattern, text_lower):
                    technologies.add(self._normalize_skill_name(tech))
        
        return sorted(list(technologies))
    
    def _extract_experience_requirements(self, text: str) -> str:
        """Extract experience requirements"""
        text_lower = text.lower()
        
        for pattern in self.experience_patterns:
            match = re.search(pattern, text_lower)
            if match:
                return match.group(0).title()
        
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
        
        # Education patterns
        education_patterns = [
            r'(?:bachelor|master|phd|doctorate).*?(?:degree|in).*?(?=\n|$|\.)',
            r'(?:bs|ba|ms|ma|mba|ph\.?d).*?(?=\n|$|\.)',
        ]
        
        for pattern in education_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches[:3]:  # Limit to top 3
                cleaned = match.strip().title()
                if len(cleaned) > 10 and cleaned not in education_reqs:
                    education_reqs.append(cleaned)
        
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
            for match in matches:
                cleaned = match.strip()
                if len(cleaned) > 15 and not any(blacklisted in cleaned.lower() 
                                               for blacklisted in ['skill', 'requirement', 'qualification']):
                    responsibilities.append(cleaned)
        
        return responsibilities[:10]  # Limit to top 10
    
    def _extract_benefits(self, text: str) -> List[str]:
        """Extract job benefits"""
        benefits_section = ""
        lines = text.split('\n')
        
        in_benefits_section = False
        for line in lines:
            if re.match(r'^(?:benefits|perks|what we offer)[:]*\s*$', line.strip(), re.IGNORECASE):
                in_benefits_section = True
                continue
            elif in_benefits_section and re.match(r'^[A-Z][A-Z\s]+[:]*\s*$', line.strip()):
                break  # End of benefits section
            elif in_benefits_section:
                benefits_section += line + '\n'
        
        # Extract bullet points from benefits section
        benefits = []
        if benefits_section:
            bullet_matches = re.findall(r'[•\-\*]\s*([^\n\r]+)', benefits_section)
            for match in bullet_matches[:8]:  # Limit to 8 benefits
                cleaned = match.strip()
                if len(cleaned) > 5:
                    benefits.append(cleaned)
        
        return benefits