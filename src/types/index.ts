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
