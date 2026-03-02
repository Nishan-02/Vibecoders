'use client'; // no-op in Vite; required for Next.js App Router compatibility

/**
 * LocationDemo.tsx
 *
 * Example client component demonstrating usage of the getCurrentLocation()
 * utility from lib/location.ts.
 *
 * This component is self-contained and has zero SSR dependency.
 * Works identically in:
 *   - Vite + React (current setup)
 *   - Next.js App Router (add 'use client' at the top — already present)
 *   - React Native Expo (swap lib/location.ts only, this file stays the same)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Loader2, AlertTriangle, CheckCircle2, Navigation } from 'lucide-react';
import { getCurrentLocation, type LocationResponse, type LocationError } from './lib/location';
import { cn } from './lib/utils';

// ─── Sub-types for local state ─────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'success' | 'error';

// ─── Component ─────────────────────────────────────────────────────────────

export default function LocationDemo() {
    const [status, setStatus] = useState<Status>('idle');
    const [result, setResult] = useState<LocationResponse | null>(null);

    const handleGetLocation = async () => {
        setStatus('loading');
        setResult(null);

        const response = await getCurrentLocation({
            enableHighAccuracy: true,
            timeout: 10_000,
            maximumAge: 0,
        });

        setResult(response);
        setStatus(response.success ? 'success' : 'error');
    };

    const handleReset = () => {
        setStatus('idle');
        setResult(null);
    };

    return (
        <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6 font-sans">
            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
                <div className="w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-10">

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-2">
                        <MapPin className="w-6 h-6 text-violet-400" />
                    </div>
                    <h1 className="text-3xl font-display font-bold tracking-tight text-white">
                        Location
                    </h1>
                    <p className="text-zinc-500 text-sm tracking-wide">
                        Tap the button to share your current location
                    </p>
                </div>

                {/* Main button + result card */}
                <div className="w-full flex flex-col items-center gap-6">

                    {/* Trigger Button */}
                    <AnimatePresence mode="wait">
                        {status !== 'loading' && (
                            <motion.button
                                key="trigger-btn"
                                id="location-trigger-btn"
                                onClick={status === 'idle' ? handleGetLocation : handleReset}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                    'group relative w-40 h-40 rounded-full border flex flex-col items-center justify-center gap-3 transition-all duration-300',
                                    status === 'idle' && [
                                        'bg-violet-500/10 border-violet-500/25',
                                        'hover:bg-violet-500/20 hover:border-violet-500/50',
                                        'shadow-[0_0_40px_rgba(139,92,246,0.1)] hover:shadow-[0_0_60px_rgba(139,92,246,0.2)]',
                                    ],
                                    status === 'success' && [
                                        'bg-emerald-500/10 border-emerald-500/25',
                                        'hover:bg-emerald-500/20 hover:border-emerald-500/50',
                                    ],
                                    status === 'error' && [
                                        'bg-red-500/10 border-red-500/25',
                                        'hover:bg-red-500/20 hover:border-red-500/50',
                                    ],
                                )}
                            >
                                {/* Pulse ring — only on idle */}
                                {status === 'idle' && (
                                    <span className="absolute inset-0 rounded-full border border-violet-500/20 animate-pulse-ring" />
                                )}

                                <AnimatePresence mode="wait">
                                    {status === 'idle' && (
                                        <motion.div
                                            key="icon-idle"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="flex flex-col items-center gap-2"
                                        >
                                            <Navigation className="w-8 h-8 text-violet-400 group-hover:scale-110 transition-transform" />
                                            <span className="text-xs text-violet-300 font-medium tracking-widest uppercase">
                                                Get Location
                                            </span>
                                        </motion.div>
                                    )}

                                    {status === 'success' && (
                                        <motion.div
                                            key="icon-success"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="flex flex-col items-center gap-2"
                                        >
                                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                            <span className="text-xs text-emerald-300 font-medium tracking-widest uppercase">
                                                Reset
                                            </span>
                                        </motion.div>
                                    )}

                                    {status === 'error' && (
                                        <motion.div
                                            key="icon-error"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="flex flex-col items-center gap-2"
                                        >
                                            <AlertTriangle className="w-8 h-8 text-red-400" />
                                            <span className="text-xs text-red-300 font-medium tracking-widest uppercase">
                                                Retry
                                            </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        )}

                        {/* Loading spinner */}
                        {status === 'loading' && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="w-40 h-40 rounded-full bg-violet-500/10 border border-violet-500/20 flex flex-col items-center justify-center gap-3"
                            >
                                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                                <span className="text-xs text-violet-300 font-medium tracking-widest uppercase">
                                    Locating…
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Result Card */}
                    <AnimatePresence>
                        {result && (
                            <motion.div
                                key="result-card"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                                className="w-full"
                            >
                                {result.success
                                    ? (() => {
                                        const r = result; // narrowed to LocationResult
                                        return (
                                            <SuccessCard
                                                lat={r.coordinates.latitude}
                                                lng={r.coordinates.longitude}
                                                accuracy={r.coordinates.accuracy}
                                                mapsUrl={r.mapsUrl}
                                            />
                                        );
                                    })()
                                    : (
                                        <ErrorCard
                                            code={(result as LocationError).errorCode}
                                            message={(result as LocationError).message}
                                        />
                                    )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer note */}
                <p className="text-center text-zinc-600 text-[10px] uppercase tracking-[0.18em]">
                    Powered by navigator.geolocation · No data stored
                </p>
            </div>
        </div>
    );
}

// ─── Success Card ───────────────────────────────────────────────────────────

interface SuccessCardProps {
    lat: number;
    lng: number;
    accuracy: number | null;
    mapsUrl: string;
}

function SuccessCard({ lat, lng, accuracy, mapsUrl }: SuccessCardProps) {
    return (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-emerald-500/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 text-xs font-semibold tracking-widest uppercase">
                    Location Acquired
                </span>
            </div>

            {/* Coordinates */}
            <div className="px-4 py-4 space-y-3">
                <CoordRow label="Latitude" value={lat.toFixed(6)} />
                <CoordRow label="Longitude" value={lng.toFixed(6)} />
                {accuracy !== null && (
                    <CoordRow label="Accuracy" value={`±${accuracy.toFixed(0)} m`} />
                )}
            </div>

            {/* Maps Link */}
            <div className="px-4 pb-4">
                <a
                    id="maps-link"
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        'flex items-center justify-center gap-2 w-full py-3 rounded-xl',
                        'bg-violet-500/15 border border-violet-500/25 text-violet-300',
                        'text-sm font-semibold tracking-wide',
                        'hover:bg-violet-500/25 hover:border-violet-500/40 transition-all duration-200',
                        'group',
                    )}
                >
                    <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Open in Google Maps
                </a>
            </div>
        </div>
    );
}

function CoordRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-xs uppercase tracking-wider">{label}</span>
            <span className="text-white text-sm font-mono font-medium">{value}</span>
        </div>
    );
}

// ─── Error Card ─────────────────────────────────────────────────────────────

interface ErrorCardProps {
    code: string;
    message: string;
}

const errorHints: Record<string, string> = {
    PERMISSION_DENIED: 'Open browser settings → Site Settings → Location → Allow.',
    POSITION_UNAVAILABLE: 'Make sure GPS / Location Services are enabled on your device.',
    TIMEOUT: 'Move to an area with better signal and try again.',
    INSECURE_CONTEXT: 'Serve the app over HTTPS or use localhost.',
    UNSUPPORTED: 'Switch to a modern browser that supports Geolocation.',
    UNKNOWN: 'An unexpected error occurred. Please try again.',
};

function ErrorCard({ code, message }: ErrorCardProps) {
    const hint = errorHints[code] ?? errorHints['UNKNOWN'];

    return (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-red-500/5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-300 text-xs font-semibold tracking-widest uppercase">
                    {code.replace(/_/g, ' ')}
                </span>
            </div>

            <div className="px-4 py-4 space-y-3">
                <p className="text-zinc-300 text-sm leading-relaxed">{message}</p>
                <p className="text-zinc-500 text-xs leading-relaxed border-l-2 border-zinc-700 pl-3">
                    {hint}
                </p>
            </div>
        </div>
    );
}
