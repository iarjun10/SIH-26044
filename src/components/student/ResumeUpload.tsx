import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { SkillEntry } from '@/types';
import { Upload, FileText, Loader2, Check, X, Sparkles } from 'lucide-react';

interface ResumeUploadProps {
  onSkillsExtracted: (skills: SkillEntry[]) => void;
}

const KNOWN_SKILLS = [
  'Python', 'JavaScript', 'Java', 'C++', 'React', 'Node.js', 'SQL', 'Git',
  'Docker', 'AWS', 'Machine Learning', 'Data Structures', 'Problem Solving',
  'Communication', 'Teamwork', 'Leadership', 'REST APIs', 'HTML/CSS',
  'TypeScript', 'Redux', 'Django', 'Flask', 'Spring Boot', 'Kotlin',
  'Android', 'Testing', 'Selenium', 'Cloud Computing', 'DevOps',
  'Data Analysis', 'Pandas', 'NumPy', 'TensorFlow', 'Statistics',
  'Tableau', 'Power BI', 'R', 'Project Management', 'Kubernetes',
  'Microservices', 'Hibernate', 'Express', 'MongoDB', 'Firebase',
  'Flutter', 'UI/UX', 'Jenkins', 'NLP', 'Deep Learning',
];

export function ResumeUpload({ onSkillsExtracted }: ResumeUploadProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<SkillEntry[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [acceptedSkills, setAcceptedSkills] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!profile) return;
    setUploading(true);
    setError(null);
    setExtractedSkills(null);
    setFileName(file.name);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Extract text from the file
      let text = '';
      if (file.type === 'application/pdf' || fileExt === 'pdf') {
        text = await extractPdfText(file);
      } else if (file.type.startsWith('image/')) {
        text = extractFromImageName(file.name);
      } else {
        text = await file.text();
      }

      const found = extractSkills(text);
      setExtractedSkills(found);
      setAcceptedSkills(new Set(found.map((s) => s.skill)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload resume');
    }
    setUploading(false);
  };

  const extractSkills = (text: string): SkillEntry[] => {
    const lowerText = text.toLowerCase();
    const found: SkillEntry[] = [];
    for (const skill of KNOWN_SKILLS) {
      if (lowerText.includes(skill.toLowerCase())) {
        const existing = found.some((s) => s.skill.toLowerCase() === skill.toLowerCase());
        if (!existing) {
          found.push({ skill, score: 60 });
        }
      }
    }
    return found;
  };

  const extractFromImageName = (name: string): string => {
    return name.replace(/[_-]/g, ' ').replace(/\.\w+$/, '');
  };

  const extractPdfText = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let text = '';
      for (let i = 0; i < bytes.length; i++) {
        text += String.fromCharCode(bytes[i]);
      }
      return text.replace(/[^\x20-\x7E\n]/g, ' ');
    } catch {
      return '';
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

  const handleSave = () => {
    if (!extractedSkills) return;
    const accepted = extractedSkills.filter((s) => acceptedSkills.has(s.skill));
    onSkillsExtracted(accepted);
    setExtractedSkills(null);
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
          accept=".pdf,image/*,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500">Uploading and analyzing resume...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Upload your resume (PDF or image)</p>
            <p className="text-xs text-slate-400">We'll extract skills and suggest additions to your profile</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {extractedSkills && (
        <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900">Skills detected from "{fileName}"</h3>
          </div>
          {extractedSkills.length === 0 ? (
            <p className="text-sm text-slate-500">No known skills detected. Try a different resume or add skills manually.</p>
          ) : (
            <>
              <p className="text-xs text-slate-400 mb-3">Toggle the skills you want to add to your profile (default score: 60)</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {extractedSkills.map((s) => {
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
