'use client'; // no-op in Vite; required for Next.js App Router compatibility

/**
 * AnchorSelector.tsx
 *
 * Full anchor-selection screen with 3 labelled cards:
 *   Mom · Dad · Favourite Contact
 *
 * Each card opens the native OS contact picker via selectAnchor(label).
 * No typing anywhere — only taps.
 *
 * Works identically in:
 *   - Vite + React (current)
 *   - Next.js App Router ('use client' is already present)
 *   - React Native Expo (swap lib/contactPicker.ts only — this file stays the same)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Heart,
    User2,
    Star,
    CheckCircle2,
    RefreshCw,
    Loader2,
    AlertTriangle,
    Phone,
    UserRound,
    Smartphone,
} from 'lucide-react';
import {
    selectAnchor,
    loadAnchorContact,
    clearAnchorContact,
    type AnchorContact,
    type ContactPickerError,
    type ContactPickerResponse,
} from './lib/contactPicker';
import { cn } from './lib/utils';

// ─── Card definitions ─────────────────────────────────────────────────────────

interface AnchorCard {
    label: string;
    icon: React.ReactNode;
    description: string;
    accentFrom: string; // Tailwind gradient-from colour
    accentTo: string;   // Tailwind gradient-to colour
    glowColour: string; // Box shadow rgba
    borderIdle: string;
    borderActive: string;
    textAccent: string;
}

const ANCHOR_CARDS: AnchorCard[] = [
    {
        label: 'Mom',
        icon: <Heart className="w-7 h-7" />,
        description: 'Select your mother from contacts',
        accentFrom: 'from-rose-500/20',
        accentTo: 'to-pink-500/10',
        glowColour: 'rgba(244,63,94,0.18)',
        borderIdle: 'border-rose-500/20',
        borderActive: 'border-rose-500/60',
        textAccent: 'text-rose-400',
    },
    {
        label: 'Dad',
        icon: <User2 className="w-7 h-7" />,
        description: 'Select your father from contacts',
        accentFrom: 'from-blue-500/20',
        accentTo: 'to-indigo-500/10',
        glowColour: 'rgba(59,130,246,0.18)',
        borderIdle: 'border-blue-500/20',
        borderActive: 'border-blue-500/60',
        textAccent: 'text-blue-400',
    },
    {
        label: 'Favourite',
        icon: <Star className="w-7 h-7" />,
        description: 'Select any trusted contact',
        accentFrom: 'from-amber-500/20',
        accentTo: 'to-yellow-500/10',
        glowColour: 'rgba(245,158,11,0.18)',
        borderIdle: 'border-amber-500/20',
        borderActive: 'border-amber-500/60',
        textAccent: 'text-amber-400',
    },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'success';

// ─── Root Component ───────────────────────────────────────────────────────────

export default function AnchorSelector() {
    const [anchor, setAnchor] = useState<AnchorContact | null>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
    const [error, setError] = useState<ContactPickerError | null>(null);
    const [isSupported, setIsSupported] = useState<boolean | null>(null); // null = not yet checked

    // ── Hydrate from localStorage + check API support on mount ──────────────────
    useEffect(() => {
        // Check Contact Picker API support (client-side only)
        setIsSupported('contacts' in navigator);

        // Restore previously saved anchor
        const saved = loadAnchorContact();
        if (saved) {
            setAnchor(saved);
            setStatus('success');
        }
    }, []);

    // ── Handle card tap ──────────────────────────────────────────────────────────
    const handleCardTap = async (label: string) => {
        setLoadingLabel(label);
        setStatus('loading');
        setError(null);

        const result: ContactPickerResponse = await selectAnchor(label);

        setLoadingLabel(null);

        if (result.success) {
            setAnchor(result.contact);
            setStatus('success');
        } else {
            const err = result as ContactPickerError;
            // Don't show error card for quiet cancellations
            if (err.errorCode !== 'USER_CANCELLED') {
                setError(err);
            }
            setStatus('idle');
        }
    };

    // ── Handle change ────────────────────────────────────────────────────────────
    const handleChange = () => {
        clearAnchorContact();
        setAnchor(null);
        setError(null);
        setStatus('idle');
    };

    // ── Render ───────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6 font-sans overflow-hidden">

            {/* Ambient background glow */}
            <div className="pointer-events-none fixed inset-0 flex items-center justify-center" aria-hidden>
                <div className="w-[700px] h-[700px] rounded-full bg-indigo-700/4 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

                {/* ── Header ── */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-display font-bold tracking-tight text-white">
                        Select Your Anchor
                    </h1>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                        Choose a trusted person for emergency SOS alerts.
                        <br />No typing required — just tap.
                    </p>
                </div>

                {/* ── Unsupported banner ── */}
                {isSupported === false && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
                    >
                        <Smartphone className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-amber-300 text-xs leading-relaxed">
                            Contact picker is supported on mobile Chrome only. Open this page
                            on your Android device in Chrome.
                        </p>
                    </motion.div>
                )}

                {/* ── Main content area ── */}
                <AnimatePresence mode="wait">

                    {/* SUCCESS STATE — Anchor Connected */}
                    {status === 'success' && anchor && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                            className="w-full"
                        >
                            <ConfirmationCard anchor={anchor} onClear={handleChange} />
                        </motion.div>
                    )}

                    {/* IDLE / LOADING STATE — 3 cards */}
                    {status !== 'success' && (
                        <motion.div
                            key="cards"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                            className="w-full flex flex-col gap-3"
                        >
                            {ANCHOR_CARDS.map((card) => (
                                <AnchorCardButton
                                    key={card.label}
                                    card={card}
                                    isLoading={loadingLabel === card.label}
                                    disabled={status === 'loading'}
                                    onTap={() => handleCardTap(card.label)}
                                />
                            ))}

                            {/* Inline error message */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20"
                                    >
                                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-red-300 text-xs font-semibold uppercase tracking-wider mb-0.5">
                                                {error.errorCode.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-zinc-400 text-xs leading-relaxed">
                                                {error.message}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                </AnimatePresence>

                {/* ── Footer ── */}
                <p className="text-center text-zinc-700 text-[10px] uppercase tracking-[0.18em]">
                    Stored locally · Never leaves your device
                </p>

            </div>
        </div>
    );
}

// ─── Anchor Card Button ───────────────────────────────────────────────────────

interface AnchorCardButtonProps {
    card: AnchorCard;
    isLoading: boolean;
    disabled: boolean;
    onTap: () => void;
}

function AnchorCardButton({ card, isLoading, disabled, onTap }: AnchorCardButtonProps) {
    return (
        <motion.button
            id={`anchor-card-${card.label.toLowerCase()}`}
            onClick={onTap}
            disabled={disabled}
            whileTap={disabled ? {} : { scale: 0.97 }}
            className={cn(
                // Layout
                'relative w-full flex items-center gap-4 px-5 py-4 rounded-2xl',
                // Background gradient
                `bg-gradient-to-r ${card.accentFrom} ${card.accentTo}`,
                // Border
                'border transition-all duration-300',
                disabled && !isLoading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                isLoading ? card.borderActive : card.borderIdle,
                !disabled && `hover:${card.borderActive}`,
            )}
            style={
                isLoading
                    ? { boxShadow: `0 0 28px ${card.glowColour}` }
                    : undefined
            }
        >
            {/* Icon */}
            <div className={cn('shrink-0 transition-transform duration-300', card.textAccent, isLoading && 'scale-110')}>
                {isLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : card.icon}
            </div>

            {/* Text */}
            <div className="flex-1 text-left">
                <p className={cn('font-display font-semibold text-lg leading-none mb-1', card.textAccent)}>
                    {card.label}
                </p>
                <p className="text-zinc-500 text-xs">
                    {isLoading ? 'Opening contacts…' : card.description}
                </p>
            </div>

            {/* Chevron / spinner indicator */}
            <div className={cn('shrink-0 text-zinc-600 transition-opacity', isLoading && 'opacity-0')}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </div>

            {/* Subtle glow ring on hover */}
            <span
                aria-hidden
                className={cn(
                    'absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none',
                    `ring-1 ${isLoading ? card.borderActive : card.borderIdle}`,
                )}
            />
        </motion.button>
    );
}

// ─── Confirmation Card ────────────────────────────────────────────────────────

interface ConfirmationCardProps {
    anchor: AnchorContact;
    onClear: () => void;
}

function ConfirmationCard({ anchor, onClear }: ConfirmationCardProps) {
    // Find the card definition for consistent accent colours
    const cardDef = ANCHOR_CARDS.find((c) => c.label === anchor.label) ?? ANCHOR_CARDS[2];

    return (
        <div className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">

            {/* ── Header bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 bg-emerald-500/5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 text-sm font-semibold tracking-wide">
                    Anchor Connected ✓
                </span>
            </div>

            {/* ── Contact details */}
            <div className="px-5 py-5 space-y-4">

                {/* Label badge */}
                {anchor.label && (
                    <div className="flex items-center gap-2">
                        <div className={cn('shrink-0', cardDef.textAccent)}>
                            {cardDef.icon}
                        </div>
                        <span className={cn('text-xl font-display font-bold', cardDef.textAccent)}>
                            {anchor.label}
                        </span>
                    </div>
                )}

                {/* Divider */}
                <div className="h-px bg-zinc-800" />

                {/* Name row */}
                <div className="flex items-center gap-3">
                    <UserRound className="w-4 h-4 text-zinc-500 shrink-0" />
                    <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="text-zinc-500 text-xs uppercase tracking-wider shrink-0 mr-3">Name</span>
                        <span className="text-white text-sm font-medium truncate text-right">{anchor.name}</span>
                    </div>
                </div>

                {/* Phone row */}
                <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                    <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="text-zinc-500 text-xs uppercase tracking-wider shrink-0 mr-3">Phone</span>
                        <span className="text-white text-sm font-mono font-medium truncate text-right">{anchor.phone}</span>
                    </div>
                </div>
            </div>

            {/* ── Change button */}
            <div className="px-5 pb-5">
                <button
                    id="change-anchor-btn"
                    onClick={onClear}
                    className={cn(
                        'group flex items-center justify-center gap-2 w-full py-3 rounded-xl',
                        'bg-zinc-800 border border-zinc-700 text-zinc-400',
                        'text-sm font-medium tracking-wide',
                        'hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-600',
                        'transition-all duration-200',
                    )}
                >
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    Change Anchor
                </button>
            </div>

        </div>
    );
}
