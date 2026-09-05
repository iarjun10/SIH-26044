export type UserRole = 'student' | 'industry' | 'institution';

export type ApplicationStatus = 'applied' | 'shortlisted' | 'selected' | 'rejected';

export type InternshipStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string;
  organization_name: string;
  created_at: string;
}

export interface SkillEntry {
  skill: string;
  score: number;
}

export interface StudentSkills {
  id: string;
  student_id: string;
  skills: SkillEntry[];
  gaps: string[];
  total_score: number;
  updated_at: string;
}

export interface Internship {
  id: string;
  company_id: string;
  title: string;
  description: string;
  required_skills: string[];
  duration: string;
  stipend: string;
  location: string;
  status: InternshipStatus;
  created_at: string;
}

export interface Application {
  id: string;
  student_id: string;
  internship_id: string;
  status: ApplicationStatus;
  match_score: number;
  cover_letter: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationWithDetails extends Application {
  internship?: Internship;
  student_profile?: Profile;
  student_skills?: StudentSkills;
}

export interface StatusHistory {
  id: string;
  application_id: string;
  status: ApplicationStatus;
  changed_by: string | null;
  created_at: string;
}

export interface InterviewSlot {
  id: string;
  application_id: string;
  proposed_by: string;
  scheduled_time: string;
  selected: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_id: string | null;
  read: boolean;
  created_at: string;
}

export interface VerifiedSkill {
  id: string;
  student_id: string;
  skill: string;
  verified_score: number;
  verified_at: string;
}

export interface SkillRating {
  skill: string;
  rating: number;
}

export interface IndustryFeedback {
  id: string;
  application_id: string;
  student_id: string;
  skill_ratings: SkillRating[];
  overall_rating: number;
  comments: string;
  created_at: string;
}

export interface Bookmark {
  id: string;
  student_id: string;
  internship_id: string;
  created_at: string;
}

// ============================================================
// AI LAYER TYPES
// ============================================================

export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type VerificationStatus = 'claimed' | 'assessed' | 'verified';

export type SkillSource = 'resume' | 'assessment' | 'verified' | 'manual' | 'resume+assessment';

export type SkillCategory =
  | 'Programming'
  | 'AI/ML'
  | 'Data Science'
  | 'Web Development'
  | 'Mobile Development'
  | 'Cloud'
  | 'Cybersecurity'
  | 'Database'
  | 'Research'
  | 'Communication'
  | 'Management'
  | 'Ayush/Healthcare'
  | 'Other';

export interface ResumeEducation {
  degree: string;
  institution: string;
  year: string;
  specialization: string;
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
}

export interface ResumeCertification {
  name: string;
  issuer: string;
  year: string;
}

export interface ResumeInternship {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface ResumeResearch {
  title: string;
  description: string;
}

export interface ResumeWorkExperience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface ResumeExtraction {
  name: string;
  email: string;
  phone: string;
  education: ResumeEducation[];
  degree: string;
  specialization: string;
  technical_skills: string[];
  programming_languages: string[];
  frameworks: string[];
  tools: string[];
  ai_ml_skills: string[];
  domain_skills: string[];
  ayush_healthcare_skills: string[];
  soft_skills: string[];
  projects: ResumeProject[];
  certifications: ResumeCertification[];
  internships: ResumeInternship[];
  research_experience: ResumeResearch[];
  work_experience: ResumeWorkExperience[];
  achievements: string[];
}

export interface ResumeAnalysis {
  id: string;
  student_id: string;
  file_path: string;
  file_name: string;
  extracted_data: ResumeExtraction;
  raw_text: string;
  created_at: string;
  updated_at: string;
}

export interface AISkillProfileEntry {
  id: string;
  student_id: string;
  skill: string;
  category: SkillCategory;
  proficiency_level: ProficiencyLevel;
  score: number;
  confidence: number;
  source: SkillSource;
  verification_status: VerificationStatus;
  last_assessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AIQuestionType = 'mcq' | 'conceptual' | 'coding' | 'scenario' | 'short_answer';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface AIAssessmentQuestion {
  id: number;
  question: string;
  type: AIQuestionType;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  maxScore: number;
  userAnswer?: string;
}

export interface AIAssessmentResult {
  totalScore: number;
  proficiencyLevel: ProficiencyLevel;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  questionResults: Array<{
    questionId: number;
    userAnswer: string;
    correct: boolean;
    score: number;
    feedback: string;
  }>;
}

export interface AIAssessment {
  id: string;
  student_id: string;
  skill: string;
  difficulty: Difficulty;
  question_type: AIQuestionType;
  questions: AIAssessmentQuestion[];
  score: number;
  proficiency_level: ProficiencyLevel;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  created_at: string;
}
