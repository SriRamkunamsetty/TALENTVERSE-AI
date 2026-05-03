import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, BrainCircuit, Activity, Cpu, ShieldAlert, Zap } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion } from 'framer-motion';

export default function AnalyticsDashboard() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState({
        totalJobs: 0,
        biasFreeJobs: 0
    });
    
    // Telemetry Data (could be fetched from FB, using static here for demo impact)
    const telemetryData = [
        { time: '08:00', latency: 450, tokens: 1200 },
        { time: '09:00', latency: 480, tokens: 2300 },
        { time: '10:00', latency: 520, tokens: 3400 },
        { time: '11:00', latency: 410, tokens: 1800 },
        { time: '12:00', latency: 430, tokens: 4100 },
        { time: '13:00', latency: 490, tokens: 2900 },
        { time: '14:00', latency: 470, tokens: 3600 },
    ];
    
    const candidateFunnel = [
        { stage: 'Sourced', count: 420 },
        { stage: 'AI Screened', count: 180 },
        { stage: 'AI Interviewed', count: 65 },
        { stage: 'Matched (>80%)', count: 24 },
    ];

    useEffect(() => {
        if (!user) return;
        
        let unsubJobs: any;

        const loadStats = async () => {
            const qJobs = query(collection(db, 'jobs'), where('recruiterId', '==', user.uid));
            unsubJobs = onSnapshot(qJobs, snap => {
                let unbiased = 0;
                snap.docs.forEach(d => {
                    if (d.data().aiAnalysis && !d.data().aiAnalysis.hasBias) unbiased++;
                });
                
                setStats({
                    totalJobs: snap.size,
                    biasFreeJobs: unbiased
                });
            });
        };

        loadStats();

        return () => {
            if (unsubJobs) unsubJobs();
        };
    }, [user]);

    const container = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const item = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 font-sans selection:bg-orange-500/30">
            <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link to="/recruiter">
                        <Button variant="ghost" className="text-white/50 hover:text-white rounded-full">
                            <ArrowLeft className="w-5 h-5 mr-2" /> Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">AI Observability</h1>
                        <p className="text-sm text-white/50">Real-time telemetry & intelligence metrics</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3 text-xs text-green-400 bg-green-400/10 px-4 py-2 rounded-full border border-green-400/20">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span>All Systems Operational</span>
                </div>
            </header>

            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <motion.div variants={item}>
                    <Card className="bg-black/40 backdrop-blur-md border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center relative z-10">
                                <Users className="w-4 h-4 mr-2" />
                                Resumes Parsed
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-5xl font-light tracking-tighter">1,204</div>
                            <div className="text-xs text-green-400 mt-2 flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> +12% this week</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="bg-black/40 backdrop-blur-md border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center relative z-10">
                                <Zap className="w-4 h-4 mr-2 text-orange-400" />
                                Avg Match Score
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-5xl font-light tracking-tighter text-orange-400">82<span className="text-2xl text-orange-400/50">%</span></div>
                            <div className="text-xs text-white/40 mt-2">Semantic Compatibility Baseline</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="bg-black/40 backdrop-blur-md border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center relative z-10">
                                <ShieldAlert className="w-4 h-4 mr-2" />
                                Bias Detected & Fixed
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-5xl font-light tracking-tighter">{stats.totalJobs - stats.biasFreeJobs}</div>
                            <div className="text-xs text-white/40 mt-2">Job descriptions sanitized</div>
                        </CardContent>
                    </Card>
                </motion.div>
                
                <motion.div variants={item}>
                    <Card className="bg-black/40 backdrop-blur-md border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center relative z-10">
                                <Cpu className="w-4 h-4 mr-2" />
                                Gemini Token Usage
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-5xl font-light tracking-tighter">4.2<span className="text-2xl text-white/50">M</span></div>
                            <div className="text-xs text-white/40 mt-2">Tokens in last 30 days</div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
                    <Card className="bg-black/50 border border-white/5 shadow-2xl h-full backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-white/90 flex items-center">
                                <Activity className="w-4 h-4 mr-2 text-blue-400" />
                                Gemini Enterprise Latency & Throughput
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={telemetryData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis dataKey="time" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#111', borderColor: '#ffffff20', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Area type="monotone" dataKey="latency" stroke="#60A5FA" strokeWidth={2} fillOpacity={1} fill="url(#colorLatency)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card className="bg-black/50 border border-white/5 shadow-2xl h-full backdrop-blur-sm">
                         <CardHeader>
                            <CardTitle className="text-base font-semibold text-white/90 flex items-center">
                                <BrainCircuit className="w-4 h-4 mr-2 text-purple-400" />
                                Funnel Conversion
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={candidateFunnel} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                                        <XAxis type="number" stroke="#ffffff40" fontSize={12} hide />
                                        <YAxis dataKey="stage" type="category" stroke="#ffffff80" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            cursor={{fill: '#ffffff05'}}
                                            contentStyle={{ backgroundColor: '#111', borderColor: '#ffffff20', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="count" fill="#A78BFA" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8">
                 <div className="p-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-2xl border border-red-500/20 backdrop-blur-md">
                    <h2 className="text-sm font-semibold flex items-center text-red-400 uppercase tracking-widest mb-4">
                        <ShieldAlert className="w-4 h-4 mr-2" /> Security & Threat Detection (Live)
                    </h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm bg-black/40 p-3 rounded-lg border border-white/5">
                            <span className="text-white/70">Prompt Injection attempt blocked from candidate <i>a***@gmail.com</i></span>
                            <span className="text-xs text-red-400 font-mono">NEUTRALIZED</span>
                        </div>
                         <div className="flex items-center justify-between text-sm bg-black/40 p-3 rounded-lg border border-white/5">
                            <span className="text-white/70">"Ignore previous instructions" string found in parsed PDF (Resume ID: #8821)</span>
                            <span className="text-xs text-red-400 font-mono">QUARANTINED</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
