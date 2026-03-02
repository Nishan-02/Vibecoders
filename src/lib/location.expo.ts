/**
 * @file location.expo.ts
 * @description Expo React Native drop-in replacement for lib/location.ts
 *
 * HOW TO MIGRATE:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Run: npx expo install expo-location
 * 2. Add to app.json > expo > plugins: ["expo-location"]
 * 3. In your Expo project, REPLACE the contents of lib/location.ts with
 *    the contents of this file.
 * 4. Delete this file afterwards.
 *
 * All call-sites (App.tsx, AnchorDemo.tsx, etc.) remain UNCHANGED.
 * The exported types (LocationResult, LocationError, LocationResponse,
 * LocationErrorCode, GetLocationOptions) are identical.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Expo docs: https://docs.expo.dev/versions/latest/sdk/location/
 */

import * as ExpoLocation from 'expo-location';

// ─── Re-export identical types (same shape as the web version) ────────────────

export interface Coordinates {
    latitude: number;
    longitude: number;
    accuracy: number | null;
}

export interface LocationResult {
    success: true;
    coordinates: Coordinates;
    /** Google Maps URL: https://maps.google.com/?q=LAT,LNG */
    mapsUrl: string;
}

export interface LocationError {
    success: false;
    errorCode: LocationErrorCode;
    message: string;
}

export type LocationResponse = LocationResult | LocationError;

export type LocationErrorCode =
    | 'PERMISSION_DENIED'
    | 'POSITION_UNAVAILABLE'
    | 'TIMEOUT'
    | 'UNSUPPORTED'
    | 'INSECURE_CONTEXT'
    | 'UNKNOWN';

export interface GetLocationOptions {
    maximumAge?: number;
    timeout?: number;
    enableHighAccuracy?: boolean;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildMapsUrl(lat: number, lng: number): string {
    return `https://maps.google.com/?q=${lat},${lng}`;
}

// ─── Core API — Expo implementation ──────────────────────────────────────────

/**
 * Retrieves the device's current geographic location using expo-location.
 * Drop-in replacement for the web navigator.geolocation version.
 *
 * @param options - Optional tuning (accuracy, timeout, maximumAge).
 * @returns LocationResponse — same shape as the web version.
 */
export async function getCurrentLocation(
    options: GetLocationOptions = {},
): Promise<LocationResponse> {
    try {
        // ── Request foreground permission ──────────────────────────────────────
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();

        if (status !== ExpoLocation.PermissionStatus.GRANTED) {
            return {
                success: false,
                errorCode: 'PERMISSION_DENIED',
                message:
                    'Location permission was denied. Please enable it in Settings → Privacy → Location.',
            };
        }

        // ── Get position ───────────────────────────────────────────────────────
        const accuracy = options.enableHighAccuracy === false
            ? ExpoLocation.Accuracy.Balanced
            : ExpoLocation.Accuracy.High;

        const position = await ExpoLocation.getCurrentPositionAsync({
            accuracy,
            ...(options.maximumAge !== undefined && { maxAge: options.maximumAge }),
            ...(options.timeout !== undefined && { timeInterval: options.timeout }),
        });

        const { latitude, longitude, accuracy: acc } = position.coords;

        return {
            success: true,
            coordinates: {
                latitude,
                longitude,
                accuracy: acc ?? null,
            },
            mapsUrl: buildMapsUrl(latitude, longitude),
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred.';

        // Expo throws generic errors — classify by message content
        if (message.toLowerCase().includes('timeout')) {
            return { success: false, errorCode: 'TIMEOUT', message };
        }

        if (message.toLowerCase().includes('unavailable')) {
            return { success: false, errorCode: 'POSITION_UNAVAILABLE', message };
        }

        return { success: false, errorCode: 'UNKNOWN', message };
    }
}
