/**
 * lib/location.ts — Expo React Native implementation
 * Drop-in replacement for the web browser navigator.geolocation version.
 * Identical export shape — all call-sites unchanged.
 */
import * as ExpoLocation from 'expo-location';

export interface Coordinates {
    latitude: number;
    longitude: number;
    accuracy: number | null;
}

export interface LocationResult {
    success: true;
    coordinates: Coordinates;
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

function buildMapsUrl(lat: number, lng: number): string {
    return `https://maps.google.com/?q=${lat},${lng}`;
}

export async function getCurrentLocation(
    options: GetLocationOptions = {},
): Promise<LocationResponse> {
    try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();

        if (status !== ExpoLocation.PermissionStatus.GRANTED) {
            return {
                success: false,
                errorCode: 'PERMISSION_DENIED',
                message: 'Location permission denied. Enable it in Settings → Privacy → Location.',
            };
        }

        const accuracy = options.enableHighAccuracy === false
            ? ExpoLocation.Accuracy.Balanced
            : ExpoLocation.Accuracy.High;

        const position = await ExpoLocation.getCurrentPositionAsync({ accuracy });
        const { latitude, longitude, accuracy: acc } = position.coords;

        return {
            success: true,
            coordinates: { latitude, longitude, accuracy: acc ?? null },
            mapsUrl: buildMapsUrl(latitude, longitude),
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error.';
        if (message.toLowerCase().includes('timeout')) {
            return { success: false, errorCode: 'TIMEOUT', message };
        }
        return { success: false, errorCode: 'UNKNOWN', message };
    }
}
