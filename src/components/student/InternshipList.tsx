import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { StudentSkills, Internship, Application } from '@/types';
import { rankInternshipsByMatch } from '@/lib/match';
import { Search, MapPin, Clock, IndianRupee, Check, Loader2, AlertCircle } from 'lucide-react';

export function InternshipList() {
  const { profile } = useAuth();
  const [skills, setSkills] = useState<StudentSkills | null>(null);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

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

  const rankedInternships = useMemo(() => {
    if (!skills) return internships.map((i) => ({ ...i, matchScore: 0 }));
    return rankInternshipsByMatch(skills.skills, internships);
  }, [skills, internships]);

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    internships.forEach((i) => i.required_skills.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [internships]);

  const filtered = useMemo(() => {
    return rankedInternships.filter((i) => {
      const matchesSearch = !searchQuery ||
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSkill = !skillFilter || i.required_skills.includes(skillFilter);
      return matchesSearch && matchesSkill;
    });
  }, [rankedInternships, searchQuery, skillFilter]);

  const appliedIds = new Set(applications.map((a) => a.internship_id));

  const handleApply = async (internshipId: string) => {
    if (!profile || !skills) return;
    setApplying(internshipId);
    setApplyError(null);

    const matchScore = rankedInternships.find((i) => i.id === internshipId)?.matchScore ?? 0;

    const { data, error } = await supabase
      .from('applications')
      .insert({
        student_id: profile.id,
        internship_id: internshipId,
        status: 'applied',
        match_score: matchScore,
      })
      .select()
      .single();

    if (error) {
      setApplyError(error.message);
    } else if (data) {
      setApplications((prev) => [...prev, data as Application]);
    }
    setApplying(null);
  };

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
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Complete Your Assessment First</h2>
        <p className="text-slate-500">You need to complete the skill assessment before applying for internships.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Browse Internships</h1>
        <p className="text-slate-500 text-sm mt-1">Sorted by your skill match percentage</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or keyword..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
          />
        </div>
        <select
          value={skillFilter ?? ''}
          onChange={(e) => setSkillFilter(e.target.value || null)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white"
        >
          <option value="">All Skills</option>
          {allSkills.map((skill) => (
            <option key={skill} value={skill}>{skill}</option>
          ))}
        </select>
      </div>

      {applyError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {applyError}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500">No internships found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((internship) => {
            const isApplied = appliedIds.has(internship.id);
            return (
              <div key={internship.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-semibold text-slate-900">{internship.title}</h3>
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                    internship.matchScore >= 70 ? 'bg-green-50 text-green-700' :
                    internship.matchScore >= 40 ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {internship.matchScore}% match
                  </span>
                </div>

                <p className="text-sm text-slate-500 line-clamp-2 mb-4">{internship.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {internship.required_skills.map((skill) => {
                    const hasSkill = skills.skills.some((s) => s.skill.toLowerCase() === skill.toLowerCase());
                    return (
                      <span key={skill} className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${
                        hasSkill ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {hasSkill && <Check className="w-3 h-3" />}
                        {skill}
                      </span>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-4 mt-auto">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{internship.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{internship.duration}</span>
                  <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />{internship.stipend}</span>
                </div>

                {isApplied ? (
                  <div className="w-full py-2.5 bg-green-50 text-green-700 text-center rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Applied
                  </div>
                ) : (
                  <button
                    onClick={() => handleApply(internship.id)}
                    disabled={applying === internship.id}
                    className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                  >
                    {applying === internship.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Now'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
