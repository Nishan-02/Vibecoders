/**
 * @file location.ts
 * @description Reusable geolocation utility for browser environments.
 *
 * FUTURE-PROOF DESIGN:
 * -------------------------------------------------------------------
 * This module exports a single async function `getCurrentLocation()`.
 * When migrating to React Native / Expo, replace ONLY this file's
 * implementation with `expo-location` — all call-sites in the app
 * remain unchanged.
 *
 * Vite (client-side) example usage:
 *   import { getCurrentLocation } from '@/lib/location';
 *
 * Expo replacement (keep same export shape):
 *   import * as ExpoLocation from 'expo-location';
 *   export async function getCurrentLocation(): Promise<LocationResult> { ... }
 * -------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────────

/** The coordinates returned by the geolocation provider. */
export interface Coordinates {
    latitude: number;
    longitude: number;
    accuracy: number | null;
}

/** A successful location result. */
export interface LocationResult {
    success: true;
    coordinates: Coordinates;
    /** A Google Maps link in the format https://maps.google.com/?q=LAT,LNG */
    mapsUrl: string;
}

/** A failed location result with a human-readable error. */
export interface LocationError {
    success: false;
    errorCode: LocationErrorCode;
    message: string;
}

/** Union type returned by `getCurrentLocation`. */
export type LocationResponse = LocationResult | LocationError;

/**
 * Discriminated error codes for fine-grained error handling.
 *  - PERMISSION_DENIED  → user blocked location access
 *  - POSITION_UNAVAILABLE → device cannot determine location
 *  - TIMEOUT            → request took too long
 *  - UNSUPPORTED        → browser/environment lacks geolocation API
 *  - INSECURE_CONTEXT   → page is not served over HTTPS / secure context
 *  - UNKNOWN            → catch-all
 */
export type LocationErrorCode =
    | 'PERMISSION_DENIED'
    | 'POSITION_UNAVAILABLE'
    | 'TIMEOUT'
    | 'UNSUPPORTED'
    | 'INSECURE_CONTEXT'
    | 'UNKNOWN';

/** Options for the geolocation request. */
export interface GetLocationOptions {
    /** Maximum age (ms) of a cached position to accept. Default: 0 (fresh). */
    maximumAge?: number;
    /** Timeout (ms) before giving up. Default: 10_000. */
    timeout?: number;
    /** Request high-accuracy GPS. Default: true. */
    enableHighAccuracy?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Converts raw GeolocationPositionError codes to our typed error codes.
 */
function mapGeoError(error: GeolocationPositionError): LocationError {
    const codeMap: Record<number, LocationErrorCode> = {
        [GeolocationPositionError.PERMISSION_DENIED]: 'PERMISSION_DENIED',
        [GeolocationPositionError.POSITION_UNAVAILABLE]: 'POSITION_UNAVAILABLE',
        [GeolocationPositionError.TIMEOUT]: 'TIMEOUT',
    };

    const messageMap: Record<number, string> = {
        [GeolocationPositionError.PERMISSION_DENIED]:
            'Location access was denied. Please enable it in your browser settings.',
        [GeolocationPositionError.POSITION_UNAVAILABLE]:
            'Your device could not determine its current location.',
        [GeolocationPositionError.TIMEOUT]:
            'Location request timed out. Please try again.',
    };

    return {
        success: false,
        errorCode: codeMap[error.code] ?? 'UNKNOWN',
        message: messageMap[error.code] ?? error.message,
    };
}

/**
 * Builds a Google Maps link from coordinates.
 * Format: https://maps.google.com/?q=LATITUDE,LONGITUDE
 */
function buildMapsUrl(lat: number, lng: number): string {
    return `https://maps.google.com/?q=${lat},${lng}`;
}

// ─── Core API ───────────────────────────────────────────────────────────────

/**
 * Retrieves the device's current geographic location.
 *
 * @param options - Optional tuning for accuracy, timeout, and caching.
 * @returns A `LocationResponse` — either a success with coordinates + mapsUrl,
 *          or a typed error you can switch on with `.errorCode`.
 *
 * @example
 * ```ts
 * const result = await getCurrentLocation();
 * if (result.success) {
 *   console.log(result.mapsUrl);
 * } else {
 *   console.error(result.errorCode, result.message);
 * }
 * ```
 *
 * @remarks
 * - Safely returns `UNSUPPORTED` error if called during SSR (no `window`).
 * - Returns `INSECURE_CONTEXT` if page is not on HTTPS / localhost.
 * - Wraps the callback-based `navigator.geolocation` API in a Promise.
 */
export async function getCurrentLocation(
    options: GetLocationOptions = {},
): Promise<LocationResponse> {
    // ── Guard: SSR / non-browser environment ──────────────────────────────────
    if (typeof window === 'undefined') {
        return {
            success: false,
            errorCode: 'UNSUPPORTED',
            message: 'Geolocation is not available in a server-side environment.',
        };
    }

    // ── Guard: Secure context check (geolocation requires HTTPS or localhost) ──
    if (!window.isSecureContext) {
        return {
            success: false,
            errorCode: 'INSECURE_CONTEXT',
            message:
                'Geolocation requires a secure context (HTTPS or localhost). Please serve your app over HTTPS.',
        };
    }

    // ── Guard: API availability ────────────────────────────────────────────────
    if (!('geolocation' in navigator)) {
        return {
            success: false,
            errorCode: 'UNSUPPORTED',
            message: 'Your browser does not support the Geolocation API.',
        };
    }

    // ── Promisify navigator.geolocation.getCurrentPosition ────────────────────
    return new Promise<LocationResponse>((resolve) => {
        const positionOptions: PositionOptions = {
            enableHighAccuracy: options.enableHighAccuracy ?? true,
            timeout: options.timeout ?? 10_000,
            maximumAge: options.maximumAge ?? 0,
        };

        navigator.geolocation.getCurrentPosition(
            (position: GeolocationPosition) => {
                const { latitude, longitude, accuracy } = position.coords;
                resolve({
                    success: true,
                    coordinates: { latitude, longitude, accuracy },
                    mapsUrl: buildMapsUrl(latitude, longitude),
                });
            },
            (error: GeolocationPositionError) => {
                resolve(mapGeoError(error));
            },
            positionOptions,
        );
    });
}
