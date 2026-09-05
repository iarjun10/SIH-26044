import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';
import type { StudentSkills, Internship, Application, Profile, IndustryFeedback, SkillRating } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, FunnelChart, Funnel, LabelList,
} from 'recharts';
import { GraduationCap, Building2, Briefcase, Users, CheckCircle2, XCircle, Clock, Upload, FileSpreadsheet, Target, ShieldCheck } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  applied: '#3b82f6',
  shortlisted: '#f59e0b',
  selected: '#10b981',
  rejected: '#ef4444',
};

type Tab = 'analytics' | 'approvals' | 'import';

export function InstitutionDashboard() {
  const [tab, setTab] = useState<Tab>('analytics');
  const [students, setStudents] = useState<StudentSkills[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [feedback, setFeedback] = useState<IndustryFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: skillsData }, { data: internshipsData }, { data: appsData }, { data: profilesData }, { data: fbData }] = await Promise.all([
        supabase.from('student_skills').select('*'),
        supabase.from('internships').select('*').order('created_at', { ascending: false }),
        supabase.from('applications').select('*'),
        supabase.from('profiles').select('*').eq('role', 'student'),
        supabase.from('industry_feedback').select('*'),
      ]);
      setStudents((skillsData as StudentSkills[]) ?? []);
      setInternships(internshipsData ?? []);
      setApplications((appsData as Application[]) ?? []);
      setProfiles((profilesData as Profile[]) ?? []);
      setFeedback((fbData as IndustryFeedback[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const pendingInternships = useMemo(() => internships.filter((i) => i.status === 'pending'), [internships]);

  const handleApprove = async (id: string) => {
    await supabase.from('internships').update({ status: 'approved' }).eq('id', id);
    setInternships((prev) => prev.map((i) => i.id === id ? { ...i, status: 'approved' } : i));
    const internship = internships.find((i) => i.id === id);
    if (internship) {
      // Notify all students about the new approved internship
      for (const student of profiles) {
        await createNotification(
          student.id,
          'internship_posted',
          'New Internship Available',
          `"${internship.title}" at ${internship.location} is now accepting applications.`,
          internship.id
        );
      }
    }
  };

  const handleReject = async (id: string) => {
    await supabase.from('internships').update({ status: 'rejected' }).eq('id', id);
    setInternships((prev) => prev.map((i) => i.id === id ? { ...i, status: 'rejected' } : i));
  };

  // Skill accuracy: compare self-rated vs industry feedback
  const skillAccuracy = useMemo(() => {
    if (feedback.length === 0) return [];
    const accuracyMap: Record<string, { selfTotal: number; actualTotal: number; count: number }> = {};

    feedback.forEach((fb) => {
      const studentSkill = students.find((s) => s.student_id === fb.student_id);
      if (!studentSkill) return;
      const ratings = fb.skill_ratings as SkillRating[];
      ratings.forEach((r) => {
        const selfRated = studentSkill.skills.find((s) => s.skill.toLowerCase() === r.skill.toLowerCase());
        if (!selfRated) return;
        const selfScore = selfRated.score;
        const actualScore = r.rating * 20; // Convert 1-5 to 20-100
        if (!accuracyMap[r.skill]) accuracyMap[r.skill] = { selfTotal: 0, actualTotal: 0, count: 0 };
        accuracyMap[r.skill].selfTotal += selfScore;
        accuracyMap[r.skill].actualTotal += actualScore;
        accuracyMap[r.skill].count++;
      });
    });

    return Object.entries(accuracyMap).map(([skill, { selfTotal, actualTotal, count }]) => ({
      skill,
      selfRated: Math.round(selfTotal / count),
      actual: Math.round(actualTotal / count),
      accuracy: Math.round((actualTotal / count) - (selfTotal / count)),
    })).sort((a, b) => a.accuracy - b.accuracy);
  }, [feedback, students]);

  // CSV Import
  const handleCsvImport = async () => {
    setImportError(null);
    setImportResult(null);
    if (!csvText.trim()) { setImportError('Please paste CSV data or upload a file.'); return; }

    const lines = csvText.trim().split('\n');
    if (lines.length < 2) { setImportError('CSV must have a header row and at least one data row.'); return; }

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = header.indexOf('name');
    const emailIdx = header.indexOf('email');
    const skillsIdx = header.indexOf('skills');

    if (nameIdx === -1 || emailIdx === -1) { setImportError('CSV must include "name" and "email" columns.'); return; }

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const name = cols[nameIdx];
      const email = cols[emailIdx];
      if (!name || !email) { skipped++; continue; }

      // Check if user already exists
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      if (existing) { skipped++; continue; }

      // Create auth user
      const password = 'import123';
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, role: 'student' },
      });

      if (authError || !authData.user) { skipped++; continue; }

      // If skills provided, create skill record
      if (skillsIdx !== -1 && cols[skillsIdx]) {
        const skillNames = cols[skillsIdx].split(';').map((s) => s.trim()).filter(Boolean);
        const skills = skillNames.map((s) => ({ skill: s, score: 60 }));
        const gaps = skills.filter((s) => s.score < 50).map((s) => s.skill);
        const totalScore = skills.length > 0 ? Math.round(skills.reduce((sum, s) => sum + s.score, 0) / skills.length) : 0;
        await supabase.from('student_skills').insert({
          student_id: authData.user.id,
          skills, gaps, total_score: totalScore,
        });
      }
      imported++;
    }

    // Refresh data
    const [{ data: skillsData }, { data: profilesData }] = await Promise.all([
      supabase.from('student_skills').select('*'),
      supabase.from('profiles').select('*').eq('role', 'student'),
    ]);
    setStudents((skillsData as StudentSkills[]) ?? []);
    setProfiles((profilesData as Profile[]) ?? []);

    setImportResult(`Imported ${imported} student${imported !== 1 ? 's' : ''}.${skipped > 0 ? ` Skipped ${skipped} (already exist or invalid).` : ''} Default password: import123`);
    setCsvText('');
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setCsvText(e.target?.result as string);
    reader.readAsText(file);
  };

  // Existing analytics computations
  const gapDistribution = useMemo(() => {
    const gapCounts: Record<string, number> = {};
    students.forEach((s) => { s.gaps.forEach((gap) => { gapCounts[gap] = (gapCounts[gap] ?? 0) + 1; }); });
    return Object.entries(gapCounts).map(([skill, count]) => ({ skill, students: count })).sort((a, b) => b.students - a.students);
  }, [students]);

  const appsPerInternship = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach((a) => { const intern = internships.find((i) => i.id === a.internship_id); if (intern) counts[intern.title] = (counts[intern.title] ?? 0) + 1; });
    return Object.entries(counts).map(([title, count]) => ({ title, applications: count }));
  }, [applications, internships]);

  const funnelData = useMemo(() => [
    { name: 'Applied', value: applications.length, fill: STATUS_COLORS.applied },
    { name: 'Shortlisted', value: applications.filter((a) => a.status === 'shortlisted' || a.status === 'selected').length, fill: STATUS_COLORS.shortlisted },
    { name: 'Selected', value: applications.filter((a) => a.status === 'selected').length, fill: STATUS_COLORS.selected },
  ], [applications]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = { applied: 0, shortlisted: 0, selected: 0, rejected: 0 };
    applications.forEach((a) => { counts[a.status]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [applications]);

  const avgSkillScores = useMemo(() => {
    if (students.length === 0) return [];
    const skillSums: Record<string, { total: number; count: number }> = {};
    students.forEach((s) => { s.skills.forEach((sk) => { if (!skillSums[sk.skill]) skillSums[sk.skill] = { total: 0, count: 0 }; skillSums[sk.skill].total += sk.score; skillSums[sk.skill].count++; }); });
    return Object.entries(skillSums).map(([skill, { total, count }]) => ({ skill, avgScore: Math.round(total / count) })).sort((a, b) => b.avgScore - a.avgScore);
  }, [students]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div>
    );
  }

  const companyCount = new Set(internships.map((i) => i.company_id)).size;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Institution Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Analytics, internship approvals, and student management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg w-fit">
        <button onClick={() => setTab('analytics')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'analytics' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Analytics</button>
        <button onClick={() => setTab('approvals')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${tab === 'approvals' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
          Approvals
          {pendingInternships.length > 0 && <span className="text-xs bg-amber-500 text-white rounded-full px-1.5 py-0.5">{pendingInternships.length}</span>}
        </button>
        <button onClick={() => setTab('import')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'import' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Bulk Import</button>
      </div>

      {/* ANALYTICS TAB */}
      {tab === 'analytics' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><GraduationCap className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold text-slate-900">{profiles.length}</p><p className="text-xs text-slate-500">Students</p></div></div></div>
            <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center"><Building2 className="w-5 h-5 text-slate-600" /></div><div><p className="text-2xl font-bold text-slate-900">{companyCount}</p><p className="text-xs text-slate-500">Companies</p></div></div></div>
            <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center"><Briefcase className="w-5 h-5 text-indigo-600" /></div><div><p className="text-2xl font-bold text-slate-900">{internships.filter(i => i.status === 'approved').length}</p><p className="text-xs text-slate-500">Live Internships</p></div></div></div>
            <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold text-slate-900">{applications.length}</p><p className="text-xs text-slate-500">Applications</p></div></div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
              ) : <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">No skill gaps recorded</div>}
            </div>
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
              ) : <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">No applications yet</div>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Placement Funnel</h2>
              <p className="text-sm text-slate-500 mb-4">Application progression: Applied → Shortlisted → Selected</p>
              <ResponsiveContainer width="100%" height={280}>
                <FunnelChart>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    {funnelData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    <LabelList position="right" fill="#475569" stroke="none" dataKey="name" fontSize={12} />
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={16} fontWeight="bold" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Application Status</h2>
              <p className="text-sm text-slate-500 mb-4">Current distribution</p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {statusDistribution.map((entry, idx) => <Cell key={idx} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
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

          {/* Skill Accuracy: self-rated vs actual */}
          {skillAccuracy.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-900">Self-Rated vs Actual Skill Accuracy</h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">Industry feedback compared to student self-assessment. Negative = overrated, positive = underrated.</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={skillAccuracy} margin={{ left: 0, right: 16, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="skill" tick={{ fontSize: 10, fill: '#64748b' }} angle={-30} textAnchor="end" height={70} interval={0} />
                  <YAxis domain={[-50, 50]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="selfRated" name="Self-Rated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Industry-Rated" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* APPROVALS TAB */}
      {tab === 'approvals' && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" /> Internship Approval Queue
          </h2>
          {pendingInternships.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500">No pending approvals. All internships are reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingInternships.map((intern) => (
                <div key={intern.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-slate-900">{intern.title}</h3>
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
                      </div>
                      <p className="text-sm text-slate-500">{intern.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {intern.required_skills.map((s) => <span key={s} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{s}</span>)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                        <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{intern.location}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{intern.duration}</span>
                        <span className="flex items-center gap-1">{intern.stipend}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(intern.id)} className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => handleReject(intern.id)} className="flex items-center gap-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Also show approved/rejected for context */}
          {internships.filter((i) => i.status !== 'pending').length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-slate-500 mb-3">Reviewed Internships</h3>
              <div className="space-y-2">
                {internships.filter((i) => i.status !== 'pending').map((intern) => (
                  <div key={intern.id} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                    <span className="text-sm text-slate-700">{intern.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${intern.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {intern.status === 'approved' ? 'Approved' : 'Rejected'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BULK IMPORT TAB */}
      {tab === 'import' && (
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" /> Bulk Student Import
          </h2>
          <p className="text-sm text-slate-500 mb-6">Upload a CSV file to bulk-create student accounts with initial skill data. New students get the default password "import123".</p>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all mb-4">
              <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">Click to upload a CSV file</p>
              <p className="text-xs text-slate-400 mt-1">Or paste CSV data below</p>
            </div>

            <div className="mb-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">CSV format (columns: name, email, skills)</label>
              <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={6} placeholder={'name,email,skills\nJohn Doe,john@example.com,Python;SQL;React\nJane Smith,jane@example.com,Java;Spring Boot'} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 resize-none font-mono" />
            </div>

            <p className="text-xs text-slate-400 mb-4">Skills column is optional. Separate multiple skills with semicolons (;). Imported skills default to score 60.</p>

            {importError && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{importError}</div>}
            {importResult && <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{importResult}</div>}

            <button onClick={handleCsvImport} disabled={!csvText.trim()} className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2">
              <Upload className="w-4 h-4" /> Import Students
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
