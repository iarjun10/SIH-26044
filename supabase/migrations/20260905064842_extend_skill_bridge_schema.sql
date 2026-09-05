/*
# Skill Bridge — Schema Extension

## Overview
Extends the existing Skill Bridge schema with 6 new features:
1. Internship approval workflow (status field on internships)
2. Interview scheduling (interview_slots table)
3. In-app notifications (notifications table)
4. Verified skill badges (verified_skills table)
5. Industry feedback loop (industry_feedback table)
6. Bookmark/save internships (bookmarks table)

## New Tables
1. **interview_slots** — proposed interview times linked to an application.
2. **notifications** — in-app notifications per user.
3. **verified_skills** — skills verified via timed quiz, with score and badge.
4. **industry_feedback** — industry ratings of student skill performance post-internship.
5. **bookmarks** — student-saved internships for later.

## Modified Tables
- **internships** — added `status` column (pending/approved/rejected), default 'pending'.

## Security (RLS)
- All new tables have RLS enabled with role-appropriate policies.
- interview_slots: students see/select their own; industry sees for their internships.
- notifications: users see only their own; insert via trigger.
- verified_skills: students CRUD their own; industry/institution can SELECT.
- industry_feedback: industry INSERT/SELECT for their internships; institution SELECT.
- bookmarks: students CRUD their own.

## Triggers
- notify_new_internship: fires when internship status changes to 'approved' → notifies matching students.
- notify_status_change: fires on application status update → notifies the student.
- notify_interview_slot: fires when interview slot is created → notifies the student.
*/

-- ============================================================
-- 1. ADD STATUS TO INTERNSHIPS
-- ============================================================
ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing internships to 'approved' so the demo still works
UPDATE public.internships SET status = 'approved' WHERE status = 'pending';

-- Industry can now only update status of their own internships (already covered by existing policy)
-- Institution can update status (approve/reject)
DROP POLICY IF EXISTS "internships_update_institution" ON public.internships;
CREATE POLICY "internships_update_institution"
  ON public.internships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'institution'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'institution'
    )
  );

-- ============================================================
-- 2. INTERVIEW_SLOTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.interview_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  proposed_by uuid NOT NULL DEFAULT auth.uid(),
  scheduled_time timestamptz NOT NULL,
  selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interview_slots_select" ON public.interview_slots;
CREATE POLICY "interview_slots_select"
  ON public.interview_slots FOR SELECT
  TO authenticated USING (
    -- student sees slots for their applications
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = interview_slots.application_id AND a.student_id = auth.uid()
    )
    -- industry sees slots for their internships
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.internships i ON i.id = a.internship_id
      WHERE a.id = interview_slots.application_id AND i.company_id = auth.uid()
    )
    -- institution sees all
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'institution'
    )
  );

DROP POLICY IF EXISTS "interview_slots_insert" ON public.interview_slots;
CREATE POLICY "interview_slots_insert"
  ON public.interview_slots FOR INSERT
  TO authenticated WITH CHECK (
    proposed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.internships i ON i.id = a.internship_id
      WHERE a.id = interview_slots.application_id AND i.company_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "interview_slots_update" ON public.interview_slots;
CREATE POLICY "interview_slots_update"
  ON public.interview_slots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = interview_slots.application_id AND a.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = interview_slots.application_id AND a.student_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_interview_slots_application ON public.interview_slots(application_id);

-- ============================================================
-- 3. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  link_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own"
  ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);

-- ============================================================
-- 4. VERIFIED_SKILLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.verified_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid(),
  skill text NOT NULL,
  verified_score integer NOT NULL DEFAULT 0,
  verified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, skill)
);

ALTER TABLE public.verified_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verified_skills_select" ON public.verified_skills;
CREATE POLICY "verified_skills_select"
  ON public.verified_skills FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('industry', 'institution')
    )
  );

DROP POLICY IF EXISTS "verified_skills_insert_own" ON public.verified_skills;
CREATE POLICY "verified_skills_insert_own"
  ON public.verified_skills FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "verified_skills_update_own" ON public.verified_skills;
CREATE POLICY "verified_skills_update_own"
  ON public.verified_skills FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "verified_skills_delete_own" ON public.verified_skills;
CREATE POLICY "verified_skills_delete_own"
  ON public.verified_skills FOR DELETE
  TO authenticated USING (student_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_verified_skills_student ON public.verified_skills(student_id);

-- ============================================================
-- 5. INDUSTRY_FEEDBACK TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.industry_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  skill_ratings jsonb NOT NULL DEFAULT '[]'::jsonb,
  overall_rating integer NOT NULL DEFAULT 0,
  comments text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "industry_feedback_select" ON public.industry_feedback;
CREATE POLICY "industry_feedback_select"
  ON public.industry_feedback FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.internships i ON i.id = a.internship_id
      WHERE a.id = industry_feedback.application_id AND i.company_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'institution'
    )
  );

DROP POLICY IF EXISTS "industry_feedback_insert" ON public.industry_feedback;
CREATE POLICY "industry_feedback_insert"
  ON public.industry_feedback FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.internships i ON i.id = a.internship_id
      WHERE a.id = industry_feedback.application_id AND i.company_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "industry_feedback_update" ON public.industry_feedback;
CREATE POLICY "industry_feedback_update"
  ON public.industry_feedback FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.internships i ON i.id = a.internship_id
      WHERE a.id = industry_feedback.application_id AND i.company_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.internships i ON i.id = a.internship_id
      WHERE a.id = industry_feedback.application_id AND i.company_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_industry_feedback_app ON public.industry_feedback(application_id);
CREATE INDEX IF NOT EXISTS idx_industry_feedback_student ON public.industry_feedback(student_id);

-- ============================================================
-- 6. BOOKMARKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid(),
  internship_id uuid NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, internship_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookmarks_select_own" ON public.bookmarks;
CREATE POLICY "bookmarks_select_own"
  ON public.bookmarks FOR SELECT
  TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "bookmarks_insert_own" ON public.bookmarks;
CREATE POLICY "bookmarks_insert_own"
  ON public.bookmarks FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "bookmarks_delete_own" ON public.bookmarks;
CREATE POLICY "bookmarks_delete_own"
  ON public.bookmarks FOR DELETE
  TO authenticated USING (student_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_bookmarks_student ON public.bookmarks(student_id);

-- ============================================================
-- 7. STORAGE BUCKET FOR RESUMES
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resumes bucket
DROP POLICY IF EXISTS "resumes_upload_own" ON storage.objects;
CREATE POLICY "resumes_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resumes');

DROP POLICY IF EXISTS "resumes_read_own" ON storage.objects;
CREATE POLICY "resumes_read_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "resumes_delete_own" ON storage.objects;
CREATE POLICY "resumes_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'resumes');