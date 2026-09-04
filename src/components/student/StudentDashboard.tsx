import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { StudentSkills, Internship, Application } from '@/types';
import { rankInternshipsByMatch } from '@/lib/match';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { TrendingUp, AlertTriangle, Target, Award, ArrowRight } from 'lucide-react';

interface StudentDashboardProps {
  onNavigate: (page: string) => void;
}

export function StudentDashboard({ onNavigate }: StudentDashboardProps) {
  const { profile } = useAuth();
  const [skills, setSkills] = useState<StudentSkills | null>(null);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: skillsData }, { data: internshipsData }, { data: appsData }] = await Promise.all([
        supabase.from('student_skills').select('*').eq('student_id', profile.id).maybeSingle(),
        supabase.from('internships').select('*').order('created_at', { ascending: false }),
        supabase.from('applications').select('*').eq('student_id', profile.id),
      ]);
      setSkills(skillsData as StudentSkills | null);
      setInternships(internshipsData ?? []);
      setApplications(appsData ?? []);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
      </div>
    );
  }

  if (!skills) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">No Skill Profile Yet</h2>
        <p className="text-slate-500 mb-6">Take the skill assessment to unlock your dashboard, see your skill gaps, and get matched with internships.</p>
        <button
          onClick={() => onNavigate('assessment')}
          className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg transition-colors text-sm"
        >
          Take Assessment
        </button>
      </div>
    );
  }

  const radarData = skills.skills.map((s) => ({ skill: s.skill, score: s.score }));
  const ranked = rankInternshipsByMatch(skills.skills, internships).slice(0, 5);
  const appliedCount = applications.length;
  const shortlistedCount = applications.filter((a) => a.status === 'shortlisted').length;
  const selectedCount = applications.filter((a) => a.status === 'selected').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {profile?.full_name.split(' ')[0]}</h1>
        <p className="text-slate-500 text-sm mt-1">Here's your skill profile and internship matches</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{skills.total_score}</p>
              <p className="text-xs text-slate-500">Overall Score</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{appliedCount}</p>
              <p className="text-xs text-slate-500">Applications</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{shortlistedCount}</p>
              <p className="text-xs text-slate-500">Shortlisted</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{selectedCount}</p>
              <p className="text-xs text-slate-500">Selected</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Radar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Skill Profile</h2>
          <p className="text-sm text-slate-500 mb-4">Your skills across technical and soft areas</p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Radar dataKey="score" stroke="#1d4ed8" fill="#3b82f6" fillOpacity={0.3} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Skill Gaps */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Skill Gaps</h2>
          <p className="text-sm text-slate-500 mb-4">Areas where you score below 50 — focus on improving these</p>
          {skills.gaps.length > 0 ? (
            <div className="space-y-3">
              {skills.gaps.map((gap) => {
                const skillEntry = skills.skills.find((s) => s.skill === gap);
                return (
                  <div key={gap} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700">{gap}</span>
                      <div className="mt-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${skillEntry?.score ?? 0}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-600">{skillEntry?.score ?? 0}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
              <p className="text-sm text-slate-500">No skill gaps detected. Great job!</p>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100">
            <h3 className="text-sm font-medium text-slate-700 mb-3">All Skills Breakdown</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={radarData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="skill" tick={{ fontSize: 10, fill: '#64748b' }} width={90} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Internship Matches */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Top Internship Matches</h2>
            <p className="text-sm text-slate-500">Ranked by your skill compatibility</p>
          </div>
          <button
            onClick={() => onNavigate('internships')}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ranked.map((internship) => (
            <div key={internship.id} className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{internship.title}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  internship.matchScore >= 70 ? 'bg-green-50 text-green-700' :
                  internship.matchScore >= 40 ? 'bg-amber-50 text-amber-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {internship.matchScore}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{internship.location} · {internship.stipend}</p>
              <div className="flex flex-wrap gap-1">
                {internship.required_skills.slice(0, 4).map((skill) => (
                  <span key={skill} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
