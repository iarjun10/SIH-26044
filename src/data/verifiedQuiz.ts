export interface VerifiedQuizQuestion {
  skill: string;
  question: string;
  options: string[];
  correctIndex: number;
  timeLimit: number; // seconds
}

export const verifiedQuizQuestions: VerifiedQuizQuestion[] = [
  {
    skill: 'Python',
    question: 'Which of the following is the correct way to create a dictionary in Python?',
    options: ['dict = {}', 'dict = []', 'dict = ()', 'dict = <>'],
    correctIndex: 0,
    timeLimit: 30,
  },
  {
    skill: 'JavaScript',
    question: 'What does "===" check in JavaScript?',
    options: ['Value only', 'Value and type', 'Type only', 'Reference only'],
    correctIndex: 1,
    timeLimit: 30,
  },
  {
    skill: 'SQL',
    question: 'Which SQL clause is used to filter rows returned by a query?',
    options: ['ORDER BY', 'GROUP BY', 'WHERE', 'HAVING'],
    correctIndex: 2,
    timeLimit: 30,
  },
  {
    skill: 'Data Structures',
    question: 'What is the time complexity of inserting an element at the beginning of an array?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctIndex: 2,
    timeLimit: 30,
  },
  {
    skill: 'Problem Solving',
    question: 'A train travels 60 km in 45 minutes. What is its speed in km/h?',
    options: ['45 km/h', '60 km/h', '75 km/h', '80 km/h'],
    correctIndex: 3,
    timeLimit: 45,
  },
  {
    skill: 'Machine Learning',
    question: 'Which algorithm is best suited for a classification problem with non-linear boundaries?',
    options: ['Linear Regression', 'K-Nearest Neighbors', 'K-Means Clustering', 'Apriori'],
    correctIndex: 1,
    timeLimit: 30,
  },
  {
    skill: 'Cloud Computing',
    question: 'What does IaaS stand for in cloud computing?',
    options: ['Internet as a Service', 'Infrastructure as a Service', 'Integration as a Service', 'Information as a Service'],
    correctIndex: 1,
    timeLimit: 30,
  },
  {
    skill: 'React',
    question: 'Which hook is used to manage state in a functional React component?',
    options: ['useEffect', 'useState', 'useContext', 'useRef'],
    correctIndex: 1,
    timeLimit: 30,
  },
  {
    skill: 'Communication',
    question: 'In a formal email, which closing is most appropriate?',
    options: ['Cheers!', 'See ya!', 'Best regards,', 'Later!'],
    correctIndex: 2,
    timeLimit: 20,
  },
  {
    skill: 'Teamwork',
    question: 'When a team member disagrees with your approach, the best first step is to:',
    options: ['Insist on your approach', 'Listen to their reasoning', 'Escalate to manager', 'Ignore the disagreement'],
    correctIndex: 1,
    timeLimit: 25,
  },
  {
    skill: 'Git',
    question: 'Which Git command creates a new branch and switches to it?',
    options: ['git branch <name>', 'git checkout -b <name>', 'git switch <name>', 'git create <name>'],
    correctIndex: 1,
    timeLimit: 30,
  },
  {
    skill: 'REST APIs',
    question: 'Which HTTP method is idempotent and used to update a resource?',
    options: ['POST', 'GET', 'PUT', 'PATCH'],
    correctIndex: 2,
    timeLimit: 30,
  },
  {
    skill: 'Docker',
    question: 'What file is used to define a Docker image?',
    options: ['docker.yaml', 'Dockerfile', 'docker.config', 'image.docker'],
    correctIndex: 1,
    timeLimit: 30,
  },
  {
    skill: 'Leadership',
    question: 'A team is demotivated after a project setback. What is the most effective leadership response?',
    options: ['Reassign team members', 'Acknowledge the setback and refocus on next steps', 'Cancel the project', 'Work overtime to compensate'],
    correctIndex: 1,
    timeLimit: 30,
  },
  {
    skill: 'Testing',
    question: 'What type of testing verifies individual functions in isolation?',
    options: ['Integration testing', 'E2E testing', 'Unit testing', 'Smoke testing'],
    correctIndex: 2,
    timeLimit: 30,
  },
];
