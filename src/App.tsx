/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Heart, Wind, Zap, Settings2, CheckCircle2, AlertTriangle, MapPin, UserRound, Target, ArrowLeft, Gamepad2, Brain } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from './lib/utils';
import { selectAnchor, loadAnchorContact, type AnchorContact } from './lib/contactPicker';
import { getCurrentLocation, type LocationError } from './lib/location';
import { MeshTraceGame } from './MeshTraceGame';

// --- Types ---
interface UserState {
  id: string;
  anchorPhone: string;
  streak: number;
  lastCompleted: string | null;
}

// ─── Constants & Colors ────────────────────────────────────────────────────────
const C = {
  bg: '#070810',
  surface: '#0d0f1f',
  border: 'rgba(120,130,255,0.12)',
  accent: '#6c6fff',
  accent2: '#a78bfa',
  text: '#e8e9f8',
  glow: 'rgba(108,111,255,0.35)',
};

// ─── BREATH BALL COMPONENT ─────────────────────────────────────────────────────
function BreathBallGame({ onClose }: { onClose: () => void }) {
  const ballRef = useRef<HTMLDivElement>(null);
  const cycleCountEl = useRef<HTMLSpanElement>(null);

  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'Ready' | 'Inhale' | 'Hold' | 'Exhale'>('Ready');
  const [activeSide, setActiveSide] = useState<'top' | 'right' | 'bottom' | 'left' | null>(null);
  const [ballCol, setBallCol] = useState('#6c6fff'); // Inhale color

  const reqRef = useRef<number | null>(null);
  const animStartRef = useRef<number | null>(null);
  const cycleRef = useRef<number>(0);

  const SZ = 280; // track size
  const INHALE_MS = 8000;
  const EXHALE_MS = 8000;
  const HOLD_MS = 2000;
  const CYCLE_MS = INHALE_MS + HOLD_MS + EXHALE_MS + HOLD_MS;

  const sides = [
    { from: [0, 0], to: [SZ, 0], dur: INHALE_MS, phase: 'Inhale', side: 'top', col: '#6c6fff' },
    { from: [SZ, 0], to: [SZ, SZ], dur: HOLD_MS, phase: 'Hold', side: 'right', col: '#a78bfa' },
    { from: [SZ, SZ], to: [0, SZ], dur: EXHALE_MS, phase: 'Exhale', side: 'bottom', col: '#34d399' },
    { from: [0, SZ], to: [0, 0], dur: HOLD_MS, phase: 'Hold', side: 'left', col: '#a78bfa' },
  ] as const;

  const cumulative = [0, INHALE_MS, INHALE_MS + HOLD_MS, INHALE_MS + HOLD_MS + EXHALE_MS];

  const updateBall = (x: number, y: number) => {
    if (ballRef.current) {
      ballRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }
  };

  const animLoop = (ts: number) => {
    if (!running) return;
    if (animStartRef.current === null) animStartRef.current = ts;
    const elapsed = (ts - animStartRef.current!) % CYCLE_MS;

    let sideIdx = 0;
    for (let i = sides.length - 1; i >= 0; i--) {
      if (elapsed >= cumulative[i]) { sideIdx = i; break; }
    }

    const s = sides[sideIdx];
    const t = (elapsed - cumulative[sideIdx]) / s.dur; // 0 to 1
    const x = s.from[0] + (s.to[0] - s.from[0]) * t;
    const y = s.from[1] + (s.to[1] - s.from[1]) * t;

    updateBall(x, y);
    setPhase(s.phase as any);
    setActiveSide(s.side as any);
    setBallCol(s.col);

    const newCycles = Math.floor((ts - animStartRef.current!) / CYCLE_MS);
    if (newCycles !== cycleRef.current) {
      cycleRef.current = newCycles;
      if (cycleCountEl.current) cycleCountEl.current.textContent = newCycles.toString();
    }

    reqRef.current = requestAnimationFrame(animLoop);
  };

  useEffect(() => {
    if (running) {
      reqRef.current = requestAnimationFrame(animLoop);
    } else {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      updateBall(0, 0);
      setPhase('Ready');
      setActiveSide(null);
      animStartRef.current = null;
      cycleRef.current = 0;
      if (cycleCountEl.current) cycleCountEl.current.textContent = '0';
      setBallCol('#6c6fff');
    }
    return () => { if (reqRef.current) cancelAnimationFrame(reqRef.current); };
  }, [running]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative">
      <div className="absolute top-6 left-6 z-50">
        <button onClick={() => { setRunning(false); onClose(); }} className="px-4 py-2 bg-white/50 border border-[#DDDDDD] text-[#111111] font-display text-xs font-bold uppercase tracking-widest rounded-[12px] hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="text-center mb-12 relative z-10">
        <div className="font-display text-sm font-bold text-[rgba(0,0,0,0.5)] uppercase tracking-[0.2em] mb-8">🫧 Breath Ball</div>
        <div className={cn(
          "font-display text-3xl font-bold tracking-widest uppercase transition-colors duration-500",
          phase === 'Inhale' ? 'text-[#a78bfa]' : phase === 'Exhale' ? 'text-emerald-500' : phase === 'Hold' ? 'text-[#6c6fff]' : 'text-[rgba(0,0,0,0.4)]'
        )}>
          {phase}
        </div>
      </div>

      <div className="relative w-[280px] h-[280px] z-10">
        {/* Glows */}
        <div className={cn("absolute top-[-2px] left-[10%] right-[10%] h-[4px] blur-[2px] transition-opacity duration-300", activeSide === 'top' ? 'opacity-100' : 'opacity-0')} style={{ background: 'linear-gradient(90deg, transparent, #a78bfa, transparent)' }} />
        <div className={cn("absolute right-[-2px] top-[10%] bottom-[10%] w-[4px] blur-[2px] transition-opacity duration-300", activeSide === 'right' ? 'opacity-100' : 'opacity-0')} style={{ background: 'linear-gradient(180deg, transparent, #6c6fff, transparent)' }} />
        <div className={cn("absolute bottom-[-2px] left-[10%] right-[10%] h-[4px] blur-[2px] transition-opacity duration-300", activeSide === 'bottom' ? 'opacity-100' : 'opacity-0')} style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }} />
        <div className={cn("absolute left-[-2px] top-[10%] bottom-[10%] w-[4px] blur-[2px] transition-opacity duration-300", activeSide === 'left' ? 'opacity-100' : 'opacity-0')} style={{ background: 'linear-gradient(180deg, transparent, #6c6fff, transparent)' }} />

        {/* Track (Darkened border for visibility on light bg) */}
        <div className="absolute inset-0 border-2 border-black/10 rounded-[20px] bg-white/20 backdrop-blur-sm" />

        {/* Labels */}
        <div className={cn("absolute -top-7 left-1/2 -translate-x-1/2 font-display text-[10px] uppercase tracking-widest font-bold transition-colors", activeSide === 'top' ? 'text-[#a78bfa]' : 'text-[rgba(0,0,0,0.4)]')}>Inhale</div>
        <div className={cn("absolute -right-12 top-1/2 -translate-y-1/2 font-display text-[10px] uppercase tracking-widest font-bold transition-colors", activeSide === 'right' ? 'text-[#6c6fff]' : 'text-[rgba(0,0,0,0.4)]')}>Hold</div>
        <div className={cn("absolute -bottom-7 left-1/2 -translate-x-1/2 font-display text-[10px] uppercase tracking-widest font-bold transition-colors", activeSide === 'bottom' ? 'text-[#10b981]' : 'text-[rgba(0,0,0,0.4)]')}>Exhale</div>
        <div className={cn("absolute -left-12 top-1/2 -translate-y-1/2 font-display text-[10px] uppercase tracking-widest font-bold transition-colors", activeSide === 'left' ? 'text-[#6c6fff]' : 'text-[rgba(0,0,0,0.4)]')}>Hold</div>

        {/* Ball */}
        <div
          ref={ballRef}
          className="absolute rounded-full top-0 left-0 transition-none pointer-events-none"
          style={{
            width: '28px', height: '28px',
            background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${ballCol} 70%)`,
            boxShadow: `0 0 16px ${ballCol}66, inset 0 0 8px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.1)`,
            border: '1px solid rgba(255,255,255,0.8)'
          }}
        />
      </div>

      <div className="mt-16 font-display text-sm font-bold uppercase tracking-widest text-[rgba(0,0,0,0.5)] z-10">
        Cycles: <span ref={cycleCountEl} className="text-[#a78bfa] text-xl ml-2 font-black">0</span>
      </div>

      <button
        onClick={() => setRunning(!running)}
        className={cn(
          "mt-8 px-8 py-4 rounded-[12px] font-display text-xs font-bold uppercase tracking-widest transition-all z-10",
          running
            ? "bg-rose-500 text-white border-transparent shadow-[0_8px_30px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95"
            : "bg-white text-[#111111] border border-[#DDDDDD] hover:border-transparent hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:scale-105 active:scale-95"
        )}
      >
        {running ? '■ Stop' : '▶ Start'}
      </button>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<UserState | null>(null);
  const [anchor, setAnchor] = useState<AnchorContact | null>(null);

  // Base states
  const [mode, setMode] = useState<'anchor' | 'hub' | 'sos' | 'exhale'>('anchor');
  const [overlay, setOverlay] = useState<'hold' | 'breath' | 'games' | 'meshtrace' | null>(null);
  const [lastStress, setLastStress] = useState<'calm' | 'mild' | 'high' | null>(null);

  // Hold Mode State
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBeatRef = useRef(0);

  // Exhale Engine State
  const [exhaleIntensity, setExhaleIntensity] = useState(0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number }[]>([]);
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
      const newUser = { id: uuidv4(), anchorPhone: '', streak: 0, lastCompleted: null };
      setUser(newUser);
      localStorage.setItem('resonance_user', JSON.stringify(newUser));
    }

    const savedAnchor = loadAnchorContact();
    if (savedAnchor) {
      setAnchor(savedAnchor);
      setMode('hub'); // go straight to hub if anchor exists
    }

    // --- Shake Detection ---
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
          if (shakeRef.current.shakeCount > 5) { triggerSOS(); shakeRef.current.shakeCount = 0; }
        } else { shakeRef.current.shakeCount = Math.max(0, shakeRef.current.shakeCount - 0.5); }
        shakeRef.current.lastX = x || 0; shakeRef.current.lastY = y || 0; shakeRef.current.lastZ = z || 0; shakeRef.current.lastTime = currentTime;
      }
    };
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [mode]);

  // --- SOS Logic ---
  const triggerSOS = async () => {
    setMode('sos'); setOverlay(null);
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    const locationResult = await getCurrentLocation();
    if (locationResult.success) {
      const { latitude, longitude } = locationResult.coordinates;
      const locationUrl = locationResult.mapsUrl;
      console.log('[SOS] Map Link:', locationUrl);
      const savedAnchor = loadAnchorContact();
      if (savedAnchor?.phone) {
        try { await fetch('/api/sos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anchorPhone: savedAnchor.phone, locationUrl }) }); } catch (e) { console.error('[SOS] API Error:', e); }
      }
    }
    setTimeout(() => setMode('exhale'), 3000);
  };

  // --- Hold Logic (15s Grounding) ---
  const handleHoldStart = () => {
    setIsHolding(true);
    const startTime = Date.now();
    const duration = 15000;
    lastBeatRef.current = 0;
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setHoldProgress(progress);
      if (navigator.vibrate && elapsed - lastBeatRef.current >= 1000) { navigator.vibrate(80); lastBeatRef.current = elapsed; }
      if (progress >= 1) completeHabit();
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
      const updated = { ...prev, streak: prev.streak + 1, lastCompleted: today };
      localStorage.setItem('resonance_user', JSON.stringify(updated));
      return updated;
    });
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => { setHoldProgress(0); setOverlay(null); }, 1500);
  };

  // --- Exhale Logic ---
  useEffect(() => {
    if (mode === 'exhale') { initAudio(); initParticles(); } else { stopAudio(); }
    return () => stopAudio();
  }, [mode]);

  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / analyserRef.current.frequencyBinCount;
        setExhaleIntensity(average / 128);
        requestAnimationFrame(update);
      };
      update();
    } catch (e) { console.error("Audio Init Error", e); }
  };

  const stopAudio = () => {
    if (microphoneRef.current) microphoneRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
  };

  const initParticles = () => {
    setParticles(Array.from({ length: 50 }).map((_, i) => ({ id: i, x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2 })));
  };

  useEffect(() => {
    if (mode !== 'exhale') return;
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => {
        let { x, y, vx, vy } = p;
        if (exhaleIntensity > 0.3) {
          const dx = x - window.innerWidth / 2, dy = y - window.innerHeight / 2, dist = Math.sqrt(dx * dx + dy * dy), force = exhaleIntensity * 20;
          vx += (dx / dist) * force; vy += (dy / dist) * force;
        }
        x += vx; y += vy; vx *= 0.95; vy *= 0.95;
        if (x < -50) x = window.innerWidth + 50; if (x > window.innerWidth + 50) x = -50;
        if (y < -50) y = window.innerHeight + 50; if (y > window.innerHeight + 50) y = -50;
        return { ...p, x, y, vx, vy };
      }));
    }, 16);
    return () => clearInterval(interval);
  }, [mode, exhaleIntensity]);

  // --- UI Helpers ---
  const handleSelectAnchorPhase1 = async () => {
    const labels = ['Mom', 'Dad', 'Favourite'];
    const currentIdx = anchor?.label ? labels.indexOf(anchor.label) : -1;
    const result = await selectAnchor(labels[(currentIdx + 1) % labels.length]);
    if (result.success) { setAnchor(result.contact); setMode('hub'); }
  };

  if (!user) return null;

  return (
    <div className="relative w-full h-screen bg-[linear-gradient(135deg,#E8ECFF_0%,#F4E8FF_50%,#DFF7FF_100%)] text-[#111111] font-sans flex flex-col items-center justify-center p-6 overflow-hidden">

      {/* ─── PHASE 1: Anchor Setup ─── */}
      {mode === 'anchor' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center text-center">
          <h1 className="font-display text-4xl font-bold mb-4 text-[#111111]">Set Your Anchor</h1>
          <p className="text-[rgba(0,0,0,0.7)] mb-12 max-w-sm">Tap the button to pick a trusted contact from your phone. They will receive the SOS alert if you shake your physical device.</p>
          <button
            onClick={handleSelectAnchorPhase1}
            className="px-8 py-4 rounded-full bg-[rgba(255,255,255,0.7)] border border-[#DDDDDD] text-[#111111] font-display font-bold uppercase tracking-widest hover:bg-[#FFFFFF] hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all font-sm"
          >
            Select Your Anchor
          </button>
        </motion.div>
      )}

      {/* ─── PHASE 2: Main Hub (New Redesign) ─── */}
      {mode === 'hub' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full max-w-[860px]">
          <div className="font-display text-sm font-bold tracking-[0.2em] uppercase bg-gradient-to-br from-[#111111] to-[rgba(0,0,0,0.5)] text-transparent bg-clip-text mb-12 opacity-80">
            Resonance
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
            {/* Grounding Card */}
            <div
              onClick={() => setOverlay('hold')}
              className="group relative bg-[rgba(255,255,255,0.7)] backdrop-blur-md border border-[#DDDDDD] rounded-[20px] p-10 flex flex-col items-center text-center cursor-pointer overflow-hidden transition-all duration-300 hover:border-[#FFFFFF] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.05)] active:scale-95"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-4xl mb-4 leading-none relative z-10 transition-transform group-hover:scale-110 duration-500">💓</div>
              <div className="font-display font-bold text-sm tracking-[0.12em] uppercase text-[#111111] mb-2 relative z-10">15s Grounding</div>
              <div className="text-xs text-[rgba(0,0,0,0.7)] font-light leading-relaxed relative z-10">Hold to anchor yourself</div>
            </div>

            {/* Breath Ball Card */}
            <div
              onClick={() => setOverlay('breath')}
              className="group relative bg-[rgba(255,255,255,0.7)] backdrop-blur-md border border-[#DDDDDD] rounded-[20px] p-10 flex flex-col items-center text-center cursor-pointer overflow-hidden transition-all duration-300 hover:border-[#FFFFFF] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.05)] active:scale-95"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-4xl mb-4 leading-none relative z-10 transition-transform group-hover:scale-110 duration-500">🫧</div>
              <div className="font-display font-bold text-sm tracking-[0.12em] uppercase text-[#111111] mb-2 relative z-10">Breath Ball</div>
              <div className="text-xs text-[rgba(0,0,0,0.7)] font-light leading-relaxed relative z-10">Follow the ball to breathe</div>
            </div>

            {/* Games Card */}
            <div
              onClick={() => setOverlay('games')}
              className="group relative bg-[rgba(255,255,255,0.7)] backdrop-blur-md border border-[#DDDDDD] rounded-[20px] p-10 flex flex-col items-center text-center cursor-pointer overflow-hidden transition-all duration-300 hover:border-[#FFFFFF] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.05)] active:scale-95"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-4xl mb-4 leading-none relative z-10 transition-transform group-hover:scale-110 duration-500">🎮</div>
              <div className="font-display font-bold text-sm tracking-[0.12em] uppercase text-[#111111] mb-2 relative z-10">Games</div>
              <div className="text-xs text-[rgba(0,0,0,0.7)] font-light leading-relaxed relative z-10">Play to unwind</div>
            </div>
          </div>

          <div className="absolute bottom-12 text-[rgba(0,0,0,0.5)] text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
            <Zap className="w-3 h-3" /> Shake for Emergency SOS
          </div>
        </motion.div>
      )}

      {/* ─── OVERLAYS ─── */}
      <AnimatePresence>
        {mode === 'hub' && overlay && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[linear-gradient(135deg,#E8ECFF_0%,#F4E8FF_50%,#DFF7FF_100%)] flex flex-col items-center justify-center p-6"
          >
            {/* Hold Overlay */}
            {overlay === 'hold' && (
              <>
                <div className="absolute top-6 left-6 z-50">
                  <button onClick={() => setOverlay(null)} className="px-4 py-2 bg-white/50 border border-[#DDDDDD] text-[#111111] font-display text-xs font-bold uppercase tracking-widest rounded-[12px] hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                </div>
                <div className="font-display text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(0,0,0,0.5)] mb-12">💓 15s Grounding</div>

                <div className="relative mb-10">
                  <button
                    onPointerDown={handleHoldStart}
                    onPointerUp={handleHoldEnd}
                    onPointerLeave={handleHoldEnd}
                    className={cn(
                      "w-[120px] h-[120px] rounded-full flex items-center justify-center font-display font-bold text-sm tracking-widest uppercase select-none relative transition-all duration-150 backdrop-blur-md",
                      isHolding
                        ? "bg-[rgba(255,255,255,1)] text-[#111111] border-2 border-transparent shadow-[0_10px_40px_rgba(0,0,0,0.1)] scale-95"
                        : "bg-[rgba(255,255,255,0.4)] text-[rgba(0,0,0,0.7)] border-2 border-white/50"
                    )}
                  >
                    <svg className="absolute -top-[7px] -left-[7px] w-[134px] h-[134px] -rotate-90 pointer-events-none overflow-visible">
                      <circle cx="67" cy="67" r="62" fill="none" className="stroke-white/50" strokeWidth="3" />
                      <motion.circle
                        cx="67" cy="67" r="62" fill="none" className="stroke-[#a78bfa]" strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={390} strokeDashoffset={390 * (1 - holdProgress)}
                        style={{ filter: 'drop-shadow(0 0 6px rgba(167,139,250,0.5))' }}
                      />
                    </svg>
                    {isHolding ? '●' : 'Hold'}
                  </button>
                </div>

                <motion.div key={user.streak} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="font-display text-6xl font-black text-[#111111] leading-none mb-1">{user.streak}</motion.div>
                <div className="text-xs text-[rgba(0,0,0,0.5)] font-medium uppercase tracking-widest">streak with anchor</div>
              </>
            )}

            {/* Breath Ball Overlay */}
            {overlay === 'breath' && <BreathBallGame onClose={() => setOverlay(null)} />}

            {/* Games Overlays */}
            {overlay === 'games' && (
              <>
                <div className="absolute top-6 left-6 z-50">
                  <button onClick={() => setOverlay(null)} className="px-4 py-2 bg-white/50 border border-[#DDDDDD] text-[#111111] font-display text-xs font-bold uppercase tracking-widest rounded-[12px] hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                </div>
                <div className="font-display text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(0,0,0,0.5)] mb-12">🎮 Games</div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-[480px]">
                  <div onClick={() => setOverlay('meshtrace')} className="bg-[rgba(255,255,255,0.7)] backdrop-blur-md border border-white/50 rounded-[20px] p-6 flex flex-col items-center gap-2 cursor-pointer transition-all hover:bg-white hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)]">
                    <div className="text-3xl mb-1 mt-2">🎯</div>
                    <div className="font-display font-bold text-xs tracking-widest uppercase text-[#111111]">MeshTrace</div>
                    <div className="text-[11px] text-[rgba(0,0,0,0.6)] text-center leading-relaxed">Tremor & stress detection</div>
                    {lastStress && <div className={cn("mt-2 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full", lastStress === 'calm' ? 'bg-emerald-100 text-emerald-700' : lastStress === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>State: {lastStress}</div>}
                  </div>

                  <div className="bg-[rgba(255,255,255,0.4)] backdrop-blur-sm border border-black/5 rounded-[20px] p-6 flex flex-col items-center gap-2 cursor-not-allowed opacity-80 mix-blend-luminosity grayscale">
                    <div className="text-3xl mb-1 mt-2">🧩</div>
                    <div className="font-display font-bold text-xs tracking-widest uppercase text-[#111111]">Mind Tiles</div>
                    <div className="text-[11px] text-[rgba(0,0,0,0.6)] text-center leading-relaxed">Soothing pattern matching</div>
                    <span className="font-display text-[10px] text-[rgba(0,0,0,0.5)] tracking-widest uppercase border border-black/10 rounded-full px-3 py-1 mt-2 bg-black/5">Coming Soon</span>
                  </div>

                  <div className="bg-[rgba(255,255,255,0.4)] backdrop-blur-sm border border-black/5 rounded-[20px] p-6 flex flex-col items-center gap-2 cursor-not-allowed opacity-80 mix-blend-luminosity grayscale">
                    <div className="text-3xl mb-1 mt-2">🌊</div>
                    <div className="font-display font-bold text-xs tracking-widest uppercase text-[#111111]">Flow State</div>
                    <div className="text-[11px] text-[rgba(0,0,0,0.6)] text-center leading-relaxed">Drift through calm waters</div>
                    <span className="font-display text-[10px] text-[rgba(0,0,0,0.5)] tracking-widest uppercase border border-black/10 rounded-full px-3 py-1 mt-2 bg-black/5">Coming Soon</span>
                  </div>

                  <div className="bg-[rgba(255,255,255,0.4)] backdrop-blur-sm border border-black/5 rounded-[20px] p-6 flex flex-col items-center gap-2 cursor-not-allowed opacity-80 mix-blend-luminosity grayscale">
                    <div className="text-3xl mb-1 mt-2">⭐</div>
                    <div className="font-display font-bold text-xs tracking-widest uppercase text-[#111111]">Star Garden</div>
                    <div className="text-[11px] text-[rgba(0,0,0,0.6)] text-center leading-relaxed">Grow your constellation</div>
                    <span className="font-display text-[10px] text-[rgba(0,0,0,0.5)] tracking-widest uppercase border border-black/10 rounded-full px-3 py-1 mt-2 bg-black/5">Coming Soon</span>
                  </div>
                </div>
              </>
            )}

            {/* MeshTrace Game overlay is rendered separately within games menu */}
            {overlay === 'meshtrace' && (
              <MeshTraceGame
                onClose={() => setOverlay('games')}
                onComplete={(state) => setLastStress(state)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PHASE 3: SOS Triggered ─── */}
      <AnimatePresence>
        {mode === 'sos' && (
          <motion.div key="sos" initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[100] bg-rose-500 flex flex-col items-center justify-center gap-8 p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center animate-pulse"><AlertTriangle className="w-12 h-12 text-white" /></div>
            <div className="space-y-4">
              <h2 className="text-4xl font-display font-bold tracking-tight text-white">SOS TRIGGERED</h2>
              <p className="text-white/90 font-medium">Alerting your anchor and sharing location...</p>
            </div>
            <div className="flex items-center gap-4 text-sm font-semibold bg-white/20 text-white px-6 py-3 rounded-full">
              <MapPin className="w-4 h-4" />
              {anchor ? `${anchor.name} · ${anchor.phone}` : 'No Anchor Set'}
            </div>
          </motion.div>
        )}

        {/* ─── PHASE 3: Exhale De-escalation ─── */}
        {mode === 'exhale' && (
          <motion.div key="exhale" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] overflow-hidden flex flex-col items-center justify-center bg-[linear-gradient(135deg,#DFF7FF_0%,#E8ECFF_100%)] text-[#111111]">
            {particles.map(p => (
              <motion.div key={p.id} className="absolute w-2 h-2 rounded-full bg-[#6c6fff]/40 blur-[1px]" animate={{ x: p.x, y: p.y }} transition={{ duration: 0, ease: "linear" }} />
            ))}
            <div className="relative z-10 flex flex-col items-center gap-8 text-center pointer-events-none">
              <div className="w-32 h-32 rounded-full border-2 border-[#6c6fff]/30 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                <Wind className={cn("w-12 h-12 text-[#6c6fff] transition-transform", exhaleIntensity > 0.3 && "scale-150")} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-bold text-[#111111]">Exhale Deeply</h2>
                <p className="text-[rgba(0,0,0,0.6)] text-sm">Blow into the microphone to clear the screen</p>
              </div>
            </div>
            <button onClick={() => { setMode('hub'); setOverlay(null); }} className="absolute bottom-12 px-8 py-4 rounded-full bg-[#6c6fff]/10 border border-[#6c6fff]/20 text-[#6c6fff] text-sm font-bold uppercase tracking-widest hover:bg-[#6c6fff]/20 transition-colors">
              I feel better now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
