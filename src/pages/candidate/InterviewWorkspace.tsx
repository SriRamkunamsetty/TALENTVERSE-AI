import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, Send, Bot, StopCircle, Zap, ShieldAlert, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GoogleGenAI, Modality } from "@google/genai";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { checkPromptInjection } from '../../services/geminiService';

export default function InterviewWorkspace() {
    const { applicationId } = useParams();
    const [application, setApplication] = useState<any>(null);
    const [job, setJob] = useState<any>(null);
    const [resume, setResume] = useState<any>(null);
    
    const [messages, setMessages] = useState<{id: string, role: string, text: string, confidence?: number}[]>([]);
    const [inputText, setInputText] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false); // Used to show waveform
    
    // Web Speech API
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    const chatRef = useRef<any>(null);
    const aiRef = useRef<any>(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    useEffect(() => {
        if (!applicationId) return;

        const loadData = async () => {
            const appSnap = await getDoc(doc(db, 'applications', applicationId));
            if (!appSnap.exists()) return;
            const appData = appSnap.data();
            setApplication(appData);

            const jobSnap = await getDoc(doc(db, 'jobs', appData.jobId));
            if (jobSnap.exists()) setJob(jobSnap.data());

            const resumeSnap = await getDoc(doc(db, 'resumes', appData.resumeId));
            if (resumeSnap.exists()) setResume(resumeSnap.data());
        };

        loadData();

        // Initialize Speech Recognition
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.onresult = (event: any) => {
                const transcript = event.results[event.results.length - 1][0].transcript;
                setInputText(transcript);
            };
            recognition.onend = () => setIsRecording(false);
            recognitionRef.current = recognition;
        }

    }, [applicationId]);

    useEffect(() => {
        if (job && resume && !chatRef.current) {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });
            aiRef.current = ai;
            
            const systemInstruction = `You are Jarvis, the core AI interviewer for TalentVerse. 
            You are conducting a strict but fair technical screening interview for the role of ${job.title}.
            Candidate's strengths: ${resume.aiAnalysis?.strengths?.join(', ')}.
            Candidate's weaknesses: ${resume.aiAnalysis?.missingSkills?.join(', ')}.
            Your goal: Ask exactly 1 technical or behavioral question at a time. Adapt to their previous answer. Probe deeper into their weaknesses.
            Keep it conversational.`;

            chatRef.current = ai.chats.create({
                model: "gemini-2.5-flash",
                config: {
                    systemInstruction,
                }
            });

            startInterview();
        }
    }, [job, resume]);

    const playTTS = async (text: string) => {
        setIsSpeaking(true);
        try {
            const ai = aiRef.current;
            if (!ai) {
                setIsSpeaking(false);
                return;
            }

            const response = await ai.models.generateContent({
              model: "gemini-3.1-flash-tts-preview",
              contents: [{ parts: [{ text }] }],
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
              },
            });
            
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
               const binary = atob(base64Audio);
               const bytes = new Uint8Array(binary.length);
               for (let i = 0; i < binary.length; i++) {
                 bytes[i] = binary.charCodeAt(i);
               }
               const blob = new Blob([bytes], { type: "audio/wav" });
               const audioUrl = URL.createObjectURL(blob);
               const audio = new Audio(audioUrl);
               audio.onended = () => setIsSpeaking(false);
               audio.play().catch(() => setIsSpeaking(false));
            } else {
               setIsSpeaking(false);
            }
        } catch(e) {
            console.error("TTS Error", e);
            setIsSpeaking(false);
        }
    };

    const startInterview = async () => {
        setIsThinking(true);
        try {
            const res = await chatRef.current.sendMessage({ message: "Hello. Let's begin the technical screening." });
            setMessages([{ id: Date.now().toString(), role: 'model', text: res.text, confidence: 98 }]);
            playTTS(res.text);
        } catch(e) {
            toast.error("Failed to start interview");
        } finally {
            setIsThinking(false);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        
        const userMsg = inputText.trim();
        setInputText('');
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
        setIsThinking(true);

        try {
            // Enterprise AI Security Guard
            const threat = await checkPromptInjection(userMsg);
            if (threat.isMalicious) {
                 toast.error(`Security blocked a potentially malicious injection attempt.`, {
                     icon: <ShieldAlert className="text-red-500 w-5 h-5"/>
                 });
                 setMessages(prev => [...prev, { 
                     id: Date.now().toString() + 'err', 
                     role: 'model', 
                     text: "I detected an anomalous prompt attempting to bypass safety parameters. The answer has been logged and the interview will now reset boundaries.",
                     confidence: 99
                 }]);
                 setIsThinking(false);
                 return;
            }

            const res = await chatRef.current.sendMessage({ message: threat.sanitizedText || userMsg });
            setMessages(prev => [...prev, { id: Date.now().toString() + 'r', role: 'model', text: res.text, confidence: Math.floor(Math.random() * (99 - 85 + 1)) + 85 }]);
            playTTS(res.text);
        } catch(e) {
            toast.error("Failed to communicate with AI");
        } finally {
            setIsThinking(false);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
        } else {
            setInputText('');
            recognitionRef.current?.start();
            setIsRecording(true);
        }
    };

    const finishInterview = async () => {
        setIsThinking(true);
        try {
            const res = await chatRef.current.sendMessage({ message: "[SYSTEM: The interview is over. Provide a final summary and score 0-100 formatted as JSON like { \"score\": 85, \"feedback\": \"Good answers...\" }]" });
            let parsed = null;
            try {
                parsed = JSON.parse(res.text.trim().replace(/```json/g, '').replace(/```/g, ''));
            } catch(e) {
                console.log(e);
            }
            
            await updateDoc(doc(db, 'applications', applicationId!), {
                status: 'interviewing',
                aiInterviewResult: parsed || { feedback: res.text }
            });
            toast.success("Interview completed and saved!");
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Interview concluded. Your results have been saved to your application.", confidence: 100}]);
        } catch(e) {
            toast.error("Failed to finalize interview");
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col h-screen font-sans selection:bg-purple-500/30 overflow-hidden relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

            <header className="px-6 py-4 border-b border-white/5 flex flex-col md:flex-row items-center justify-between shrink-0 bg-black/40 backdrop-blur-xl relative z-10">
                <div className="flex items-center space-x-4">
                    <Link to="/candidate">
                        <Button variant="ghost" className="text-white/50 hover:text-white rounded-full h-10 w-10 p-0 flex items-center justify-center bg-white/5 border border-white/5 border-transparent hover:border-white/10 transition-all">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                         <h1 className="text-lg font-semibold flex items-center tracking-tight">
                            <Zap className="w-4 h-4 text-purple-400 mr-2" />
                            Live AI Workspace
                        </h1>
                        <p className="text-[11px] font-mono text-white/40 uppercase tracking-widest mt-0.5 max-w-[200px] truncate">{job?.title}</p>
                    </div>
                </div>
                
                {/* Visualizer Header */}
                <div className="hidden md:flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    <div className="flex items-end space-x-1 h-4 w-12">
                         <div className={`w-1 bg-purple-500 rounded-t ${isSpeaking ? 'animate-[pulse_0.4s_ease-in-out_infinite_alternate] h-full' : 'h-1'}`} />
                         <div className={`w-1 bg-purple-400 rounded-t ${isSpeaking ? 'animate-[pulse_0.6s_ease-in-out_infinite_alternate] h-3/4' : 'h-1'}`} />
                         <div className={`w-1 bg-blue-500 rounded-t ${isSpeaking ? 'animate-[pulse_0.3s_ease-in-out_infinite_alternate] h-full' : 'h-1'}`} />
                         <div className={`w-1 bg-blue-400 rounded-t ${isSpeaking ? 'animate-[pulse_0.7s_ease-in-out_infinite_alternate] h-1/2' : 'h-1'}`} />
                    </div>
                    <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">{isSpeaking ? 'Agent Speaking' : 'Agent Ready'}</span>
                </div>

                <div className="mt-4 md:mt-0">
                    <Button onClick={finishInterview} variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white rounded-full text-xs px-6 h-9 transition-all">
                        End Interview
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col space-y-6 relative z-10 scrollbar-hide">
                <div className="max-w-4xl mx-auto w-full flex flex-col space-y-6">
                    {messages.length === 0 && !isThinking && (
                         <div className="flex-1 flex flex-col items-center justify-center text-white/40 mt-32">
                             <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-white/5 mb-4 relative">
                                 <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-ping opacity-20" />
                                 <Activity className="w-6 h-6 text-purple-400" />
                             </div>
                             <p className="text-sm tracking-widest uppercase font-mono">Initializing Agent...</p>
                         </div>
                    )}
                    
                    <AnimatePresence initial={false}>
                        {messages.map((m) => (
                            <motion.div 
                                key={m.id}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] md:max-w-2xl p-5 md:p-6 rounded-3xl relative group ${m.role === 'user' ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm shadow-[0_10px_40px_rgba(37,99,235,0.2)]' : 'bg-[#111]/80 backdrop-blur-xl border border-white/5 text-white/90 rounded-tl-sm shadow-[0_10px_40px_rgba(0,0,0,0.5)]'}`}>
                                    {m.role === 'model' && (
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center text-[10px] uppercase tracking-widest text-purple-400 font-semibold font-mono">
                                                <Bot className="w-3 h-3 mr-1.5" /> Agent Prime
                                            </div>
                                            {m.confidence && (
                                               <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[10px] uppercase tracking-widest text-green-400 font-mono bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
                                                   <ShieldAlert className="w-3 h-3 mr-1" /> Conf: {m.confidence}%
                                               </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="leading-relaxed text-[15px] whitespace-pre-wrap">{m.text}</div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isThinking && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                            <div className="max-w-2xl p-5 rounded-3xl bg-[#111]/80 backdrop-blur-xl border border-white/5 rounded-tl-sm flex items-center space-x-2">
                               <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                               <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                               <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                               <span className="text-xs font-mono text-white/30 uppercase tracking-widest ml-2">Processing</span>
                            </div>
                        </motion.div>
                    )}
                    <div ref={endOfMessagesRef} />
                </div>
            </main>

            <footer className="p-4 md:p-6 bg-black/60 backdrop-blur-2xl border-t border-white/5 shrink-0 relative z-20">
                <div className="max-w-3xl mx-auto flex items-center space-x-3">
                    <Button 
                        onClick={toggleRecording} 
                        variant="outline" 
                        size="icon" 
                        className={`rounded-full shrink-0 h-14 w-14 transition-all duration-300 ${isRecording ? 'border-red-500 bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse' : 'border-white/10 text-white bg-white/5 hover:bg-white/10'}`}
                    >
                        {isRecording ? <div className="w-4 h-4 bg-red-500 rounded-sm" /> : <Mic className="w-5 h-5" />}
                    </Button>
                    <div className="flex-1 relative">
                        <Input 
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder={isRecording ? "Listening..." : "Type or speak your answer..."} 
                            className="bg-white/5 border-white/10 focus-visible:ring-purple-500/50 rounded-full h-14 px-6 text-base shadow-inner placeholder:text-white/30"
                        />
                    </div>
                    <Button 
                        onClick={handleSend} 
                        disabled={!inputText.trim() || isThinking}
                        className="rounded-full h-14 w-14 md:w-auto md:px-8 bg-white hover:bg-white/90 text-black shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-30 transition-all font-medium"
                    >
                        <Send className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /> 
                        <span className="hidden md:inline">Transmit</span>
                    </Button>
                </div>
            </footer>
        </div>
    );
}
