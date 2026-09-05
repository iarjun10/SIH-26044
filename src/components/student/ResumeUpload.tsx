import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { analyzeResume, syncResumeSkillsToProfile } from '@/lib/aiSkills';
import type { ResumeExtraction, SkillEntry } from '@/types';
import { normalizeSkillList, scoreToProficiency, inferScoreFromContext } from '@/lib/skillNormalization';
import { Upload, Loader2, Check, X, Sparkles, AlertCircle } from 'lucide-react';

interface ResumeUploadProps {
  onSkillsExtracted: (skills: SkillEntry[]) => void;
  onAnalysisComplete?: () => void;
}

export function ResumeUpload({ onSkillsExtracted, onAnalysisComplete }: ResumeUploadProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extraction, setExtraction] = useState<ResumeExtraction | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [acceptedSkills, setAcceptedSkills] = useState<Set<string>>(new Set());
  const [skillEntries, setSkillEntries] = useState<{ skill: string; score: number; category: string }[]>([]);
  const [synced, setSynced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!profile) return;
    setUploading(true);
    setError(null);
    setExtraction(null);
    setSynced(false);
    setFileName(file.name);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      setUploading(false);
      setAnalyzing(true);

      const { extraction: result, error: analyzeError } = await analyzeResume(filePath, file.name, profile.id);

      if (analyzeError) {
        setError(analyzeError);
        setAnalyzing(false);
        return;
      }

      setExtraction(result);

      const allRawSkills = [
        ...result.technical_skills, ...result.programming_languages,
        ...result.frameworks, ...result.tools, ...result.ai_ml_skills,
        ...result.domain_skills, ...result.ayush_healthcare_skills, ...result.soft_skills,
      ];

      const normalized = normalizeSkillList(allRawSkills);
      const contextStrings = [
        ...result.projects.map((p) => `${p.name} ${p.description} ${p.technologies.join(' ')}`),
        ...result.certifications.map((c) => `${c.name} ${c.issuer} certified`),
        ...result.internships.map((i) => `${i.role} ${i.description}`),
        ...result.work_experience.map((w) => `${w.role} ${w.description}`),
      ];

      const entries = normalized.map((n) => ({
        skill: n.canonical,
        score: inferScoreFromContext(n.canonical, contextStrings),
        category: n.category,
      }));

      setSkillEntries(entries);
      setAcceptedSkills(new Set(entries.map((e) => e.skill)));
      setAnalyzing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload resume');
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const toggleAccept = (skill: string) => {
    setAcceptedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  };

  const handleSave = async () => {
    if (!extraction || !profile) return;

    const acceptedEntries = skillEntries.filter((e) => acceptedSkills.has(e.skill));
    const skills: SkillEntry[] = acceptedEntries.map((e) => ({ skill: e.skill, score: e.score }));
    onSkillsExtracted(skills);

    const { error: syncError } = await syncResumeSkillsToProfile(profile.id, extraction);
    if (syncError) {
      setError(syncError);
    } else {
      setSynced(true);
      onAnalysisComplete?.();
    }

    setExtraction(null);
    setFileName('');
  };

  return (
    <div>
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {uploading || analyzing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500">
              {uploading ? 'Uploading resume...' : 'AI is analyzing your resume...'}
            </p>
            {analyzing && <p className="text-xs text-slate-400">Extracting skills, projects, certifications, and more</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Upload your resume (PDF or text)</p>
            <p className="text-xs text-slate-400">AI will extract your skills, projects, and experience</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {synced && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
          <Check className="w-4 h-4" /> Skills synced to your AI skill profile.
        </div>
      )}

      {extraction && (
        <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900">AI Analysis Results — "{fileName}"</h3>
          </div>

          {extraction.name && (
            <div className="mb-3 text-sm text-slate-600">
              <span className="font-medium">Name:</span> {extraction.name}
              {extraction.degree && <span className="ml-3"><span className="font-medium">Degree:</span> {extraction.degree}</span>}
            </div>
          )}

          {extraction.education.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-500 mb-1">Education</p>
              <div className="space-y-1">
                {extraction.education.map((edu, i) => (
                  <div key={i} className="text-xs text-slate-600">
                    {edu.degree}{edu.specialization ? `, ${edu.specialization}` : ''} — {edu.institution} ({edu.year})
                  </div>
                ))}
              </div>
            </div>
          )}

          {extraction.projects.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-500 mb-1">Projects ({extraction.projects.length})</p>
              <div className="space-y-1">
                {extraction.projects.slice(0, 5).map((p, i) => (
                  <div key={i} className="text-xs text-slate-600">
                    <span className="font-medium">{p.name}</span>: {p.description.substring(0, 80)}
                    {p.description.length > 80 ? '...' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}

          {extraction.certifications.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-500 mb-1">Certifications ({extraction.certifications.length})</p>
              <div className="space-y-1">
                {extraction.certifications.slice(0, 5).map((c, i) => (
                  <div key={i} className="text-xs text-slate-600">
                    {c.name} — {c.issuer} ({c.year})
                  </div>
                ))}
              </div>
            </div>
          )}

          {skillEntries.length > 0 ? (
            <>
              <div className="border-t border-slate-100 pt-3 mt-3">
                <p className="text-xs font-medium text-slate-500 mb-2">
                  Extracted Skills ({skillEntries.length}) — toggle to select which to add
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {skillEntries.map((s) => {
                    const accepted = acceptedSkills.has(s.skill);
                    return (
                      <button
                        key={s.skill}
                        onClick={() => toggleAccept(s.skill)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border-2 transition-all ${
                          accepted ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        {accepted ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {s.skill}
                        <span className="text-slate-400">· {scoreToProficiency(s.score)}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleSave}
                  disabled={acceptedSkills.size === 0}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Add {acceptedSkills.size} skill{acceptedSkills.size !== 1 ? 's' : ''} to profile
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 mt-2">No skills detected. Try a different resume or add skills manually.</p>
          )}
        </div>
      )}
    </div>
  );
}
