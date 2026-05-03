import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Briefcase, Zap, BrainCircuit, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import { parseResumeWithAI, calculateMatchScore } from '../../services/geminiService';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function CandidateDashboard() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [resumeHistory, setResumeHistory] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    
    // Fetch all open jobs
    const q = query(collection(db, 'jobs')); // In production, add where('status', '==', 'open')
    const unsubscribeJobs = onSnapshot(q, (snapshot) => {
      const j = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobs(j);
      setLoading(false);
    });

    // Fetch user's applications
    const qApps = query(collection(db, 'applications'), where('candidateId', '==', user.uid));
    const unsubscribeApps = onSnapshot(qApps, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(apps);
    });

    // Fetch user's resume analysis
    const qResume = query(collection(db, 'resumes'), where('candidateId', '==', user.uid));
    const unsubscribeResume = onSnapshot(qResume, (snapshot) => {
        if (!snapshot.empty) {
            // Sort by newest
            const sorted = snapshot.docs.map(d => ({id: d.id, ...d.data()})).sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setResumeHistory(sorted);
            setResumeData(sorted[0]);
        }
    });

    return () => {
        unsubscribeJobs();
        unsubscribeApps();
        unsubscribeResume();
    };
  }, [user]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelUpload = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setUploading(false);
          setUploadStage(null);
          toast.warning("Upload cancelled securely.");
      }
  };

  const processFile = async (file: File) => {
    if (!file || !user) return;
    if (file.type !== 'application/pdf') {
        toast.error("Security: Invalid file format. Only PDF files allowed.");
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        toast.error("Security: File exceeds 5MB limit.");
        return;
    }
    
    // Setup AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setUploading(true);
    
    // Simulate cinematic stages
    const stages = [
        "Parsing Document Structure...",
        "Extracting Semantic Signals...",
        "Evaluating Technical Depth...",
        "Building Intelligence Graph...",
        "Synthesizing Cognitive Profile..."
    ];
    
    let currentStage = 0;
    setUploadStage(stages[currentStage]);
    
    const stageInterval = setInterval(() => {
        currentStage++;
        if (currentStage < stages.length) {
            setUploadStage(stages[currentStage]);
        } else {
            clearInterval(stageInterval);
        }
    }, 1500);

    try {
        const base64 = await toBase64(file);
        if (signal.aborted) throw new Error("Upload cancelled");
        
        const base64Data = base64.split(',')[1] || base64; 
        
        let previousText = undefined;
        if (resumeHistory.length > 0) {
           previousText = JSON.stringify(resumeHistory[0].aiAnalysis);
        }

        const insights = await parseResumeWithAI(base64Data, file.type, previousText);
        if (signal.aborted) throw new Error("Upload cancelled");
        
        clearInterval(stageInterval);
        setUploadStage("Generating Explainable Insights...");
        
        // Import storage inside function since top level didn't have it
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('../../lib/firebase');
        
        setUploadStage("Securing Document Artifact...");
        const version = resumeHistory.length + 1;
        const storageRef = ref(storage, `resumes/${user.uid}/resume_v${version}.pdf`);
        await uploadBytes(storageRef, file);
        if (signal.aborted) throw new Error("Upload cancelled");
        
        const fileUrl = await getDownloadURL(storageRef);

        // Save to firestore
        await addDoc(collection(db, 'resumes'), {
            candidateId: user.uid,
            fileName: file.name,
            fileUrl,
            fileSize: file.size,
            version,
            aiAnalysis: insights,
            createdAt: serverTimestamp()
        });

        if (!signal.aborted) {
            toast.success("Intelligence profile updated securely.", { icon: <ShieldCheck className="w-4 h-4 text-green-400" /> });
        }
    } catch(err: any) {
        clearInterval(stageInterval);
        if (err.message === "Upload cancelled") {
            // Already handled in cancelUpload
            return;
        }
        if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
            toast.error("AI service quota exceeded. Please check your Gemini API plan.");
        } else {
            toast.error(`Error processing resume: ${err.message}`);
        }
    } finally {
        clearInterval(stageInterval);
        if (abortControllerRef.current === controller) {
            setUploading(false);
            setUploadStage(null);
            abortControllerRef.current = null;
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
  });

  const handleApply = async (job: any) => {
    if (!resumeData) return toast.error("Please upload a resume first");
    if (!user) return;

    toast.info("Calculating Deep Semantic Match...", { icon: <Activity className="animate-pulse text-blue-400 w-4 h-4" />});

    try {
        // Deep Semantic Match
        const matchResult = await calculateMatchScore(resumeData.aiAnalysis, job.description);

        if (matchResult.score < 20) {
           toast.warning("Low confidence match. Applying anyway, but results may vary.");
        }

        await addDoc(collection(db, 'applications'), {
            candidateId: user.uid,
            jobId: job.id,
            resumeId: resumeData.id,
            matchScore: matchResult.score,
            aiExplanation: matchResult.explanation,
            aiConfidenceScore: matchResult.aiConfidenceScore || 90,
            status: 'applied',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        
        toast.success(`Applied! AI Match Score: ${matchResult.score}/100`);
    } catch(err: any) {
        toast.error(`Error applying: ${err.message}`);
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-8 font-sans selection:bg-blue-500/30">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Talent Intelligence Portal</h1>
        </div>
        <div className="flex items-center space-x-4">
            <span className="text-sm text-white/50 bg-white/5 px-4 py-2 rounded-full border border-white/10 hidden md:inline-block">{user?.email}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-1">
            <Card className="bg-black/40 border-white/5 backdrop-blur-xl h-full shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                <CardHeader className="relative z-10">
                    <CardTitle className="text-lg font-medium text-white flex items-center">
                        <FileText className="w-5 h-5 text-purple-400 mr-2" /> 
                        Your Brain Trust
                    </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 p-6">
                    {uploading ? (
                       <div className="flex flex-col items-center justify-center p-8 bg-black/60 rounded-2xl border border-white/5 shadow-inner min-h-[300px]">
                           <div className="relative mb-8">
                               <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full w-16 h-16 animate-pulse" />
                               <div className="w-16 h-16 relative bg-[#111] rounded-full border border-purple-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                                   <Activity className="w-6 h-6 text-purple-400 animate-spin-slow" />
                                   <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                               </div>
                           </div>
                           <h3 className="text-sm font-mono tracking-widest uppercase text-white/80 mb-2">{uploadStage}</h3>
                           <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-1/2 animate-[pulse_1s_ease-in-out_infinite] translate-x-1/2 rounded-full" />
                           </div>
                           <p className="text-xs text-white/40 mt-6 text-center max-w-[200px] mb-4">Please do not close this window. AI is synthesizing cognitive patterns.</p>
                           <Button onClick={cancelUpload} variant="ghost" className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full mt-2">
                               Cancel Analysis
                           </Button>
                       </div>
                    ) : !resumeData ? (
                        <div 
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed ${isDragging ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 bg-white/[0.02]'} rounded-2xl p-10 text-center hover:bg-white/[0.04] transition-all duration-300 group flex flex-col items-center justify-center min-h-[300px]`}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 ${isDragging ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/30 group-hover:text-purple-400'}`}>
                                <BrainCircuit className="w-8 h-8" />
                            </div>
                            <h3 className="mb-2 text-base font-medium">Initialize Intelligence</h3>
                            <p className="text-xs text-white/40 mb-8 max-w-[250px] leading-relaxed">Drag and drop your PDF resume here, or click to browse. Max 5MB.</p>
                            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="relative cursor-pointer bg-white text-black hover:bg-white/90 rounded-full px-8 h-12 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-transform active:scale-95 font-medium">
                                Select File
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full w-full opacity-50 block" />
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-xs font-mono text-green-400 bg-green-400/10 px-2 py-1 rounded">
                                    <ShieldCheck className="w-3 h-3 mr-1" /> VALIDATED
                                </div>
                                <div className="text-xs text-white/40 font-mono">
                                    CONFIDENCE: {resumeData.aiAnalysis.aiConfidenceScore || 95}%
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2">AI Output Summary</h4>
                                <p className="text-sm text-white/80 leading-relaxed bg-black/50 p-4 rounded-xl border border-white/5">{resumeData.aiAnalysis.summary}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-black/50 rounded-xl border border-white/5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 blur-2xl rounded-full group-hover:bg-blue-500/10 transition-colors" />
                                    <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">Engineering Depth</h4>
                                    <div className="text-3xl font-light text-blue-400 flex items-baseline">{resumeData.aiAnalysis.engineeringDepth}<span className="text-sm text-blue-400/50 ml-1">/10</span></div>
                                </div>
                                <div className="p-4 bg-black/50 rounded-xl border border-white/5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 blur-2xl rounded-full group-hover:bg-purple-500/10 transition-colors" />
                                    <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">Growth Trajectory</h4>
                                    <div className="text-3xl font-light text-purple-400 flex items-baseline">{resumeData.aiAnalysis.growthTrajectory}<span className="text-sm text-purple-400/50 ml-1">/10</span></div>
                                </div>
                            </div>
                            
                            {(resumeData.aiAnalysis.atsScore || resumeData.aiAnalysis.readabilityScore) && (
                                <div className="grid grid-cols-2 gap-4">
                                    {resumeData.aiAnalysis.atsScore && (
                                        <div className="p-4 bg-black/50 rounded-xl border border-white/5">
                                            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">ATS Optimization</h4>
                                            <div className="text-2xl font-light text-green-400">{resumeData.aiAnalysis.atsScore}<span className="text-sm text-green-400/50 ml-1">/100</span></div>
                                        </div>
                                    )}
                                    {resumeData.aiAnalysis.readabilityScore && (
                                        <div className="p-4 bg-black/50 rounded-xl border border-white/5">
                                            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">Readability</h4>
                                            <div className="text-2xl font-light text-orange-400">{resumeData.aiAnalysis.readabilityScore}<span className="text-sm text-orange-400/50 ml-1">/100</span></div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2">Core Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {resumeData.aiAnalysis.skills?.slice(0, 8).map((s: string) => (
                                        <span key={s} className="px-2 py-1 text-xs bg-white/5 rounded-md border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-default">{s}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 mt-6 border-t border-white/10">
                                {resumeData.aiAnalysis.diffInsights && resumeData.aiAnalysis.diffInsights.length > 0 && (
                                    <div className="mb-6 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                                        <div className="flex items-center text-purple-400 mb-3 text-xs tracking-widest uppercase font-mono">
                                            <Zap className="w-4 h-4 mr-2" /> AI Evolution Detected
                                        </div>
                                        <ul className="space-y-2">
                                            {resumeData.aiAnalysis.diffInsights.map((insight: string, idx: number) => (
                                                <li key={idx} className="flex items-start text-sm text-white/80">
                                                    <span className="text-purple-400 mr-2 mt-0.5">•</span> {insight}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-xs text-white/40 mb-4 px-2">
                                    <span>Version {resumeData.version || 1} • {resumeHistory.length} Total Versions</span>
                                </div>
                                <div 
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`relative ${isDragging ? 'bg-purple-500/20 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.2)]' : ''} transition-all duration-300 rounded-2xl`}
                                >
                                    <Button 
                                        disabled={uploading} 
                                        onClick={() => fileInputRef.current?.click()}
                                        variant="outline" 
                                        className="w-full h-12 relative cursor-pointer border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all"
                                    >
                                        {isDragging ? 'Drop Replacement File' : 'Update Cognitive Profile (PDF)'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Hidden global file input for robust uploads */}
                    <input 
                        type="file" 
                        accept=".pdf" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileUpload} 
                    />
                </CardContent>
            </Card>
        </motion.div>

        <motion.div variants={container} initial="hidden" animate="show" className="lg:col-span-2 space-y-12">
            <div>
                <h2 className="text-xl font-semibold mb-6 flex items-center tracking-tight">
                    <BrainCircuit className="w-5 h-5 mr-3 text-purple-400" />
                    Neural Matches & Applications
                </h2>
                <div className="space-y-4">
                    {applications.length === 0 ? (
                         <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                            <p className="text-white/40 text-sm">No applications yet.</p>
                         </div>
                    ) : applications.map(app => (
                        <motion.div variants={item} key={app.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between backdrop-blur-md group hover:border-white/20 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${app.matchScore >= 80 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                    {app.matchScore}
                                </div>
                                <div>
                                    <h3 className="font-medium text-white/90">Application Record</h3>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className="text-xs text-white/50 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">{app.status}</span>
                                        {app.aiConfidenceScore && app.aiConfidenceScore < 80 && (
                                            <span className="text-[10px] text-orange-400 flex items-center">
                                                <AlertTriangle className="w-3 h-3 mr-1" /> Low Confidence
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Link to={`/candidate/interview/${app.id}`}>
                                <Button size="sm" variant="outline" className="border-white/10 text-white bg-white/5 hover:bg-white/10 rounded-full px-6 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <Zap className="w-3 h-3 mr-2 text-yellow-400" />
                                    Initiate AI Interview
                                </Button>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-6 flex items-center tracking-tight">
                    <Briefcase className="w-5 h-5 mr-3 text-blue-400" />
                    Recommended Opportunities
                </h2>
                
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-40 bg-white/5 rounded-3xl"></div>
                        <div className="h-40 bg-white/5 rounded-3xl"></div>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
                        <p className="text-white/40">No opportunities available at the moment.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {jobs.map(job => (
                            <motion.div variants={item} key={job.id} className="p-6 md:p-8 rounded-3xl bg-black/40 border border-white/5 flex flex-col md:flex-row gap-6 hover:bg-white/[0.02] hover:border-white/10 transition-all relative overflow-hidden group backdrop-blur-md">
                                
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-3">
                                        <h3 className="text-xl font-medium tracking-tight text-white/90">{job.title}</h3>
                                        <span className="text-green-400 font-mono text-[10px] tracking-widest uppercase bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">Active</span>
                                    </div>
                                    <div className="text-white/40 mb-4 text-sm font-medium">{job.company}</div>
                                    <p className="text-sm text-white/60 line-clamp-2 leading-relaxed max-w-2xl">
                                        {job.description}
                                    </p>
                                </div>

                                <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8 min-w-[200px]">
                                    <Button 
                                        onClick={() => handleApply(job)}
                                        disabled={!resumeData}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center space-x-2 h-12 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                                    >
                                        <span>Deep Apply</span>
                                        <Zap className="w-4 h-4" />
                                    </Button>
                                    {!resumeData && <p className="text-[10px] font-mono text-orange-400/80 text-center mt-3 tracking-widest uppercase">Profile Required</p>}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
      </div>
    </div>
  );
}
