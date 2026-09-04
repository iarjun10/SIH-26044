/*
# Skill Bridge — Database Schema

## Overview
Creates the full schema for the Skill Bridge platform: a role-based skill
assessment and internship matching system with three user roles
(Student, Industry, Institution).

## New Tables
1. **profiles** — extends auth.users with role, name, organization info.
   Auto-populated via trigger on signup.
2. **institutions** — institution-specific data linked to a profile.
3. **student_skills** — skill assessment results (JSONB skills array + gaps).
4. **internships** — postings by industry users with required_skills tags.
5. **applications** — student applications with status and match_score.
6. **application_status_history** — audit trail of status changes.

## Security (RLS)
- profiles: all authenticated can SELECT; users modify only their own row.
- institutions: all authenticated can SELECT; institution users manage their own.
- student_skills: students CRUD their own; industry/institution can SELECT all.
- internships: all authenticated SELECT; industry users INSERT/UPDATE/DELETE own.
- applications: students see/insert own; industry/institution SELECT all;
  industry can UPDATE status for their own internships; students can DELETE own.
- application_status_history: SELECT same as applications; INSERT via trigger only.

## Triggers
- handle_new_user: auto-creates a profiles row on auth.users INSERT.
- log_initial_status: records 'applied' in history on application INSERT.
- log_status_change: records status changes in history on application UPDATE.
- update_updated_at: auto-updates updated_at on applications and student_skills.
*/

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'industry', 'institution')),
  phone text DEFAULT '',
  organization_name text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============================================================
-- 2. INSTITUTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  location text DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "institutions_select_all" ON public.institutions;
CREATE POLICY "institutions_select_all"
  ON public.institutions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "institutions_insert_own" ON public.institutions;
CREATE POLICY "institutions_insert_own"
  ON public.institutions FOR INSERT
  TO authenticated WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'institution'
    )
  );

DROP POLICY IF EXISTS "institutions_update_own" ON public.institutions;
CREATE POLICY "institutions_update_own"
  ON public.institutions FOR UPDATE
  TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "institutions_delete_own" ON public.institutions;
CREATE POLICY "institutions_delete_own"
  ON public.institutions FOR DELETE
  TO authenticated USING (profile_id = auth.uid());

-- ============================================================
-- 3. STUDENT_SKILLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid(),
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_score numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_skills_select" ON public.student_skills;
CREATE POLICY "student_skills_select"
  ON public.student_skills FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('industry', 'institution')
    )
  );

DROP POLICY IF EXISTS "student_skills_insert_own" ON public.student_skills;
CREATE POLICY "student_skills_insert_own"
  ON public.student_skills FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student_skills_update_own" ON public.student_skills;
CREATE POLICY "student_skills_update_own"
  ON public.student_skills FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student_skills_delete_own" ON public.student_skills;
CREATE POLICY "student_skills_delete_own"
  ON public.student_skills FOR DELETE
  TO authenticated USING (student_id = auth.uid());

-- ============================================================
-- 4. INTERNSHIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  required_skills text[] NOT NULL DEFAULT '{}',
  duration text NOT NULL DEFAULT '',
  stipend text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "internships_select_all" ON public.internships;
CREATE POLICY "internships_select_all"
  ON public.internships FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "internships_insert_industry" ON public.internships;
CREATE POLICY "internships_insert_industry"
  ON public.internships FOR INSERT
  TO authenticated WITH CHECK (
    company_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'industry'
    )
  );

DROP POLICY IF EXISTS "internships_update_own" ON public.internships;
CREATE POLICY "internships_update_own"
  ON public.internships FOR UPDATE
  TO authenticated USING (company_id = auth.uid()) WITH CHECK (company_id = auth.uid());

DROP POLICY IF EXISTS "internships_delete_own" ON public.internships;
CREATE POLICY "internships_delete_own"
  ON public.internships FOR DELETE
  TO authenticated USING (company_id = auth.uid());

-- ============================================================
-- 5. APPLICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid(),
  internship_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'shortlisted', 'selected', 'rejected')),
  match_score numeric NOT NULL DEFAULT 0,
  cover_letter text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_select" ON public.applications;
CREATE POLICY "applications_select"
  ON public.applications FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('industry', 'institution')
    )
  );

DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
CREATE POLICY "applications_insert_own"
  ON public.applications FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "applications_update" ON public.applications;
CREATE POLICY "applications_update"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.internships i
      WHERE i.id = applications.internship_id AND i.company_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.internships i
      WHERE i.id = applications.internship_id AND i.company_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "applications_delete_own" ON public.applications;
CREATE POLICY "applications_delete_own"
  ON public.applications FOR DELETE
  TO authenticated USING (student_id = auth.uid());

-- ============================================================
-- 6. APPLICATION_STATUS_HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'applied',
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history_select" ON public.application_status_history;
CREATE POLICY "history_select"
  ON public.application_status_history FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_status_history.application_id
      AND (
        a.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('industry', 'institution')
        )
      )
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_student_skills_student ON public.student_skills(student_id);
CREATE INDEX IF NOT EXISTS idx_internships_company ON public.internships(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_student ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_internship ON public.applications(internship_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_history_application ON public.application_status_history(application_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, organization_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'organization_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Log initial 'applied' status on application creation
CREATE OR REPLACE FUNCTION public.log_initial_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.application_status_history (application_id, status, changed_by)
  VALUES (NEW.id, NEW.status, NEW.student_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_application_created ON public.applications;
CREATE TRIGGER on_application_created
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.log_initial_status();

-- Log status changes on application update
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.application_status_history (application_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_application_status_change ON public.applications;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_applications_updated_at ON public.applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_student_skills_updated_at ON public.student_skills;
CREATE TRIGGER update_student_skills_updated_at
  BEFORE UPDATE ON public.student_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();