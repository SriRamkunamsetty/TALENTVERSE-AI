import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Briefcase, Users, BrainCircuit, Activity } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { analyzeJobBias } from '../../services/geminiService';
import { toast } from 'sonner';

export default function RecruiterDashboard() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [biasResult, setBiasResult] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'jobs'), where('recruiterId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const j = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobs(j);
      setLoading(false);
    }, (err) => {
        console.error('Firestore Error: ', err.message);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAnalyzeBias = async () => {
    if (!newDesc) return toast.error("Description is empty");
    setIsAnalyzing(true);
    try {
      const res = await analyzeJobBias(newDesc);
      setBiasResult(res);
      if (res.hasBias) {
        toast.warning(`Bias detected! Score: ${res.biasScore}/10`);
      } else {
        toast.success("Great job! No significant bias detected.");
      }
    } catch(e) {
      toast.error("Failed to analyze bias");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateJob = async () => {
    if (!newTitle || !newCompany || !newDesc) return toast.error("Fill all fields");
    try {
      await addDoc(collection(db, 'jobs'), {
        recruiterId: user?.uid,
        title: newTitle,
        company: newCompany,
        description: newDesc,
        aiAnalysis: biasResult || null,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Job posted successfully!");
      setNewTitle('');
      setNewCompany('');
      setNewDesc('');
      setBiasResult(null);
    } catch(e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
            <Activity className="w-5 h-5 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Recruiter Command Center</h1>
        </div>
        <div className="flex items-center space-x-4">
            <Link to="/recruiter/analytics">
                <Button variant="outline" className="border-white/10 bg-black text-white hover:bg-white/10">
                    Analytics Hub
                </Button>
            </Link>
            <span className="text-sm text-white/50">{user?.email}</span>
            <Dialog>
                <DialogTrigger asChild>
                    <Button className="bg-orange-600 hover:bg-orange-500 text-white rounded-full px-6">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Position
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#111] border-white/10 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">New AI-Optimized Position</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <Input placeholder="Job Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="bg-white/5 border-white/10" />
                        <Input placeholder="Company" value={newCompany} onChange={e => setNewCompany(e.target.value)} className="bg-white/5 border-white/10" />
                        
                        <div className="relative">
                            <Textarea 
                                placeholder="Job Description (Paste here for AI evaluation)" 
                                value={newDesc} 
                                onChange={e => setNewDesc(e.target.value)}
                                className="min-h-[200px] bg-white/5 border-white/10" 
                            />
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={handleAnalyzeBias}
                                disabled={isAnalyzing || !newDesc}
                                className="absolute bottom-4 right-4 bg-black/50 border-orange-500/50 text-orange-400 hover:text-orange-300 hover:bg-black/80"
                            >
                                <BrainCircuit className="w-4 h-4 mr-2" />
                                {isAnalyzing ? 'Analyzing...' : 'Audit for Bias'}
                            </Button>
                        </div>

                        {biasResult && (
                            <div className={`p-4 rounded-xl border ${biasResult.hasBias ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                                <h4 className="font-semibold mb-2 flex items-center space-x-2">
                                    <span>AI Audit Result</span>
                                    {biasResult.hasBias && <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">Bias Score: {biasResult.biasScore}/10</span>}
                                </h4>
                                {biasResult.hasBias ? (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium text-red-300 mb-1">Issues Found:</p>
                                            <ul className="list-disc pl-5 text-sm text-white/70 space-y-1">
                                                {biasResult.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-green-300 mb-1">Suggested Rewrite:</p>
                                            <div className="p-3 bg-black/30 rounded border border-white/10 text-sm text-white/80 whitespace-pre-wrap">
                                                {biasResult.improvedDescription}
                                            </div>
                                            <Button 
                                                size="sm" 
                                                variant="secondary" 
                                                className="mt-2 text-xs"
                                                onClick={() => setNewDesc(biasResult.improvedDescription)}
                                            >
                                                Use Rewrite
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-green-400">This description looks highly inclusive and unbiased!</p>
                                )}
                            </div>
                        )}

                        <Button onClick={handleCreateJob} className="w-full bg-white text-black hover:bg-white/90">
                            Publish Position
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/50 uppercase tracking-widest flex items-center">
                    <Briefcase className="w-4 h-4 mr-2" /> Open Positions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-light">{jobs.length}</div>
            </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/50 uppercase tracking-widest flex items-center">
                    <Users className="w-4 h-4 mr-2" /> Total Candidates
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-light">--</div>
            </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/50 uppercase tracking-widest flex items-center">
                    <BrainCircuit className="w-4 h-4 mr-2" /> Avg AI Match Score
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-light">--%</div>
            </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-6 flex items-center">
            Active Positions
        </h2>
        {loading ? (
            <div className="animate-pulse space-y-4">
                <div className="h-24 bg-white/5 rounded-xl"></div>
                <div className="h-24 bg-white/5 rounded-xl"></div>
            </div>
        ) : jobs.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                <p className="text-white/40">No positions created yet.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {jobs.map(job => (
                    <div key={job.id} className="p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between group cursor-pointer">
                        <div>
                            <h3 className="text-lg font-medium">{job.title}</h3>
                            <div className="flex items-center space-x-3 mt-2 text-sm text-white/40">
                                <span>{job.company}</span>
                                <span>â</span>
                                <span>{new Date(job.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</span>
                                {job.aiAnalysis?.hasBias && (
                                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs border border-red-500/20">Checked: Biased</span>
                                )}
                                {job.aiAnalysis && !job.aiAnalysis.hasBias && (
                                    <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs border border-green-500/20">Checked: Inclusive</span>
                                )}
                            </div>
                        </div>
                        <Link to={`/recruiter/job/${job.id}`}>
                            <Button variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity border-white/10 bg-black">
                                View Candidates
                            </Button>
                        </Link>
                    </div>
                ))}
            </div>
        )}
      </div>

    </div>
  );
}
