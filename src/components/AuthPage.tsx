import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';
import { GraduationCap, Building2, Landmark, Mail, Lock, User, Building } from 'lucide-react';

type Mode = 'signin' | 'signup';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, fullName, role, organizationName);
      if (error) setError(error);
    }
    setLoading(false);
  };

  const roles: { value: UserRole; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: 'student', label: 'Student', desc: 'Take skill assessments and apply for internships', icon: <GraduationCap className="w-5 h-5" /> },
    { value: 'industry', label: 'Industry', desc: 'Post internships and manage applicants', icon: <Building2 className="w-5 h-5" /> },
    { value: 'institution', label: 'Institution', desc: 'View analytics and placement insights', icon: <Landmark className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-700 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <span className="text-white font-bold text-2xl">SB</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Skill Bridge</h1>
          <p className="text-slate-500 mt-2">Bridging Skills to Opportunities</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-8">
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'signin' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'signup' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              Sign Up
            </button>
          </div>

          {mode === 'signup' && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      role === r.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-center mb-1">{r.icon}</div>
                    <span className="text-xs font-medium">{r.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">{roles.find((r) => r.value === role)?.desc}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
                {role !== 'student' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {role === 'industry' ? 'Company Name' : 'Institution Name'}
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                        placeholder={role === 'industry' ? 'e.g. Infosys Technologies' : 'e.g. NIT Warangal'}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center mb-2">Demo accounts (password: password123)</p>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <button onClick={() => { setEmail('aarav.sharma@skillbridge.edu'); setPassword('password123'); setMode('signin'); }} className="text-left p-2 rounded-md hover:bg-slate-50 transition-colors">
                <span className="font-medium text-slate-600">Student:</span> <span className="text-blue-600">aarav.sharma@skillbridge.edu</span>
              </button>
              <button onClick={() => { setEmail('recruiter@infosys.bridge'); setPassword('password123'); setMode('signin'); }} className="text-left p-2 rounded-md hover:bg-slate-50 transition-colors">
                <span className="font-medium text-slate-600">Industry:</span> <span className="text-blue-600">recruiter@infosys.bridge</span>
              </button>
              <button onClick={() => { setEmail('admin@nit.bridge'); setPassword('password123'); setMode('signin'); }} className="text-left p-2 rounded-md hover:bg-slate-50 transition-colors">
                <span className="font-medium text-slate-600">Institution:</span> <span className="text-blue-600">admin@nit.bridge</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
