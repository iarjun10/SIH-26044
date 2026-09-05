import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { StudentSkills, Internship, Application } from '@/types';
type BookmarkType = { id: string; student_id: string; internship_id: string; created_at: string };
import { rankInternshipsByMatch } from '@/lib/match';
import { parseStipend, parseDurationMonths } from '@/lib/notifications';
import { Search, MapPin, Clock, IndianRupee, Check, Loader2, AlertCircle, Bookmark, BookmarkCheck, Filter, X } from 'lucide-react';

export function InternshipList() {
  const { profile } = useAuth();
  const [skills, setSkills] = useState<StudentSkills | null>(null);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [minStipend, setMinStipend] = useState<number>(0);
  const [maxDuration, setMaxDuration] = useState<number>(0);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: skillsData }, { data: internshipsData }, { data: appsData }, { data: bookmarkData }] = await Promise.all([
        supabase.from('student_skills').select('*').eq('student_id', profile.id).maybeSingle(),
        supabase.from('internships').select('*').eq('status', 'approved').order('created_at', { ascending: false }),
        supabase.from('applications').select('*').eq('student_id', profile.id),
        supabase.from('bookmarks').select('*').eq('student_id', profile.id),
      ]);
      setSkills(skillsData as StudentSkills | null);
      setInternships(internshipsData ?? []);
      setApplications(appsData ?? []);
      setBookmarks(new Set((bookmarkData as BookmarkType[])?.map((b) => b.internship_id) ?? []));
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

  const allLocations = useMemo(() => {
    const set = new Set<string>();
    internships.forEach((i) => set.add(i.location));
    return Array.from(set).sort();
  }, [internships]);

  const filtered = useMemo(() => {
    return rankedInternships.filter((i) => {
      const matchesSearch = !searchQuery ||
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.required_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSkill = !skillFilter || i.required_skills.includes(skillFilter);
      const matchesLocation = !locationFilter || i.location === locationFilter;
      const stipendVal = parseStipend(i.stipend);
      const matchesStipend = minStipend === 0 || stipendVal >= minStipend;
      const durationMonths = parseDurationMonths(i.duration);
      const matchesDuration = maxDuration === 0 || durationMonths <= maxDuration;
      const matchesBookmark = !showBookmarkedOnly || bookmarks.has(i.id);
      return matchesSearch && matchesSkill && matchesLocation && matchesStipend && matchesDuration && matchesBookmark;
    });
  }, [rankedInternships, searchQuery, skillFilter, locationFilter, minStipend, maxDuration, showBookmarkedOnly, bookmarks]);

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

  const handleBookmark = async (internshipId: string) => {
    if (!profile) return;
    if (bookmarks.has(internshipId)) {
      await supabase.from('bookmarks').delete().eq('student_id', profile.id).eq('internship_id', internshipId);
      setBookmarks((prev) => { const next = new Set(prev); next.delete(internshipId); return next; });
    } else {
      await supabase.from('bookmarks').insert({ student_id: profile.id, internship_id: internshipId });
      setBookmarks((prev) => new Set(prev).add(internshipId));
    }
  };

  const clearFilters = () => {
    setSkillFilter(null);
    setLocationFilter('');
    setMinStipend(0);
    setMaxDuration(0);
    setShowBookmarkedOnly(false);
  };

  const activeFilterCount = (skillFilter ? 1 : 0) + (locationFilter ? 1 : 0) + (minStipend > 0 ? 1 : 0) + (maxDuration > 0 ? 1 : 0) + (showBookmarkedOnly ? 1 : 0);

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

      {/* Search + filter toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, keyword, or skill..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Filter className="w-4 h-4" /> Filters
          {activeFilterCount > 0 && <span className="text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Skill</label>
            <select value={skillFilter ?? ''} onChange={(e) => setSkillFilter(e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-blue-500">
              <option value="">All Skills</option>
              {allSkills.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-blue-500">
              <option value="">All Locations</option>
              {allLocations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Min Stipend (₹/month)</label>
            <input type="number" value={minStipend || ''} onChange={(e) => setMinStipend(parseInt(e.target.value) || 0)}
              placeholder="Any"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Max Duration (months)</label>
            <input type="number" value={maxDuration || ''} onChange={(e) => setMaxDuration(parseInt(e.target.value) || 0)}
              placeholder="Any"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500" />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showBookmarkedOnly} onChange={(e) => setShowBookmarkedOnly(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <BookmarkCheck className="w-4 h-4 text-blue-600" /> Saved only
            </label>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500">
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
        </div>
      )}

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
            const isBookmarked = bookmarks.has(internship.id);
            return (
              <div key={internship.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-semibold text-slate-900">{internship.title}</h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => handleBookmark(internship.id)} className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title={isBookmarked ? 'Remove bookmark' : 'Save for later'}>
                      {isBookmarked ? <BookmarkCheck className="w-4 h-4 text-blue-600" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                      internship.matchScore >= 70 ? 'bg-green-50 text-green-700' :
                      internship.matchScore >= 40 ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {internship.matchScore}% match
                    </span>
                  </div>
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
