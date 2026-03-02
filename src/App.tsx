/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Heart, Wind, Zap, Settings2, CheckCircle2, AlertTriangle, MapPin, UserRound } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from './lib/utils';
import { selectAnchorContact, loadAnchorContact, type AnchorContact } from './lib/contactPicker';

// --- Types ---
interface UserState {
  id: string;
  anchorPhone: string;
  streak: number;
  lastCompleted: string | null;
}

// --- Components ---

export default function App() {
  const [user, setUser] = useState<UserState | null>(null);
  const [anchor, setAnchor] = useState<AnchorContact | null>(null);
  const [mode, setMode] = useState<'idle' | 'habit' | 'sos' | 'exhale'>('idle');
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [exhaleIntensity, setExhaleIntensity] = useState(0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number }[]>([]);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const shakeRef = useRef({ lastX: 0, lastY: 0, lastZ: 0, lastTime: 0, shakeCount: 0 });

  // --- Initialization ---
  useEffect(() => {
    const saved = localStorage.getItem('resonance_user');
    if (saved) {
      setUser(JSON.parse(saved));
    } else {
      const newUser = {
        id: uuidv4(),
        anchorPhone: '',
        streak: 0,
        lastCompleted: null,
      };
      setUser(newUser);
      localStorage.setItem('resonance_user', JSON.stringify(newUser));
    }

    // Hydrate anchor contact from contactPicker storage
    const savedAnchor = loadAnchorContact();
    if (savedAnchor) setAnchor(savedAnchor);

    // Setup Shake Detection
    const handleMotion = (event: DeviceMotionEvent) => {
      if (mode === 'sos' || mode === 'exhale') return;

      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      const currentTime = Date.now();
      const diffTime = currentTime - shakeRef.current.lastTime;

      if (diffTime > 100) {
        const { x, y, z } = acc;
        const speed = Math.abs((x || 0) + (y || 0) + (z || 0) - (shakeRef.current.lastX + shakeRef.current.lastY + shakeRef.current.lastZ)) / diffTime * 10000;

        if (speed > 2500) {
          shakeRef.current.shakeCount++;
          if (shakeRef.current.shakeCount > 5) {
            triggerSOS();
            shakeRef.current.shakeCount = 0;
          }
        } else {
          shakeRef.current.shakeCount = Math.max(0, shakeRef.current.shakeCount - 0.5);
        }

        shakeRef.current.lastX = x || 0;
        shakeRef.current.lastY = y || 0;
        shakeRef.current.lastZ = z || 0;
        shakeRef.current.lastTime = currentTime;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [mode]);

  // --- SOS Logic ---
  const triggerSOS = async () => {
    setMode('sos');
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);

    // Get Location
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

      // Read anchor from contactPicker localStorage (anchorContact key)
      const savedAnchor = loadAnchorContact();
      if (savedAnchor?.phone) {
        try {
          await fetch('/api/sos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anchorPhone: savedAnchor.phone, locationUrl }),
          });
        } catch (e) {
          console.error("SOS API Error", e);
        }
      }
    });

    // Auto-transition to Exhale after 3 seconds
    setTimeout(() => setMode('exhale'), 3000);
  };

  // --- Habit Logic ---
  const startHabit = () => {
    setMode('habit');
    setHoldProgress(0);
  };

  const handleHoldStart = () => {
    setIsHolding(true);
    const startTime = Date.now();
    const duration = 15000;

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setHoldProgress(progress);

      // Rhythmic Haptics
      if (navigator.vibrate && Math.floor(elapsed / 500) % 2 === 0) {
        navigator.vibrate(50);
      }

      if (progress >= 1) {
        completeHabit();
      }
    }, 50);
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    if (holdProgress < 1) setHoldProgress(0);
  };

  const completeHabit = () => {
    setIsHolding(false);
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);

    setUser(prev => {
      if (!prev) return null;
      const today = new Date().toDateString();
      if (prev.lastCompleted === today) return prev;

      const updated = {
        ...prev,
        streak: prev.streak + 1,
        lastCompleted: today
      };
      localStorage.setItem('resonance_user', JSON.stringify(updated));
      return updated;
    });

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => setMode('idle'), 1500);
  };

  // --- Exhale Engine Logic ---
  useEffect(() => {
    if (mode === 'exhale') {
      initAudio();
      initParticles();
    } else {
      stopAudio();
    }
  }, [mode]);

  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setExhaleIntensity(average / 128);
        requestAnimationFrame(update);
      };
      update();
    } catch (e) {
      console.error("Audio Init Error", e);
    }
  };

  const stopAudio = () => {
    if (microphoneRef.current) microphoneRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
  };

  const initParticles = () => {
    const p = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
    }));
    setParticles(p);
  };

  useEffect(() => {
    if (mode !== 'exhale') return;
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => {
        let { x, y, vx, vy } = p;

        // Push particles away based on exhale intensity
        if (exhaleIntensity > 0.3) {
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = exhaleIntensity * 20;
          vx += (dx / dist) * force;
          vy += (dy / dist) * force;
        }

        x += vx;
        y += vy;
        vx *= 0.95;
        vy *= 0.95;

        // Wrap around
        if (x < -50) x = window.innerWidth + 50;
        if (x > window.innerWidth + 50) x = -50;
        if (y < -50) y = window.innerHeight + 50;
        if (y > window.innerHeight + 50) y = -50;

        return { ...p, x, y, vx, vy };
      }));
    }, 16);
    return () => clearInterval(interval);
  }, [mode, exhaleIntensity]);

  // --- UI Helpers ---
  const handleSelectAnchor = async () => {
    const result = await selectAnchorContact();
    if (result.success) {
      setAnchor(result.contact);
    } else {
      const err = result as import('./lib/contactPicker').ContactPickerError;
      // Only show alert for real errors — not user cancellations
      if (err.errorCode !== 'USER_CANCELLED') {
        alert(`Could not select anchor: ${err.message}`);
      }
    }
  };

  if (!user) return null;

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center p-6 select-none touch-none bg-[#050505] text-white overflow-hidden font-sans">

      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 to-transparent pointer-events-none" />

      <AnimatePresence mode="wait">
        {mode === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-12 text-center"
          >
            <div className="space-y-2">
              <h1 className="text-5xl font-display font-bold tracking-tighter">Resonance</h1>
              <p className="text-zinc-500 font-medium uppercase tracking-widest text-xs">Zero-Friction Mental Health</p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <button
                onClick={startHabit}
                className="group relative w-32 h-32 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center transition-all hover:bg-emerald-500/20 active:scale-95"
              >
                <div className="absolute inset-0 rounded-full animate-pulse-ring border border-emerald-500/30" />
                <Heart className="w-10 h-10 text-emerald-400 group-hover:scale-110 transition-transform" />
              </button>
              <span className="text-zinc-400 text-sm font-medium">Daily Orbit</span>
            </div>

            <div className="grid grid-cols-2 gap-8 w-full max-w-xs">
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl font-display font-bold">{user.streak}</span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">Streak</span>
              </div>
              <button
                onClick={handleSelectAnchor}
                className="flex flex-col items-center gap-1 group"
              >
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  anchor ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700"
                )}>
                  {anchor ? <CheckCircle2 className="w-5 h-5" /> : <UserRound className="w-5 h-5" />}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                  {anchor ? anchor.name : 'Anchor'}
                </span>
              </button>
            </div>

            <div className="absolute bottom-12 text-zinc-600 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
              <Zap className="w-3 h-3" /> Shake for Emergency SOS
            </div>
          </motion.div>
        )}

        {mode === 'habit' && (
          <motion.div
            key="habit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-16"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-medium">Find Stillness</h2>
              <p className="text-zinc-500 text-sm">Hold the orb for 15 seconds</p>
            </div>

            <div className="relative w-64 h-64 flex items-center justify-center">
              {/* Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-zinc-800"
                />
                <motion.circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray="754"
                  animate={{ strokeDashoffset: 754 * (1 - holdProgress) }}
                  className="text-emerald-500"
                />
              </svg>

              <button
                onPointerDown={handleHoldStart}
                onPointerUp={handleHoldEnd}
                onPointerLeave={handleHoldEnd}
                className={cn(
                  "relative w-48 h-48 rounded-full transition-all duration-500 flex items-center justify-center",
                  isHolding ? "bg-emerald-500 scale-110 shadow-[0_0_50px_rgba(16,185,129,0.4)]" : "bg-emerald-500/20 scale-100"
                )}
              >
                <AnimatePresence>
                  {holdProgress >= 1 ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <CheckCircle2 className="w-16 h-16 text-white" />
                    </motion.div>
                  ) : (
                    <Heart className={cn("w-12 h-12 transition-colors", isHolding ? "text-white" : "text-emerald-400")} />
                  )}
                </AnimatePresence>
              </button>
            </div>
          </motion.div>
        )}

        {mode === 'sos' && (
          <motion.div
            key="sos"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-600 absolute inset-0 flex flex-col items-center justify-center gap-8 p-12 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-display font-bold">SOS TRIGGERED</h2>
              <p className="text-white/80 font-medium">Alerting your anchor and sharing location...</p>
            </div>
            <div className="flex items-center gap-4 text-sm font-semibold bg-black/20 px-6 py-3 rounded-full">
              <MapPin className="w-4 h-4" />
              {anchor ? `${anchor.name} · ${anchor.phone}` : 'No Anchor Set'}
            </div>
          </motion.div>
        )}

        {mode === 'exhale' && (
          <motion.div
            key="exhale"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center"
          >
            {/* Particles */}
            {particles.map(p => (
              <motion.div
                key={p.id}
                className="absolute w-2 h-2 rounded-full bg-emerald-400/40 blur-[1px]"
                animate={{ x: p.x, y: p.y }}
                transition={{ duration: 0, ease: "linear" }}
              />
            ))}

            <div className="relative z-10 flex flex-col items-center gap-8 text-center pointer-events-none">
              <div className="w-32 h-32 rounded-full border-2 border-emerald-500/30 flex items-center justify-center">
                <Wind className={cn("w-12 h-12 text-emerald-400 transition-transform", exhaleIntensity > 0.3 && "scale-150")} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-medium">Exhale Deeply</h2>
                <p className="text-zinc-500 text-sm">Blow into the microphone to clear the screen</p>
              </div>
            </div>

            <button
              onClick={() => setMode('idle')}
              className="absolute bottom-12 px-8 py-4 rounded-full bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              I feel better now
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
