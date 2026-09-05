import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { createNotification } from '@/lib/notifications';
import type { Internship, ApplicationWithDetails, StudentSkills, Profile, ApplicationStatus, InterviewSlot, IndustryFeedback, SkillRating } from '@/types';
import { Plus, Building2, Users, TrendingUp, X, Loader2, MapPin, Clock, IndianRupee, Calendar, Star, MessageSquare, CheckCircle2 } from 'lucide-react';

export function IndustryDashboard() {
  const { profile } = useAuth();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<string | null>(null);
  const [slotModal, setSlotModal] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<string | null>(null);
  const [interviewSlots, setInterviewSlots] = useState<Record<string, InterviewSlot[]>>({});
  const [feedback, setFeedback] = useState<Record<string, IndustryFeedback>>({});

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [duration, setDuration] = useState('');
  const [stipend, setStipend] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slot form state
  const [slot1, setSlot1] = useState('');
  const [slot2, setSlot2] = useState('');
  const [slot3, setSlot3] = useState('');

  // Feedback form state
  const [skillRatings, setSkillRatings] = useState<Record<string, number>>({});
  const [overallRating, setOverallRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: internshipsData } = await supabase
        .from('internships')
        .select('*')
        .eq('company_id', profile.id)
        .order('created_at', { ascending: false });
      setInternships(internshipsData ?? []);

      if (internshipsData && internshipsData.length > 0) {
        const ids = internshipsData.map((i) => i.id);
        const { data: appsData } = await supabase
          .from('applications')
          .select(`*, internship:internships(*), student_profile:profiles!applications_student_id_fkey(*), student_skills:student_skills!applications_student_id_fkey(*)`)
          .in('internship_id', ids)
          .order('created_at', { ascending: false });
        setApplications((appsData as ApplicationWithDetails[]) ?? []);

        // Fetch interview slots and feedback
        if (appsData && appsData.length > 0) {
          const appIds = appsData.map((a) => a.id);
          const [{ data: slotData }, { data: fbData }] = await Promise.all([
            supabase.from('interview_slots').select('*').in('application_id', appIds).order('scheduled_time', { ascending: true }),
            supabase.from('industry_feedback').select('*').in('application_id', appIds),
          ]);
          const slotMap: Record<string, InterviewSlot[]> = {};
          (slotData ?? []).forEach((s) => {
            if (!slotMap[s.application_id]) slotMap[s.application_id] = [];
            slotMap[s.application_id].push(s as InterviewSlot);
          });
          setInterviewSlots(slotMap);

          const fbMap: Record<string, IndustryFeedback> = {};
          (fbData ?? []).forEach((f) => { fbMap[f.application_id] = f as IndustryFeedback; });
          setFeedback(fbMap);
        }
      }
      setLoading(false);
    })();
  }, [profile]);

  const handleAddSkill = () => {
    const skill = skillInput.trim();
    if (skill && !requiredSkills.includes(skill)) {
      setRequiredSkills([...requiredSkills, skill]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter((s) => s !== skill));
  };

  const handleCreateInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    setError(null);

    const { data, error } = await supabase
      .from('internships')
      .insert({
        company_id: profile.id,
        title, description, required_skills: requiredSkills,
        duration, stipend, location, status: 'pending',
      })
      .select().single();

    if (error) {
      setError(error.message);
    } else if (data) {
      setInternships((prev) => [data as Internship, ...prev]);
      setShowModal(false);
      setTitle(''); setDescription(''); setRequiredSkills([]); setDuration(''); setStipend(''); setLocation('');
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    const { error } = await supabase.from('applications').update({ status: newStatus }).eq('id', appId);
    if (!error) {
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a));
      const app = applications.find((a) => a.id === appId);
      if (app) {
        await createNotification(
          app.student_id,
          'status_change',
          'Application Status Updated',
          `Your application for "${app.internship?.title}" is now ${newStatus}.`,
          app.id
        );
      }
    }
  };

  const handleProposeSlots = async () => {
    if (!profile || !slotModal) return;
    const slots = [slot1, slot2, slot3].filter(Boolean);
    if (slots.length === 0) return;

    const { data } = await supabase.from('interview_slots').insert(
      slots.map((s) => ({
        application_id: slotModal,
        proposed_by: profile.id,
        scheduled_time: new Date(s).toISOString(),
      }))
    ).select('*');

    if (data) {
      setInterviewSlots((prev) => ({
        ...prev,
        [slotModal]: [...(prev[slotModal] ?? []), ...(data as InterviewSlot[])],
      }));
    }

    const app = applications.find((a) => a.id === slotModal);
    if (app) {
      await createNotification(
        app.student_id,
        'interview_slot',
        'Interview Slots Proposed',
        `${profile.organization_name} proposed ${slots.length} interview slot${slots.length > 1 ? 's' : ''} for "${app.internship?.title}". Check your portfolio to pick one.`,
        app.id
      );
    }

    setSlotModal(null);
    setSlot1(''); setSlot2(''); setSlot3('');
  };

  const openFeedback = (app: ApplicationWithDetails) => {
    const studentSkills = (app.student_skills as unknown as StudentSkills)?.skills ?? [];
    const ratings: Record<string, number> = {};
    studentSkills.forEach((s) => { ratings[s.skill] = 3; });
    setSkillRatings(ratings);
    setOverallRating(3);
    setFeedbackComments('');
    setFeedbackModal(app.id);
  };

  const handleSubmitFeedback = async () => {
    if (!profile || !feedbackModal) return;
    const app = applications.find((a) => a.id === feedbackModal);
    if (!app) return;

    const ratings: SkillRating[] = Object.entries(skillRatings).map(([skill, rating]) => ({ skill, rating }));

    const { data, error } = await supabase.from('industry_feedback').insert({
      application_id: feedbackModal,
      student_id: app.student_id,
      skill_ratings: ratings,
      overall_rating: overallRating,
      comments: feedbackComments,
    }).select('*').single();

    if (!error && data) {
      setFeedback((prev) => ({ ...prev, [feedbackModal]: data as IndustryFeedback }));
    }
    setFeedbackModal(null);
  };

  const stats = {
    totalInternships: internships.length,
    totalApplicants: applications.length,
    shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
    selected: applications.filter((a) => a.status === 'selected').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
      </div>
    );
  }

  const selectedApps = selectedInternship
    ? applications.filter((a) => a.internship_id === selectedInternship)
    : applications;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{profile?.organization_name}</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your internship postings and applicants</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg transition-colors text-sm">
          <Plus className="w-4 h-4" /> Post Internship
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Building2 className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{stats.totalInternships}</p><p className="text-xs text-slate-500">Internships Posted</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-slate-600" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{stats.totalApplicants}</p><p className="text-xs text-slate-500">Total Applicants</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{stats.shortlisted}</p><p className="text-xs text-slate-500">Shortlisted</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{stats.selected}</p><p className="text-xs text-slate-500">Selected</p></div>
          </div>
        </div>
      </div>

      {internships.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No Internships Posted</h2>
          <p className="text-sm text-slate-500 mb-6">Post your first internship to start receiving applications. New postings require institution approval before going live.</p>
          <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg text-sm">Post Internship</button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button onClick={() => setSelectedInternship(null)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${!selectedInternship ? 'bg-blue-50 text-blue-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              All ({applications.length})
            </button>
            {internships.map((intern) => {
              const count = applications.filter((a) => a.internship_id === intern.id).length;
              return (
                <button key={intern.id} onClick={() => setSelectedInternship(intern.id)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${selectedInternship === intern.id ? 'bg-blue-50 text-blue-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {intern.title} ({count})
                  {intern.status === 'pending' && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Pending</span>}
                  {intern.status === 'approved' && <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Live</span>}
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {selectedApps.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No applicants yet for this selection.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Student</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Internship</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Match</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Skills</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedApps.map((app) => {
                      const slots = interviewSlots[app.id] ?? [];
                      const hasFeedback = !!feedback[app.id];
                      return (
                        <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{app.student_profile?.full_name}</p>
                              <p className="text-xs text-slate-500">{app.student_profile?.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4"><p className="text-sm text-slate-700">{app.internship?.title}</p></td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${app.match_score >= 70 ? 'bg-green-50 text-green-700' : app.match_score >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{app.match_score}%</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(app.student_skills as unknown as StudentSkills)?.skills?.slice(0, 5).map((s) => (
                                <span key={s.skill} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{s.skill}: {s.score}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select value={app.status} onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                              className={`text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer outline-none transition-all ${app.status === 'applied' ? 'bg-blue-50 text-blue-700 border-blue-200' : app.status === 'shortlisted' ? 'bg-amber-50 text-amber-700 border-amber-200' : app.status === 'selected' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                              <option value="applied">Applied</option>
                              <option value="shortlisted">Shortlisted</option>
                              <option value="selected">Selected</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            {slots.length > 0 && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> {slots.filter(s => s.selected).length}/{slots.length} selected</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {app.status === 'shortlisted' && (
                                <button onClick={() => setSlotModal(app.id)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors" title="Propose interview slots">
                                  <Calendar className="w-3.5 h-3.5" /> Schedule
                                </button>
                              )}
                              {app.status === 'selected' && !hasFeedback && (
                                <button onClick={() => openFeedback(app)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors" title="Give feedback">
                                  <Star className="w-3.5 h-3.5" /> Rate
                                </button>
                              )}
                              {hasFeedback && (
                                <span className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg" title="Feedback submitted">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Rated
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Post Internship Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900">Post New Internship</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateInternship} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" placeholder="e.g. Software Development Intern" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm resize-none" placeholder="Describe the role and responsibilities..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Required Skills</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" placeholder="Type a skill and press Enter" />
                  <button type="button" onClick={handleAddSkill} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {requiredSkills.map((skill) => (
                    <span key={skill} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md">{skill}<button type="button" onClick={() => handleRemoveSkill(skill)} className="hover:text-red-500"><X className="w-3 h-3" /></button></span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Duration</label><input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" placeholder="e.g. 6 months" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Stipend</label><input type="text" value={stipend} onChange={(e) => setStipend(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" placeholder="e.g. ₹25,000/month" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" placeholder="e.g. Bangalore" /></div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">New postings start as "Pending" and require institution approval before students can see them.</div>
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Internship'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interview Slot Modal */}
      {slotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSlotModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-amber-500" /><h2 className="text-base font-bold text-slate-900">Propose Interview Slots</h2></div>
              <button onClick={() => setSlotModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-500">Propose 2-3 time slots. The student will pick one from their portfolio.</p>
              {[1, 2, 3].map((n) => (
                <div key={n}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Slot {n}</label>
                  <input type="datetime-local" value={n === 1 ? slot1 : n === 2 ? slot2 : slot3} onChange={(e) => { if (n === 1) setSlot1(e.target.value); else if (n === 2) setSlot2(e.target.value); else setSlot3(e.target.value); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500" />
                </div>
              ))}
              <button onClick={handleProposeSlots} disabled={!slot1 && !slot2 && !slot3} className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50">Propose Slots</button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setFeedbackModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-2"><Star className="w-5 h-5 text-indigo-600" /><h2 className="text-base font-bold text-slate-900">Rate Student Performance</h2></div>
              <button onClick={() => setFeedbackModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500">Rate the student's actual skill performance based on their internship work. This data helps institutions compare self-rated vs actual skills.</p>
              <div className="space-y-3">
                {Object.entries(skillRatings).map(([skill, rating]) => (
                  <div key={skill} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{skill}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setSkillRatings((prev) => ({ ...prev, [skill]: star }))}>
                          <Star className={`w-5 h-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Overall Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setOverallRating(star)}>
                      <Star className={`w-6 h-6 ${star <= overallRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1"><MessageSquare className="w-4 h-4" /> Comments</label>
                <textarea value={feedbackComments} onChange={(e) => setFeedbackComments(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 resize-none" placeholder="Optional feedback..." />
              </div>
              <button onClick={handleSubmitFeedback} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors">Submit Feedback</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
