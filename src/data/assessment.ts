import type { SkillEntry } from '@/types';

export interface AssessmentQuestion {
  id: number;
  skill: string;
  question: string;
  options: { label: string; score: number }[];
}

export const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: 1,
    skill: 'Python',
    question: 'How would you rate your Python programming ability?',
    options: [
      { label: 'No experience', score: 0 },
      { label: 'Basic scripts and automation', score: 40 },
      { label: 'Built projects with frameworks like Django/Flask', score: 70 },
      { label: 'Advanced — libraries, decorators, async', score: 90 },
    ],
  },
  {
    id: 2,
    skill: 'JavaScript',
    question: 'How comfortable are you with JavaScript?',
    options: [
      { label: 'Never used it', score: 0 },
      { label: 'Basic DOM manipulation', score: 40 },
      { label: 'Built frontend apps with React/Vue', score: 70 },
      { label: 'Full-stack with Node.js, async patterns', score: 90 },
    ],
  },
  {
    id: 3,
    skill: 'SQL',
    question: 'How would you rate your SQL and database skills?',
    options: [
      { label: 'No experience', score: 0 },
      { label: 'Basic SELECT/INSERT queries', score: 40 },
      { label: 'Joins, subqueries, indexing', score: 70 },
      { label: 'Query optimization, schema design', score: 90 },
    ],
  },
  {
    id: 4,
    skill: 'Data Structures',
    question: 'How well do you understand data structures (arrays, trees, graphs)?',
    options: [
      { label: 'Not familiar', score: 0 },
      { label: 'Know basic arrays and lists', score: 40 },
      { label: 'Trees, hash maps, stacks/queues', score: 70 },
      { label: 'Graphs, heaps, advanced structures', score: 90 },
    ],
  },
  {
    id: 5,
    skill: 'Problem Solving',
    question: 'Rate your problem-solving and algorithmic thinking:',
    options: [
      { label: 'Struggle with logic problems', score: 0 },
      { label: 'Can solve basic problems', score: 40 },
      { label: 'Comfortable with medium-level challenges', score: 70 },
      { label: 'Competitive programming level', score: 90 },
    ],
  },
  {
    id: 6,
    skill: 'Machine Learning',
    question: 'How would you rate your Machine Learning knowledge?',
    options: [
      { label: 'No experience', score: 0 },
      { label: 'Know the concepts', score: 40 },
      { label: 'Built models with scikit-learn/TensorFlow', score: 70 },
      { label: 'Deep learning, NLP, or computer vision', score: 90 },
    ],
  },
  {
    id: 7,
    skill: 'Cloud Computing',
    question: 'How familiar are you with cloud platforms (AWS, GCP, Azure)?',
    options: [
      { label: 'Never used cloud services', score: 0 },
      { label: 'Used basic services (EC2, S3)', score: 40 },
      { label: 'Deployed apps, used multiple services', score: 70 },
      { label: 'Architecture, IAM, infrastructure as code', score: 90 },
    ],
  },
  {
    id: 8,
    skill: 'React',
    question: 'How would you rate your React skills?',
    options: [
      { label: 'No experience', score: 0 },
      { label: 'Built simple components', score: 40 },
      { label: 'Hooks, state management, routing', score: 70 },
      { label: 'Performance optimization, custom hooks', score: 90 },
    ],
  },
  {
    id: 9,
    skill: 'Communication',
    question: 'How would you rate your verbal and written communication?',
    options: [
      { label: 'Prefer to work alone, limited communication', score: 0 },
      { label: 'Can communicate when needed', score: 40 },
      { label: 'Comfortable presenting and documenting', score: 70 },
      { label: 'Excellent — public speaking, technical writing', score: 90 },
    ],
  },
  {
    id: 10,
    skill: 'Teamwork',
    question: 'How do you work in a team setting?',
    options: [
      { label: 'Prefer solo work', score: 0 },
      { label: 'Can collaborate on tasks', score: 40 },
      { label: 'Active contributor in team projects', score: 70 },
      { label: 'Lead and coordinate team efforts', score: 90 },
    ],
  },
  {
    id: 11,
    skill: 'Git',
    question: 'How proficient are you with Git version control?',
    options: [
      { label: 'Never used Git', score: 0 },
      { label: 'Basic commit/push/pull', score: 40 },
      { label: 'Branching, merging, pull requests', score: 70 },
      { label: 'Rebasing, conflict resolution, CI integration', score: 90 },
    ],
  },
  {
    id: 12,
    skill: 'REST APIs',
    question: 'How well do you understand REST API design?',
    options: [
      { label: 'No experience', score: 0 },
      { label: 'Can consume APIs', score: 40 },
      { label: 'Can design and build REST endpoints', score: 70 },
      { label: 'Authentication, rate limiting, best practices', score: 90 },
    ],
  },
  {
    id: 13,
    skill: 'Docker',
    question: 'How would you rate your Docker and containerization skills?',
    options: [
      { label: 'Never used Docker', score: 0 },
      { label: 'Can run containers from images', score: 40 },
      { label: 'Write Dockerfiles, docker-compose', score: 70 },
      { label: 'Multi-stage builds, orchestration', score: 90 },
    ],
  },
  {
    id: 14,
    skill: 'Leadership',
    question: 'How would you rate your leadership abilities?',
    options: [
      { label: 'No leadership experience', score: 0 },
      { label: 'Led small group tasks', score: 40 },
      { label: 'Managed projects and mentored peers', score: 70 },
      { label: 'Led teams, made strategic decisions', score: 90 },
    ],
  },
  {
    id: 15,
    skill: 'Testing',
    question: 'How familiar are you with software testing?',
    options: [
      { label: 'No testing experience', score: 0 },
      { label: 'Manual testing', score: 40 },
      { label: 'Unit tests with Jest/pytest', score: 70 },
      { label: 'Integration, E2E, CI/CD pipelines', score: 90 },
    ],
  },
];

export function computeSkillProfile(answers: Record<number, number>): {
  skills: SkillEntry[];
  gaps: string[];
  totalScore: number;
} {
  const skills: SkillEntry[] = assessmentQuestions.map((q) => ({
    skill: q.skill,
    score: answers[q.id] ?? 0,
  }));

  const gaps = skills.filter((s) => s.score < 50).map((s) => s.skill);
  const totalScore = Math.round(
    skills.reduce((sum, s) => sum + s.score, 0) / skills.length
  );

  return { skills, gaps, totalScore };
}
