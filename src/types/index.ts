export type UserRole = 'student' | 'industry' | 'institution';

export type ApplicationStatus = 'applied' | 'shortlisted' | 'selected' | 'rejected';

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
