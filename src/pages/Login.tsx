import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { BrainCircuit } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { setRole } = useAuthStore();

  const handleGoogleLogin = async (role: 'candidate' | 'recruiter') => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: result.user.email || 'no-email@talentverse.com',
          displayName: result.user.displayName || 'Anonymous',
          photoURL: result.user.photoURL || '',
          role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setRole(role);
      } else {
        setRole(userSnap.data().role);
      }
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error?.message?.includes('popup-closed-by-user') || error?.code === 'auth/popup-closed-by-user') {
        toast.error('The login popup was closed. Please try again or open the app in a new tab if it was blocked.');
      } else {
        toast.error(`Login failed: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
              <BrainCircuit className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold tracking-tight text-center text-white mb-2">Welcome to TalentVerse</h2>
          <p className="text-white/50 text-center mb-10">Select your workspace to continue</p>
          
          <div className="space-y-4">
            <button 
              onClick={() => handleGoogleLogin('recruiter')}
              disabled={loading}
              className="w-full group relative px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-left flex items-center justify-between overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <span className="block text-lg font-medium text-white mb-1">I am a Recruiter</span>
                <span className="block text-sm text-white/50">Find top engineering talent with AI</span>
              </div>
              <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center relative z-10 group-hover:border-orange-500/50 group-hover:bg-orange-500/20 transition-colors">
                <span className="text-white/50 group-hover:text-orange-500 transition-colors">â</span>
              </div>
            </button>

            <button 
              onClick={() => handleGoogleLogin('candidate')}
              disabled={loading}
              className="w-full group relative px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-left flex items-center justify-between overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <span className="block text-lg font-medium text-white mb-1">I am a Candidate</span>
                <span className="block text-sm text-white/50">Discover roles matching your skills</span>
              </div>
              <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center relative z-10 group-hover:border-blue-500/50 group-hover:bg-blue-500/20 transition-colors">
                <span className="text-white/50 group-hover:text-blue-500 transition-colors">â</span>
              </div>
            </button>
          </div>
          
          {loading && (
            <div className="mt-8 text-center text-sm text-white/40 animate-pulse">
              Authenticating via Google...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
