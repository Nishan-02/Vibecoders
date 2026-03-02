import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Target } from 'lucide-react';
import { cn } from './lib/utils';

// --- Types ---
interface Exercise {
    icon: string;
    color: string;
    name: string;
    tag: string;
    steps: string[];
}

interface StressState {
    tier: 'calm' | 'mild' | 'high';
    icon: string;
    title: string;
    desc: string;
}

// --- Constants & Config ---
const CFG = {
    GRID: 40,
    CORRIDOR: 18,
    PATH_W: 2.5,
    TRACE_W: 4,
    END_R: 28,
    JITTER_WINDOW: 10,
    JITTER_HIGH: 5,
};

const EXERCISES: Record<'calm' | 'mild' | 'high', Exercise[]> = {
    calm: [
        {
            icon: '🌬️', color: 'bg-emerald-500/10 text-emerald-400', name: 'Box Breathing',
            tag: '4 min · breathing',
            steps: [
                'Inhale slowly through your nose for 4 counts',
                'Hold your breath gently for 4 counts',
                'Exhale completely through your mouth for 4 counts',
                'Hold empty for 4 counts — repeat 4 rounds',
            ]
        },
        {
            icon: '🧘', color: 'bg-blue-500/10 text-blue-400', name: 'Body Scan',
            tag: '5 min · mindfulness',
            steps: [
                'Sit or lie comfortably, close your eyes',
                'Start at the top of your head, notice any tension',
                'Slowly scan down — face, neck, shoulders, arms',
                'Release each area as you pass through it',
                'End at your feet. Breathe naturally throughout',
            ]
        },
        {
            icon: '🚶', color: 'bg-amber-500/10 text-amber-400', name: 'Grounding Walk',
            tag: '5–10 min · movement',
            steps: [
                'Walk at a slow, deliberate pace',
                'With each step, feel the ground under your foot',
                'Name 5 things you can see around you',
                'Name 3 things you can hear right now',
                'Return your attention to your breath and steps',
            ]
        },
    ],
    mild: [
        {
            icon: '🌊', color: 'bg-blue-500/10 text-blue-400', name: '4-7-8 Breathing',
            tag: '3 min · breathing',
            steps: [
                'Place your tongue lightly on the roof of your mouth',
                'Exhale completely to empty your lungs',
                'Inhale quietly through your nose for 4 counts',
                'Hold your breath for 7 counts',
                'Exhale fully through your mouth for 8 counts',
                'Repeat 3–4 cycles — let your body slow down',
            ]
        },
        {
            icon: '💪', color: 'bg-emerald-500/10 text-emerald-400', name: 'Progressive Muscle Release',
            tag: '5 min · body',
            steps: [
                'Start with your hands — clench them tight for 5s',
                'Release suddenly, feel the warmth spread',
                'Move up: tense your forearms, hold, release',
                'Shoulders up to your ears — hold 5s, drop slowly',
                'Work down your body: chest, stomach, legs, feet',
                'End with your whole body loose and heavy',
            ]
        },
        {
            icon: '🖐️', color: 'bg-amber-500/10 text-amber-400', name: '5-4-3-2-1 Grounding',
            tag: '3 min · sensory',
            steps: [
                'Name 5 things you can see in this moment',
                'Touch 4 objects near you and notice each texture',
                'Listen for 3 distinct sounds around you',
                'Notice 2 smells — even subtle ones',
                'Identify 1 thing you can taste right now',
                'Take a slow deep breath to close',
            ]
        },
    ],
    high: [
        {
            icon: '🧊', color: 'bg-blue-500/10 text-blue-400', name: 'Cold Water Reset',
            tag: 'Immediate · body',
            steps: [
                'Splash cold water on your face and wrists now',
                'Hold ice cubes in your palms if available',
                'Breathe slowly — cold activates your calm reflex',
                'Stay with the sensation for 30 seconds',
                'This triggers the dive reflex — heart rate slows naturally',
            ]
        },
        {
            icon: '🫀', color: 'bg-rose-500/10 text-rose-400', name: 'Physiological Sigh',
            tag: '1 min · fastest reset',
            steps: [
                'This is the fastest way to calm your nervous system',
                'Take a full deep breath in through your nose',
                'At the top — sniff in once more to fill completely',
                'Now exhale slowly and completely through your mouth',
                'Repeat 2–3 times. Feel your heart rate drop',
            ]
        },
        {
            icon: '🥁', color: 'bg-amber-500/10 text-amber-400', name: 'Bilateral Tapping',
            tag: '3 min · body',
            steps: [
                'Cross your arms over your chest like a hug',
                'Tap your left shoulder with your right hand',
                'Then tap your right shoulder with your left hand',
                'Alternate: left, right, left, right at a slow rhythm',
                'Focus only on the tapping sensation, nothing else',
                'Continue for 2–3 minutes — breathe slowly throughout',
            ]
        },
    ],
};

const STATES: Record<'calm' | 'mild' | 'high', StressState> = {
    calm: {
        tier: 'calm',
        icon: '🌿',
        title: 'Steady and grounded',
        desc: 'Your movement was controlled and consistent. A great sign. These gentle practices can help you maintain and deepen that calm.',
    },
    mild: {
        tier: 'mild',
        icon: '〰️',
        title: 'Some tension detected',
        desc: "There's a little restlessness in your trace right now. That's completely okay. These exercises can help release it and bring you back to centre.",
    },
    high: {
        tier: 'high',
        icon: '🌀',
        title: 'You are carrying a lot right now',
        desc: "Significant shaking or tension was detected in your trace. You don't have to push through it. Start with whichever exercise feels most accessible — even just breathing.",
    },
};

export function MeshTraceGame({ onClose, onComplete }: { onClose: () => void, onComplete?: (state: 'calm' | 'mild' | 'high', score: number) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [gameState, setGameState] = useState<'start' | 'playing' | 'done'>('start');
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [highScore, setHighScore] = useState<number>(0);
    const [stressResult, setStressResult] = useState<StressState | null>(null);

    // --- Game Engine Refs ---
    const eng = useRef({
        W: 0, H: 0,
        pathPoints: [] as { x: number, y: number }[],
        tracePath: [] as { x: number, y: number, accurate: boolean }[],
        accurateCount: 0, totalCount: 0, exitCount: 0, wasInside: true, totalDev: 0,
        activeTouch: false, tracing: false,
        prevDX: 0, prevDY: 0, reversalCount: 0, jitterSamples: 0, jitterWindows: [] as number[],
        animFrame: 0
    });

    // Load high score
    useEffect(() => {
        const saved = localStorage.getItem('meshtrace_highscore');
        if (saved) setHighScore(parseInt(saved, 10));
    }, []);

    const vibe = (p: number | number[]) => {
        if (navigator.vibrate) navigator.vibrate(p);
    };

    // --- Engine Logic ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const W = canvas.offsetWidth;
            const H = canvas.offsetHeight;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            ctx.scale(dpr, dpr);
            eng.current.W = W;
            eng.current.H = H;
            if (gameState === 'playing' && eng.current.pathPoints.length === 0) {
                buildPath();
            }
        };

        const buildPath = () => {
            const e = eng.current;
            const g = CFG.GRID;
            const snap = (v: number) => Math.round(v / g) * g;
            const numSegs = 7 + Math.floor(Math.random() * 5);
            const margin = g * 2;
            const cols = Math.floor((e.W - margin * 2) / g);

            let cx = snap(margin + Math.floor(Math.random() * cols) * g);
            let cy = snap(e.H * 0.09);
            const endY = snap(e.H * 0.88);
            const yStep = (endY - cy) / numSegs;
            const pts = [{ x: cx, y: cy }];
            let lastDir = 0;

            for (let i = 0; i < numSegs; i++) {
                const ny = cy + yStep;
                const candidates = [0];
                if (lastDir !== -1) {
                    const maxL = Math.floor((cx - margin) / g);
                    if (maxL >= 1) candidates.push(-(Math.min(maxL, 3 + Math.floor(Math.random() * 2))));
                }
                if (lastDir !== 1) {
                    const maxR = Math.floor((e.W - margin - cx) / g);
                    if (maxR >= 1) candidates.push(Math.min(maxR, 3 + Math.floor(Math.random() * 2)));
                }
                const pick = candidates[Math.floor(Math.random() * candidates.length)];
                const nx = cx + pick * g;
                if (pick !== 0) { pts.push({ x: nx, y: cy }); lastDir = pick > 0 ? 1 : -1; }
                else lastDir = 0;
                pts.push({ x: nx, y: ny });
                cx = nx; cy = ny;
            }
            e.pathPoints = pts;
        };

        // --- Geometry ---
        const distToSeg = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
            const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
            if (!l2) return Math.hypot(px - ax, py - ay);
            const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
            return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
        };

        const distToPath = (px: number, py: number) => {
            let min = Infinity;
            const pts = eng.current.pathPoints;
            for (let i = 0; i < pts.length - 1; i++) {
                const d = distToSeg(px, py, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
                if (d < min) min = d;
            }
            return min;
        };

        const nearStart = (px: number, py: number) => {
            const pts = eng.current.pathPoints;
            return pts.length && Math.hypot(px - pts[0].x, py - pts[0].y) < 38;
        };

        const nearEnd = (px: number, py: number) => {
            const pts = eng.current.pathPoints;
            const last = pts[pts.length - 1];
            return pts.length && Math.hypot(px - last.x, py - last.y) < CFG.END_R;
        };

        // --- Drawing ---
        const drawMesh = () => {
            ctx.strokeStyle = 'rgba(255,255,255,0.065)'; ctx.lineWidth = 1;
            const e = eng.current;
            for (let x = 0; x <= e.W; x += CFG.GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, e.H); ctx.stroke(); }
            for (let y = 0; y <= e.H; y += CFG.GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(e.W, y); ctx.stroke(); }
        };

        const drawPath = () => {
            const e = eng.current;
            const pts = e.pathPoints;
            if (pts.length < 2) return;
            const p0 = pts[0], pN = pts[pts.length - 1];
            const t = performance.now() / 1000;

            // Corridor glow
            ctx.save();
            ctx.strokeStyle = 'rgba(16,185,129,0.12)'; ctx.lineWidth = CFG.CORRIDOR * 2;
            ctx.lineCap = ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
            pts.forEach((p, i) => i && ctx.lineTo(p.x, p.y));
            ctx.stroke(); ctx.restore();

            // Path line
            ctx.save();
            ctx.strokeStyle = '#10b981'; ctx.lineWidth = CFG.PATH_W;
            ctx.lineCap = ctx.lineJoin = 'round';
            ctx.shadowColor = '#10b981'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
            pts.forEach((p, i) => i && ctx.lineTo(p.x, p.y));
            ctx.stroke(); ctx.restore();

            // Corner dots
            ctx.save(); ctx.fillStyle = 'rgba(16,185,129,0.4)';
            for (let i = 1; i < pts.length - 1; i++) {
                ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 3, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();

            // START dot
            const sp = 7 + Math.sin(t * 3) * 2.5;
            ctx.save();
            ctx.beginPath(); ctx.arc(p0.x, p0.y, sp, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(16,185,129,0.15)'; ctx.fill();
            ctx.beginPath(); ctx.arc(p0.x, p0.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981'; ctx.shadowColor = '#10b981'; ctx.shadowBlur = 14; ctx.fill();
            ctx.restore();

            // END dot
            const ep = 11 + Math.sin(t * 2.2) * 3;
            ctx.save();
            ctx.beginPath(); ctx.arc(pN.x, pN.y, ep, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(16,185,129,0.18)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath(); ctx.arc(pN.x, pN.y, 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2; ctx.shadowColor = '#10b981'; ctx.shadowBlur = 10; ctx.stroke();
            ctx.beginPath(); ctx.arc(pN.x, pN.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(16,185,129,0.6)'; ctx.fill(); ctx.restore();

            // Labels
            ctx.save(); ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText('START', p0.x, p0.y - 20); ctx.fillText('END', pN.x, pN.y + 26); ctx.restore();
        };

        const drawInstruction = () => {
            if (eng.current.tracePath.length > 0) return;
            ctx.save(); ctx.font = '11px sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.textAlign = 'center';
            ctx.fillText('TOUCH START POINT TO BEGIN', eng.current.W / 2, eng.current.H * 0.5); ctx.restore();
        };

        const drawTrace = () => {
            const tp = eng.current.tracePath;
            if (tp.length < 2) return;
            ctx.save(); ctx.lineWidth = CFG.TRACE_W; ctx.lineCap = ctx.lineJoin = 'round';
            for (let i = 0; i < tp.length - 1; i++) {
                const p = tp[i], q = tp[i + 1];
                if (!p || !q) continue;
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
                ctx.strokeStyle = p.accurate ? 'rgba(255,255,255,0.4)' : 'rgba(239,68,68,0.7)';
                ctx.stroke();
            }
            ctx.restore();
            const last = tp[tp.length - 1];
            if (last && eng.current.activeTouch) {
                ctx.save(); ctx.beginPath(); ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
                ctx.fillStyle = last.accurate ? 'rgba(255,255,255,0.6)' : 'rgba(239,68,68,0.9)';
                ctx.fill(); ctx.restore();
            }
        };

        const render = () => {
            ctx.clearRect(0, 0, eng.current.W, eng.current.H);
            drawMesh();
            if (gameState === 'playing' || gameState === 'done') {
                drawPath(); drawTrace();
                if (gameState === 'playing') drawInstruction();
            }
            eng.current.animFrame = requestAnimationFrame(render);
        };

        // --- Input Logic ---
        const updateHUD = () => {
            const e = eng.current;
            if (!e.totalCount) return;
            const pct = Math.round((e.accurateCount / e.totalCount) * 100);
            setAccuracy(pct);
        };

        const updateJitter = (px: number, py: number) => {
            const e = eng.current;
            if (e.tracePath.length < 2) return;
            const prev = e.tracePath[e.tracePath.length - 1];
            if (!prev) return;
            const dx = px - prev.x, dy = py - prev.y;
            if (e.prevDX !== 0 || e.prevDY !== 0) {
                if (dx * e.prevDX + dy * e.prevDY < 0) e.reversalCount++;
            }
            e.prevDX = dx; e.prevDY = dy; e.jitterSamples++;
            if (e.jitterSamples % CFG.JITTER_WINDOW === 0) {
                e.jitterWindows.push(e.reversalCount / CFG.JITTER_WINDOW);
                e.reversalCount = 0;
            }
        };

        const recordPoint = (px: number, py: number) => {
            const e = eng.current;
            updateJitter(px, py);
            const d = distToPath(px, py), ok = d <= CFG.CORRIDOR;
            e.totalCount++; e.totalDev += d;
            if (ok) e.accurateCount++;
            if (!ok && e.wasInside) { e.exitCount++; vibe(25); }
            e.wasInside = ok;
            e.tracePath.push({ x: px, y: py, accurate: ok });
            updateHUD();
            if (nearEnd(px, py)) {
                vibe([40, 30, 70]);
                endGame();
            }
        };

        const getPos = (e: any) => {
            const r = canvas.getBoundingClientRect();
            const s = e.touches ? e.touches[0] : e;
            return { x: (s.clientX - r.left) * (eng.current.W / r.width), y: (s.clientY - r.top) * (eng.current.H / r.height) };
        };

        const onStart = (ev: TouchEvent | MouseEvent) => {
            if (gameState !== 'playing') return;
            const p = getPos(ev);
            if (!eng.current.tracing && !nearStart(p.x, p.y)) return;
            eng.current.tracing = true; eng.current.activeTouch = true; vibe(18);
            eng.current.tracePath.push({ x: p.x, y: p.y, accurate: distToPath(p.x, p.y) <= CFG.CORRIDOR });
        };

        const onMove = (ev: TouchEvent | MouseEvent) => {
            if (!eng.current.tracing || gameState !== 'playing') return;
            const p = getPos(ev); recordPoint(p.x, p.y);
        };

        const onEnd = () => {
            eng.current.activeTouch = false;
            if (eng.current.tracePath.length > 0) eng.current.tracePath.push({} as any); // visual gap
        };

        // --- End Game Evaluation ---
        const computeJitterScore = () => {
            const e = eng.current;
            if (!e.jitterWindows.length) return 0;
            const avg = e.jitterWindows.reduce((a, b) => a + b, 0) / e.jitterWindows.length;
            return Math.min(100, Math.round(avg * 100 / CFG.JITTER_HIGH));
        };

        const endGame = () => {
            setGameState('done');
            eng.current.tracing = false;
            eng.current.activeTouch = false;

            const e = eng.current;
            const pct = e.totalCount > 0 ? Math.round((e.accurateCount / e.totalCount) * 100) : 0;
            const jitterScore = computeJitterScore();
            const exitRate = e.totalCount > 0 ? e.exitCount / (e.totalCount / 10) : 0;
            const tremorSignal = (jitterScore * 0.65) + (exitRate * 5 * 0.35);

            let tier: 'calm' | 'mild' | 'high';
            if (pct >= 70 && tremorSignal < 30) tier = 'calm';
            else if (pct >= 45 || tremorSignal < 55) tier = 'mild';
            else tier = 'high';

            if (pct > highScore) {
                setHighScore(pct);
                localStorage.setItem('meshtrace_highscore', pct.toString());
            }

            setStressResult(STATES[tier]);
            if (onComplete) onComplete(tier, pct);
        };

        // Bindings
        window.addEventListener('resize', resize);
        canvas.addEventListener('touchstart', onStart as any, { passive: false });
        canvas.addEventListener('touchmove', onMove as any, { passive: false });
        canvas.addEventListener('touchend', onEnd as any, { passive: false });
        canvas.addEventListener('mousedown', onStart as any);
        canvas.addEventListener('mousemove', (e) => { if (e.buttons === 1) onMove(e); });
        canvas.addEventListener('mouseup', onEnd);
        canvas.addEventListener('mouseleave', onEnd);

        resize();
        render();

        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('touchstart', onStart as any);
            canvas.removeEventListener('touchmove', onMove as any);
            canvas.removeEventListener('touchend', onEnd as any);
            canvas.removeEventListener('mousedown', onStart as any);
            canvas.removeEventListener('mousemove', onMove as any);
            canvas.removeEventListener('mouseup', onEnd);
            canvas.removeEventListener('mouseleave', onEnd);
            cancelAnimationFrame(eng.current.animFrame);
        };
    }, [gameState, highScore]); // re-bind when state changes if needed, but mostly driven by mutable eng ref

    // --- Handlers ---
    const startGame = () => {
        eng.current.tracePath = [];
        eng.current.accurateCount = 0; eng.current.totalCount = 0;
        eng.current.exitCount = 0; eng.current.wasInside = true; eng.current.totalDev = 0;
        eng.current.activeTouch = false; eng.current.tracing = false;
        eng.current.prevDX = 0; eng.current.prevDY = 0; eng.current.reversalCount = 0;
        eng.current.jitterSamples = 0; eng.current.jitterWindows = [];
        setAccuracy(null);
        setGameState('playing');
    };

    return (
        <div className="absolute inset-0 z-50 bg-[#050505] text-white flex flex-col font-sans overflow-hidden">
            <button onClick={onClose} className="absolute top-6 right-6 z-50 p-2 text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>

            {/* Canvas Layer */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full block"
                style={{ cursor: 'crosshair', touchAction: 'none' }}
            />

            {/* HUD Layer */}
            <AnimatePresence>
                {gameState === 'playing' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-8 left-0 right-0 pointer-events-none flex justify-between px-8"
                    >
                        <div className="text-left">
                            <div className="text-[10px] tracking-widest text-zinc-500 uppercase">Target</div>
                            <div className="font-display text-2xl font-bold flex items-center gap-2">
                                <Target className="w-5 h-5 text-emerald-500/50" />
                                {highScore > 0 ? `${highScore}%` : '100%'}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] tracking-widest text-zinc-500 uppercase">Accuracy</div>
                            <div className="font-display text-3xl font-bold">{accuracy ?? '—'}{accuracy !== null && '%'}</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Start Screen Layer */}
            <AnimatePresence>
                {gameState === 'start' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 z-40 bg-[#050505]/95 backdrop-blur flex flex-col items-center justify-center p-6 text-center"
                    >
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-8">
                            <Target className="w-8 h-8 text-emerald-400" />
                        </div>

                        <h1 className="text-5xl font-display font-bold tracking-tight mb-3">MeshTrace</h1>
                        <p className="text-zinc-400 text-sm tracking-widest uppercase mb-12">Precision Focus Game</p>

                        {highScore > 0 && (
                            <div className="mb-8 px-6 py-3 rounded-full bg-white/5 border border-white/10 flex items-center gap-3">
                                <Target className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-medium text-zinc-300">Target to beat: <span className="text-white font-bold">{highScore}%</span></span>
                            </div>
                        )}

                        <button
                            onClick={startGame}
                            className="px-10 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                        >
                            Begin Tracing
                        </button>

                        <div className="absolute bottom-12 flex gap-6 text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full" /> New path each time</div>
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full" /> Stay inside</div>
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full" /> Reach the end</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result Screen Layer */}
            <AnimatePresence>
                {gameState === 'done' && stressResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute inset-0 z-40 bg-[#050505] overflow-y-auto px-6 py-16"
                    >
                        <div className="max-w-md mx-auto">
                            {/* Score Header */}
                            <div className="flex flex-col items-center text-center pb-8 border-b border-white/5 mb-8">
                                <div className="text-[10px] text-zinc-500 tracking-widest uppercase mb-2">Final Accuracy</div>
                                <div className="text-6xl font-display font-bold mb-4">{accuracy}%</div>
                                {accuracy && accuracy > highScore ? (
                                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest">
                                        New High Score
                                    </div>
                                ) : highScore > 0 ? (
                                    <div className="text-xs text-zinc-500">Target was {highScore}%</div>
                                ) : null}
                            </div>

                            {/* Stress Reading */}
                            <div className="flex flex-col items-center text-center mb-12">
                                <div className="text-5xl mb-4">{stressResult.icon}</div>
                                <div className="text-[10px] text-zinc-500 tracking-widest uppercase mb-4">Movement Reading</div>
                                <h2 className="text-2xl font-display font-bold mb-3">{stressResult.title}</h2>
                                <p className="text-sm text-zinc-400 leading-relaxed max-w-[280px]">
                                    {stressResult.desc}
                                </p>
                            </div>

                            {/* Exercises Context */}
                            <div className="text-[10px] text-zinc-500 tracking-widest uppercase mb-4">Try these exercises</div>

                            <div className="flex flex-col gap-3 mb-10">
                                {EXERCISES[stressResult.tier].map((ex, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-white/5 border border-white/10 rounded-2xl p-5"
                                    >
                                        <div className="flex gap-4 items-start mb-4">
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0", ex.color)}>
                                                {ex.icon}
                                            </div>
                                            <div>
                                                <div className="font-display font-bold text-lg">{ex.name}</div>
                                                <div className="text-[10px] tracking-widest uppercase text-zinc-500 mt-1">{ex.tag}</div>
                                            </div>
                                        </div>
                                        <div className="pl-14 flex flex-col gap-2">
                                            {ex.steps.map((step, j) => (
                                                <div key={j} className="text-xs text-zinc-400 leading-relaxed flex items-start gap-2">
                                                    <span className="text-emerald-500 mt-0.5">•</span>
                                                    <span>{step}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="flexjustify-center pb-20 text-center">
                                <button
                                    onClick={startGame}
                                    className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-colors"
                                >
                                    Trace Again
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
