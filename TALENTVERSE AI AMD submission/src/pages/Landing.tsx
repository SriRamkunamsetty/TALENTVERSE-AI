import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '../store/useAuthStore';
import { BrainCircuit, Sparkles, Target, Zap } from 'lucide-react';

export default function Landing() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-black overflow-hidden relative selection:bg-orange-500/30">
      
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 backdrop-blur-md border-b border-white/5 bg-black/50">
        <div className="flex items-center space-x-2">
          <BrainCircuit className="w-8 h-8 text-orange-500" />
          <span className="font-display text-xl font-bold tracking-tighter text-white">TALENTVERSE AI</span>
        </div>
        <div>
          {user ? (
            <Link to="/dashboard">
              <Button variant="outline" className="border-white/10 hover:bg-white/10 text-black dark:text-white">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto"
        >
          <div className="inline-flex items-center space-x-2 px-3 py-1 mb-8 rounded-full bg-white/5 border border-white/10 text-sm text-orange-200">
            <Sparkles className="w-4 h-4" />
            <span>The Intelligence Operating System for Hiring</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/30 mb-8 leading-[0.9]">
            Hire with precision.<br />
            Powered by multi-agent AI.
          </h1>
          
          <p className="text-xl md:text-2xl text-white/50 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
            Move beyond keywords and bias. TalentVerse uses deep semantic reasoning to analyze engineering depth, growth trajectory, and pure potential.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link to={user ? "/dashboard" : "/login"}>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-full font-medium tracking-wide flex items-center space-x-2 transition-colors shadow-[0_0_40px_-10px_rgba(249,115,22,0.5)]"
              >
                <span>Enter Workspace</span>
                <BrainCircuit className="w-5 h-5" />
              </motion.button>
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-32 relative z-10"
        >
          <FeatureCard 
            icon={<Target className="w-5 h-5 text-orange-400" />}
            title="Semantic Matching"
            description="Vector-based skill matching that understands transferable skills and actual capability, not just job titles."
          />
          <FeatureCard 
            icon={<Zap className="w-5 h-5 text-blue-400" />}
            title="AI Interviewer Agent"
            description="Preliminary screening rounds conducted by an adaptive AI that adjusts questioning based on candidate responses."
          />
          <FeatureCard 
            icon={<BrainCircuit className="w-5 h-5 text-emerald-400" />}
            title="Bias Detection"
            description="Examine JDs and resumes through an objective lens, removing gendered language and revealing pure talent."
          />
        </motion.div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md text-left hover:bg-white/10 transition-colors">
      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 text-white/90">{title}</h3>
      <p className="text-white/50 leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
}
