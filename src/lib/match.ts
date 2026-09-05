import type { SkillEntry, Internship } from '@/types';

const SKILL_ALIASES: Record<string, string[]> = {
  python: ['django', 'flask', 'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'selenium', 'r'],
  javascript: ['react', 'node', 'node.js', 'vue', 'angular', 'typescript', 'redux', 'express', 'html/css'],
  react: ['javascript', 'redux', 'typescript', 'frontend', 'html/css'],
  'node.js': ['javascript', 'express', 'backend', 'rest apis', 'api'],
  java: ['spring boot', 'hibernate', 'android', 'kotlin', 'selenium'],
  sql: ['postgresql', 'mysql', 'database', 'mongodb'],
  'c++': ['data structures', 'algorithms', 'competitive programming', 'opengl'],
  'machine learning': ['deep learning', 'nlp', 'statistics', 'data analysis', 'tensorflow'],
  docker: ['kubernetes', 'devops', 'ci/cd', 'jenkins', 'cloud computing'],
  aws: ['cloud computing', 'docker', 'kubernetes', 'devops'],
  git: ['version control', 'github'],
  'rest apis': ['api', 'node.js', 'backend', 'microservices'],
  'data structures': ['algorithms', 'problem solving', 'c++', 'java'],
  testing: ['selenium', 'jenkins', 'qa', 'automation'],
  communication: ['leadership', 'teamwork', 'project management'],
  leadership: ['communication', 'teamwork', 'project management'],
  teamwork: ['communication', 'leadership'],
};

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function isAdjacent(skillA: string, skillB: string): boolean {
  const a = normalize(skillA);
  const b = normalize(skillB);
  if (a === b) return false;
  const aliases = SKILL_ALIASES[a];
  if (aliases && aliases.includes(b)) return true;
  const reverseAliases = SKILL_ALIASES[b];
  if (reverseAliases && reverseAliases.includes(a)) return true;
  return false;
}

export function computeMatchScore(
  studentSkills: SkillEntry[],
  requiredSkills: string[]
): number {
  if (requiredSkills.length === 0) return 0;

  let totalWeight = 0;
  let achievedWeight = 0;

  for (const required of requiredSkills) {
    const reqNorm = normalize(required);
    totalWeight += 100;

    // Direct match: use proficiency score
    const directMatch = studentSkills.find(
      (s) => normalize(s.skill) === reqNorm
    );
    if (directMatch) {
      achievedWeight += directMatch.score;
      continue;
    }

    // Adjacent match: partial credit (50% of the adjacent skill's proficiency)
    const adjacentMatch = studentSkills.find(
      (s) => isAdjacent(required, s.skill)
    );
    if (adjacentMatch) {
      achievedWeight += Math.round(adjacentMatch.score * 0.5);
      continue;
    }

    // No match: 0 credit
  }

  return Math.round((achievedWeight / totalWeight) * 100);
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
