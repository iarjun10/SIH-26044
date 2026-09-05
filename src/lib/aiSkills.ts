import { supabase } from '@/lib/supabase';
import type {
  ResumeExtraction,
  AISkillProfileEntry,
  AIAssessmentQuestion,
  AIAssessmentResult,
  AIQuestionType,
  Difficulty,
} from '@/types';
import { normalizeSkillList, scoreToProficiency, inferScoreFromContext } from '@/lib/skillNormalization';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

// ============================================================
// RESUME ANALYSIS
// ============================================================

export async function analyzeResume(
  filePath: string,
  fileName: string,
  studentId: string
): Promise<{ extraction: ResumeExtraction; error: string | null }> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/ai-resume-analyzer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ filePath, fileName, studentId }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { extraction: emptyExtraction(), error: errData.error ?? `Analysis failed (${response.status})` };
    }

    const data = await response.json();
    if (!data.extraction) {
      return { extraction: emptyExtraction(), error: 'No extraction data returned' };
    }

    return { extraction: data.extraction as ResumeExtraction, error: null };
  } catch (err) {
    return {
      extraction: emptyExtraction(),
      error: err instanceof Error ? err.message : 'Network error during analysis',
    };
  }
}

function emptyExtraction(): ResumeExtraction {
  return {
    name: '', email: '', phone: '', education: [], degree: '', specialization: '',
    technical_skills: [], programming_languages: [], frameworks: [], tools: [],
    ai_ml_skills: [], domain_skills: [], ayush_healthcare_skills: [], soft_skills: [],
    projects: [], certifications: [], internships: [], research_experience: [],
    work_experience: [], achievements: [],
  };
}

// ============================================================
// AI SKILL PROFILE SYNC
// ============================================================

export async function syncResumeSkillsToProfile(
  studentId: string,
  extraction: ResumeExtraction
): Promise<{ synced: number; error: string | null }> {
  const allRawSkills = [
    ...extraction.technical_skills,
    ...extraction.programming_languages,
    ...extraction.frameworks,
    ...extraction.tools,
    ...extraction.ai_ml_skills,
    ...extraction.domain_skills,
    ...extraction.ayush_healthcare_skills,
    ...extraction.soft_skills,
  ];

  if (allRawSkills.length === 0) {
    return { synced: 0, error: null };
  }

  const normalized = normalizeSkillList(allRawSkills);

  const contextStrings = [
    ...extraction.projects.map((p) => `${p.name} ${p.description} ${p.technologies.join(' ')}`),
    ...extraction.certifications.map((c) => `${c.name} ${c.issuer} certified`),
    ...extraction.internships.map((i) => `${i.role} ${i.description}`),
    ...extraction.work_experience.map((w) => `${w.role} ${w.description}`),
    ...extraction.research_experience.map((r) => `${r.title} ${r.description}`),
  ];

  // Fetch existing AI skill profile
  const { data: existing } = await supabase
    .from('ai_skill_profile')
    .select('*')
    .eq('student_id', studentId);

  const existingMap = new Map<string, AISkillProfileEntry>();
  (existing as AISkillProfileEntry[] | null)?.forEach((e) => {
    existingMap.set(e.skill.toLowerCase(), e);
  });

  const toUpsert: Array<{
    student_id: string;
    skill: string;
    category: string;
    proficiency_level: string;
    score: number;
    confidence: number;
    source: string;
    verification_status: string;
    last_assessed_at: string | null;
  }> = [];

  for (const norm of normalized) {
    const existingEntry = existingMap.get(norm.canonical.toLowerCase());
    const inferredScore = inferScoreFromContext(norm.canonical, contextStrings);

    if (existingEntry) {
      // Don't downgrade an assessed or verified skill
      if (existingEntry.verification_status === 'verified') {
        continue;
      }
      if (existingEntry.verification_status === 'assessed' && existingEntry.source === 'assessment') {
        // Merge: resume + assessment
        const mergedScore = Math.round((existingEntry.score + inferredScore) / 2);
        toUpsert.push({
          student_id: studentId,
          skill: norm.canonical,
          category: norm.category,
          proficiency_level: scoreToProficiency(mergedScore),
          score: mergedScore,
          confidence: Math.min(existingEntry.confidence + 10, 95),
          source: 'resume+assessment',
          verification_status: existingEntry.verification_status,
          last_assessed_at: existingEntry.last_assessed_at,
        });
        continue;
      }
    }

    // New skill from resume — claimed status
    toUpsert.push({
      student_id: studentId,
      skill: norm.canonical,
      category: norm.category,
      proficiency_level: scoreToProficiency(inferredScore),
      score: inferredScore,
      confidence: 60,
      source: 'resume',
      verification_status: 'claimed',
      last_assessed_at: null,
    });
  }

  if (toUpsert.length === 0) {
    return { synced: 0, error: null };
  }

  const { error } = await supabase
    .from('ai_skill_profile')
    .upsert(toUpsert, { onConflict: 'student_id,skill' });

  if (error) {
    return { synced: 0, error: error.message };
  }

  return { synced: toUpsert.length, error: null };
}

// ============================================================
// AI ASSESSMENT — GENERATE
// ============================================================

export async function generateAssessment(
  studentId: string,
  skill: string,
  difficulty: Difficulty,
  questionType: AIQuestionType,
  careerGoal?: string,
  domain?: string
): Promise<{ questions: AIAssessmentQuestion[]; error: string | null }> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/ai-assessment-generator`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'generate',
        studentId,
        skill,
        difficulty,
        questionType,
        careerGoal,
        domain,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { questions: [], error: errData.error ?? `Generation failed (${response.status})` };
    }

    const data = await response.json();
    if (!data.questions || !Array.isArray(data.questions)) {
      return { questions: [], error: 'Invalid question format returned' };
    }

    return { questions: data.questions as AIAssessmentQuestion[], error: null };
  } catch (err) {
    return {
      questions: [],
      error: err instanceof Error ? err.message : 'Network error during question generation',
    };
  }
}

// ============================================================
// AI ASSESSMENT — EVALUATE
// ============================================================

export async function evaluateAssessment(
  studentId: string,
  skill: string,
  difficulty: Difficulty,
  questionType: AIQuestionType,
  questions: AIAssessmentQuestion[],
  userAnswers: string[]
): Promise<{ result: AIAssessmentResult | null; error: string | null }> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/ai-assessment-generator`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'evaluate',
        studentId,
        skill,
        difficulty,
        questionType,
        questions,
        userAnswers,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { result: null, error: errData.error ?? `Evaluation failed (${response.status})` };
    }

    const data = await response.json();
    if (data.totalScore === undefined || data.totalScore === null) {
      return { result: null, error: 'Invalid evaluation result' };
    }

    const result: AIAssessmentResult = {
      totalScore: data.totalScore,
      proficiencyLevel: data.proficiencyLevel,
      strengths: data.strengths ?? [],
      weaknesses: data.weaknesses ?? [],
      recommendations: data.recommendations ?? [],
      questionResults: data.questionResults ?? [],
    };

    // Update the ai_skill_profile with the assessed score
    await updateSkillProfileFromAssessment(studentId, skill, result.totalScore, result.proficiencyLevel);

    return { result, error: null };
  } catch (err) {
    return {
      result: null,
      error: err instanceof Error ? err.message : 'Network error during evaluation',
    };
  }
}

async function updateSkillProfileFromAssessment(
  studentId: string,
  skill: string,
  score: number,
  proficiencyLevel: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('ai_skill_profile')
    .select('*')
    .eq('student_id', studentId)
    .eq('skill', skill)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    const entry = existing as AISkillProfileEntry;
    // If verified, don't downgrade
    if (entry.verification_status === 'verified') return;

    const newSource = entry.source === 'resume' || entry.source === 'resume+assessment' ? 'resume+assessment' : 'assessment';
    const newScore = entry.verification_status === 'assessed' && entry.source !== 'resume'
      ? Math.round((entry.score + score) / 2)
      : score;

    await supabase
      .from('ai_skill_profile')
      .update({
        score: newScore,
        proficiency_level: proficiencyLevel,
        confidence: Math.min(entry.confidence + 20, 95),
        source: newSource,
        verification_status: 'assessed',
        last_assessed_at: now,
      })
      .eq('id', entry.id);
  } else {
    await supabase
      .from('ai_skill_profile')
      .insert({
        student_id: studentId,
        skill,
        category: 'Other',
        proficiency_level: proficiencyLevel,
        score,
        confidence: 75,
        source: 'assessment',
        verification_status: 'assessed',
        last_assessed_at: now,
      });
  }
}

// ============================================================
// FETCH AI SKILL PROFILE
// ============================================================

export async function fetchAISkillProfile(studentId: string): Promise<AISkillProfileEntry[]> {
  const { data } = await supabase
    .from('ai_skill_profile')
    .select('*')
    .eq('student_id', studentId)
    .order('score', { ascending: false });

  return (data as AISkillProfileEntry[]) ?? [];
}

// ============================================================
// FETCH RESUME ANALYSIS
// ============================================================

export async function fetchLatestResumeAnalysis(studentId: string): Promise<ResumeExtraction | null> {
  const { data } = await supabase
    .from('resume_analysis')
    .select('extracted_data')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.extracted_data as ResumeExtraction) ?? null;
}

// ============================================================
// SKILL VERIFICATION LOGIC
// ============================================================

export interface SkillVerificationSummary {
  skill: string;
  claimedScore: number | null;
  assessedScore: number | null;
  verifiedScore: number | null;
  finalScore: number;
  confidence: number;
  status: 'claimed' | 'assessed' | 'verified';
  source: string;
}

export function buildSkillVerificationSummary(
  aiProfile: AISkillProfileEntry[],
  verifiedSkills: Array<{ skill: string; verified_score: number }>,
  studentSkills: Array<{ skill: string; score: number }>
): SkillVerificationSummary[] {
  const allSkills = new Set<string>();
  aiProfile.forEach((e) => allSkills.add(e.skill));
  verifiedSkills.forEach((v) => allSkills.add(v.skill));
  studentSkills.forEach((s) => allSkills.add(s.skill));

  const aiMap = new Map<string, AISkillProfileEntry>();
  aiProfile.forEach((e) => aiMap.set(e.skill.toLowerCase(), e));

  const verifiedMap = new Map<string, number>();
  verifiedSkills.forEach((v) => verifiedMap.set(v.skill.toLowerCase(), v.verified_score));

  const studentMap = new Map<string, number>();
  studentSkills.forEach((s) => studentMap.set(s.skill.toLowerCase(), s.score));

  const results: SkillVerificationSummary[] = [];

  for (const skill of allSkills) {
    const aiEntry = aiMap.get(skill.toLowerCase());
    const verifiedScore = verifiedMap.get(skill.toLowerCase()) ?? null;
    const claimedScore = studentMap.get(skill.toLowerCase()) ?? null;

    let status: 'claimed' | 'assessed' | 'verified' = 'claimed';
    let finalScore = 0;
    let confidence = 50;
    let source = 'manual';

    if (verifiedScore !== null) {
      status = 'verified';
      finalScore = verifiedScore;
      confidence = 90;
      source = 'verified';
    } else if (aiEntry && aiEntry.verification_status === 'assessed') {
      status = 'assessed';
      finalScore = aiEntry.score;
      confidence = aiEntry.confidence;
      source = aiEntry.source;
    } else if (aiEntry) {
      status = aiEntry.verification_status;
      finalScore = aiEntry.score;
      confidence = aiEntry.confidence;
      source = aiEntry.source;
    } else if (claimedScore !== null) {
      status = 'claimed';
      finalScore = claimedScore;
      confidence = 40;
      source = 'assessment';
    }

    results.push({
      skill,
      claimedScore,
      assessedScore: aiEntry?.score ?? null,
      verifiedScore,
      finalScore,
      confidence,
      status,
      source,
    });
  }

  return results.sort((a, b) => b.finalScore - a.finalScore);
}
