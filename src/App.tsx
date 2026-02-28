/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  ArrowRight, 
  Mic, 
  Send, 
  X, 
  Check,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Heart,
  MessageCircle,
  ShieldCheck,
  Compass,
  Smile,
  Settings,
  Volume2,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';
import { GoogleGenAI, Modality } from "@google/genai";
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { QUESTIONS, MISSIONS, SPARK_CHALLENGES, SPARK_TIPS } from './constants';
import { Score, View, Question, Mission, SparkChallenge } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- AI Service ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [view, setView] = useState<View>('intro');
  const [quizStep, setQuizStep] = useState(0);
  
  // Tutorial State
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(() => {
    return localStorage.getItem('spark_sync_tutorial_seen') === 'true';
  });

  const TUTORIAL_STEPS = [
    {
      view: 'intro',
      title: 'Welcome to Spark & Sync',
      content: 'Your journey to reconnection begins here. We use high-fidelity diagnostics and AI-driven architecture to bridge the gap between partners.',
      target: 'intro-hero'
    },
    {
      view: 'quiz',
      title: 'The Diagnostic',
      content: 'Our analysis identifies your relationship\'s unique footprint. These answers allow Aura to build a truly bespoke reconnection roadmap.',
      target: 'quiz-container'
    },
    {
      view: 'dashboard',
      title: 'The Command Center',
      content: 'Track your Connection Points and Architecture Progress. Consistency is the foundation of trust.',
      target: 'dashboard-stats'
    },
    {
      view: 'dashboard',
      title: 'Daily Rituals',
      content: 'Every day, you receive a mission. These are intentional acts designed to break the "roommate phase" and restore intimacy.',
      target: 'active-mission'
    },
    {
      view: 'dashboard',
      title: 'Aura Concierge',
      content: 'Aura is your 24/7 relationship architect. Consult her for tactical advice on missions or deep emotional insights.',
      target: 'aura-trigger'
    },
    {
      view: 'dashboard',
      title: 'The Spark Lab',
      content: 'For high-impact intimacy modules, enter the Lab. This is where we engineer immediate heat and reconnection.',
      target: 'spark-lab-entry'
    }
  ];

  const startTutorial = () => {
    setTutorialStep(0);
    setTutorialActive(true);
    navigateTo('intro');
  };

  const nextTutorialStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      const nextStep = tutorialStep + 1;
      setTutorialStep(nextStep);
      const nextView = TUTORIAL_STEPS[nextStep].view as View;
      if (view !== nextView) {
        navigateTo(nextView);
      }
    } else {
      finishTutorial();
    }
  };

  const finishTutorial = () => {
    setTutorialActive(false);
    setHasSeenTutorial(true);
    localStorage.setItem('spark_sync_tutorial_seen', 'true');
  };

  useEffect(() => {
    if (!hasSeenTutorial && view === 'intro') {
      const timer = setTimeout(() => setTutorialActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTutorial, view]);
  const [scores, setScores] = useState<Score>({
    communication: 0,
    intimacy: 0,
    vision: 0,
    trust: 0,
    fun: 0
  });
  const [archetype, setArchetype] = useState('');
  const [healthScore, setHealthScore] = useState(0);
  const [personalizedInsights, setPersonalizedInsights] = useState('');
  const [isAuraOpen, setIsAuraOpen] = useState(false);
  const [completedMissions, setCompletedMissions] = useState<number[]>([]);
  const [activeMissionId, setActiveMissionId] = useState(1);
  const [auraMessages, setAuraMessages] = useState<{ 
    role: 'user' | 'model', 
    text: string, 
    timestamp: string, 
    read: boolean,
    feedback?: 'up' | 'down' | null 
  }[]>([]);
  const [isAuraTyping, setIsAuraTyping] = useState(false);
  const [isAuraSpeaking, setIsAuraSpeaking] = useState(false);
  const [isAuraProcessing, setIsAuraProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [auraError, setAuraError] = useState<string | null>(null);
  const [hasSpokenInitial, setHasSpokenInitial] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [wakeWord, setWakeWord] = useState('Aura');
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const [micSensitivity, setMicSensitivity] = useState(0.5);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [auraOverlayTab, setAuraOverlayTab] = useState<'chat' | 'settings'>('chat');
  const [connectionPoints, setConnectionPoints] = useState(0);
  const [revealedChallengeId, setRevealedChallengeId] = useState<number | null>(null);
  const [completedChallenges, setCompletedChallenges] = useState<number[]>([]);

  const auraScrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [micPermissionStatus, setMicPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  // Check microphone permission on mount and when overlay opens
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((permissionStatus) => {
        setMicPermissionStatus(permissionStatus.state as any);
        permissionStatus.onchange = () => {
          setMicPermissionStatus(permissionStatus.state as any);
        };
      });
    }
  }, [isAuraOpen]);

  const requestMicPermission = async () => {
    playSound('click');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermissionStatus('granted');
      setAuraError(null);
    } catch (err) {
      console.error("Mic permission error:", err);
      setMicPermissionStatus('denied');
      setAuraError("Microphone access was denied. Please enable it in your browser settings.");
    }
  };

  const formatTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleFeedback = (index: number, type: 'up' | 'down') => {
    playSound('click');
    setAuraMessages(prev => {
      const updated = [...prev];
      updated[index] = { 
        ...updated[index], 
        feedback: updated[index].feedback === type ? null : type 
      };
      return updated;
    });
  };

  // --- Sound Effects ---
  const playSound = (type: 'click' | 'success' | 'pop' | 'celebration') => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'celebration') {
      // Create a more complex celebratory sound
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // C6
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15); // E6

      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(783.99, now); // G5
      osc3.frequency.exponentialRampToValueAtTime(1567.98, now + 0.2); // G6

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      
      gain2.gain.setValueAtTime(0.05, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

      gain3.gain.setValueAtTime(0.03, now);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

      osc.start(now);
      osc.stop(now + 0.6);
      osc2.start(now);
      osc2.stop(now + 0.7);
      osc3.start(now);
      osc3.stop(now + 0.8);

      // Trigger Confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C5A059', '#1A1A1A', '#FFFFFF', '#F43F5E'],
        ticks: 200,
        gravity: 1.2,
        scalar: 1.2,
        shapes: ['circle', 'square']
      });
    }
  };

  // --- Audio Utilities ---
  const pcmToWav = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + bytes.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 24000, true);
    view.setUint32(28, 48000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, bytes.length, true);
    return new Blob([header, bytes], { type: 'audio/wav' });
  };

  const speak = async (text: string) => {
    if (!text) return;
    setAuraError(null);
    console.log("Aura attempting to speak:", text.substring(0, 30) + "...");
    setIsAuraProcessing(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say gently: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        console.log("Audio data received, length:", base64Audio.length);
        const wav = pcmToWav(base64Audio);
        if (audioRef.current) {
          const url = URL.createObjectURL(wav);
          audioRef.current.src = url;
          setIsAuraProcessing(false);
          setIsAuraSpeaking(true);
          try {
            await audioRef.current.play();
            console.log("Audio playback started");
          } catch (playError) {
            console.error("Autoplay blocked or play error:", playError);
            setIsAuraSpeaking(false);
            setAuraError("Audio playback was blocked. Please click the message to hear me.");
          }
          audioRef.current.onended = () => {
            setIsAuraSpeaking(false);
            URL.revokeObjectURL(url);
          };
        } else {
          setIsAuraProcessing(false);
        }
      } else {
        console.warn("No audio data in response");
        setAuraError("I'm having a little trouble with my voice right now, but I'm still here to listen.");
        setIsAuraProcessing(false);
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setAuraError("My voice connection is a bit unstable. Let's continue via text for a moment.");
      setIsAuraProcessing(false);
      setIsAuraSpeaking(false);
    }
  };

  // Trigger initial message speech when overlay opens
  useEffect(() => {
    if (isAuraOpen && auraMessages.length === 0) {
      const greeting = "Hello. I am Aura, your relationship concierge. I'm here to help you navigate the path back to connection. How can I support you today?";
      setAuraMessages([{ role: 'model', text: greeting, timestamp: formatTime(), read: true }]);
    }
  }, [isAuraOpen, auraMessages.length]);

  // Re-initialize recognition when settings change
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn("Error stopping recognition:", e);
        }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = isWakeWordEnabled;
      recognition.interimResults = isWakeWordEnabled;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log("Speech recognition started");
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        setInterimTranscript(interim);

        if (finalTranscript) {
          const transcript = finalTranscript.trim();
          console.log("Speech recognized (Final):", transcript);
          setInterimTranscript('');

          if (isWakeWordEnabled) {
            if (transcript.toLowerCase().includes(wakeWord.toLowerCase())) {
              const parts = transcript.toLowerCase().split(wakeWord.toLowerCase());
              const afterWakeWord = parts[parts.length - 1]?.trim();
              if (afterWakeWord) {
                sendMessage(afterWakeWord);
              }
            }
          } else {
            sendMessage(transcript);
          }
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        
        let message = "I couldn't quite catch that. Could you try again?";
        if (event.error === 'not-allowed') {
          message = "Microphone access is denied. Please enable it in your browser settings to speak with me.";
        } else if (event.error === 'network') {
          message = "I'm having trouble connecting to my hearing service. Please check your internet.";
        } else if (event.error === 'no-speech') {
          // Ignore no-speech in continuous mode to avoid annoying errors
          if (isWakeWordEnabled) return;
          message = "I didn't hear anything. Are you there?";
        } else if (event.error === 'audio-capture') {
          message = "I can't find a microphone. Is it plugged in?";
        }
        
        setAuraError(message);
      };
      
      recognition.onend = () => {
        console.log("Speech recognition ended");
        setIsListening(false);
        // If wake word is enabled, we might want to restart it automatically
        if (isWakeWordEnabled && isAuraOpen) {
          try {
            recognition.start();
          } catch (e) {
            console.warn("Failed to restart recognition:", e);
          }
        }
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn("Speech recognition not supported in this browser");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isWakeWordEnabled, wakeWord, isAuraOpen]);

  const toggleMic = async () => {
    playSound('click');
    
    if (micPermissionStatus !== 'granted') {
      await requestMicPermission();
      return;
    }

    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        if (audioRef.current) audioRef.current.pause();
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start recognition:", error);
        setIsListening(false);
      }
    }
  };

  useEffect(() => {
    if (isAuraOpen && auraMessages.length > 0 && !hasSpokenInitial) {
      const firstModelMsg = auraMessages.find(m => m.role === 'model');
      if (firstModelMsg) {
        speak(firstModelMsg.text);
        setHasSpokenInitial(true);
      }
    }
  }, [isAuraOpen, auraMessages, hasSpokenInitial]);

  // --- Navigation ---
  const navigateTo = (v: View) => {
    playSound('click');
    setView(v);
  };

  // --- Quiz Logic ---
  const handleChoice = (choiceScores: Partial<Score>) => {
    playSound('pop');
    setScores(prev => {
      const next = { ...prev };
      (Object.keys(choiceScores) as (keyof Score)[]).forEach(key => {
        next[key] += choiceScores[key] || 0;
      });
      return next;
    });

    if (quizStep < QUESTIONS.length - 1) {
      setQuizStep(prev => prev + 1);
    } else {
      runAnalysis();
    }
  };

  const runAnalysis = async () => {
    navigateTo('analyzing');
    
    const scoreValues = Object.values(scores) as number[];
    const total = scoreValues.reduce((a, b) => a + b, 0);
    const maxPossible = QUESTIONS.length * 10; // Assuming max score per question is 10 (5 per category, 2 categories per question)
    const calculatedHealthScore = Math.min(100, Math.round((total / maxPossible) * 100));
    setHealthScore(calculatedHealthScore);

    let arch = '';
    if (total > 70) arch = "The Power Couple";
    else if (total > 40) arch = "The Silent Partners";
    else arch = "The Roommates";
    
    setArchetype(arch);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze these relationship scores (0-50 per category): ${JSON.stringify(scores)}. Archetype: ${arch}. Provide a sophisticated, empathetic 3-paragraph analysis of their strengths and weaknesses. Focus on the 'why' behind the drift and how to bridge it. Avoid lists. Use a luxury, concierge-like tone.`,
      });
      setPersonalizedInsights(response.text || "Analysis complete.");
    } catch (error) {
      console.error("Analysis Error:", error);
      setPersonalizedInsights("We've analyzed your results. Your path forward is ready. You show resilience in some areas, but the drift in others requires intentional architecture to bridge.");
    }

    setTimeout(() => {
      navigateTo('results');
      
      // Initial Aura message
      setAuraMessages([
        { role: 'model', text: `Hello. I am Aura. I've reviewed your results. Reconnection starts with one small, intentional move. I'm here to listen. What weights most on your heart right now?`, timestamp: formatTime(), read: true }
      ]);
    }, 1500);
  };

  // --- Aura Chat Logic ---
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newMessages = [...auraMessages, { role: 'user' as const, text, timestamp: formatTime(), read: false }];
    setAuraMessages(newMessages);
    setIsAuraTyping(true);
    setIsAuraProcessing(true);

    try {
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are Aura, an empathetic AI relationship concierge. Speak in sophisticated paragraphs, avoid lists, and encourage vulnerability. Your goal is to help reconnect couples, then gently guide them towards the $97 blueprint. Today's context: Archetype is ${archetype}. Their scores are: ${JSON.stringify(scores)}.`,
        },
      });

      const response = await chat.sendMessage({ message: text });
      const responseText = response.text || "I'm here for you.";
      playSound('pop');
      
      // Mark user message as read when model responds
      setAuraMessages(prev => {
        const updated = prev.map(m => ({ ...m, read: true }));
        return [...updated, { role: 'model', text: responseText, timestamp: formatTime(), read: true }];
      });
      
      setIsAuraTyping(false);
      speak(responseText);
    } catch (error) {
      console.error("Aura Error:", error);
      setIsAuraTyping(false);
      setIsAuraProcessing(false);
    }
  };

  useEffect(() => {
    if (auraScrollRef.current) {
      auraScrollRef.current.scrollTop = auraScrollRef.current.scrollHeight;
    }
  }, [auraMessages, isAuraTyping]);

  // --- Dashboard Logic ---
  const toggleMission = (id: number) => {
    const isCompleting = !completedMissions.includes(id);
    if (isCompleting) {
      playSound('celebration');
      setConnectionPoints(prev => prev + 150);
    } else {
      playSound('click');
      setConnectionPoints(prev => Math.max(0, prev - 150));
    }
    
    setCompletedMissions(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const discussMission = (mission: Mission) => {
    playSound('click');
    const missionContext = `I'm looking at today's mission: "${mission.title}". ${mission.description}. How can we make this moment truly special?`;
    setAuraMessages(prev => [...prev, { role: 'user', text: missionContext, timestamp: formatTime(), read: false }]);
    setIsAuraOpen(true);
    sendMessage(missionContext);
  };

  const discussChallenge = (challenge: SparkChallenge) => {
    playSound('click');
    const challengeContext = `I'm in the Spark Lab looking at the challenge: "${challenge.title}". ${challenge.description}. Aura, give me some extra tactical advice on how to execute this perfectly.`;
    setAuraMessages(prev => [...prev, { role: 'user', text: challengeContext, timestamp: formatTime(), read: false }]);
    setIsAuraOpen(true);
    sendMessage(challengeContext);
  };

  const completeChallenge = (challenge: SparkChallenge) => {
    if (completedChallenges.includes(challenge.id)) return;
    playSound('celebration');
    setCompletedChallenges(prev => [...prev, challenge.id]);
    setConnectionPoints(prev => prev + challenge.points);
  };

  const radarData = useMemo(() => [
    { subject: 'Communication', A: scores.communication, fullMark: 10 },
    { subject: 'Intimacy', A: scores.intimacy, fullMark: 10 },
    { subject: 'Vision', A: scores.vision, fullMark: 10 },
    { subject: 'Trust', A: scores.trust, fullMark: 10 },
    { subject: 'Fun', A: scores.fun, fullMark: 10 },
  ], [scores]);

  return (
    <div className="min-h-screen font-sans">
      {/* Tutorial Overlay */}
      <AnimatePresence>
        {tutorialActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] pointer-events-none"
          >
            <div className="absolute inset-0 bg-brand-900/40 backdrop-blur-[2px]" />
            <motion.div 
              key={tutorialStep}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-10 pointer-events-auto border border-brand-100"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-accent">
                    Guide • Step {tutorialStep + 1} of {TUTORIAL_STEPS.length}
                  </span>
                  <button 
                    onClick={finishTutorial}
                    className="text-brand-900/30 hover:text-brand-accent transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <h4 className="text-2xl font-serif italic text-brand-900">{TUTORIAL_STEPS[tutorialStep].title}</h4>
                  <p className="text-brand-800/70 leading-relaxed italic font-serif text-lg">
                    "{TUTORIAL_STEPS[tutorialStep].content}"
                  </p>
                </div>
                <div className="flex justify-between items-center pt-4">
                  <button 
                    onClick={finishTutorial}
                    className="text-[10px] font-bold uppercase tracking-widest text-brand-900/40 hover:text-brand-900 transition-colors"
                  >
                    Skip Tutorial
                  </button>
                  <button 
                    onClick={nextTutorialStep}
                    className="bg-brand-900 text-white px-8 py-4 uppercase tracking-widest text-[10px] font-bold hover:bg-brand-accent transition-all flex items-center gap-3"
                  >
                    {tutorialStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next Step'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <audio ref={audioRef} className="hidden" />
      <nav className="fixed top-0 w-full py-8 px-12 z-40 bg-brand-50/80 backdrop-blur-xl border-b border-brand-100 flex justify-between items-center">
        <div className="flex items-center gap-12">
          <div className="font-serif text-2xl font-medium tracking-tight">
            Spark<span className="text-brand-accent">&</span>Sync
          </div>
          <div className="hidden md:flex gap-8 text-[10px] uppercase tracking-[0.2em] font-medium text-brand-900/40">
            <span className="hover:text-brand-accent cursor-pointer transition-colors">The Method</span>
            <span className="hover:text-brand-accent cursor-pointer transition-colors">Aura Concierge</span>
            <span className="hover:text-brand-accent cursor-pointer transition-colors">Privacy</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-[9px] uppercase tracking-[0.3em] font-bold text-brand-900/30">
            Privately Encrypted
          </div>
          <div className="w-px h-4 bg-brand-200" />
          <div className="text-[10px] font-bold tracking-widest uppercase text-brand-accent">
            Member Access
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-20 flex flex-col min-h-screen relative">
        <AnimatePresence mode="wait">
          {view === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center min-h-[70vh]"
              id="intro-hero"
            >
              <div className="space-y-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-px w-12 bg-brand-accent" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.5em] text-brand-accent">Aura Relationship Concierge</span>
                  </div>
                  <h1 className="text-7xl md:text-9xl font-serif font-light leading-[0.9] tracking-tighter text-brand-900">
                    Connection, <br/><span className="italic text-brand-accent">Refined.</span>
                  </h1>
                </div>
                <p className="text-xl text-brand-800/70 leading-relaxed font-serif italic max-w-xl">
                  "The roommate phase is a choice, not a destiny. We provide the architecture for your reconnection."
                </p>
                <div className="flex flex-col sm:flex-row gap-6 pt-4">
                  <button 
                    onClick={() => navigateTo('quiz')}
                    className="group relative bg-brand-900 text-brand-50 px-12 py-6 rounded-none font-medium text-lg hover:bg-brand-accent transition-all duration-700 shadow-2xl flex items-center justify-center gap-4 overflow-hidden"
                  >
                    <span className="relative z-10 uppercase tracking-widest text-sm">Begin Your Diagnostic</span>
                    <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-2 transition-transform" />
                    <div className="absolute inset-0 bg-brand-accent translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  </button>
                  <button className="px-12 py-6 border border-brand-200 text-brand-900 uppercase tracking-widest text-sm font-bold hover:bg-brand-100 transition-colors">
                    The Blueprint
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-[4/5] bg-brand-100 overflow-hidden rounded-[10rem] shadow-2xl relative">
                  <img 
                    src="https://picsum.photos/seed/luxury-couple/800/1000?grayscale" 
                    alt="Luxury Couple" 
                    className="w-full h-full object-cover opacity-80 mix-blend-multiply"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-900/40 to-transparent" />
                </div>
                {/* Floating Badge */}
                <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-full shadow-2xl border border-brand-100 flex flex-col items-center justify-center w-40 h-40 animate-pulse">
                  <div className="text-brand-accent font-serif text-4xl italic">98%</div>
                  <div className="text-[8px] font-bold uppercase tracking-widest text-center">Success Rate</div>
                </div>
                <div className="absolute top-20 -right-4 vertical-text text-[10px] font-bold uppercase tracking-[0.5em] text-brand-900/20">
                  ESTABLISHED MMXXIV
                </div>
              </div>
            </motion.div>
          )}

          {view === 'quiz' && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-20"
              id="quiz-container"
            >
              <div className="lg:col-span-2 space-y-16">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-bold uppercase tracking-[0.5em] text-brand-accent">
                      Phase {quizStep + 1} of {QUESTIONS.length}
                    </span>
                    <div className="h-px flex-grow bg-brand-100" />
                  </div>
                  <h3 className="text-5xl md:text-6xl font-serif font-medium text-brand-900 leading-[1.1] min-h-[12rem]">
                    {QUESTIONS[quizStep].text}
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {QUESTIONS[quizStep].choices.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleChoice(choice.scores)}
                      className="group w-full flex justify-between items-center bg-white border border-brand-100 p-8 hover:border-brand-accent transition-all text-left shadow-sm hover:shadow-xl"
                    >
                      <span className="text-xl font-serif italic text-brand-800 group-hover:text-brand-900">{choice.text}</span>
                      <div className="w-10 h-10 rounded-full border border-brand-100 flex items-center justify-center group-hover:bg-brand-accent group-hover:border-brand-accent transition-all">
                        <ArrowRight className="w-4 h-4 text-transparent group-hover:text-white transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="hidden lg:block space-y-8 pt-20">
                <div className="bg-brand-900 p-10 text-brand-50 space-y-6">
                  <h4 className="font-serif text-2xl italic">Aura's Insight</h4>
                  <p className="text-sm leading-relaxed text-brand-200 opacity-70">
                    "Honesty is the only currency that matters here. Your answers allow me to build a truly bespoke reconnection architecture."
                  </p>
                  <div className="pt-4 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                    <span className="text-[9px] uppercase tracking-widest font-bold">Analyzing in real-time</span>
                  </div>
                </div>
                <div className="p-8 border border-brand-100 rounded-none text-center">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brand-900/30">Privacy Guaranteed</p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'analyzing' && (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center space-y-8 py-20"
            >
              <div className="w-20 h-20 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
              <h2 className="text-2xl font-serif font-bold tracking-tight">Finalizing Your Diagnostic</h2>
              <p className="text-sm text-brand-800 opacity-50 uppercase tracking-widest font-bold">Synchronizing Voice Systems...</p>
            </motion.div>
          )}

          {view === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col space-y-16"
            >
              <div className="text-center space-y-6">
                <p className="text-xs font-bold tracking-[0.5em] text-brand-800 opacity-50 uppercase">Diagnostic Complete</p>
                <h2 className="text-5xl md:text-7xl font-serif font-bold">
                  Archetype: <span className="italic text-brand-accent">{archetype}</span>
                </h2>
                <div className="flex justify-center gap-12 py-8">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-900/40 mb-2">Health Index</p>
                    <div className="text-6xl font-serif italic text-brand-accent">{healthScore}%</div>
                  </div>
                  <div className="w-px h-16 bg-brand-100" />
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-900/40 mb-2">Sync Level</p>
                    <div className="text-6xl font-serif italic text-brand-900">
                      {healthScore > 80 ? 'Optimal' : healthScore > 50 ? 'Stable' : 'Critical'}
                    </div>
                  </div>
                </div>
                <div className="text-xl text-brand-800 opacity-70 max-w-3xl mx-auto leading-relaxed font-light space-y-6 text-left">
                  <div className="markdown-body">
                    <Markdown>{personalizedInsights}</Markdown>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-xl border border-brand-100 flex flex-col items-center">
                  <div className="w-full h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#F5F0EB" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#1C1917', fontSize: 12 }} />
                        <Radar
                          name="Scores"
                          dataKey="A"
                          stroke="#E11D48"
                          fill="#E11D48"
                          fillOpacity={0.1}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-brand-900 text-white rounded-[3.5rem] p-10 shadow-2xl space-y-8">
                    <h3 className="text-3xl font-serif italic mb-4">Aura is listening.</h3>
                    <p className="text-brand-200 text-sm leading-relaxed mb-10 opacity-80">
                      Aura has analyzed your footprint. Click below to enter a voice conversation and discover your customized path forward.
                    </p>
                    <button 
                      onClick={() => {
                        playSound('click');
                        setIsAuraOpen(true);
                      }}
                      className="w-full bg-brand-accent hover:bg-rose-600 py-6 rounded-2xl font-bold transition-all shadow-xl flex items-center justify-center gap-4 text-lg"
                    >
                      Speak with Aura
                    </button>
                  </div>

                  <div className="bg-white p-10 rounded-[3.5rem] border border-brand-100 shadow-sm text-center">
                    {!isSubscribed ? (
                      <div className="flex flex-col gap-3">
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email address" 
                          className="w-full px-6 py-4 rounded-2xl bg-brand-50 border-2 border-transparent focus:bg-white focus:border-brand-accent outline-none text-sm font-medium"
                        />
                        <button 
                          onClick={async () => {
                            playSound('click');
                            try {
                              const response = await fetch('/api/subscribe', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  email, 
                                  archetype, 
                                  insights: personalizedInsights 
                                }),
                              });
                              if (response.ok) {
                                setIsSubscribed(true);
                              } else {
                                alert("Failed to sync roadmap. Please try again.");
                              }
                            } catch (error) {
                              console.error("Subscription error:", error);
                              alert("Connection error. Please try again.");
                            }
                          }}
                          className="w-full bg-brand-900 text-white py-4 rounded-2xl font-bold text-sm"
                        >
                          Download My Roadmap
                        </button>
                      </div>
                    ) : (
                      <div className="text-emerald-600 font-bold p-4 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Results Synced. Check your inbox.
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => navigateTo('success')}
                    className="w-full text-[10px] uppercase tracking-widest font-black opacity-10 hover:opacity-100 transition-opacity"
                  >
                    (Simulation: Test Success Page)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center space-y-12 max-w-3xl mx-auto py-20"
            >
              <div className="w-32 h-32 bg-brand-accent/10 text-brand-accent rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner border border-brand-accent/20">
                <CheckCircle2 className="w-16 h-16" />
              </div>
              <div className="space-y-6">
                <h1 className="font-serif text-6xl md:text-8xl font-light leading-tight text-brand-900">
                  The drift ends <br/><span className="italic text-brand-accent">today.</span>
                </h1>
                <p className="text-xl text-brand-800/60 font-serif italic max-w-xl mx-auto">
                  "Your 30-Day Architecture is initialized. Day 1 is waiting for your first intentional move."
                </p>
              </div>
              <div className="w-full max-w-md pt-8">
                <button 
                  onClick={() => navigateTo('dashboard')}
                  className="block w-full bg-brand-900 text-brand-50 py-8 rounded-none font-medium uppercase tracking-[0.3em] text-sm hover:bg-brand-accent transition-all shadow-2xl"
                >
                  Enter Your Dashboard
                </button>
              </div>
            </motion.div>
          )}

          {view === 'spark-lab' && (
            <motion.div 
              key="spark-lab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-16"
            >
              <div className="flex flex-col md:flex-row items-center justify-between border-b border-brand-200 pb-12 gap-8">
                <button 
                  onClick={() => navigateTo('dashboard')}
                  className="text-brand-900/40 hover:text-brand-accent transition-all flex items-center gap-3 font-bold uppercase tracking-[0.3em] text-[10px] group"
                >
                  <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-2 transition-transform" />
                  Return to Dashboard
                </button>
                <div className="text-center space-y-2">
                  <h2 className="text-5xl font-serif font-light text-brand-900 italic">The Spark Lab</h2>
                  <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-brand-accent">Intimacy Engineering • v2.0</p>
                </div>
                <motion.div 
                  key={connectionPoints}
                  initial={{ scale: 1, rotate: 0 }}
                  animate={{ 
                    scale: [1, 1.4, 1], 
                    rotate: [0, -5, 5, 0],
                    boxShadow: [
                      '0 0 0 rgba(197,160,89,0)', 
                      '0 0 40px rgba(197,160,89,0.6)', 
                      '0 0 0 rgba(197,160,89,0)'
                    ] 
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="flex items-center gap-4 bg-brand-900 text-brand-50 px-8 py-4 shadow-2xl"
                >
                  <Sparkles className="w-4 h-4 text-brand-accent" />
                  <span className="text-lg font-serif italic">{connectionPoints} <span className="text-[10px] not-italic opacity-40">PTS</span></span>
                </motion.div>
              </div>

              <div className="text-center space-y-6 max-w-2xl mx-auto">
                <p className="text-xl text-brand-800/70 font-serif italic leading-relaxed">
                  "Intimacy is a skill, not a feeling. Choose a module below to initiate a high-fidelity connection ritual."
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {SPARK_CHALLENGES.map((challenge) => (
                  <motion.div 
                    key={challenge.id}
                    whileHover={{ y: -10 }}
                    className="relative perspective-1000"
                  >
                    <AnimatePresence mode="wait">
                      {revealedChallengeId === challenge.id ? (
                        <motion.div 
                          key="revealed"
                          initial={{ rotateY: 90, opacity: 0 }}
                          animate={{ rotateY: 0, opacity: 1 }}
                          className="bg-brand-900 rounded-none p-10 border border-white/10 shadow-2xl h-[500px] flex flex-col justify-between text-white relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-6 opacity-10">
                            <div className="text-[9px] font-mono uppercase tracking-widest">Ritual_ID_{challenge.id}</div>
                          </div>
                          
                          <div className="space-y-6 relative z-10">
                            <div className="flex justify-between items-start">
                              <div className="w-16 h-16 bg-brand-accent/10 flex items-center justify-center text-brand-accent border border-brand-accent/20 shadow-inner">
                                {challenge.icon === 'Heart' && <Heart className="w-8 h-8" />}
                                {challenge.icon === 'MessageCircle' && <MessageCircle className="w-8 h-8" />}
                                {challenge.icon === 'Sparkles' && <Sparkles className="w-8 h-8" />}
                                {challenge.icon === 'Smile' && <Smile className="w-8 h-8" />}
                                {challenge.icon === 'Compass' && <Compass className="w-8 h-8" />}
                              </div>
                              <div className="text-right space-y-1">
                                <div className={cn(
                                  "text-[9px] font-black uppercase tracking-[0.4em] px-3 py-1 border inline-block",
                                  challenge.level === 'Easy' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" :
                                  challenge.level === 'Medium' ? "border-brand-accent/30 text-brand-accent bg-brand-accent/5" :
                                  "border-rose-500/30 text-rose-400 bg-rose-500/5"
                                )}>
                                  {challenge.level}
                                </div>
                                <div className="text-3xl font-serif italic text-white flex items-center justify-end gap-2">
                                  <span className="text-brand-accent text-sm not-italic font-sans font-bold">+</span>
                                  {challenge.points}
                                  <Sparkles className="w-4 h-4 text-brand-accent/40" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="font-serif text-4xl italic leading-tight text-white">{challenge.title}</h4>
                              <div className="w-12 h-px bg-brand-accent/50" />
                              <p className="text-base text-brand-100/70 leading-relaxed font-light italic">
                                "{challenge.description}"
                              </p>
                            </div>
                          </div>

                          <div className="space-y-8 relative z-10">
                            <div className="bg-white/[0.03] p-8 border-l-2 border-brand-accent relative group/tip">
                              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/tip:opacity-30 transition-opacity">
                                <ShieldCheck className="w-12 h-12" />
                              </div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-accent mb-3 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-brand-accent animate-pulse" />
                                Aura's Tactical Insight
                              </p>
                              <p className="text-sm italic text-brand-100/80 leading-relaxed font-serif">
                                {challenge.tip}
                              </p>
                            </div>
                            
                            <div className="flex gap-4">
                              <button 
                                onClick={() => discussChallenge(challenge)}
                                className="flex-1 bg-white/5 hover:bg-white/10 py-4 uppercase tracking-widest text-[10px] font-bold transition-all flex items-center justify-center gap-3 border border-brand-accent/30 text-brand-accent group/aura"
                              >
                                <div className="relative">
                                  <MessageCircle className="w-4 h-4" />
                                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                                </div>
                                Consult Aura
                              </button>
                              <button 
                                onClick={() => completeChallenge(challenge)}
                                disabled={completedChallenges.includes(challenge.id)}
                                className={cn(
                                  "flex-1 py-4 uppercase tracking-widest text-[10px] font-bold transition-all flex items-center justify-center gap-2",
                                  completedChallenges.includes(challenge.id) 
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                    : "bg-brand-accent hover:bg-rose-600 text-white shadow-xl shadow-brand-accent/20"
                                )}
                              >
                                {completedChallenges.includes(challenge.id) ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    Ritual Logged
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3" />
                                    Complete Ritual
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.button 
                          key="hidden"
                          onClick={() => {
                            playSound('pop');
                            setRevealedChallengeId(challenge.id);
                          }}
                          initial={{ rotateY: -90, opacity: 0 }}
                          animate={{ rotateY: 0, opacity: 1 }}
                          exit={{ rotateY: 90, opacity: 0 }}
                          className="w-full h-[500px] bg-brand-900 rounded-none border border-white/5 flex flex-col items-center justify-center space-y-8 group shadow-2xl overflow-hidden relative"
                        >
                          <div className="absolute inset-0 opacity-5 pointer-events-none" 
                            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} 
                          />
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.1)_0%,transparent_70%)]" />
                          
                          <div className="w-28 h-28 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 relative">
                            <div className="absolute inset-0 rounded-full border border-brand-accent/30 animate-ping opacity-20" />
                            <Sparkles className="w-14 h-14 text-brand-accent animate-pulse" />
                          </div>
                          
                          <div className="text-center space-y-4 relative z-10">
                            <p className="text-brand-50 font-serif italic text-3xl tracking-tight">Mystery Module</p>
                            <div className="flex items-center justify-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                              <p className="text-[10px] text-brand-100/40 uppercase tracking-[0.5em] font-bold">Awaiting Initialization</p>
                            </div>
                          </div>
                          
                          <div className="absolute bottom-10 left-0 w-full px-10 flex justify-between items-center opacity-20">
                            <div className="text-[9px] font-mono text-white tracking-widest">LVL_{challenge.level.toUpperCase()}</div>
                            <div className="text-[9px] font-mono text-white tracking-widest">PTS_{challenge.points}</div>
                          </div>
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 bg-brand-900 text-white p-16 shadow-2xl flex flex-col md:flex-row items-center gap-16 border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5">
                    <Sparkles className="w-80 h-80" />
                  </div>
                  <div className="flex-shrink-0 w-40 h-40 rounded-none bg-brand-accent flex items-center justify-center text-6xl shadow-2xl shadow-brand-accent/40 rotate-3">
                    🔥
                  </div>
                  <div className="space-y-8 text-center md:text-left relative z-10">
                    <h3 className="text-4xl font-serif italic">The Intimacy Engine</h3>
                    <p className="text-brand-100/60 text-lg leading-relaxed max-w-2xl font-light">
                      Intimacy isn't just about the physical. It's about the "drift"—the slow accumulation of unsaid things and missed moments. The Spark Lab is designed to break the drift with intentional, high-fidelity rituals.
                    </p>
                    <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                      <div className="px-6 py-3 bg-white/5 border border-white/10 text-[10px] font-bold tracking-[0.3em] uppercase text-brand-accent">
                        Low Friction
                      </div>
                      <div className="px-6 py-3 bg-white/5 border border-white/10 text-[10px] font-bold tracking-[0.3em] uppercase text-brand-accent">
                        High Fidelity
                      </div>
                      <div className="px-6 py-3 bg-white/5 border border-white/10 text-[10px] font-bold tracking-[0.3em] uppercase text-brand-accent">
                        Aura Verified
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white p-12 border border-brand-100 shadow-2xl space-y-10">
                  <h4 className="text-2xl font-serif italic text-brand-900 border-b border-brand-50 pb-6">Aura's Ritual Tips</h4>
                  <div className="space-y-8">
                    {SPARK_TIPS.map((tip, idx) => (
                      <div key={idx} className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-accent">{tip.title}</p>
                        <p className="text-sm text-brand-800/70 leading-relaxed italic font-serif">"{tip.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col space-y-16"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-brand-200 pb-12 gap-8" id="dashboard-stats">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-accent">
                      Concierge Active • Day {activeMissionId}
                    </p>
                  </div>
                  <h2 className="text-6xl font-serif font-light text-brand-900">
                    The <span className="italic">Daily Ritual</span>
                  </h2>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-brand-900/40 mb-1">Health Index</p>
                    <div className="text-3xl font-serif italic text-brand-accent">{healthScore}%</div>
                  </div>
                  <div className="w-px h-12 bg-brand-200" />
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-brand-900/40 mb-1">Connection Points</p>
                    <motion.div 
                      key={connectionPoints}
                      initial={{ scale: 1, color: '#1A1A1A' }}
                      animate={{ 
                        scale: [1, 1.3, 1], 
                        color: ['#1A1A1A', '#C5A059', '#1A1A1A'],
                        textShadow: [
                          '0 0 0 rgba(197,160,89,0)',
                          '0 0 20px rgba(197,160,89,0.4)',
                          '0 0 0 rgba(197,160,89,0)'
                        ]
                      }}
                      transition={{ duration: 0.6, ease: "backOut" }}
                      className="text-3xl font-serif italic text-brand-900"
                    >
                      {connectionPoints} <span className="text-xs font-sans not-italic font-bold opacity-30">PTS</span>
                    </motion.div>
                  </div>
                  <div className="w-px h-12 bg-brand-200" />
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-brand-900/40 mb-1">Architecture Progress</p>
                    <div className="text-3xl font-serif italic text-brand-900">{Math.round((completedMissions.length / 30) * 100)}%</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-12 border border-brand-100 shadow-2xl space-y-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                  <Compass className="w-64 h-64 rotate-12" />
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-accent">30-Day Architecture</p>
                    </div>
                    <h3 className="text-4xl font-serif font-light text-brand-900 italic">Ritual Consistency Tracker</h3>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-brand-900/30 mb-1">Current Milestone</p>
                      <div className="text-2xl font-serif italic text-brand-900">
                        {completedMissions.length < 10 ? 'Phase I: Foundation' : 
                         completedMissions.length < 20 ? 'Phase II: Expansion' : 'Phase III: Transcendence'}
                      </div>
                    </div>
                    <div className="w-px h-10 bg-brand-100" />
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-brand-900/30 mb-1">Completion</p>
                      <div className="text-2xl font-serif italic text-brand-900">
                        {completedMissions.length}<span className="text-sm opacity-20 not-italic ml-1">/ 30</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 md:grid-cols-10 gap-4 relative z-10">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const isCompleted = i < completedMissions.length;
                    const isCurrent = i === activeMissionId - 1;
                    
                    return (
                      <motion.div 
                        key={i}
                        initial={false}
                        animate={{ 
                          backgroundColor: isCompleted ? '#1A1A1A' : 'transparent',
                          borderColor: isCurrent ? '#C5A059' : isCompleted ? '#1A1A1A' : '#EBE6DE',
                          scale: isCurrent ? 1.05 : 1
                        }}
                        className={cn(
                          "aspect-square border flex flex-col items-center justify-center relative group transition-all duration-500",
                          isCurrent && "shadow-xl shadow-brand-accent/10 z-20"
                        )}
                      >
                        {isCurrent && (
                          <motion.div 
                            layoutId="current-day-glow"
                            className="absolute inset-0 border-2 border-brand-accent animate-pulse opacity-40" 
                          />
                        )}
                        
                        <span className={cn(
                          "text-[10px] font-mono transition-colors duration-500",
                          isCompleted ? "text-brand-accent" : "text-brand-900/20"
                        )}>
                          {String(i + 1).padStart(2, '0')}
                        </span>

                        {isCompleted && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute bottom-2"
                          >
                            <Check className="w-2.5 h-2.5 text-brand-accent" />
                          </motion.div>
                        )}

                        {/* Phase Markers */}
                        {(i === 9 || i === 19 || i === 29) && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-accent rotate-45 shadow-sm" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-4 border-t border-brand-50">
                  <div className="flex gap-8">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-brand-900" />
                      <span className="text-[8px] font-bold uppercase tracking-widest text-brand-900/40">Completed Ritual</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 border border-brand-accent" />
                      <span className="text-[8px] font-bold uppercase tracking-widest text-brand-900/40">Active Session</span>
                    </div>
                  </div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-brand-900/20">
                    Neural Synchronization Architecture • v2.4
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                <div className="lg:col-span-3 space-y-12">
                  <div className="bg-white p-10 border border-brand-100 shadow-xl space-y-8">
                    <div className="flex justify-between items-center border-b border-brand-50 pb-6">
                      <h4 className="text-xl font-serif italic text-brand-900">Health Diagnostic</h4>
                      <button 
                        onClick={() => {
                          playSound('click');
                          setQuizStep(0);
                          setScores({
                            communication: 0,
                            intimacy: 0,
                            vision: 0,
                            trust: 0,
                            fun: 0
                          });
                          navigateTo('quiz');
                        }}
                        className="text-[9px] font-bold uppercase tracking-widest text-brand-accent hover:underline"
                      >
                        Retake
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-900/40">Current Vitality</p>
                        <span className="text-3xl font-serif italic text-brand-accent">{healthScore}%</span>
                      </div>
                      <div className="h-1 w-full bg-brand-50 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${healthScore}%` }}
                          className="h-full bg-brand-accent"
                        />
                      </div>
                      <p className="text-xs text-brand-800/60 leading-relaxed italic font-serif">
                        {healthScore > 80 
                          ? "Your connection is vibrant. Focus on maintaining the architecture of your intimacy." 
                          : healthScore > 50 
                          ? "Stability is present, but the 'roommate phase' is beginning to settle. Intentional rituals are required." 
                          : "The drift is significant. Immediate architectural intervention is recommended to bridge the gap."}
                      </p>
                    </div>

                    <div className="pt-6 border-t border-brand-50 space-y-4">
                      {radarData.map((d, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-900/30">{d.subject}</span>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div 
                                key={i} 
                                className={cn(
                                  "w-3 h-1",
                                  i < (d.A / 10) ? "bg-brand-900" : "bg-brand-50"
                                )} 
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-12">
                  <motion.div 
                    animate={{ 
                      borderColor: completedMissions.includes(activeMissionId) ? '#C5A059' : '#EBE6DE'
                    }}
                    className="bg-white p-12 md:p-20 shadow-2xl border border-brand-100 relative overflow-hidden group"
                    id="active-mission"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-brand-50">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: completedMissions.includes(activeMissionId) ? '100%' : '0%' }}
                        className="h-full bg-brand-accent"
                      />
                    </div>
                    
                    <div className="space-y-10 relative z-10">
                      <div className="space-y-4">
                        <h3 className="text-4xl md:text-5xl font-serif italic text-brand-900">
                          {MISSIONS.find(m => m.id === activeMissionId)?.title}
                        </h3>
                        <p className="text-lg text-brand-800/70 leading-relaxed font-light">
                          {MISSIONS.find(m => m.id === activeMissionId)?.description}
                        </p>
                      </div>

                      <div className="bg-brand-50 p-8 border-l-2 border-brand-accent space-y-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">Aura's Guidance</p>
                        <p className="text-sm italic text-brand-800/80 leading-relaxed">
                          "{MISSIONS.find(m => m.id === activeMissionId)?.auraTip}"
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-6">
                        <button 
                          onClick={() => discussMission(MISSIONS.find(m => m.id === activeMissionId)!)}
                          className="flex-1 bg-brand-900 text-white py-6 px-8 uppercase tracking-widest text-xs font-bold hover:bg-brand-accent transition-all flex items-center justify-center gap-3"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Consult Aura
                        </button>
                        <button 
                          onClick={() => toggleMission(activeMissionId)}
                          className={cn(
                            "flex-1 py-6 px-8 uppercase tracking-widest text-xs font-bold transition-all flex items-center justify-center gap-3",
                            completedMissions.includes(activeMissionId) 
                              ? "bg-brand-accent text-white" 
                              : "border border-brand-900 text-brand-900 hover:bg-brand-900 hover:text-white"
                          )}
                        >
                          <AnimatePresence mode="wait">
                            {completedMissions.includes(activeMissionId) ? (
                              <motion.div 
                                key="done"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Ritual Complete
                              </motion.div>
                            ) : (
                              <motion.div 
                                key="todo"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                Mark as Complete
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  <div className="bg-brand-900 p-12 text-white flex flex-col md:flex-row items-center gap-10" id="spark-lab-entry">
                    <div className="w-24 h-24 rounded-full bg-brand-accent flex items-center justify-center text-4xl shadow-2xl shadow-brand-accent/40">
                      ✨
                    </div>
                    <div className="space-y-4 text-center md:text-left">
                      <h4 className="text-2xl font-serif italic">The Spark Lab is Open</h4>
                      <p className="text-sm text-brand-200 opacity-60 leading-relaxed max-w-md">
                        Ready for something more intense? Enter the lab for high-impact intimacy modules designed for immediate heat.
                      </p>
                      <button 
                        onClick={() => navigateTo('spark-lab')}
                        className="text-brand-accent uppercase tracking-[0.3em] text-[10px] font-bold hover:tracking-[0.4em] transition-all flex items-center gap-2"
                      >
                        Enter the Lab <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-12">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold text-brand-900 uppercase tracking-[0.4em]">The 30-Day Architecture</h4>
                      <span className="text-[10px] font-medium text-brand-900/40 italic">Scroll to explore</span>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      {Array.from({ length: 30 }).map((_, i) => {
                        const id = i + 1;
                        const isDone = completedMissions.includes(id);
                        const isActive = activeMissionId === id;
                        return (
                          <div key={id} className="relative group">
                            <button
                              onClick={() => {
                                playSound('click');
                                setActiveMissionId(id);
                              }}
                              className={cn(
                                "w-full aspect-square border flex items-center justify-center font-serif text-lg transition-all relative overflow-hidden",
                                isDone ? "bg-brand-accent border-brand-accent text-white" : "bg-white border-brand-100 text-brand-900",
                                isActive && "ring-1 ring-brand-accent ring-offset-4"
                              )}
                            >
                              {isDone ? <CheckCircle2 className="w-5 h-5" /> : id}
                              {isActive && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-brand-accent" />}
                            </button>
                            
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-56 p-6 bg-brand-900 text-white text-[11px] opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 shadow-2xl border border-white/10">
                              <p className="font-serif italic text-brand-accent mb-2">Ritual {id}</p>
                              <p className="font-serif text-sm italic mb-3 leading-tight">
                                {MISSIONS.find(m => m.id === id)?.title || "Deep Intimacy Focus"}
                              </p>
                              <p className="opacity-60 leading-relaxed">
                                {MISSIONS.find(m => m.id === id)?.auraTip || "Consistency is the foundation of trust."}
                              </p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-brand-900" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-10 border border-brand-100 space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-brand-900/40" />
                      </div>
                      <h5 className="font-serif text-xl italic">Member Security</h5>
                    </div>
                    <p className="text-xs text-brand-800/60 leading-relaxed">
                      Your journey is private. All data is end-to-end encrypted and stored locally on your device. Aura only processes what you share in real-time.
                    </p>
                    <div className="pt-4 border-t border-brand-100 flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-brand-900/30">Encryption: AES-256</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-brand-accent">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Aura Floating Trigger */}
      <motion.button 
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          playSound('click');
          setIsAuraOpen(true);
        }}
        className="fixed bottom-12 right-12 w-20 h-20 bg-brand-900 text-white rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-40 group border border-white/10"
        id="aura-trigger"
      >
        <div className="absolute inset-0 rounded-full border-2 border-brand-accent animate-ping opacity-20 group-hover:opacity-40" />
        <div className="font-serif italic text-3xl">A</div>
      </motion.button>

      {/* Aura Voice Overlay */}
      <AnimatePresence>
        {isAuraOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-900/80 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-brand-50 w-full max-w-4xl rounded-none shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col h-[85vh] overflow-hidden border border-white/10"
            >
              <div className="p-10 border-b border-brand-100 flex justify-between items-center bg-brand-900 text-white">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-brand-accent flex items-center justify-center text-white font-serif italic text-3xl shadow-2xl relative">
                    <div className="absolute inset-0 rounded-full border-2 border-brand-accent animate-ping opacity-20" />
                    A
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl font-medium tracking-tight">Aura Concierge</h3>
                    <p className="text-[9px] text-brand-200 uppercase tracking-[0.4em] font-bold opacity-60">High-Fidelity Neural Interface</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      playSound('click');
                      setAuraOverlayTab(prev => prev === 'chat' ? 'settings' : 'chat');
                    }}
                    className={cn(
                      "p-3 rounded-none transition-all uppercase tracking-widest text-[10px] font-bold border",
                      auraOverlayTab === 'settings' ? "bg-brand-accent border-brand-accent text-white" : "text-white border-white/10 hover:bg-white/5"
                    )}
                  >
                    {auraOverlayTab === 'chat' ? 'Settings' : 'Back to Chat'}
                  </button>
                  <button 
                    onClick={() => {
                      playSound('click');
                      setIsAuraOpen(false);
                    }}
                    className="text-white hover:bg-white/10 p-3 rounded-none transition-colors border border-white/10"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-grow overflow-hidden flex flex-col bg-brand-50">
                <AnimatePresence mode="wait">
                  {auraOverlayTab === 'chat' ? (
                    <motion.div 
                      key="chat"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-grow overflow-y-auto p-12 space-y-10 no-scrollbar flex flex-col"
                      ref={auraScrollRef}
                    >
                      {auraMessages.map((m, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "max-w-[75%] p-8 text-lg leading-relaxed font-serif italic relative group flex flex-col",
                            m.role === 'model' 
                              ? "bg-white text-brand-900 shadow-xl border border-brand-100 self-start" 
                              : "bg-brand-900 text-brand-50 self-end ml-auto"
                          )}
                        >
                          <div>{m.text}</div>
                          
                          <div className={cn(
                            "text-[10px] mt-4 flex items-center gap-2 font-sans not-italic font-bold tracking-widest opacity-40",
                            m.role === 'model' ? "text-brand-900" : "text-brand-50 justify-end"
                          )}>
                            <span>{m.timestamp}</span>
                            {m.role === 'user' && (
                              <div className="flex items-center">
                                <Check className={cn("w-3 h-3", m.read ? "text-brand-accent" : "text-white/20")} />
                                <Check className={cn("w-3 h-3 -ml-1.5", m.read ? "text-brand-accent" : "text-white/20")} />
                              </div>
                            )}
                          </div>

                          {m.role === 'model' && (
                            <div className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-1">
                              <button 
                                onClick={() => {
                                  playSound('click');
                                  speak(m.text);
                                }}
                                className="p-2 text-brand-accent hover:scale-110 transition-transform"
                                title="Speak Message"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleFeedback(i, 'up')}
                                className={cn(
                                  "p-2 transition-all hover:scale-110",
                                  m.feedback === 'up' ? "text-emerald-500" : "text-brand-900/20 hover:text-emerald-500"
                                )}
                                title="Helpful"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleFeedback(i, 'down')}
                                className={cn(
                                  "p-2 transition-all hover:scale-110",
                                  m.feedback === 'down' ? "text-rose-500" : "text-brand-900/20 hover:text-rose-500"
                                )}
                                title="Not Helpful"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      ))}
                      {isAuraTyping && (
                        <div className="self-start p-8 flex flex-col gap-3">
                          <div className="flex gap-2">
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 bg-brand-accent rounded-full" />
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }} className="w-1.5 h-1.5 bg-brand-accent rounded-full" />
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }} className="w-1.5 h-1.5 bg-brand-accent rounded-full" />
                          </div>
                          <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-brand-900/30">Aura is formulating...</span>
                        </div>
                      )}
                      {isListening && (
                        <div className="self-end p-8 flex flex-col items-end gap-3">
                          <div className="flex gap-1.5 h-4 items-end">
                            <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-brand-accent rounded-full" />
                            <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-1 bg-brand-accent rounded-full" />
                            <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1 bg-brand-accent rounded-full" />
                          </div>
                          <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-brand-900/30">Aura is listening...</span>
                          {interimTranscript && (
                            <p className="text-sm font-serif italic text-brand-900/40 max-w-[200px] text-right">
                              "{interimTranscript}..."
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="settings"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-grow p-16 space-y-16 overflow-y-auto no-scrollbar"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        <div className="space-y-10">
                          <h4 className="text-[11px] font-bold uppercase tracking-[0.5em] text-brand-accent border-b border-brand-100 pb-4">Voice Calibration</h4>
                          
                          <div className="space-y-8">
                            <div className="bg-white border border-brand-100 p-8 space-y-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <p className="font-serif text-xl italic text-brand-900">Microphone Access</p>
                                  <p className="text-xs text-brand-800/50">Required for voice interaction</p>
                                </div>
                                <div className={cn(
                                  "px-3 py-1 text-[8px] font-bold uppercase tracking-widest rounded-full",
                                  micPermissionStatus === 'granted' ? "bg-emerald-100 text-emerald-700" : 
                                  micPermissionStatus === 'denied' ? "bg-rose-100 text-rose-700" : "bg-brand-100 text-brand-700"
                                )}>
                                  {micPermissionStatus.toUpperCase()}
                                </div>
                              </div>
                              {micPermissionStatus !== 'granted' && (
                                <button 
                                  onClick={requestMicPermission}
                                  className="w-full bg-brand-900 text-white py-4 uppercase tracking-widest text-[10px] font-bold hover:bg-brand-accent transition-all flex items-center justify-center gap-2"
                                >
                                  <Mic className="w-3 h-3" />
                                  Enable Microphone
                                </button>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="font-serif text-xl italic text-brand-900">Wake Word Detection</p>
                                <p className="text-xs text-brand-800/50">Listen for "{wakeWord}" to initialize</p>
                              </div>
                              <button 
                                onClick={() => {
                                  playSound('click');
                                  setIsWakeWordEnabled(!isWakeWordEnabled);
                                }}
                                className={cn(
                                  "w-16 h-8 transition-all relative border",
                                  isWakeWordEnabled ? "bg-brand-accent border-brand-accent" : "bg-brand-200 border-brand-200"
                                )}
                              >
                                <motion.div 
                                  animate={{ x: isWakeWordEnabled ? 32 : 0 }}
                                  className="w-8 h-full bg-white shadow-sm"
                                />
                              </button>
                            </div>

                            {isWakeWordEnabled && (
                              <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-800/40">Custom Identifier</p>
                                <input 
                                  type="text"
                                  value={wakeWord}
                                  onChange={(e) => setWakeWord(e.target.value)}
                                  className="w-full px-6 py-4 bg-white border border-brand-100 outline-none focus:border-brand-accent font-serif italic text-lg"
                                />
                              </div>
                            )}

                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <p className="font-serif text-xl italic text-brand-900">Acoustic Sensitivity</p>
                                  <p className="text-xs text-brand-800/50">Environmental noise filtering</p>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <input 
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.1"
                                  value={micSensitivity}
                                  onChange={(e) => setMicSensitivity(parseFloat(e.target.value))}
                                  className="w-full accent-brand-accent h-px bg-brand-200 appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[9px] font-bold text-brand-900/30 tracking-widest">
                                  <span>MINIMAL</span>
                                  <span>MAXIMUM</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-10">
                          <h4 className="text-[11px] font-bold uppercase tracking-[0.5em] text-brand-accent border-b border-brand-100 pb-4">Interface Status</h4>
                          <div className="bg-brand-900 p-10 text-white space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">System Nominal</span>
                            </div>
                            <p className="text-sm leading-relaxed opacity-60 italic font-serif">
                              "Aura is currently operating at peak fidelity. Voice recognition is optimized for your unique vocal signature."
                            </p>
                            <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[8px] opacity-40 uppercase tracking-widest">Latency</p>
                                <p className="text-xs font-mono">14ms</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] opacity-40 uppercase tracking-widest">Encryption</p>
                                <p className="text-xs font-mono">AES-256</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {auraError && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-10 py-3 bg-rose-50 border-t border-rose-100 flex items-center justify-between gap-4"
                >
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest leading-tight">
                    {auraError}
                  </span>
                  <button 
                    onClick={() => setAuraError(null)}
                    className="text-rose-400 hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}

              {isAuraProcessing && !isAuraTyping && (
                <div className="px-10 py-4 flex items-center justify-center gap-3 bg-brand-50/30 border-t border-brand-100/50">
                  <div className="w-4 h-4 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-800 opacity-60">Preparing response...</span>
                </div>
              )}

              {isAuraSpeaking && (
                <div className="px-10 py-6 flex flex-col items-center gap-4 bg-brand-50/50">
                  <div className="flex items-end gap-1.5 h-10">
                    <div className="wave-bar animate-voice-wave h-4 bg-brand-accent w-1 rounded-full"></div>
                    <div className="wave-bar animate-voice-wave h-10 [animation-delay:0.2s] bg-brand-accent w-1 rounded-full"></div>
                    <div className="wave-bar animate-voice-wave h-6 [animation-delay:0.4s] bg-brand-accent w-1 rounded-full"></div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">Aura is speaking...</span>
                </div>
              )}

              <div className="p-10 border-t border-brand-100 bg-white">
                {micPermissionStatus !== 'granted' ? (
                  <button 
                    onClick={requestMicPermission}
                    className="w-full bg-brand-900 text-white py-6 uppercase tracking-[0.4em] text-[10px] font-bold hover:bg-brand-accent transition-all flex items-center justify-center gap-4 shadow-2xl group"
                  >
                    <div className="relative">
                      <Mic className="w-4 h-4" />
                      <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-0 group-hover:opacity-100" />
                    </div>
                    Enable Voice Interaction
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      onClick={toggleMic}
                      className={cn(
                        "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl relative group",
                        isListening ? "bg-brand-accent text-white" : "bg-brand-900 text-white hover:bg-brand-accent"
                      )}
                    >
                      {isListening && <div className="absolute inset-0 rounded-full border-4 border-brand-accent animate-ping opacity-30" />}
                      <Mic className={cn("w-8 h-8", isListening && "animate-pulse")} />
                    </button>
                    <div className="flex-grow flex flex-col justify-center">
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Type a message to Aura..."
                          className="w-full bg-brand-50 border border-brand-100 py-5 px-8 pr-16 outline-none focus:border-brand-accent font-serif italic text-lg transition-all"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              sendMessage((e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-900/20 hover:text-brand-accent transition-colors">
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
