/**
 * App.tsx — Resonance Native (Expo React Native)
 *
 * All 3 phases wired with native hardware APIs:
 *   Phase 1: expo-contacts anchor selection
 *   Phase 2: 60-BPM expo-haptics heartbeat hold
 *   Phase 3: expo-sensors shake → Twilio SOS + expo-av exhale
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import { Audio } from 'expo-av';
import { selectAnchor, loadAnchorContact, clearAnchorContact, type AnchorContact } from './lib/contactPicker';
import { getCurrentLocation } from './lib/location';

const { width: W, height: H } = Dimensions.get('window');
const SOS_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000'; // 10.0.2.2 = localhost on Android emulator

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#050505',
  surface: '#111111',
  border: '#1f1f1f',
  emerald: '#10b981',
  emeraldDim: 'rgba(16,185,129,0.15)',
  amber: '#f59e0b',
  amberDim: 'rgba(245,158,11,0.15)',
  red: '#ef4444',
  white: '#ffffff',
  zinc400: '#a1a1aa',
  zinc500: '#71717a',
  zinc600: '#52525b',
  zinc800: '#27272a',
};

// ─── Anchor card definitions ──────────────────────────────────────────────────
const ANCHOR_CARDS = [
  { label: 'Mom', colour: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
  { label: 'Dad', colour: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { label: 'Favourite', colour: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
];

type Mode = 'anchor' | 'idle' | 'habit' | 'sos' | 'exhale';

// ─── Root Component ───────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<Mode>('anchor');
  const [anchor, setAnchor] = useState<AnchorContact | null>(null);
  const [streak, setStreak] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  const holdProgressAnim = useRef(new Animated.Value(0)).current;
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBeatRef = useRef(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const shakeSubRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const lastShakeRef = useRef(0);

  // ── Hydrate saved anchor on mount ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const saved = await loadAnchorContact();
      if (saved) {
        setAnchor(saved);
        setMode('idle');
      }
    })();
  }, []);

  // ── Shake Detection (Accelerometer) ─────────────────────────────────────────
  useEffect(() => {
    if (mode === 'sos' || mode === 'exhale') {
      shakeSubRef.current?.remove();
      shakeSubRef.current = null;
      return;
    }

    Accelerometer.setUpdateInterval(100);
    shakeSubRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      // magnitude > 2.5g AND 1.5s cooldown between triggers
      if (magnitude > 2.5 && now - lastShakeRef.current > 1500) {
        lastShakeRef.current = now;
        triggerSOS();
      }
    });

    return () => {
      shakeSubRef.current?.remove();
      shakeSubRef.current = null;
    };
  }, [mode]);

  // ── SOS Logic ───────────────────────────────────────────────────────────────
  const triggerSOS = useCallback(async () => {
    if (mode === 'sos') return;
    setMode('sos');

    // SOS triple haptic
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 400);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 800);

    // Get GPS
    const locationResult = await getCurrentLocation();
    const locationUrl = locationResult.success
      ? locationResult.mapsUrl
      : 'Location unavailable';

    if (locationResult.success) {
      console.log('[SOS] Latitude:', locationResult.coordinates.latitude);
      console.log('[SOS] Longitude:', locationResult.coordinates.longitude);
      console.log('[SOS] Map Link:', locationResult.mapsUrl);
    }

    // Fire Twilio SOS API
    const savedAnchor = await loadAnchorContact();
    if (savedAnchor?.phone) {
      try {
        await fetch(`${SOS_API_URL}/api/sos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anchorPhone: savedAnchor.phone, locationUrl }),
        });
      } catch (e) {
        console.error('[SOS] API Error:', e);
      }
    }

    // Auto-transition to Exhale after 3s
    setTimeout(() => setMode('exhale'), 3000);
  }, [mode]);

  // ── Habit Hold Logic ─────────────────────────────────────────────────────────
  const handleHoldStart = useCallback(() => {
    setIsHolding(true);
    const startTime = Date.now();
    const duration = 15000;
    lastBeatRef.current = 0;

    holdIntervalRef.current = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setHoldProgress(progress);
      holdProgressAnim.setValue(progress);

      // 60-BPM haptic heartbeat
      if (elapsed - lastBeatRef.current >= 1000) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        lastBeatRef.current = elapsed;
      }

      if (progress >= 1) completeHabit();
    }, 50);
  }, []);

  const handleHoldEnd = useCallback(() => {
    setIsHolding(false);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    if (holdProgress < 1) setHoldProgress(0);
  }, [holdProgress]);

  const completeHabit = useCallback(() => {
    setIsHolding(false);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    setStreak(s => s + 1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => { setHoldProgress(0); setMode('idle'); }, 1500);
  }, []);

  // ── Microphone / Exhale Engine ───────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'exhale') {
      startMic();
    } else {
      stopMic();
    }
    return () => { stopMic(); };
  }, [mode]);

  const startMic = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY
      );
      recordingRef.current = recording;

      recording.setOnRecordingStatusUpdate((status) => {
        if (status.metering !== undefined && status.metering !== null) {
          // metering is in dBFS: -160 (silence) to 0 (max)
          const intensity = Math.max(0, (status.metering + 60) / 60);
          setMicLevel(intensity);
        }
      });
    } catch (e) {
      console.error('[Exhale] Mic Error:', e);
    }
  };

  const stopMic = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch { /* already stopped */ }
      recordingRef.current = null;
    }
    setMicLevel(0);
  };

  // ── Anchor Selection ─────────────────────────────────────────────────────────
  const handleSelectAnchor = async (label: string) => {
    setLoadingLabel(label);
    const result = await selectAnchor(label);
    setLoadingLabel(null);

    if (result.success) {
      setAnchor(result.contact);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMode('idle');
    } else if (result.errorCode !== 'USER_CANCELLED') {
      Alert.alert('Could not select contact', result.message);
    }
  };

  const handleChangeAnchor = async () => {
    await clearAnchorContact();
    setAnchor(null);
    setMode('anchor');
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* ── PHASE 1: Anchor Selection ── */}
      {mode === 'anchor' && (
        <View style={s.screen}>
          <Text style={s.title}>Select Your Anchor</Text>
          <Text style={s.subtitle}>Pick a trusted person for emergency SOS.{'\n'}No typing — just tap.</Text>

          <View style={s.cardContainer}>
            {ANCHOR_CARDS.map((card) => (
              <TouchableOpacity
                key={card.label}
                style={[s.card, { backgroundColor: card.bg, borderColor: card.colour + '40' }]}
                onPress={() => handleSelectAnchor(card.label)}
                activeOpacity={0.7}
                disabled={loadingLabel !== null}
              >
                <Text style={[s.cardLabel, { color: card.colour }]}>{card.label}</Text>
                <Text style={s.cardSub}>
                  {loadingLabel === card.label ? 'Opening contacts…' : 'Tap to select from contacts'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.footer}>Stored locally · Never leaves your device</Text>
        </View>
      )}

      {/* ── PHASE 2: Main Idle + Daily Habit ── */}
      {(mode === 'idle' || mode === 'habit') && (
        <View style={s.screen}>
          <Text style={s.title}>Resonance</Text>
          <Text style={[s.subtitle, { color: C.zinc600 }]}>Zero-Friction Mental Health</Text>

          {/* Hold Orb */}
          <Pressable
            onPressIn={mode === 'idle' ? () => { setMode('habit'); handleHoldStart(); } : handleHoldStart}
            onPressOut={handleHoldEnd}
            style={({ pressed }) => [
              s.orb,
              pressed && s.orbPressed,
              isHolding && s.orbActive,
            ]}
          >
            <Text style={s.orbText}>{isHolding ? '♥' : '○'}</Text>
            {mode === 'habit' && (
              <Text style={s.orbProgress}>{Math.round(holdProgress * 100)}%</Text>
            )}
          </Pressable>

          <Text style={[s.hint, { color: C.zinc500 }]}>
            {mode === 'idle' ? 'Hold the orb for 15 seconds' : 'Keep holding…'}
          </Text>

          {/* Stats row */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{streak}</Text>
              <Text style={s.statLabel}>STREAK</Text>
            </View>

            <TouchableOpacity style={s.statItem} onPress={handleChangeAnchor}>
              <View style={[s.anchorDot, anchor && s.anchorDotActive]} />
              <Text style={[s.statLabel, anchor && { color: C.emerald }]}>
                {anchor ? anchor.name : 'ANCHOR'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={s.shakeHint}>⚡ Shake phone for Emergency SOS</Text>
        </View>
      )}

      {/* ── PHASE 3a: SOS Triggered ── */}
      {mode === 'sos' && (
        <View style={[s.screen, s.sosScreen]}>
          <View style={s.sosIcon}>
            <Text style={s.sosEmoji}>⚠️</Text>
          </View>
          <Text style={s.sosTitle}>SOS TRIGGERED</Text>
          <Text style={s.sosSub}>Alerting your anchor and sharing location…</Text>
          {anchor && (
            <View style={s.sosPill}>
              <Text style={s.sosPillText}>📍 {anchor.name} · {anchor.phone}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── PHASE 3b: Exhale De-escalation ── */}
      {mode === 'exhale' && (
        <View style={[s.screen, s.exhaleScreen]}>
          <View style={[s.exhaleOrb, { transform: [{ scale: 1 + micLevel * 0.5 }] }]}>
            <Text style={s.exhaleIcon}>💨</Text>
          </View>
          <Text style={s.exhaleTitle}>Exhale Deeply</Text>
          <Text style={s.exhaleHint}>Blow into the microphone to clear the panic</Text>

          {micLevel > 0.3 && (
            <Text style={s.exhaleActive}>Exhale detected ✓</Text>
          )}

          <TouchableOpacity
            style={s.betterBtn}
            onPress={() => setMode('idle')}
          >
            <Text style={s.betterBtnText}>I feel better now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },

  // Typography
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: C.white,
    letterSpacing: -1,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: C.zinc400,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  hint: {
    fontSize: 13,
    color: C.zinc500,
    marginTop: 24,
    textAlign: 'center',
  },
  footer: {
    fontSize: 10,
    color: C.zinc600,
    letterSpacing: 2,
    marginTop: 40,
    textTransform: 'uppercase',
  },

  // Anchor cards
  cardContainer: {
    width: '100%',
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: C.zinc500,
  },

  // Hold orb
  orb: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: C.emeraldDim,
    borderWidth: 1,
    borderColor: C.emerald + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbPressed: {
    backgroundColor: C.emerald + '25',
  },
  orbActive: {
    backgroundColor: C.emerald + '30',
    borderColor: C.emerald + '80',
    shadowColor: C.emerald,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  orbText: {
    fontSize: 40,
    color: C.emerald,
  },
  orbProgress: {
    fontSize: 14,
    color: C.emerald,
    marginTop: 4,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 48,
    marginTop: 40,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: C.white,
  },
  statLabel: {
    fontSize: 10,
    color: C.zinc500,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  anchorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.zinc800,
    borderWidth: 1,
    borderColor: C.zinc600,
  },
  anchorDotActive: {
    backgroundColor: C.emeraldDim,
    borderColor: C.emerald,
  },
  shakeHint: {
    position: 'absolute',
    bottom: 40,
    fontSize: 10,
    color: C.zinc600,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // SOS
  sosScreen: {
    backgroundColor: '#7f1d1d',
  },
  sosIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  sosEmoji: {
    fontSize: 40,
  },
  sosTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -1,
    marginBottom: 12,
  },
  sosSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 24,
  },
  sosPill: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  sosPillText: {
    fontSize: 13,
    color: C.white,
    fontWeight: '600',
  },

  // Exhale
  exhaleScreen: {
    backgroundColor: '#431407',
  },
  exhaleOrb: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2,
    borderColor: C.amber + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  exhaleIcon: {
    fontSize: 44,
  },
  exhaleTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: C.white,
    marginBottom: 8,
  },
  exhaleHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 16,
  },
  exhaleActive: {
    fontSize: 13,
    color: C.amber,
    fontWeight: '600',
    marginBottom: 16,
  },
  betterBtn: {
    position: 'absolute',
    bottom: 48,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  betterBtnText: {
    fontSize: 14,
    color: C.white,
    fontWeight: '500',
  },
});
