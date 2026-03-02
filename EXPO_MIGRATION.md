# Resonance — Expo React Native Migration Guide

## Overview

The web app was architected specifically to make this migration a **file-swap only** operation.
No UI components need to change. Only the two utility files in `src/lib/` are replaced.

---

## Step 1 — Create Expo Project

```bash
npx create-expo-app@latest resonance-native --template blank-typescript
cd resonance-native
```

---

## Step 2 — Install Dependencies

```bash
# Core Expo SDKs (replace web browser APIs)
npx expo install expo-location
npx expo install expo-contacts
npx expo install @react-native-async-storage/async-storage

# Same packages as web
npm install twilio
npm install @react-native-community/netinfo   # for network checks
```

---

## Step 3 — Configure app.json Permissions

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Resonance needs your location to send it during an SOS alert.",
          "locationWhenInUsePermission": "Resonance needs your location to send it during an SOS alert."
        }
      ],
      [
        "expo-contacts",
        {
          "contactsPermission": "Resonance needs your contacts to let you pick a trusted anchor person."
        }
      ]
    ]
  }
}
```

---

## Step 4 — Swap the Two Utility Files

This is the **only code change needed**. Everything else stays identical.

### 4a. Replace `lib/location.ts`

```bash
# In your Expo project
cp src/lib/location.expo.ts src/lib/location.ts
rm src/lib/location.expo.ts
```

**What changes internally:**
- `navigator.geolocation.getCurrentPosition` → `ExpoLocation.getCurrentPositionAsync`
- `window.isSecureContext` check removed (native app is always secure)
- `typeof window === 'undefined'` SSR guard removed (not needed in React Native)
- Permission request added: `ExpoLocation.requestForegroundPermissionsAsync()`

**What stays the same (your UI never changes):**
```ts
// This call works identically on web AND Expo
const result = await getCurrentLocation();
if (result.success) {
  console.log(result.mapsUrl);         // https://maps.google.com/?q=LAT,LNG
  console.log(result.coordinates.latitude);
}
```

---

### 4b. Replace `lib/contactPicker.ts`

```bash
cp src/lib/contactPicker.expo.ts src/lib/contactPicker.ts
rm src/lib/contactPicker.expo.ts
```

**What changes internally:**
- `navigator.contacts.select()` → `ExpoContacts.getContactsAsync()`
- `localStorage` → `AsyncStorage` (from `@react-native-async-storage/async-storage`)
- `loadAnchorContact()` and `clearAnchorContact()` become `async` (return Promises)
- SSR and `isSecureContext` guards removed

**What stays the same:**
```ts
// selectAnchor, selectAnchorContact, loadAnchorContact, clearAnchorContact
// all have the same signature and return shape
const result = await selectAnchor('Mom');
if (result.success) {
  console.log(result.contact.label); // "Mom"
  console.log(result.contact.name);  // "Lakshmi"
  console.log(result.contact.phone); // "+919876543210"
}
```

> **Note on `loadAnchorContact`:** In the web version this is synchronous.
> In the Expo version it returns `Promise<AnchorContact | null>`.
> Update call-sites from `const s = loadAnchorContact()` to `const s = await loadAnchorContact()`.
> This is the **only call-site change required**.

---

## Step 5 — Hardware Sensors in Expo

These replace the browser sensor APIs and require **no changes to App.tsx logic**, just the import:

| Web API | Expo SDK | Install |
|---|---|---|
| `DeviceMotionEvent` (shake) | `expo-sensors` → `Accelerometer` | `npx expo install expo-sensors` |
| `navigator.vibrate()` | `expo-haptics` | `npx expo install expo-haptics` |
| `navigator.mediaDevices.getUserMedia` (mic) | `expo-av` → `Audio` | `npx expo install expo-av` |

### Shake Detection (replace `devicemotion` listener in App.tsx)

```ts
import { Accelerometer } from 'expo-sensors';

Accelerometer.setUpdateInterval(100);
const subscription = Accelerometer.addListener(({ x, y, z }) => {
  const speed = Math.sqrt(x * x + y * y + z * z);
  if (speed > 2.5) triggerSOS(); // same threshold logic
});
return () => subscription.remove();
```

### Haptic Heartbeat (replace `navigator.vibrate()`)

```ts
import * as Haptics from 'expo-haptics';

// 60-BPM pulse (in the hold interval):
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// SOS triple pulse:
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

### Microphone Exhale (replace Web Audio API)

```ts
import { Audio } from 'expo-av';

const { recording } = await Audio.Recording.createAsync(
  Audio.RecordingOptionsPresets.LOW_QUALITY
);
// Read metering level to drive exhaleIntensity:
recording.setOnRecordingStatusUpdate((status) => {
  const intensity = (status.metering ?? -160 + 160) / 160;
  setExhaleIntensity(intensity);
});
```

---

## Step 6 — SOS API (Twilio — unchanged)

The backend `server.ts` with Twilio stays **100% unchanged**.
Your Expo app calls the same `/api/sos` endpoint — just point it at your deployed server URL:

```ts
// In App.tsx, update the fetch URL for production:
const SOS_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

await fetch(`${SOS_URL}/api/sos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ anchorPhone, locationUrl }),
});
```

---

## File Change Summary

| File | Web | Expo | Action |
|---|---|---|---|
| `src/App.tsx` | ✅ | ✅ Same | Minor sensor swap only |
| `src/AnchorSelector.tsx` | ✅ | ✅ Same | **No change needed** |
| `src/lib/location.ts` | Browser API | Expo SDK | **Swap with `location.expo.ts`** |
| `src/lib/contactPicker.ts` | Web Contact API | Expo Contacts | **Swap with `contactPicker.expo.ts`** |
| `server.ts` | Twilio | Twilio | **No change needed** |
| `.env` | ✅ | ✅ Same | **No change needed** |
