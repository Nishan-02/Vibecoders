import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Zap, History, Play, RotateCcw } from 'lucide-react';
import { cn } from './lib/utils';

interface Session {
    score: number;
    timestamp: number;
}

export function PulseGame({ onClose }: { onClose: () => void }) {
    const [gameState, setGameState] = useState<'start' | 'countdown' | 'playing' | 'result' | 'history'>('start');
    const [countdown, setCountdown] = useState(3);
    const [timeLeft, setTimeLeft] = useState(10);
    const [taps, setTaps] = useState(0);
    const [history, setHistory] = useState<Session[]>([]);
    const [squash, setSquash] = useState(false);

    // For ripples/particles on tap
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('pulse_history');
        if (saved) setHistory(JSON.parse(saved));
    }, []);

    const saveHistory = (newScore: number) => {
        const newHistory = [{ score: newScore, timestamp: Date.now() }, ...history].slice(0, 10); // Keep last 10
        setHistory(newHistory);
        localStorage.setItem('pulse_history', JSON.stringify(newHistory));
    };

    const startGame = () => {
        setGameState('countdown');
        setCountdown(3);
        setTaps(0);
        setTimeLeft(10);
        setRipples([]);

        let count = 3;
        const countInterval = setInterval(() => {
            count -= 1;
            if (count > 0) {
                setCountdown(count);
            } else {
                clearInterval(countInterval);
                setGameState('playing');
            }
        }, 1000);
    };

    // Playing state timer
    useEffect(() => {
        if (gameState === 'playing') {
            const startStr = Date.now();
            timerRef.current = setInterval(() => {
                const elapsed = Date.now() - startStr;
                const rem = Math.max(0, 10 - elapsed / 1000);
                setTimeLeft(rem);
                if (rem === 0) {
                    endGame();
                }
            }, 50);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState]);

    const endGame = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setGameState('result');
        saveHistory(taps);
    };

    const handleTap = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (gameState !== 'playing') return;

        // Vibrate
        if (navigator.vibrate) navigator.vibrate(20);

        setTaps(t => t + 1);

        // Squash animation trigger
        setSquash(true);
        if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = setTimeout(() => setSquash(false), 100);

        // Add ripple
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now() + Math.random();
        setRipples(prev => [...prev, { id, x, y }]);
        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== id));
        }, 500);
    };

    // Derived states
    const cps = (taps / (10 - timeLeft)).toFixed(1);
    const progress = (timeLeft / 10) * 100;

    const getFeedback = (t: number) => {
        if (t >= 80) return { title: 'Godlike Speed! ⚡', desc: 'Your energy was completely unleashed.', color: 'text-rose-500', bg: 'bg-rose-100' };
        if (t >= 50) return { title: 'Intense Focus 🔥', desc: 'Incredible tapping rhythm.', color: 'text-orange-500', bg: 'bg-orange-100' };
        if (t >= 30) return { title: 'Solid Pulse 🌊', desc: 'You let a good amount of energy out.', color: 'text-emerald-500', bg: 'bg-emerald-100' };
        return { title: 'Gentle Tap 🍃', desc: 'A soft release of tension.', color: 'text-blue-500', bg: 'bg-blue-100' };
    };

    const resultStats = getFeedback(taps);
    const bestScore = history.length > 0 ? Math.max(...history.map(h => h.score)) : 0;

    return (
        <div className="absolute inset-0 z-50 bg-[linear-gradient(135deg,#E8ECFF_0%,#F4E8FF_50%,#DFF7FF_100%)] text-[#111111] flex flex-col font-sans overflow-hidden">
            {/* Top Bar Navigation */}
            <button
                onClick={gameState === 'history' ? () => setGameState('start') : onClose}
                className="absolute top-5 left-5 z-50 flex items-center gap-1.5 px-3 py-2 bg-white/60 backdrop-blur border border-[rgba(0,0,0,0.08)] rounded-[12px] text-[#111111] text-xs font-bold uppercase tracking-widest hover:bg-white transition-all shadow-sm"
            >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            {/* START SCREEN */}
            <AnimatePresence mode="wait">
                {gameState === 'start' && (
                    <motion.div
                        key="start"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className="absolute inset-0 z-40 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
                    >
                        <motion.div
                            animate={{ y: [-10, 10, -10] }}
                            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                            className="w-32 h-32 rounded-full bg-white/70 border border-[rgba(0,0,0,0.08)] shadow-[0_8px_40px_rgba(255,200,50,0.2)] flex items-center justify-center mb-8"
                        >
                            <Zap className="w-16 h-16 text-amber-400" />
                        </motion.div>

                        <h1 className="font-display text-5xl font-black tracking-tight text-[#111111] mb-2">10-Second<br />Pulse</h1>
                        <p className="text-[rgba(0,0,0,0.45)] text-sm tracking-widest uppercase mb-10">Release the Energy</p>

                        <button
                            onClick={startGame}
                            className="px-10 py-4 bg-[#6c6fff] text-white rounded-full font-display font-bold uppercase tracking-widest text-xs hover:bg-[#5a5de8] hover:scale-105 active:scale-95 transition-all shadow-[0_8px_30px_rgba(108,111,255,0.4)]"
                        >
                            Begin
                        </button>

                        <button
                            onClick={() => setGameState('history')}
                            className="mt-6 flex items-center gap-2 text-xs font-bold text-[rgba(0,0,0,0.4)] hover:text-[#111111] uppercase tracking-widest transition-colors"
                        >
                            <History className="w-4 h-4" /> View History
                        </button>
                    </motion.div>
                )}

                {/* COUNTDOWN SCREEN */}
                {gameState === 'countdown' && (
                    <motion.div
                        key="countdown"
                        className="absolute inset-0 z-40 flex items-center justify-center"
                    >
                        <motion.div
                            key={countdown}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.5 }}
                            className="font-display text-9xl font-black text-[#6c6fff] drop-shadow-2xl"
                        >
                            {countdown}
                        </motion.div>
                    </motion.div>
                )}

                {/* PLAYING SCREEN */}
                {gameState === 'playing' && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6"
                    >
                        <div className="absolute top-24 w-full px-8 text-center flex flex-col items-center gap-4">
                            <div className="text-[10px] tracking-widest text-[rgba(0,0,0,0.4)] uppercase font-bold">Pulse Active</div>
                            <div className="w-full max-w-[320px] h-2.5 bg-black/5 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-[#111111] transition-all duration-75"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="font-display text-4xl font-black tabular-nums">{timeLeft.toFixed(2)}s</div>
                        </div>

                        {/* Interactive Tap Area */}
                        <div className="relative w-64 h-64 mt-10">
                            {/* Outer Glow Base */}
                            <div className={cn("absolute inset-0 rounded-full transition-opacity duration-300 pointer-events-none blur-3xl",
                                taps > 0 ? 'opacity-80 bg-amber-400/40' : 'opacity-20 bg-black/5')} />
                            {/* Tap Button */}
                            <button
                                onPointerDown={handleTap}
                                className={cn(
                                    "absolute inset-0 rounded-full bg-white/80 border-4 border-white/50 shadow-[0_10px_50px_rgba(0,0,0,0.1)] flex items-center justify-center outline-none touch-manipulation overflow-hidden select-none transition-transform duration-75",
                                    squash && "scale-95"
                                )}
                            >
                                {/* Ripples */}
                                {ripples.map(r => (
                                    <motion.div
                                        key={r.id}
                                        initial={{ scale: 0, opacity: 0.8 }}
                                        animate={{ scale: 2, opacity: 0 }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                        className="absolute rounded-full bg-amber-400"
                                        style={{ left: r.x - 50, top: r.y - 50, width: 100, height: 100 }}
                                    />
                                ))}

                                <span className={cn("text-6xl select-none transition-transform duration-75", squash && "scale-110")}>
                                    ⚡
                                </span>
                            </button>
                        </div>

                        <div className="absolute bottom-20 w-full flex justify-center gap-12 px-8">
                            <div className="text-center">
                                <div className="font-display text-4xl font-black tabular-nums text-[#111111]">
                                    <motion.span key={taps} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>{taps}</motion.span>
                                </div>
                                <div className="text-[10px] tracking-widest text-[rgba(0,0,0,0.4)] uppercase font-bold mt-1">Total Taps</div>
                            </div>
                            <div className="w-[1px] h-12 bg-black/10" />
                            <div className="text-center">
                                <div className="font-display text-4xl font-black tabular-nums text-[#111111]">
                                    {taps > 0 && timeLeft < 10 ? cps : '0.0'}
                                </div>
                                <div className="text-[10px] tracking-widest text-[rgba(0,0,0,0.4)] uppercase font-bold mt-1">Taps/Sec</div>
                            </div>
                        </div>

                    </motion.div>
                )}

                {/* RESULT SCREEN */}
                {gameState === 'result' && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute inset-0 z-40 overflow-y-auto px-5 py-20 flex flex-col items-center"
                    >
                        <div className="text-[10px] text-[rgba(0,0,0,0.4)] tracking-[0.2em] uppercase mb-4 font-bold">Session Complete</div>

                        <div className="text-8xl mb-6">{taps >= 50 ? '🔥' : taps >= 30 ? '🌊' : '🍃'}</div>

                        <div className="bg-white/70 backdrop-blur border border-[rgba(0,0,0,0.08)] rounded-[32px] p-8 mb-6 text-center shadow-sm w-full max-w-[340px]">
                            <div className={cn("inline-block text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4", resultStats.bg, resultStats.color)}>
                                {resultStats.title}
                            </div>

                            <div className="font-display text-7xl font-black text-[#111111] mb-2">{taps}</div>
                            <div className="text-[11px] text-[rgba(0,0,0,0.4)] uppercase tracking-widest font-bold mb-6">Total Taps Revealed</div>

                            {taps > bestScore && bestScore > 0 && (
                                <div className="text-xs font-bold text-emerald-600 mb-4 bg-emerald-50 py-2 rounded-full border border-emerald-100">
                                    🎉 New Personal Best!
                                </div>
                            )}

                            <p className="text-sm text-[rgba(0,0,0,0.6)] leading-relaxed">{resultStats.desc}</p>
                        </div>

                        <div className="w-full max-w-[340px] flex gap-3">
                            <button
                                onClick={startGame}
                                className="flex-1 py-4 bg-[#6c6fff] text-white rounded-[16px] font-display font-bold text-xs uppercase tracking-widest hover:bg-[#5a5de8] transition-all shadow-[0_4px_16px_rgba(108,111,255,0.3)] active:scale-95 flex justify-center items-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" /> Again
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 bg-white/70 border border-[rgba(0,0,0,0.08)] text-[#111111] rounded-[16px] font-display font-bold text-xs uppercase tracking-widest hover:bg-white transition-all active:scale-95"
                            >
                                Dashboard
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* HISTORY SCREEN */}
                {gameState === 'history' && (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute inset-0 z-40 overflow-y-auto px-5 py-24 flex flex-col items-center"
                    >
                        <div className="w-full max-w-[340px] mb-8">
                            <h2 className="font-display text-2xl font-black text-[#111111] mb-2">Session History</h2>
                            <p className="text-xs text-[rgba(0,0,0,0.5)] uppercase tracking-widest font-bold">Past 10 Pulses</p>
                        </div>

                        {history.length === 0 ? (
                            <div className="text-center py-12 text-[rgba(0,0,0,0.4)] text-sm font-medium">
                                No sessions recorded yet.<br />Go release some energy!
                            </div>
                        ) : (
                            <div className="w-full max-w-[340px] flex flex-col gap-3">
                                {history.map((session, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white/70 backdrop-blur border border-[rgba(0,0,0,0.08)] rounded-[16px] shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 flex justify-center text-[10px] font-bold text-[rgba(0,0,0,0.3)] uppercase">#{history.length - i}</div>
                                            <div className="flex flex-col">
                                                <div className="font-display font-bold text-lg text-[#111111]">{session.score} taps</div>
                                                <div className="text-[10px] text-[rgba(0,0,0,0.5)]">
                                                    {new Date(session.timestamp).toLocaleDateString()} at {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                        {i === 0 && <div className="text-[10px] uppercase font-bold text-[#6c6fff] bg-[#6c6fff]/10 px-2 py-1 rounded-full">Latest</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
