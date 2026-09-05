import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { VerifiedSkill } from '@/types';
import { verifiedQuizQuestions } from '@/data/verifiedQuiz';
import { BadgeCheck, Clock, X, CheckCircle2, Loader2, Lock } from 'lucide-react';

interface VerifiedSkillBadgeProps {
  skillName: string;
  verifiedSkills: VerifiedSkill[];
  onVerified: () => void;
}

export function VerifiedSkillBadge({ skillName, verifiedSkills, onVerified }: VerifiedSkillBadgeProps) {
  const { profile } = useAuth();
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const quiz = verifiedQuizQuestions.find(
    (q) => q.skill.toLowerCase() === skillName.toLowerCase()
  );
  const verified = verifiedSkills.find(
    (v) => v.skill.toLowerCase() === skillName.toLowerCase()
  );

  useEffect(() => {
    if (showQuiz && quiz && timeLeft > 0 && result === null) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setResult('timeout');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [showQuiz, quiz, timeLeft, result]);

  const startQuiz = () => {
    if (!quiz) return;
    setShowQuiz(true);
    setSelectedAnswer(null);
    setResult(null);
    setTimeLeft(quiz.timeLimit);
  };

  const handleSubmit = async () => {
    if (selectedAnswer === null || !quiz || !profile) return;
    setSubmitting(true);
    const isCorrect = selectedAnswer === quiz.correctIndex;

    if (isCorrect) {
      const score = Math.round((timeLeft / quiz.timeLimit) * 40 + 60);
      const { error } = await supabase
        .from('verified_skills')
        .upsert({
          student_id: profile.id,
          skill: skillName,
          verified_score: score,
          verified_at: new Date().toISOString(),
        }, { onConflict: 'student_id,skill' });

      if (!error) {
        setResult('correct');
        onVerified();
      }
    } else {
      setResult('wrong');
    }
    setSubmitting(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const closeQuiz = () => {
    setShowQuiz(false);
    setSelectedAnswer(null);
    setResult(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200" title={`Verified: ${verified.verified_score}/100`}>
        <BadgeCheck className="w-3 h-3" />
        {skillName} <span className="text-indigo-400 font-normal">· {verified.verified_score}</span>
      </span>
    );
  }

  if (!quiz) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md" title="No verification quiz available for this skill">
        <Lock className="w-3 h-3" />
        {skillName}
      </span>
    );
  }

  return (
    <>
      <button
        onClick={startQuiz}
        className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md hover:bg-amber-50 hover:text-amber-700 transition-colors border border-transparent hover:border-amber-200"
        title="Take a timed quiz to verify this skill"
      >
        <BadgeCheck className="w-3 h-3 text-slate-400" />
        {skillName}
      </button>

      {showQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={closeQuiz}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Verify: {skillName}</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1 text-sm font-medium ${timeLeft <= 10 ? 'text-red-500' : 'text-slate-500'}`}>
                  <Clock className="w-4 h-4" /> {timeLeft}s
                </span>
                <button onClick={closeQuiz} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5">
              {result === null ? (
                <>
                  <p className="text-sm text-slate-700 mb-4">{quiz.question}</p>
                  <div className="space-y-2">
                    {quiz.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedAnswer(idx)}
                        className={`w-full text-left p-3 rounded-lg border-2 text-sm transition-all ${
                          selectedAnswer === idx ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={selectedAnswer === null || submitting}
                    className="w-full mt-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Answer'}
                  </button>
                </>
              ) : (
                <div className="text-center py-6">
                  {result === 'correct' ? (
                    <>
                      <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-slate-900 mb-1">Verified!</h3>
                      <p className="text-sm text-slate-500 mb-4">You've earned a verified badge for {skillName}.</p>
                    </>
                  ) : (
                    <>
                      <X className="w-14 h-14 text-red-400 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{result === 'timeout' ? 'Time\'s up!' : 'Not quite!'}</h3>
                      <p className="text-sm text-slate-500 mb-4">You can try again later to earn the verified badge.</p>
                    </>
                  )}
                  <button onClick={closeQuiz} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
