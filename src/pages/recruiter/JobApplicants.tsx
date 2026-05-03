import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Activity, Bot, Zap } from 'lucide-react';

export default function JobApplicants() {
    const { id } = useParams();
    const [job, setJob] = useState<any>(null);
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        
        getDoc(doc(db, 'jobs', id)).then(snap => {
            if (snap.exists()) setJob({ id: snap.id, ...snap.data() });
        });

        const q = query(collection(db, 'applications'), where('jobId', '==', id));
        const unsub = onSnapshot(q, async (snap) => {
            const apps = [];
            for (let d of snap.docs) {
                const appData = { id: d.id, ...d.data() } as any;
                // Fetch candidate name if we had it, but we can do a simplified version
                const candidateSnap = await getDoc(doc(db, 'users', appData.candidateId));
                if (candidateSnap.exists()) {
                    appData.candidate = candidateSnap.data();
                }
                const resumeSnap = await getDoc(doc(db, 'resumes', appData.resumeId));
                if (resumeSnap.exists()) {
                    appData.resume = resumeSnap.data();
                }
                apps.push(appData);
            }
            // Sort by match score
            apps.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
            setApplications(apps);
            setLoading(false);
        });

        return () => unsub();
    }, [id]);

    if (loading) return <div className="p-8 text-white">Loading Intelligence...</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8">
            <header className="mb-8 flex items-center space-x-4">
                <Link to="/recruiter">
                    <Button variant="ghost" className="text-white/50 hover:text-white">
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">{job?.title} - Talent Pool</h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {applications.map(app => (
                    <div key={app.id} className="p-6 bg-[#111] border border-white/10 rounded-2xl flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{app.candidate?.displayName || app.candidate?.email || 'Anonymous Candidate'}</h3>
                                        <p className="text-xs text-white/40">Applied {new Date(app.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-bold ${app.matchScore >= 80 ? 'text-green-400' : 'text-blue-400'}`}>
                                        {app.matchScore}%
                                    </div>
                                    <div className="text-[10px] uppercase text-white/50 tracking-wider">AI Match</div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h4 className="flex items-center text-xs uppercase tracking-wider text-white/40 mb-2">
                                        <Bot className="w-3 h-3 mr-1" /> AI Reasoning
                                    </h4>
                                    <p className="text-sm text-white/80 leading-relaxed text-balance">
                                        {app.aiExplanation}
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-xs uppercase text-white/40 mb-1">Missing Skills</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {app.resume?.aiAnalysis?.missingSkills?.length ? app.resume.aiAnalysis.missingSkills.map((s: string) => (
                                                <span key={s} className="px-1.5 py-0.5 bg-red-500/10 text-red-300 text-[10px] rounded">{s}</span>
                                            )) : <span className="text-xs text-green-400">Perfect match</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-xs uppercase text-white/40 mb-1">Growth Signals</h4>
                                        <p className="text-xs text-white/70">{app.resume?.aiAnalysis?.growthTrajectory}/10 Potential</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 pt-4 border-t border-white/10">
                            <Button className="flex-1 bg-white hover:bg-white/90 text-black">
                                Reveal Contact
                            </Button>
                            <Button variant="outline" className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-white">
                                <Zap className="w-4 h-4 mr-2" /> Start AI Interview
                            </Button>
                        </div>
                    </div>
                ))}
                
                {applications.length === 0 && (
                     <div className="md:col-span-2 text-center py-20 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-white/40">No applications yet. The AI is scanning the talent pool.</p>
                     </div>
                )}
            </div>
        </div>
    );
}
