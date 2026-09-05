import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { generateAssessment, evaluateAssessment } from '@/lib/aiSkills';
import type { AIAssessmentQuestion, AIAssessmentResult, Difficulty, AIQuestionType, SkillEntry } from '@/types';
import { ChevronLeft, ChevronRight, CircleCheck as CheckCircle2, Loader as Loader2, Brain, CircleAlert as AlertCircle, Trophy, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';

interface AIAssessmentPanelProps {
  skills: SkillEntry[];
  onComplete: () => void;
}

export function AIAssessmentPanel({ skills, onComplete }: AIAssessmentPanelProps) {
  const { profile } = useAuth();
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [questionType, setQuestionType] = useState<AIQuestionType>('mcq');
  const [phase, setPhase] = useState<'config' | 'loading' | 'taking' | 'evaluating' | 'results'>('config');
  const [questions, setQuestions] = useState<AIAssessmentQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<AIAssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!profile || !selectedSkill) return;
    setPhase('loading');
    setError(null);

    const { questions: generated, error: genError } = await generateAssessment(
      profile.id, selectedSkill, difficulty, questionType
    );

    if (genError) {
      setError(genError);
      setPhase('config');
      return;
    }

    if (generated.length === 0) {
      setError('No questions were generated. Please try again.');
      setPhase('config');
      return;
    }

    setQuestions(generated);
    setAnswers(new Array(generated.length).fill(''));
    setCurrentQ(0);
    setPhase('taking');
  };

  const handleAnswer = (answer: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = answer;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!profile || !selectedSkill) return;
    setPhase('evaluating');
    setError(null);

    const { result: evalResult, error: evalError } = await evaluateAssessment(
      profile.id, selectedSkill, difficulty, questionType, questions, answers
    );

    if (evalError || !evalResult) {
      setError(evalError ?? 'Evaluation failed');
      setPhase('taking');
      return;
    }

    setResult(evalResult);
    setPhase('results');
  };

  const handleReset = () => {
    setPhase('config');
    setQuestions([]);
    setAnswers([]);
    setResult(null);
    setError(null);
    setCurrentQ(0);
  };

  const allAnswered = answers.every((a) => a.trim().length > 0);

  if (phase === 'config') {
    const skillOptions = skills.map((s) => s.skill).sort();

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">AI-Powered Assessment</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Generate a custom assessment for any skill. The AI creates questions based on your profile, evaluates your answers, and provides detailed feedback.
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Skill to Assess</label>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Select a skill...</option>
              {skillOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Question Type</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as AIQuestionType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500"
              >
                <option value="mcq">Multiple Choice</option>
                <option value="conceptual">Conceptual</option>
                <option value="coding">Coding</option>
                <option value="scenario">Scenario-Based</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!selectedSkill}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Brain className="w-4 h-4" /> Generate AI Assessment
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'evaluating') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">
          {phase === 'loading' ? 'AI is generating custom questions...' : 'AI is evaluating your answers...'}
        </p>
      </div>
    );
  }

  if (phase === 'taking') {
    const q = questions[currentQ];
    const progress = ((currentQ + 1) / questions.length) * 100;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">AI Assessment: {selectedSkill}</h3>
          <span className="text-xs text-slate-400 ml-auto">{difficulty} · {questionType}</span>
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Question {currentQ + 1} of {questions.length}</span>
            <span className="text-sm text-slate-400">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mb-6">
          <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full mb-3">
            {q.type} · {q.maxScore} pts
          </span>
          <h2 className="text-base font-semibold text-slate-900">{q.question}</h2>
        </div>

        <div className="space-y-2.5">
          {q.options ? (
            q.options.map((option, idx) => {
              const selected = answers[currentQ] === option;
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${selected ? 'text-indigo-700' : 'text-slate-700'}`}>{option}</span>
                    {selected && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                  </div>
                </button>
              );
            })
          ) : (
            <textarea
              value={answers[currentQ] ?? ''}
              onChange={(e) => handleAnswer(e.target.value)}
              rows={5}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm resize-none"
            />
          )}
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={() => currentQ > 0 && setCurrentQ(currentQ - 1)}
            disabled={currentQ === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          {currentQ === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" /> Submit Assessment
            </button>
          ) : (
            <button
              onClick={() => setCurrentQ(currentQ + 1)}
              disabled={!answers[currentQ]?.trim()}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'results' && result) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
          <Trophy className={`w-14 h-14 mx-auto mb-3 ${result.totalScore >= 70 ? 'text-green-500' : result.totalScore >= 40 ? 'text-amber-500' : 'text-red-400'}`} />
          <h3 className="text-lg font-bold text-slate-900">Assessment Complete</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">{result.totalScore}<span className="text-lg text-slate-400">/100</span></p>
          <p className="text-sm text-slate-500 mt-1">Proficiency: <span className="font-medium text-slate-700">{result.proficiencyLevel}</span></p>
          <p className="text-xs text-slate-400 mt-1">{selectedSkill} · {difficulty} · {questionType}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.strengths.length > 0 && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <h4 className="text-sm font-semibold text-green-900">Strengths</h4>
              </div>
              <ul className="space-y-1">
                {result.strengths.map((s, i) => <li key={i} className="text-xs text-green-700 flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />{s}</li>)}
              </ul>
            </div>
          )}
          {result.weaknesses.length > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <h4 className="text-sm font-semibold text-red-900">Weaknesses</h4>
              </div>
              <ul className="space-y-1">
                {result.weaknesses.map((w, i) => <li key={i} className="text-xs text-red-700 flex items-start gap-1.5"><AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{w}</li>)}
              </ul>
            </div>
          )}
        </div>

        {result.recommendations.length > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-blue-900">Recommendations</h4>
            </div>
            <ul className="space-y-1">
              {result.recommendations.map((r, i) => <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5"><Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />{r}</li>)}
            </ul>
          </div>
        )}

        {result.questionResults.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Question Feedback</h4>
            <div className="space-y-2">
              {result.questionResults.map((qr, i) => (
                <div key={i} className={`p-3 rounded-lg border ${qr.correct ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">Q{qr.questionId}</span>
                    <span className={`text-xs font-bold ${qr.correct ? 'text-green-600' : 'text-red-600'}`}>{qr.score}/{questions[i]?.maxScore ?? 20}</span>
                  </div>
                  <p className="text-xs text-slate-500">{qr.feedback}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleReset} className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors">
            Take Another Assessment
          </button>
          <button onClick={onComplete} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors">
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}
