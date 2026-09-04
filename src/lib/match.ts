import type { SkillEntry, Internship } from '@/types';

export function computeMatchScore(
  studentSkills: SkillEntry[],
  requiredSkills: string[]
): number {
  if (requiredSkills.length === 0) return 0;
  const studentSkillNames = studentSkills.map((s) => s.skill.toLowerCase());
  const matched = requiredSkills.filter((req) =>
    studentSkillNames.includes(req.toLowerCase())
  );
  return Math.round((matched.length / requiredSkills.length) * 100);
}

export function rankInternshipsByMatch(
  studentSkills: SkillEntry[],
  internships: Internship[]
): Array<Internship & { matchScore: number }> {
  return internships
    .map((internship) => ({
      ...internship,
      matchScore: computeMatchScore(studentSkills, internship.required_skills),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
}
