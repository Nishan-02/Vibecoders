/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Heart, Wind, Zap, CheckCircle2, AlertTriangle, MapPin, ArrowLeft, Gamepad2, UserRound, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from './lib/utils';
import { selectAnchor, loadAnchorContact, clearAnchorContact, type AnchorContact } from './lib/contactPicker';
import { getCurrentLocation } from './lib/location';
import { MeshTraceGame } from './MeshTraceGame';
import { PulseGame } from './PulseGame';

// --- Types ---
interface UserState {
  id: string;
  anchorPhone: string;
  streak: number;
  lastCompleted: string | null;
  totalSos?: number;
}

// ─── INLINE BREATH BALL ────────────────────────────────────────────────────────
function InlineBreathBall() {
  const ballRef = useRef<HTMLDivElement>(null);
  const cycleCountEl = useRef<HTMLSpanElement>(null);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'Ready' | 'Inhale' | 'Hold' | 'Exhale'>('Ready');
  const [activeSide, setActiveSide] = useState<'top' | 'right' | 'bottom' | 'left' | null>(null);
  const [ballCol, setBallCol] = useState('#6c6fff');
  const reqRef = useRef<number | null>(null);
  const animStartRef = useRef<number | null>(null);
  const cycleRef = useRef<number>(0);

  const SZ = 200;
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
    const t = (elapsed - cumulative[sideIdx]) / s.dur;
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
    <div className="flex flex-col items-center w-full py-6">
      {/* Phase label */}
      <div className={cn(
        "font-display text-2xl font-bold tracking-widest uppercase transition-colors duration-500 mb-6",
        phase === 'Inhale' ? 'text-[#a78bfa]' : phase === 'Exhale' ? 'text-emerald-500' : phase === 'Hold' ? 'text-[#6c6fff]' : 'text-[rgba(0,0,0,0.35)]'
      )}>
        {phase}
      </div>

      {/* Track */}
      <div className="relative" style={{ width: SZ, height: SZ }}>
        {/* Glows */}
        <div className={cn("absolute top-[-2px] left-[10%] right-[10%] h-[3px] blur-[2px] transition-opacity duration-300", activeSide === 'top' ? 'opacity-100' : 'opacity-0')} style={{ background: 'linear-gradient(90deg, transparent, #a78bfa, transparent)' }} />
        <div className={cn("absolute right-[-2px] top-[10%] bottom-[10%] w-[3px] blur-[2px] transition-opacity duration-300", activeSide === 'right' ? 'opacity-100' : 'opacity-0')} style={{ background: 'linear-gradient(180deg, transparent, #6c6fff, transparent)' }} />
        <div className={cn("absolute bottom-[-2px] left-[10%] right-[10%] h-[3px] blur-[2px] transition-opacity duration-300", activeSide === 'bottom' ? 'opacity-100' : 'opacity-0')} style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }} />
        <div className={cn("absolute left-[-2px] top-[10%] bottom-[10%] w-[3px] blur-[2px] transition-opacity duration-300", activeSide === 'left' ? 'opacity-100' : 'opacity-0')} style={{ background: 'linear-gradient(180deg, transparent, #6c6fff, transparent)' }} />
        {/* Border */}
        <div className="absolute inset-0 border-2 border-black/10 rounded-[16px] bg-white/20 backdrop-blur-sm" />
        {/* Labels */}
        <div className={cn("absolute -top-6 left-1/2 -translate-x-1/2 font-display text-[9px] uppercase tracking-widest font-bold transition-colors", activeSide === 'top' ? 'text-[#a78bfa]' : 'text-[rgba(0,0,0,0.35)]')}>Inhale</div>
        <div className={cn("absolute -right-10 top-1/2 -translate-y-1/2 font-display text-[9px] uppercase tracking-widest font-bold transition-colors", activeSide === 'right' ? 'text-[#6c6fff]' : 'text-[rgba(0,0,0,0.35)]')}>Hold</div>
        <div className={cn("absolute -bottom-6 left-1/2 -translate-x-1/2 font-display text-[9px] uppercase tracking-widest font-bold transition-colors", activeSide === 'bottom' ? 'text-[#10b981]' : 'text-[rgba(0,0,0,0.35)]')}>Exhale</div>
        <div className={cn("absolute -left-10 top-1/2 -translate-y-1/2 font-display text-[9px] uppercase tracking-widest font-bold transition-colors", activeSide === 'left' ? 'text-[#6c6fff]' : 'text-[rgba(0,0,0,0.35)]')}>Hold</div>
        {/* Ball */}
        <div
          ref={ballRef}
          className="absolute rounded-full top-0 left-0 transition-none pointer-events-none"
          style={{
            width: '22px', height: '22px',
            background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${ballCol} 70%)`,
            boxShadow: `0 0 12px ${ballCol}66`,
            border: '1px solid rgba(255,255,255,0.8)'
          }}
        />
      </div>

      <div className="mt-10 font-display text-xs font-bold uppercase tracking-widest text-[rgba(0,0,0,0.4)]">
        Cycles: <span ref={cycleCountEl} className="text-[#a78bfa] text-base ml-1 font-black">0</span>
      </div>

      <button
        onClick={() => setRunning(!running)}
        className={cn(
          "mt-4 px-6 py-3 rounded-[12px] font-display text-xs font-bold uppercase tracking-widest transition-all",
          running
            ? "bg-rose-500 text-white shadow-[0_6px_20px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95"
            : "bg-white text-[#111111] border border-[#DDDDDD] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:scale-105 active:scale-95"
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

  // UI expansion states (inline toggles — no page nav)
  const [showGames, setShowGames] = useState(false);
  const [showBreath, setShowBreath] = useState(false);
  const [showAnchor, setShowAnchor] = useState(false);
  const [activeGame, setActiveGame] = useState<'meshtrace' | 'pulse' | null>(null);
  const [lastStress, setLastStress] = useState<'calm' | 'mild' | 'high' | null>(null);

  // Hold state
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBeatRef = useRef(0);

  // Exhale / SOS states
  const [mode, setMode] = useState<'hub' | 'sos' | 'exhale'>('hub');
  const [exhaleIntensity, setExhaleIntensity] = useState(0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number }[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const shakeRef = useRef({ lastX: 0, lastY: 0, lastZ: 0, lastTime: 0, shakeCount: 0 });

  // --- Init ---
  useEffect(() => {
    const saved = localStorage.getItem('resonance_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.totalSos === undefined) parsed.totalSos = 0;
      setUser(parsed);
    } else {
      const newUser = { id: uuidv4(), anchorPhone: '', streak: 0, lastCompleted: null, totalSos: 0 };
      setUser(newUser);
      localStorage.setItem('resonance_user', JSON.stringify(newUser));
    }
    const savedAnchor = loadAnchorContact();
    if (savedAnchor) setAnchor(savedAnchor);

    const handleMotion = (event: DeviceMotionEvent) => {
      if (mode !== 'hub') return;
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

  // --- SOS ---
  const triggerSOS = async () => {
    setMode('sos');
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, totalSos: (prev.totalSos || 0) + 1 };
      localStorage.setItem('resonance_user', JSON.stringify(updated));
      return updated;
    });
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    const locationResult = await getCurrentLocation();
    if (locationResult.success) {
      const locationUrl = locationResult.mapsUrl;
      const savedAnchor = loadAnchorContact();
      if (savedAnchor?.phone) {
        try { await fetch('/api/sos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anchorPhone: savedAnchor.phone, locationUrl }) }); } catch (e) { console.error('[SOS] API Error:', e); }
      }
    }
    setTimeout(() => setMode('exhale'), 3000);
  };

  // --- Hold ---
  const handleHoldStart = () => {
    setIsHolding(true);
    const startTime = Date.now();
    lastBeatRef.current = 0;
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 15000, 1);
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
    setTimeout(() => setHoldProgress(0), 1500);
  };

  // --- Exhale ---
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
        setExhaleIntensity(dataArray.reduce((a, b) => a + b) / analyserRef.current.frequencyBinCount / 128);
        requestAnimationFrame(update);
      };
      update();
    } catch (e) { console.error('Audio Init Error', e); }
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

  // --- Anchor select ---
  const handleSelectAnchor = async () => {
    const labels = ['Mom', 'Dad', 'Favourite'];
    const currentIdx = anchor?.label ? labels.indexOf(anchor.label) : -1;
    const result = await selectAnchor(labels[(currentIdx + 1) % labels.length]);
    if (result.success) {
      setAnchor(result.contact);
    } else {
      // Mock for desktop testing (result.message only exists on ContactPickerError)
      const errMsg = (result as { message?: string }).message ?? 'Contact Picker not supported.';
      alert(`${errMsg}\n\n[Dev Mode] Mocking a contact for desktop testing.`);
      setAnchor({ label: 'Emergency', name: 'Dev Mock Contact', phone: '+1234567890' });
    }
  };

  if (!user) return null;

  // ─── Full-screen Games ──────────────────────────────────────────────────
  if (activeGame === 'meshtrace') {
    return (
      <div className="fixed inset-0 bg-[linear-gradient(135deg,#E8ECFF_0%,#F4E8FF_50%,#DFF7FF_100%)]">
        <MeshTraceGame
          onClose={() => setActiveGame(null)}
          onComplete={(state) => { setLastStress(state); setActiveGame(null); }}
        />
      </div>
    );
  }

  if (activeGame === 'pulse') {
    return (
      <div className="fixed inset-0 bg-[linear-gradient(135deg,#E8ECFF_0%,#F4E8FF_50%,#DFF7FF_100%)]">
        <PulseGame onClose={() => setActiveGame(null)} />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-[linear-gradient(135deg,#E8ECFF_0%,#F4E8FF_50%,#DFF7FF_100%)] text-[#111111] font-sans">

      {/* ── SOS Overlay ── */}
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

        {/* ── Exhale Overlay ── */}
        {mode === 'exhale' && (
          <motion.div key="exhale" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] overflow-hidden flex flex-col items-center justify-center bg-[linear-gradient(135deg,#DFF7FF_0%,#E8ECFF_100%)] text-[#111111]">
            {particles.map(p => (
              <motion.div key={p.id} className="absolute w-2 h-2 rounded-full bg-[#6c6fff]/40 blur-[1px]" animate={{ x: p.x, y: p.y }} transition={{ duration: 0, ease: 'linear' }} />
            ))}
            <div className="relative z-10 flex flex-col items-center gap-8 text-center pointer-events-none">
              <div className="w-32 h-32 rounded-full border-2 border-[#6c6fff]/30 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                <Wind className={cn('w-12 h-12 text-[#6c6fff] transition-transform', exhaleIntensity > 0.3 && 'scale-150')} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-bold text-[#111111]">Exhale Deeply</h2>
                <p className="text-[rgba(0,0,0,0.6)] text-sm">Blow into the microphone to clear the screen</p>
              </div>
            </div>
            <button onClick={() => { setMode('hub'); }} className="absolute bottom-12 px-8 py-4 rounded-full bg-[#6c6fff]/10 border border-[#6c6fff]/20 text-[#6c6fff] text-sm font-bold uppercase tracking-widest hover:bg-[#6c6fff]/20 transition-colors">
              I feel better now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Single Page Scrollable Dashboard ── */}
      <div className="flex flex-col items-center w-full max-w-[520px] mx-auto px-5 pb-16 pt-10">

        {/* Header */}
        <div className="w-full flex justify-between items-center mb-8">
          <div className="flex flex-col">
            <span className="text-[rgba(0,0,0,0.45)] text-[10px] uppercase tracking-[0.2em] font-bold mb-0.5">Hello, Anonymous</span>
            <span className="font-display text-2xl font-black uppercase tracking-tight text-[#111111]">Your Dashboard</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { clearAnchorContact(); setAnchor(null); setShowAnchor(true); }}
              className="w-10 h-10 rounded-full border border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.7)] backdrop-blur-md flex items-center justify-center hover:bg-white transition-all shadow-sm"
              title="Clear Anchor"
            >
              <ArrowLeft className="w-4 h-4 text-[#111111]" />
            </button>
            <button
              onClick={() => setShowAnchor(v => !v)}
              className="w-10 h-10 rounded-full border border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.7)] backdrop-blur-md flex items-center justify-center hover:bg-white transition-all shadow-sm group"
              title="Manage Anchor"
            >
              <Shield className="w-4 h-4 text-[#a78bfa] group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* Streak Bar */}
        <div className="w-full bg-[rgba(255,255,255,0.7)] backdrop-blur-md border border-[#DDDDDD] rounded-[20px] p-5 flex flex-col mb-3 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-xl">🔥</span>
            <span className="font-display font-black text-sm tracking-wide uppercase text-[#111111]">{user.streak} Day Focus</span>
          </div>
          <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all duration-1000 rounded-full" style={{ width: `${Math.min(user.streak * 10, 100)}%` }} />
          </div>
        </div>

        {/* Stats Row */}
        <div className="w-full grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[rgba(255,255,255,0.55)] border border-[rgba(0,0,0,0.05)] rounded-[18px] p-4 flex flex-col items-center text-center">
            <AlertTriangle className="w-4 h-4 text-rose-500 mb-1.5" />
            <div className="font-display text-lg font-black text-[#111111]">{user.totalSos || 0}</div>
            <div className="text-[9px] text-[rgba(0,0,0,0.45)] font-bold tracking-[0.1em] uppercase mt-0.5">Total SOS</div>
          </div>
          <div className="bg-[rgba(255,255,255,0.55)] border border-[rgba(0,0,0,0.05)] rounded-[18px] p-4 flex flex-col items-center text-center">
            <Shield className="w-4 h-4 text-[#6c6fff] mb-1.5" />
            <div className="font-display text-xs font-black text-[#111111] uppercase leading-6">{anchor ? 'Active' : 'None'}</div>
            <div className="text-[9px] text-[rgba(0,0,0,0.45)] font-bold tracking-[0.1em] uppercase mt-0.5">Anchor</div>
          </div>
          <div className="bg-[rgba(255,255,255,0.55)] border border-[rgba(0,0,0,0.05)] rounded-[18px] p-4 flex flex-col items-center text-center">
            <Zap className="w-4 h-4 text-[#a78bfa] mb-1.5" />
            <div className="font-display text-xs font-black text-[#111111] uppercase leading-6">{user.streak >= 7 ? 'Master' : user.streak > 2 ? 'Adept' : 'Novice'}</div>
            <div className="text-[9px] text-[rgba(0,0,0,0.45)] font-bold tracking-[0.1em] uppercase mt-0.5">Zen Level</div>
          </div>
        </div>

        {/* ── Daily Focus / Hold ── */}
        <div className="w-full bg-[rgba(255,255,255,0.7)] backdrop-blur-md border border-[#DDDDDD] rounded-[24px] p-6 mb-3 flex flex-col items-center shadow-sm">
          <div className="font-display text-[9px] font-bold tracking-[0.2em] uppercase text-[rgba(0,0,0,0.35)] mb-6">Daily Focus Session</div>
          <div className="relative">
            <button
              onPointerDown={handleHoldStart}
              onPointerUp={handleHoldEnd}
              onPointerLeave={handleHoldEnd}
              className={cn(
                'w-[160px] h-[160px] rounded-full flex flex-col items-center justify-center font-display font-bold select-none transition-all duration-300 z-10 relative',
                isHolding
                  ? 'bg-white text-[#111111] border border-transparent shadow-[0_10px_40px_rgba(0,0,0,0.1)] scale-95'
                  : 'bg-[rgba(255,255,255,0.5)] border border-white/60 text-[#111111] hover:scale-105 hover:bg-white/70'
              )}
            >
              {!isHolding && <div className="absolute inset-[18%] rounded-full bg-gradient-to-b from-[#e8e9ff] to-[#f4e8ff] opacity-60 blur-xl" />}
              <span className="text-lg tracking-widest uppercase mb-1 z-10">{isHolding ? '●' : 'HOLD'}</span>
              <span className="text-[10px] opacity-50 font-medium normal-case z-10">15 seconds</span>
            </button>
            {isHolding && (
              <svg className="absolute -top-[10px] -left-[10px] w-[180px] h-[180px] -rotate-90 pointer-events-none overflow-visible z-20">
                <circle cx="90" cy="90" r="83" fill="none" className="stroke-white/40" strokeWidth="2" />
                <motion.circle
                  cx="90" cy="90" r="83" fill="none" className="stroke-[#a78bfa]" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={521} strokeDashoffset={521 * (1 - holdProgress)}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(167,139,250,0.6))' }}
                />
              </svg>
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#6c6fff] to-[#a78bfa] blur-[40px] opacity-15 rounded-full z-0 pointer-events-none" />
          </div>
          <div className="font-display text-[9px] font-bold tracking-[0.2em] uppercase text-[rgba(0,0,0,0.35)] mt-6">Hold To Breathe</div>
          {holdProgress >= 1 && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 flex items-center gap-2 text-emerald-600 font-display font-bold text-sm uppercase tracking-widest">
              <CheckCircle2 className="w-5 h-5" /> Session Complete
            </motion.div>
          )}
        </div>

        {/* ── Breath Ball (inline toggle) ── */}
        <div className="w-full bg-[rgba(255,255,255,0.7)] backdrop-blur-md border border-[#DDDDDD] rounded-[24px] mb-3 overflow-hidden shadow-sm">
          <button
            onClick={() => setShowBreath(v => !v)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🫧</span>
              <div className="text-left">
                <div className="font-display font-bold text-sm uppercase tracking-wide text-[#111111]">Breath Ball</div>
                <div className="text-[11px] text-[rgba(0,0,0,0.5)]">Follow the ball to breathe</div>
              </div>
            </div>
            {showBreath ? <ChevronUp className="w-4 h-4 text-[rgba(0,0,0,0.4)]" /> : <ChevronDown className="w-4 h-4 text-[rgba(0,0,0,0.4)]" />}
          </button>
          <AnimatePresence>
            {showBreath && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden border-t border-[rgba(0,0,0,0.05)]"
              >
                <InlineBreathBall />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Zen Arena / Games (inline toggle) ── */}
        <div className="w-full bg-[rgba(255,255,255,0.7)] backdrop-blur-md border border-[#DDDDDD] rounded-[24px] mb-3 overflow-hidden shadow-sm">
          <button
            onClick={() => setShowGames(v => !v)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-5 h-5 text-[#6c6fff]" />
              <div className="text-left">
                <div className="font-display font-bold text-sm uppercase tracking-wide text-[#111111]">Zen Arena</div>
                <div className="text-[11px] text-[rgba(0,0,0,0.5)]">Play to unwind</div>
              </div>
            </div>
            {showGames ? <ChevronUp className="w-4 h-4 text-[rgba(0,0,0,0.4)]" /> : <ChevronDown className="w-4 h-4 text-[rgba(0,0,0,0.4)]" />}
          </button>
          <AnimatePresence>
            {showGames && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden border-t border-[rgba(0,0,0,0.05)]"
              >
                <div className="grid grid-cols-3 gap-3 p-5">
                  {/* MeshTrace */}
                  <div
                    onClick={() => setActiveGame('meshtrace')}
                    className="bg-[rgba(255,255,255,0.6)] border border-white/60 rounded-[16px] p-4 flex flex-col items-center gap-1.5 cursor-pointer hover:bg-white hover:-translate-y-1 transition-all shadow-sm"
                  >
                    <div className="text-2xl mt-1">🎯</div>
                    <div className="font-display font-bold text-[10px] tracking-widest uppercase text-[#111111] text-center">MeshTrace</div>
                    <div className="text-[9px] text-[rgba(0,0,0,0.5)] text-center leading-tight">Tremor detection</div>
                    {lastStress && (
                      <div className={cn('text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full mt-1', lastStress === 'calm' ? 'bg-emerald-100 text-emerald-700' : lastStress === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>
                        {lastStress}
                      </div>
                    )}
                  </div>

                  {/* 10-Second Pulse */}
                  <div
                    onClick={() => setActiveGame('pulse')}
                    className="bg-[rgba(255,255,255,0.6)] border border-white/60 rounded-[16px] p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-white hover:-translate-y-1 transition-all shadow-sm"
                  >
                    <div className="text-2xl mt-1">⚡</div>
                    <div className="font-display font-bold text-[10px] tracking-widest uppercase text-[#111111] text-center">Pulse</div>
                    <div className="text-[9px] text-[rgba(0,0,0,0.5)] text-center leading-tight">Release energy</div>
                  </div>

                  {/* Flow State — coming soon */}
                  <div className="bg-[rgba(255,255,255,0.3)] border border-black/5 rounded-[16px] p-4 flex flex-col items-center gap-1.5 cursor-not-allowed opacity-60 grayscale">
                    <div className="text-2xl mt-1">🌊</div>
                    <div className="font-display font-bold text-[10px] tracking-widest uppercase text-[#111111] text-center">Flow State</div>
                    <div className="text-[9px] text-[rgba(0,0,0,0.5)] text-center leading-tight">Calm waters</div>
                    <span className="text-[8px] font-bold text-[rgba(0,0,0,0.4)] uppercase border border-black/10 rounded-full px-2 py-0.5 mt-1 bg-black/5">Soon</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SOS Shield quick-tap button ── */}
        <button
          onClick={triggerSOS}
          className="w-full bg-rose-50/80 backdrop-blur-md border border-rose-100 rounded-[20px] py-5 px-6 flex items-center gap-4 transition-all hover:bg-rose-100 hover:border-rose-200 mb-3 shadow-sm group"
        >
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center group-hover:bg-rose-200 transition-colors">
            <MapPin className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-left">
            <div className="font-display font-bold text-sm uppercase tracking-wide text-rose-700">SOS Shield</div>
            <div className="text-[11px] text-rose-400">{anchor ? `Alert ${anchor.name}` : 'Tap to send emergency alert'}</div>
          </div>
          <AlertTriangle className="w-4 h-4 text-rose-300 ml-auto" />
        </button>

        {/* ── Anchor Section (inline toggle at bottom) ── */}
        <div className="w-full bg-[rgba(255,255,255,0.7)] backdrop-blur-md border border-[#DDDDDD] rounded-[24px] overflow-hidden shadow-sm">
          <button
            onClick={() => setShowAnchor(v => !v)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#a78bfa]" />
              <div className="text-left">
                <div className="font-display font-bold text-sm uppercase tracking-wide text-[#111111]">Your Anchor</div>
                <div className="text-[11px] text-[rgba(0,0,0,0.5)]">{anchor ? `${anchor.name} · ${anchor.phone}` : 'No anchor selected'}</div>
              </div>
            </div>
            {showAnchor ? <ChevronUp className="w-4 h-4 text-[rgba(0,0,0,0.4)]" /> : <ChevronDown className="w-4 h-4 text-[rgba(0,0,0,0.4)]" />}
          </button>
          <AnimatePresence>
            {showAnchor && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden border-t border-[rgba(0,0,0,0.05)]"
              >
                <div className="p-6 flex flex-col gap-4">
                  {anchor ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-[16px] p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                          <UserRound className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-display font-bold text-sm text-[#111111]">{anchor.name}</div>
                          {anchor.label && <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{anchor.label}</div>}
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
                      </div>
                      <div className="flex items-center gap-2 text-[rgba(0,0,0,0.5)] text-xs">
                        <Phone className="w-3 h-3" />
                        <span className="font-mono">{anchor.phone}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[rgba(0,0,0,0.6)] text-sm leading-relaxed">Pick a trusted contact who will receive your GPS location when SOS is triggered. Works on Android Chrome with real contacts.</p>
                  )}
                  <button
                    onClick={handleSelectAnchor}
                    className="w-full py-3.5 rounded-[14px] bg-[#a78bfa] text-white font-display font-bold text-xs uppercase tracking-widest hover:bg-[#9070e8] transition-all shadow-[0_4px_16px_rgba(167,139,250,0.4)] hover:shadow-[0_4px_24px_rgba(167,139,250,0.5)] active:scale-95"
                  >
                    {anchor ? '↺ Change Anchor' : '+ Select Anchor'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer note */}
        <div className="mt-8 text-[rgba(0,0,0,0.3)] text-[9px] uppercase tracking-[0.2em] flex items-center gap-2">
          <Zap className="w-3 h-3" /> Shake device for emergency SOS
        </div>
      </div>
    </div>
  );
}
