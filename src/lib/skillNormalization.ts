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

export interface SkillNormalizationResult {
  canonical: string;
  category: SkillCategory;
}

const SKILL_CATEGORIES: Record<string, SkillCategory> = {
  // Programming
  python: 'Programming', java: 'Programming', javascript: 'Programming', typescript: 'Programming',
  'c++': 'Programming', 'c': 'Programming', 'c#': 'Programming', 'go': 'Programming',
  rust: 'Programming', kotlin: 'Programming', swift: 'Programming', ruby: 'Programming',
  php: 'Programming', scala: 'Programming', r: 'Programming', matlab: 'Programming',
  'data structures': 'Programming', algorithms: 'Programming', 'problem solving': 'Programming',
  git: 'Programming', 'version control': 'Programming',

  // AI/ML
  'machine learning': 'AI/ML', 'deep learning': 'AI/ML', nlp: 'AI/ML',
  'natural language processing': 'AI/ML', 'computer vision': 'AI/ML',
  tensorflow: 'AI/ML', pytorch: 'AI/ML', 'scikit-learn': 'AI/ML', sklearn: 'AI/ML',
  'neural networks': 'AI/ML', 'generative ai': 'AI/ML', 'llm': 'AI/ML',
  'large language models': 'AI/ML', 'transformers': 'AI/ML', 'reinforcement learning': 'AI/ML',
  'model deployment': 'AI/ML', 'prompt engineering': 'AI/ML',

  // Data Science
  'data analysis': 'Data Science', 'data visualization': 'Data Science',
  'data science': 'Data Science', statistics: 'Data Science', pandas: 'Data Science',
  numpy: 'Data Science', tableau: 'Data Science', 'power bi': 'Data Science',
  'excel': 'Data Science', 'data mining': 'Data Science', 'data engineering': 'Data Science',
  etl: 'Data Science', 'big data': 'Data Science', spark: 'Data Science',
  hadoop: 'Data Science', 'apache kafka': 'Data Science',

  // Web Development
  react: 'Web Development', 'react.js': 'Web Development', vue: 'Web Development',
  'vue.js': 'Web Development', angular: 'Web Development', 'next.js': 'Web Development',
  'node.js': 'Web Development', node: 'Web Development', express: 'Web Development',
  'express.js': 'Web Development', django: 'Web Development', flask: 'Web Development',
  'fastapi': 'Web Development', 'spring boot': 'Web Development', 'html/css': 'Web Development',
  html: 'Web Development', css: 'Web Development', 'tailwind': 'Web Development',
  'tailwind css': 'Web Development', bootstrap: 'Web Development',
  'rest apis': 'Web Development', 'api': 'Web Development', graphql: 'Web Development',
  redux: 'Web Development', 'frontend': 'Web Development', 'backend': 'Web Development',
  'full stack': 'Web Development', 'microservices': 'Web Development',

  // Mobile Development
  'android': 'Mobile Development', 'ios': 'Mobile Development', flutter: 'Mobile Development',
  'react native': 'Mobile Development', 'mobile development': 'Mobile Development',
  'xamarin': 'Mobile Development', 'ionic': 'Mobile Development',

  // Cloud
  'cloud computing': 'Cloud', aws: 'Cloud', 'amazon web services': 'Cloud',
  gcp: 'Cloud', 'google cloud': 'Cloud', azure: 'Cloud',
  'microsoft azure': 'Cloud', docker: 'Cloud', kubernetes: 'Cloud',
  devops: 'Cloud', 'ci/cd': 'Cloud', jenkins: 'Cloud',
  'infrastructure as code': 'Cloud', terraform: 'Cloud', 'serverless': 'Cloud',

  // Cybersecurity
  'cybersecurity': 'Cybersecurity', 'security': 'Cybersecurity',
  'penetration testing': 'Cybersecurity', 'ethical hacking': 'Cybersecurity',
  'network security': 'Cybersecurity', 'information security': 'Cybersecurity',
  'owasp': 'Cybersecurity', 'cryptography': 'Cybersecurity',

  // Database
  sql: 'Database', postgresql: 'Database', mysql: 'Database',
  mongodb: 'Database', redis: 'Database', 'database': 'Database',
  'database management': 'Database', sqlite: 'Database',
  'oracle': 'Database', 'cassandra': 'Database', 'elasticsearch': 'Database',

  // Research
  'research': 'Research', 'research experience': 'Research',
  'academic research': 'Research', 'paper writing': 'Research',
  'literature review': 'Research', 'publication': 'Research',

  // Communication
  'communication': 'Communication', 'written communication': 'Communication',
  'verbal communication': 'Communication', 'presentation': 'Communication',
  'public speaking': 'Communication', 'technical writing': 'Communication',

  // Management
  'leadership': 'Management', 'teamwork': 'Management', 'project management': 'Management',
  'agile': 'Management', 'scrum': 'Management', 'team management': 'Management',
  'time management': 'Management', 'product management': 'Management',

  // Ayush/Healthcare
  'ayurveda': 'Ayush/Healthcare', 'yoga': 'Ayush/Healthcare', 'unani': 'Ayush/Healthcare',
  'siddha': 'Ayush/Healthcare', 'homeopathy': 'Ayush/Healthcare',
  'healthcare': 'Ayush/Healthcare', 'public health': 'Ayush/Healthcare',
  'medical': 'Ayush/Healthcare', 'pharma': 'Ayush/Healthcare',
  'clinical research': 'Ayush/Healthcare',
};

const SKILL_ALIASES: Record<string, string> = {
  // Canonical mapping: alias -> canonical name
  'ml': 'Machine Learning',
  'machine learning': 'Machine Learning',
  'nlp': 'Natural Language Processing',
  'natural language processing': 'Natural Language Processing',
  'python programming': 'Python',
  'python3': 'Python',
  'py': 'Python',
  'react.js': 'React',
  'reactjs': 'React',
  'react.js developer': 'React',
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'js': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'c++': 'C++',
  'cpp': 'C++',
  'c sharp': 'C#',
  'c#': 'C#',
  'gcp': 'Google Cloud',
  'google cloud platform': 'Google Cloud',
  'amazon web services': 'AWS',
  'amazon s3': 'AWS',
  'amazon ec2': 'AWS',
  'k8s': 'Kubernetes',
  'docker containers': 'Docker',
  'kotlin android': 'Kotlin',
  'scikit-learn': 'scikit-learn',
  'sklearn': 'scikit-learn',
  'tf': 'TensorFlow',
  'pytorch': 'PyTorch',
  'torch': 'PyTorch',
  'html/css': 'HTML/CSS',
  'html5': 'HTML/CSS',
  'css3': 'HTML/CSS',
  'tailwind': 'Tailwind CSS',
  'tailwindcss': 'Tailwind CSS',
  'rest api': 'REST APIs',
  'restful apis': 'REST APIs',
  'rest apis': 'REST APIs',
  'rest': 'REST APIs',
  'api design': 'REST APIs',
  'ui/ux': 'UI/UX Design',
  'ui/ux design': 'UI/UX Design',
  'ux design': 'UI/UX Design',
  'ui design': 'UI/UX Design',
  'data structure': 'Data Structures',
  'data structures and algorithms': 'Data Structures',
  'dsa': 'Data Structures',
  'algorithms and data structures': 'Data Structures',
  'ds': 'Data Structures',
  'problem solving skills': 'Problem Solving',
  'competitive programming': 'Problem Solving',
  'gen ai': 'Generative AI',
  'genai': 'Generative AI',
  'generative artificial intelligence': 'Generative AI',
  'large language model': 'Large Language Models',
  'llms': 'Large Language Models',
  'ci cd': 'CI/CD',
  'cicd': 'CI/CD',
  'ci/cd pipeline': 'CI/CD',
  'postgres': 'PostgreSQL',
  'postgres sql': 'PostgreSQL',
  'mongo db': 'MongoDB',
  'powerbi': 'Power BI',
  'power-bi': 'Power BI',
  'data analytics': 'Data Analysis',
  'data analyst': 'Data Analysis',
  'ms excel': 'Excel',
  'microsoft excel': 'Excel',
  'spring-boot': 'Spring Boot',
  'spring framework': 'Spring Boot',
  'dev ops': 'DevOps',
  'agile methodology': 'Agile',
  'scrum master': 'Agile',
};

function normalizeKey(s: string): string {
  return s.toLowerCase().trim();
}

export function normalizeSkill(rawName: string): SkillNormalizationResult {
  const key = normalizeKey(rawName);

  // Check direct canonical mapping
  if (SKILL_ALIASES[key]) {
    const canonical = SKILL_ALIASES[key];
    return {
      canonical,
      category: getSkillCategory(canonical),
    };
  }

  // Check if it's already a canonical name in the category map
  if (SKILL_CATEGORIES[key]) {
    return {
      canonical: toTitleCase(rawName),
      category: SKILL_CATEGORIES[key],
    };
  }

  // Check partial matches in aliases
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    if (key.includes(alias) || alias.includes(key)) {
      return {
        canonical,
        category: getSkillCategory(canonical),
      };
    }
  }

  // Unknown skill — return title-cased original
  return {
    canonical: toTitleCase(rawName),
    category: getSkillCategory(toTitleCase(rawName)),
  };
}

function getSkillCategory(canonicalName: string): SkillCategory {
  const key = normalizeKey(canonicalName);
  return SKILL_CATEGORIES[key] ?? 'Other';
}

function toTitleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 1) return word.toUpperCase();
      // Handle special cases
      const lower = word.toLowerCase();
      if (['ai', 'ml', 'ui', 'ux', 'api', 'apis', 'sql', 'css', 'html', 'ios', 'aws', 'gcp', 'nlp', 'etl'].includes(lower)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function normalizeSkillList(skills: string[]): SkillNormalizationResult[] {
  const seen = new Set<string>();
  const results: SkillNormalizationResult[] = [];

  for (const skill of skills) {
    const normalized = normalizeSkill(skill);
    const key = normalized.canonical.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push(normalized);
    }
  }

  return results;
}

export function scoreToProficiency(score: number): 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' {
  if (score >= 90) return 'Expert';
  if (score >= 70) return 'Advanced';
  if (score >= 40) return 'Intermediate';
  return 'Beginner';
}

export function inferScoreFromContext(skill: string, context: string[]): number {
  // Infer a base score from context: resume projects, certifications, etc.
  let score = 50;

  for (const ctx of context) {
    const lower = ctx.toLowerCase();
    const skillLower = skill.toLowerCase();
    if (lower.includes(skillLower)) {
      if (lower.includes('project') || lower.includes('built') || lower.includes('developed')) {
        score = Math.max(score, 65);
      }
      if (lower.includes('certif') || lower.includes('certified')) {
        score = Math.max(score, 70);
      }
      if (lower.includes('advanced') || lower.includes('expert') || lower.includes('senior')) {
        score = Math.max(score, 80);
      }
      if (lower.includes('intermediate') || lower.includes('moderate')) {
        score = Math.max(score, 55);
      }
    }
  }

  return Math.min(score, 85);
}

export const ALL_CATEGORIES: SkillCategory[] = [
  'Programming',
  'AI/ML',
  'Data Science',
  'Web Development',
  'Mobile Development',
  'Cloud',
  'Cybersecurity',
  'Database',
  'Research',
  'Communication',
  'Management',
  'Ayush/Healthcare',
  'Other',
];
