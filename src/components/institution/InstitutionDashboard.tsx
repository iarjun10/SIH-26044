import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { StudentSkills, Internship, Application, Profile } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, FunnelChart, Funnel, LabelList,
} from 'recharts';
import { GraduationCap, Building2, Briefcase, Users, TrendingUp, Award } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  applied: '#3b82f6',
  shortlisted: '#f59e0b',
  selected: '#10b981',
  rejected: '#ef4444',
};

export function InstitutionDashboard() {
  const [students, setStudents] = useState<StudentSkills[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: skillsData }, { data: internshipsData }, { data: appsData }, { data: profilesData }] = await Promise.all([
        supabase.from('student_skills').select('*'),
        supabase.from('internships').select('*').order('created_at', { ascending: false }),
        supabase.from('applications').select('*'),
        supabase.from('profiles').select('*').eq('role', 'student'),
      ]);
      setStudents((skillsData as StudentSkills[]) ?? []);
      setInternships(internshipsData ?? []);
      setApplications((appsData as Application[]) ?? []);
      setProfiles((profilesData as Profile[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Skill gap distribution: count how many students have each skill as a gap
  const gapDistribution = useMemo(() => {
    const gapCounts: Record<string, number> = {};
    students.forEach((s) => {
      s.gaps.forEach((gap) => {
        gapCounts[gap] = (gapCounts[gap] ?? 0) + 1;
      });
    });
    return Object.entries(gapCounts)
      .map(([skill, count]) => ({ skill, students: count }))
      .sort((a, b) => b.students - a.students);
  }, [students]);

  // Applications per internship
  const appsPerInternship = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach((a) => {
      const intern = internships.find((i) => i.id === a.internship_id);
      if (intern) counts[intern.title] = (counts[intern.title] ?? 0) + 1;
    });
    return Object.entries(counts).map(([title, count]) => ({ title, applications: count }));
  }, [applications, internships]);

  // Placement funnel
  const funnelData = useMemo(() => {
    const stages = [
      { name: 'Applied', value: applications.length, fill: STATUS_COLORS.applied },
      { name: 'Shortlisted', value: applications.filter((a) => a.status === 'shortlisted' || a.status === 'selected').length, fill: STATUS_COLORS.shortlisted },
      { name: 'Selected', value: applications.filter((a) => a.status === 'selected').length, fill: STATUS_COLORS.selected },
    ];
    return stages;
  }, [applications]);

  // Status distribution pie
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = { applied: 0, shortlisted: 0, selected: 0, rejected: 0 };
    applications.forEach((a) => { counts[a.status]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [applications]);

  // Average skill scores
  const avgSkillScores = useMemo(() => {
    if (students.length === 0) return [];
    const skillSums: Record<string, { total: number; count: number }> = {};
    students.forEach((s) => {
      s.skills.forEach((sk) => {
        if (!skillSums[sk.skill]) skillSums[sk.skill] = { total: 0, count: 0 };
        skillSums[sk.skill].total += sk.score;
        skillSums[sk.skill].count++;
      });
    });
    return Object.entries(skillSums)
      .map(([skill, { total, count }]) => ({ skill, avgScore: Math.round(total / count) }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [students]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
      </div>
    );
  }

  const companyCount = new Set(internships.map((i) => i.company_id)).size;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Institution Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Read-only analytics across students, internships, and placements</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{profiles.length}</p>
              <p className="text-xs text-slate-500">Students</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{companyCount}</p>
              <p className="text-xs text-slate-500">Companies</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{internships.length}</p>
              <p className="text-xs text-slate-500">Internships</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{applications.length}</p>
              <p className="text-xs text-slate-500">Applications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Skill Gap Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Skill Gap Distribution</h2>
          <p className="text-sm text-slate-500 mb-4">Number of students lacking each skill (score &lt; 50)</p>
          {gapDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gapDistribution} layout="vertical" margin={{ left: 20, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} width={100} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Bar dataKey="students" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">No skill gaps recorded</div>
          )}
        </div>

        {/* Applications per Internship */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Applications per Internship</h2>
          <p className="text-sm text-slate-500 mb-4">Total applications received for each posting</p>
          {appsPerInternship.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={appsPerInternship} margin={{ left: 0, right: 16, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="title" tick={{ fontSize: 9, fill: '#64748b' }} angle={-25} textAnchor="end" height={80} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Bar dataKey="applications" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">No applications yet</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Placement Funnel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Placement Funnel</h2>
          <p className="text-sm text-slate-500 mb-4">Application progression: Applied → Shortlisted → Selected</p>
          <ResponsiveContainer width="100%" height={280}>
            <FunnelChart>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                {funnelData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
                <LabelList position="right" fill="#475569" stroke="none" dataKey="name" fontSize={12} />
                <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={16} fontWeight="bold" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution Pie */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Application Status</h2>
          <p className="text-sm text-slate-500 mb-4">Current distribution across all applications</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                {statusDistribution.map((entry, idx) => (
                  <Cell key={idx} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Average Skill Scores */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Average Skill Scores Across Students</h2>
        <p className="text-sm text-slate-500 mb-4">Mean score for each skill assessed</p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={avgSkillScores} margin={{ left: 0, right: 16, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="skill" tick={{ fontSize: 10, fill: '#64748b' }} angle={-30} textAnchor="end" height={70} interval={0} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
            <Bar dataKey="avgScore" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
