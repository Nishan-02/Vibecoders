'use client'; // no-op in Vite; required for Next.js App Router compatibility

/**
 * AnchorDemo.tsx
 *
 * Example client component demonstrating the selectAnchorContact() utility.
 *
 * Works identically in:
 *   - Vite + React (current setup)
 *   - Next.js App Router ('use client' directive already present)
 *   - React Native Expo (swap lib/contactPicker.ts only — this file stays the same)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRound, Phone, Loader2, AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import {
    selectAnchorContact,
    loadAnchorContact,
    clearAnchorContact,
    type AnchorContact,
    type ContactPickerError,
    type ContactPickerResponse,
} from './lib/contactPicker';
import { cn } from './lib/utils';

// ─── Local state type ─────────────────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'success' | 'error';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AnchorDemo() {
    const [status, setStatus] = useState<Status>('idle');
    const [contact, setContact] = useState<AnchorContact | null>(null);
    const [error, setError] = useState<ContactPickerError | null>(null);

    // Hydrate from localStorage on mount
    useEffect(() => {
        const saved = loadAnchorContact();
        if (saved) {
            setContact(saved);
            setStatus('success');
        }
    }, []);

    const handleSelect = async () => {
        setStatus('loading');
        setError(null);

        const result: ContactPickerResponse = await selectAnchorContact();

        if (result.success) {
            setContact(result.contact);
            setStatus('success');
        } else {
            setError(result as ContactPickerError);
            setStatus('error');
        }
    };

    const handleClear = () => {
        clearAnchorContact();
        setContact(null);
        setError(null);
        setStatus('idle');
    };

    return (
        <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6 font-sans">
            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
                <div className="w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-10">

                {/* ── Header ── */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-2">
                        <ShieldCheck className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-display font-bold tracking-tight text-white">
                        Select Your Anchor
                    </h1>
                    <p className="text-zinc-500 text-sm tracking-wide">
                        Choose a trusted contact for emergency SOS alerts
                    </p>
                </div>

                {/* ── Main interaction area ── */}
                <div className="w-full flex flex-col items-center gap-6">

                    {/* Orb button / loading / success states */}
                    <AnimatePresence mode="wait">

                        {/* Loading */}
                        {status === 'loading' && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="w-40 h-40 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center gap-3"
                            >
                                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                <span className="text-xs text-indigo-300 font-medium tracking-widest uppercase">
                                    Opening…
                                </span>
                            </motion.div>
                        )}

                        {/* Idle — Select button */}
                        {status === 'idle' && (
                            <motion.button
                                key="idle-btn"
                                id="select-anchor-btn"
                                onClick={handleSelect}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                    'group relative w-40 h-40 rounded-full border flex flex-col items-center justify-center gap-3 transition-all duration-300',
                                    'bg-indigo-500/10 border-indigo-500/25',
                                    'hover:bg-indigo-500/20 hover:border-indigo-500/50',
                                    'shadow-[0_0_40px_rgba(99,102,241,0.1)] hover:shadow-[0_0_60px_rgba(99,102,241,0.22)]',
                                )}
                            >
                                <span className="absolute inset-0 rounded-full border border-indigo-400/20 animate-pulse-ring" />
                                <UserRound className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs text-indigo-300 font-medium tracking-widest uppercase">
                                    Select Anchor
                                </span>
                            </motion.button>
                        )}

                        {/* Error — retry button */}
                        {status === 'error' && (
                            <motion.button
                                key="error-btn"
                                id="retry-anchor-btn"
                                onClick={handleSelect}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                    'group relative w-40 h-40 rounded-full border flex flex-col items-center justify-center gap-3 transition-all duration-300',
                                    'bg-red-500/10 border-red-500/25',
                                    'hover:bg-red-500/20 hover:border-red-500/50',
                                )}
                            >
                                <AlertTriangle className="w-8 h-8 text-red-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs text-red-300 font-medium tracking-widest uppercase">
                                    Retry
                                </span>
                            </motion.button>
                        )}

                        {/* Success — contact found */}
                        {status === 'success' && (
                            <motion.div
                                key="success-orb"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="w-40 h-40 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex flex-col items-center justify-center gap-3"
                            >
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                <span className="text-xs text-emerald-300 font-medium tracking-widest uppercase">
                                    Anchor Set
                                </span>
                            </motion.div>
                        )}

                    </AnimatePresence>

                    {/* ── Result / Error cards ── */}
                    <AnimatePresence>

                        {/* Success card */}
                        {status === 'success' && contact && (
                            <motion.div
                                key="success-card"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                                className="w-full"
                            >
                                <ContactCard contact={contact} onClear={handleClear} />
                            </motion.div>
                        )}

                        {/* Error card */}
                        {status === 'error' && error && (
                            <motion.div
                                key="error-card"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                                className="w-full"
                            >
                                <ErrorCard code={error.errorCode} message={error.message} />
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                {/* ── Footer ── */}
                <p className="text-center text-zinc-600 text-[10px] uppercase tracking-[0.18em]">
                    Contact stored locally · Never leaves your device
                </p>

            </div>
        </div>
    );
}

// ─── Contact Card ──────────────────────────────────────────────────────────────

interface ContactCardProps {
    contact: AnchorContact;
    onClear: () => void;
}

function ContactCard({ contact, onClear }: ContactCardProps) {
    return (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-emerald-500/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 text-xs font-semibold tracking-widest uppercase">
                    Selected Anchor
                </span>
            </div>

            {/* Details */}
            <div className="px-4 py-4 space-y-3">
                <DetailRow
                    icon={<UserRound className="w-4 h-4 text-zinc-500" />}
                    label="Name"
                    value={contact.name}
                />
                <DetailRow
                    icon={<Phone className="w-4 h-4 text-zinc-500" />}
                    label="Phone"
                    value={contact.phone}
                    mono
                />
            </div>

            {/* Change contact */}
            <div className="px-4 pb-4">
                <button
                    id="change-anchor-btn"
                    onClick={onClear}
                    className={cn(
                        'flex items-center justify-center gap-2 w-full py-3 rounded-xl',
                        'bg-zinc-800 border border-zinc-700 text-zinc-400',
                        'text-sm font-medium tracking-wide',
                        'hover:bg-zinc-700 hover:text-zinc-200 transition-all duration-200',
                        'group',
                    )}
                >
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    Change Anchor
                </button>
            </div>
        </div>
    );
}

interface DetailRowProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    mono?: boolean;
}

function DetailRow({ icon, label, value, mono }: DetailRowProps) {
    return (
        <div className="flex items-center gap-3">
            <div className="shrink-0">{icon}</div>
            <div className="flex-1 flex items-center justify-between min-w-0">
                <span className="text-zinc-500 text-xs uppercase tracking-wider shrink-0 mr-3">
                    {label}
                </span>
                <span
                    className={cn(
                        'text-white text-sm truncate text-right',
                        mono ? 'font-mono font-medium' : 'font-medium',
                    )}
                >
                    {value}
                </span>
            </div>
        </div>
    );
}

// ─── Error Card ────────────────────────────────────────────────────────────────

interface ErrorCardProps {
    code: string;
    message: string;
}

const errorHints: Record<string, string> = {
    UNSUPPORTED:
        'Use Chrome on Android 80+ over HTTPS. The Contact Picker API is not available on desktop browsers.',
    INSECURE_CONTEXT: 'Serve the app over HTTPS or localhost.',
    USER_CANCELLED: 'Tap "Select Anchor" and choose a contact from the list.',
    NO_NAME: 'The contact must have a name saved in your phonebook.',
    NO_PHONE:
        'Please select a contact that has at least one phone number saved.',
    UNKNOWN: 'An unexpected error occurred. Please try again.',
};

function ErrorCard({ code, message }: ErrorCardProps) {
    const hint = errorHints[code] ?? errorHints['UNKNOWN'];

    return (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            {/* Header bar */}
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
