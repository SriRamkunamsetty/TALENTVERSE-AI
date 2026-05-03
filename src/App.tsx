import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useAuthStore } from './store/useAuthStore';
import { Toaster } from '@/components/ui/sonner';

import Landing from './pages/Landing';
import Login from './pages/Login';
import RecruiterDashboard from './pages/recruiter/Dashboard';
import CandidateDashboard from './pages/candidate/Dashboard';
import ResumeWorkspace from './pages/candidate/ResumeWorkspace';
import InterviewWorkspace from './pages/candidate/InterviewWorkspace';
import AnalyticsDashboard from './pages/recruiter/AnalyticsDashboard';
import JobApplicants from './pages/recruiter/JobApplicants';

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: 'candidate' | 'recruiter' | 'admin' }) {
  const { user, role, loading } = useAuthStore();

  if (loading) return <div className="flex items-center justify-center h-screen w-screen bg-black text-white"><div className="animate-pulse">Loading TalentVerse AI...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && role && role !== allowedRole) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default function App() {
  const { setUser, setRole, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user document to get role
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setRole(userSnap.data().role);
          } else {
            // Document might be in the process of being created by Login.tsx
            // We just wait for that to complete, it will navigate to dashboard.
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setRole('candidate'); // fallback
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white selection:bg-orange-500/30 selection:text-orange-200">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
          
          {/* Recruiter Routes */}
          <Route path="/recruiter" element={<ProtectedRoute allowedRole="recruiter"><RecruiterDashboard /></ProtectedRoute>} />
          <Route path="/recruiter/job/:id" element={<ProtectedRoute allowedRole="recruiter"><JobApplicants /></ProtectedRoute>} />
          <Route path="/recruiter/analytics" element={<ProtectedRoute allowedRole="recruiter"><AnalyticsDashboard /></ProtectedRoute>} />

          {/* Candidate Routes */}
          <Route path="/candidate" element={<ProtectedRoute allowedRole="candidate"><CandidateDashboard /></ProtectedRoute>} />
          <Route path="/candidate/resume" element={<ProtectedRoute allowedRole="candidate"><ResumeWorkspace /></ProtectedRoute>} />
          <Route path="/candidate/interview/:applicationId" element={<ProtectedRoute allowedRole="candidate"><InterviewWorkspace /></ProtectedRoute>} />
          
        </Routes>
      </div>
      <Toaster theme="dark" />
    </BrowserRouter>
  );
}

function DashboardRouter() {
  const { role } = useAuthStore();
  if (role === 'recruiter') return <Navigate to="/recruiter" replace />;
  return <Navigate to="/candidate" replace />;
}
