/*
# Skill Bridge — AI Skill Foundation

## Overview
Adds the database tables needed for the AI-powered student skill layer:
1. resume_analysis — stores structured JSON extracted from a student's resume by the AI edge function
2. ai_skill_profile — per-skill rows with category, proficiency, confidence, source, verification status
3. ai_assessments — AI-generated assessment sessions with questions, answers, scores, and evaluation

## New Tables
1. **resume_analysis**
   - student_id (uuid, owner)
   - file_path (text, storage path)
   - file_name (text)
   - extracted_data (jsonb — structured resume content: name, education, skills, projects, etc.)
   - raw_text (text — extracted plain text for debugging)
   - created_at, updated_at
2. **ai_skill_profile**
   - student_id (uuid, owner)
   - skill (text, normalized canonical name)
   - category (text — Programming, AI/ML, Data Science, Web Dev, etc.)
   - proficiency_level (text — Beginner/Intermediate/Advanced/Expert)
   - score (integer 0-100)
   - confidence (integer 0-100 — how confident the AI is in this assessment)
   - source (text — resume, assessment, verified, manual)
   - verification_status (text — claimed, assessed, verified)
   - last_assessed_at (timestamptz)
   - UNIQUE(student_id, skill)
3. **ai_assessments**
   - student_id (uuid, owner)
   - skill (text — which skill the assessment targeted)
   - difficulty (text — beginner/intermediate/advanced)
   - question_type (text — mcq/conceptual/coding/scenario/short_answer)
   - questions (jsonb — array of {question, options, correctAnswer, userAnswer})
   - score (integer 0-100)
   - proficiency_level (text)
   - strengths (jsonb — array of strings)
   - weaknesses (jsonb — array of strings)
   - recommendations (jsonb — array of strings)
   - created_at

## Security (RLS)
- All three tables: students CRUD their own data; industry/institution can SELECT (for matching/analytics)
- Standard 4-policy pattern per table (SELECT/INSERT/UPDATE/DELETE)

## Notes
- These tables complement (do not replace) the existing student_skills table
- ai_skill_profile is the unified view that merges resume-extracted + assessment-verified skills
- The existing verified_skills table feeds into verification_status='verified'
*/

-- ============================================================
-- 1. RESUME_ANALYSIS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.resume_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid(),
  file_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resume_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resume_analysis_select" ON public.resume_analysis;
CREATE POLICY "resume_analysis_select"
  ON public.resume_analysis FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('industry', 'institution')
    )
  );

DROP POLICY IF EXISTS "resume_analysis_insert_own" ON public.resume_analysis;
CREATE POLICY "resume_analysis_insert_own"
  ON public.resume_analysis FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "resume_analysis_update_own" ON public.resume_analysis;
CREATE POLICY "resume_analysis_update_own"
  ON public.resume_analysis FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "resume_analysis_delete_own" ON public.resume_analysis;
CREATE POLICY "resume_analysis_delete_own"
  ON public.resume_analysis FOR DELETE
  TO authenticated USING (student_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_resume_analysis_student ON public.resume_analysis(student_id);

-- ============================================================
-- 2. AI_SKILL_PROFILE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_skill_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid(),
  skill text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  proficiency_level text NOT NULL DEFAULT 'Beginner'
    CHECK (proficiency_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  confidence integer NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('resume', 'assessment', 'verified', 'manual', 'resume+assessment')),
  verification_status text NOT NULL DEFAULT 'claimed'
    CHECK (verification_status IN ('claimed', 'assessed', 'verified')),
  last_assessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, skill)
);

ALTER TABLE public.ai_skill_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_skill_profile_select" ON public.ai_skill_profile;
CREATE POLICY "ai_skill_profile_select"
  ON public.ai_skill_profile FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('industry', 'institution')
    )
  );

DROP POLICY IF EXISTS "ai_skill_profile_insert_own" ON public.ai_skill_profile;
CREATE POLICY "ai_skill_profile_insert_own"
  ON public.ai_skill_profile FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "ai_skill_profile_update_own" ON public.ai_skill_profile;
CREATE POLICY "ai_skill_profile_update_own"
  ON public.ai_skill_profile FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "ai_skill_profile_delete_own" ON public.ai_skill_profile;
CREATE POLICY "ai_skill_profile_delete_own"
  ON public.ai_skill_profile FOR DELETE
  TO authenticated USING (student_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_skill_profile_student ON public.ai_skill_profile(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_skill_profile_skill ON public.ai_skill_profile(skill);

-- ============================================================
-- 3. AI_ASSESSMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid(),
  skill text NOT NULL,
  difficulty text NOT NULL DEFAULT 'intermediate'
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  question_type text NOT NULL DEFAULT 'mcq'
    CHECK (question_type IN ('mcq', 'conceptual', 'coding', 'scenario', 'short_answer')),
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  proficiency_level text NOT NULL DEFAULT 'Beginner'
    CHECK (proficiency_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_assessments_select" ON public.ai_assessments;
CREATE POLICY "ai_assessments_select"
  ON public.ai_assessments FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('industry', 'institution')
    )
  );

DROP POLICY IF EXISTS "ai_assessments_insert_own" ON public.ai_assessments;
CREATE POLICY "ai_assessments_insert_own"
  ON public.ai_assessments FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "ai_assessments_update_own" ON public.ai_assessments;
CREATE POLICY "ai_assessments_update_own"
  ON public.ai_assessments FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "ai_assessments_delete_own" ON public.ai_assessments;
CREATE POLICY "ai_assessments_delete_own"
  ON public.ai_assessments FOR DELETE
  TO authenticated USING (student_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_assessments_student ON public.ai_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_assessments_skill ON public.ai_assessments(skill);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
DROP TRIGGER IF EXISTS update_resume_analysis_updated_at ON public.resume_analysis;
CREATE TRIGGER update_resume_analysis_updated_at
  BEFORE UPDATE ON public.resume_analysis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_ai_skill_profile_updated_at ON public.ai_skill_profile;
CREATE TRIGGER update_ai_skill_profile_updated_at
  BEFORE UPDATE ON public.ai_skill_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
