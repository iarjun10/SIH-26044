import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { StudentSkills, ApplicationWithDetails, StatusHistory, InterviewSlot, VerifiedSkill } from '@/types';
import { VerifiedSkillBadge } from '@/components/student/VerifiedSkillBadge';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Award, TrendingUp, AlertTriangle, Clock, CheckCircle2, XCircle, FileText, Calendar, MapPin, Video } from 'lucide-react';

const statusConfig = {
  applied: { label: 'Applied', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock className="w-3.5 h-3.5" /> },
  shortlisted: { label: 'Shortlisted', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  selected: { label: 'Selected', color: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
};

export function Portfolio() {
  const { profile } = useAuth();
  const [skills, setSkills] = useState<StudentSkills | null>(null);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [history, setHistory] = useState<Record<string, StatusHistory[]>>({});
  const [interviewSlots, setInterviewSlots] = useState<Record<string, InterviewSlot[]>>({});
  const [verifiedSkills, setVerifiedSkills] = useState<VerifiedSkill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: skillsData } = await supabase
        .from('student_skills')
        .select('*')
        .eq('student_id', profile.id)
        .maybeSingle();
      setSkills(skillsData as StudentSkills | null);

      const { data: appsData } = await supabase
        .from('applications')
        .select(`*, internship:internships(*)`)
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });
      setApplications((appsData as ApplicationWithDetails[]) ?? []);

      const { data: verifiedData } = await supabase
        .from('verified_skills')
        .select('*')
        .eq('student_id', profile.id);
      setVerifiedSkills((verifiedData as VerifiedSkill[]) ?? []);

      if (appsData && appsData.length > 0) {
        const appIds = appsData.map((a) => a.id);
        const [{ data: histData }, { data: slotData }] = await Promise.all([
          supabase.from('application_status_history').select('*').in('application_id', appIds).order('created_at', { ascending: true }),
          supabase.from('interview_slots').select('*').in('application_id', appIds).order('scheduled_time', { ascending: true }),
        ]);
        const histMap: Record<string, StatusHistory[]> = {};
        (histData ?? []).forEach((h) => {
          if (!histMap[h.application_id]) histMap[h.application_id] = [];
          histMap[h.application_id].push(h as StatusHistory);
        });
        setHistory(histMap);

        const slotMap: Record<string, InterviewSlot[]> = {};
        (slotData ?? []).forEach((s) => {
          if (!slotMap[s.application_id]) slotMap[s.application_id] = [];
          slotMap[s.application_id].push(s as InterviewSlot);
        });
        setInterviewSlots(slotMap);
      }

      setLoading(false);
    })();
  }, [profile]);

  const handleSelectSlot = async (slotId: string, appId: string) => {
    await supabase.from('interview_slots').update({ selected: true }).eq('id', slotId);
    await supabase.from('interview_slots').update({ selected: false }).neq('id', slotId).eq('application_id', appId);
    // Refresh slots
    const { data: slotData } = await supabase.from('interview_slots').select('*').eq('application_id', appId).order('scheduled_time', { ascending: true });
    setInterviewSlots((prev) => ({ ...prev, [appId]: (slotData as InterviewSlot[]) ?? [] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
      </div>
    );
  }

  const radarData = skills?.skills.map((s) => ({ skill: s.skill, score: s.score })) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Portfolio</h1>
        <p className="text-slate-500 text-sm mt-1">{profile?.full_name} · {profile?.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Skills */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Skill Profile</h2>
            <p className="text-sm text-slate-500 mb-4">Overall score: {skills?.total_score ?? 0}/100</p>
            {radarData.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Radar dataKey="score" stroke="#1d4ed8" fill="#3b82f6" fillOpacity={0.3} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Skill Details</h2>
            <div className="space-y-2.5">
              {skills?.skills.map((s) => {
                const verified = verifiedSkills.find((v) => v.skill.toLowerCase() === s.skill.toLowerCase());
                return (
                  <div key={s.skill}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 flex items-center gap-1.5">
                        {s.skill}
                        {verified && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded" title={`Verified: ${verified.verified_score}/100`}>
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-medium text-slate-500">{s.score}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.score >= 70 ? 'bg-green-500' : s.score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${s.score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Verified skills section */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Verified Skill Badges</h3>
              <div className="flex flex-wrap gap-2">
                {skills?.skills.map((s) => (
                  <VerifiedSkillBadge
                    key={s.skill}
                    skillName={s.skill}
                    verifiedSkills={verifiedSkills}
                    onVerified={async () => {
                      if (!profile) return;
                      const { data } = await supabase.from('verified_skills').select('*').eq('student_id', profile.id);
                      setVerifiedSkills((data as VerifiedSkill[]) ?? []);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {skills && skills.gaps.length > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h2 className="text-sm font-semibold text-amber-900">Skill Gaps</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skills.gaps.map((gap) => (
                  <span key={gap} className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-md">{gap}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Applications + History + Interview Slots */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Applications ({applications.length})</h2>
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No applications yet. Browse internships to apply.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => {
                  const status = statusConfig[app.status];
                  const hist = history[app.id] ?? [];
                  const slots = interviewSlots[app.id] ?? [];
                  const hasSelectedSlot = slots.some((s) => s.selected);
                  return (
                    <div key={app.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{app.internship?.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {app.internship?.location} · {app.internship?.stipend} · {app.internship?.duration}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {app.match_score}% match
                          </span>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1 ${status.color}`}>
                            {status.icon} {status.label}
                          </span>
                        </div>
                      </div>

                      {/* Required skills */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {app.internship?.required_skills.map((skill) => {
                          const hasSkill = skills?.skills.some((s) => s.skill.toLowerCase() === skill.toLowerCase());
                          return (
                            <span key={skill} className={`text-xs px-2 py-0.5 rounded ${
                              hasSkill ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {skill}
                            </span>
                          );
                        })}
                      </div>

                      {/* Interview slots */}
                      {slots.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-amber-500" />
                            <p className="text-xs font-medium text-slate-600">
                              Interview Slots {hasSelectedSlot ? '(Selected)' : '(Pick one)'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {slots.map((slot) => {
                              const slotDate = new Date(slot.scheduled_time);
                              return (
                                <button
                                  key={slot.id}
                                  onClick={() => !slot.selected && handleSelectSlot(slot.id, app.id)}
                                  disabled={slot.selected || hasSelectedSlot}
                                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border-2 transition-all ${
                                    slot.selected
                                      ? 'border-green-500 bg-green-50 text-green-700'
                                      : hasSelectedSlot
                                        ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                                        : 'border-slate-200 text-slate-600 hover:border-amber-400 hover:bg-amber-50'
                                  }`}
                                >
                                  <Video className="w-3 h-3" />
                                  {slotDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at{' '}
                                  {slotDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  {slot.selected && <CheckCircle2 className="w-3 h-3" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Status history timeline */}
                      {hist.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs font-medium text-slate-400 mb-2">Status History</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {hist.map((h, idx) => {
                              const cfg = statusConfig[h.status];
                              return (
                                <div key={h.id} className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 ${cfg.color}`}>
                                    {cfg.icon} {cfg.label}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </span>
                                  {idx < hist.length - 1 && <span className="text-slate-300">→</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
