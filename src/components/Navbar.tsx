import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { LogOut, GraduationCap, Building2, Landmark, User } from 'lucide-react';
import type { ReactNode } from 'react';
import type { UserRole } from '@/types';

const roleConfig: Record<UserRole, { label: string; icon: ReactNode }> = {
  student: { label: 'Student', icon: <GraduationCap className="w-4 h-4" /> },
  industry: { label: 'Industry', icon: <Building2 className="w-4 h-4" /> },
  institution: { label: 'Institution', icon: <Landmark className="w-4 h-4" /> },
};

interface NavItem {
  label: string;
  page: string;
}

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  navItems: NavItem[];
}

export function Navbar({ currentPage, onNavigate, navItems }: NavbarProps) {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    await supabase.auth.signOut();
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SB</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold text-slate-900">Skill Bridge</span>
                <span className="text-xs text-slate-500 block leading-none">Bridging Skills to Opportunities</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === item.page
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50">
              <span className="text-slate-600">
                {profile && roleConfig[profile.role].icon}
              </span>
              <div className="hidden sm:block">
                <span className="text-sm font-medium text-slate-700">{profile?.full_name}</span>
                <span className="text-xs text-slate-400 block leading-none">
                  {profile && roleConfig[profile.role].label}
                </span>
              </div>
              <User className="w-4 h-4 text-slate-400 sm:hidden" />
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                currentPage === item.page
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
