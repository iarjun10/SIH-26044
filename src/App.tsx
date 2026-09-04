import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthPage } from '@/components/AuthPage';
import { Navbar } from '@/components/Navbar';
import { SkillAssessment } from '@/components/student/SkillAssessment';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { InternshipList } from '@/components/student/InternshipList';
import { Portfolio } from '@/components/student/Portfolio';
import { IndustryDashboard } from '@/components/industry/IndustryDashboard';
import { InstitutionDashboard } from '@/components/institution/InstitutionDashboard';

function AppContent() {
  const { profile, loading } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700" />
      </div>
    );
  }

  if (!profile) {
    return <AuthPage />;
  }

  const studentNav = [
    { label: 'Dashboard', page: 'dashboard' },
    { label: 'Assessment', page: 'assessment' },
    { label: 'Internships', page: 'internships' },
    { label: 'Portfolio', page: 'portfolio' },
  ];

  const industryNav = [
    { label: 'Dashboard', page: 'dashboard' },
  ];

  const institutionNav = [
    { label: 'Dashboard', page: 'dashboard' },
  ];

  const navItems = profile.role === 'student' ? studentNav
    : profile.role === 'industry' ? industryNav
    : institutionNav;

  const renderPage = () => {
    if (profile.role === 'student') {
      switch (page) {
        case 'assessment': return <SkillAssessment onComplete={() => setPage('dashboard')} />;
        case 'internships': return <InternshipList />;
        case 'portfolio': return <Portfolio />;
        default: return <StudentDashboard onNavigate={setPage} />;
      }
    }
    if (profile.role === 'industry') {
      return <IndustryDashboard />;
    }
    return <InstitutionDashboard />;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar currentPage={page} onNavigate={setPage} navItems={navItems} />
      {renderPage()}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
