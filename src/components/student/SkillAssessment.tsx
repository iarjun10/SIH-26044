import { useState } from 'react';
import { assessmentQuestions, computeSkillProfile } from '@/data/assessment';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import type { SkillEntry } from '@/types';

interface SkillAssessmentProps {
  onComplete: () => void;
}

export function SkillAssessment({ onComplete }: SkillAssessmentProps) {
  const { profile } = useAuth();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = assessmentQuestions[currentQ];
  const totalQuestions = assessmentQuestions.length;
  const progress = ((currentQ + 1) / totalQuestions) * 100;
  const isLast = currentQ === totalQuestions - 1;
  const allAnswered = Object.keys(answers).length === totalQuestions;

  const handleSelect = (score: number) => {
    setAnswers((prev) => ({ ...prev, [question.id]: score }));
  };

  const handleNext = () => {
    if (currentQ < totalQuestions - 1) setCurrentQ(currentQ + 1);
  };

  const handlePrev = () => {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitting(true);
    setError(null);

    const { skills, gaps, totalScore } = computeSkillProfile(answers);

    const { data: existing } = await supabase
      .from('student_skills')
      .select('id')
      .eq('student_id', profile.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('student_skills')
        .update({
          skills: skills as SkillEntry[],
          gaps,
          total_score: totalScore,
          updated_at: new Date().toISOString(),
        })
        .eq('student_id', profile.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase
        .from('student_skills')
        .insert({
          student_id: profile.id,
          skills: skills as SkillEntry[],
          gaps,
          total_score: totalScore,
        });
      if (error) setError(error.message);
    }

    setSubmitting(false);
    if (!error) onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Skill Assessment</h1>
        <p className="text-slate-500 text-sm">
          Answer {totalQuestions} questions to build your skill profile. This helps us match you with the best internships.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">
            Question {currentQ + 1} of {totalQuestions}
          </span>
          <span className="text-sm text-slate-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="mb-6">
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full mb-3">
            {question.skill}
          </span>
          <h2 className="text-lg font-semibold text-slate-900">{question.question}</h2>
        </div>

        <div className="space-y-2.5">
          {question.options.map((option) => {
            const selected = answers[question.id] === option.score;
            return (
              <button
                key={option.label}
                onClick={() => handleSelect(option.score)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${selected ? 'text-blue-700' : 'text-slate-700'}`}>
                    {option.label}
                  </span>
                  {selected && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={handlePrev}
            disabled={currentQ === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={answers[question.id] === undefined}
              className="flex items-center gap-1 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
