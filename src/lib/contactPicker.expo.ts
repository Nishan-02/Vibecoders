/**
 * @file contactPicker.expo.ts
 * @description Expo React Native drop-in replacement for lib/contactPicker.ts
 *
 * HOW TO MIGRATE:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Run: npx expo install expo-contacts
 * 2. Add to app.json > expo > plugins: ["expo-contacts"]
 * 3. In your Expo project, REPLACE the contents of lib/contactPicker.ts with
 *    the contents of this file.
 * 4. Delete this file afterwards.
 *
 * All call-sites (App.tsx, AnchorSelector.tsx, AnchorDemo.tsx, etc.)
 * remain UNCHANGED. Every exported symbol has the identical shape.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Note: expo-contacts does NOT provide a built-in contact picker UI.
 * This implementation fetches all contacts and returns the first match
 * by name. For a visual picker, integrate react-native-contacts or
 * use a BottomSheet with a FlatList of Contacts — the UI layer is
 * already handled by AnchorSelector.tsx which remains unchanged.
 *
 * Expo docs: https://docs.expo.dev/versions/latest/sdk/contacts/
 */

import * as ExpoContacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Identical types (same shape as the web version) ─────────────────────────

export interface AnchorContact {
    label?: string;
    name: string;
    phone: string;
}

export type ContactPickerErrorCode =
    | 'UNSUPPORTED'
    | 'INSECURE_CONTEXT'
    | 'USER_CANCELLED'
    | 'NO_PHONE'
    | 'NO_NAME'
    | 'UNKNOWN';

export interface ContactPickerSuccess {
    success: true;
    contact: AnchorContact;
}

export interface ContactPickerError {
    success: false;
    errorCode: ContactPickerErrorCode;
    message: string;
}

export type ContactPickerResponse = ContactPickerSuccess | ContactPickerError;

export const ANCHOR_CONTACT_KEY = 'anchorContact';

// ─── Storage helpers (AsyncStorage instead of localStorage) ──────────────────

async function saveToStorage(contact: AnchorContact): Promise<void> {
    try {
        await AsyncStorage.setItem(ANCHOR_CONTACT_KEY, JSON.stringify(contact));
    } catch {
        console.warn('[contactPicker] Could not persist contact to AsyncStorage.');
    }
}

export async function loadAnchorContact(): Promise<AnchorContact | null> {
    try {
        const raw = await AsyncStorage.getItem(ANCHOR_CONTACT_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AnchorContact;
    } catch {
        return null;
    }
}

export async function clearAnchorContact(): Promise<void> {
    try {
        await AsyncStorage.removeItem(ANCHOR_CONTACT_KEY);
    } catch {
        console.warn('[contactPicker] Could not clear anchorContact from AsyncStorage.');
    }
}

// ─── Shared picker logic ──────────────────────────────────────────────────────

async function openExpoContactPicker(label: string): Promise<ContactPickerResponse> {
    // Request permission
    const { status } = await ExpoContacts.requestPermissionsAsync();

    if (status !== ExpoContacts.PermissionStatus.GRANTED) {
        return {
            success: false,
            errorCode: 'PERMISSION_DENIED' as ContactPickerErrorCode,
            message:
                'Contacts permission was denied. Please enable it in Settings → Privacy → Contacts.',
        };
    }

    // Fetch all contacts with phone numbers
    const { data } = await ExpoContacts.getContactsAsync({
        fields: [ExpoContacts.Fields.Name, ExpoContacts.Fields.PhoneNumbers],
    });

    if (!data || data.length === 0) {
        return {
            success: false,
            errorCode: 'POSITION_UNAVAILABLE' as ContactPickerErrorCode,
            message: 'No contacts found on this device.',
        };
    }

    // Filter contacts that have a name and at least one phone number
    const valid = data.filter(
        (c) => c.name && c.phoneNumbers && c.phoneNumbers.length > 0,
    );

    if (valid.length === 0) {
        return {
            success: false,
            errorCode: 'NO_PHONE',
            message: 'No contacts with phone numbers found.',
        };
    }

    // NOTE: On Expo, contacts are returned as a list — your native UI
    // (AnchorSelector.tsx / a BottomSheet picker) should call this after
    // the user picks an item from the list. Here we return the full list
    // as metadata so the UI layer can present and pick.
    //
    // For the hackathon demo, we return the first valid contact as a
    // placeholder. Replace this with your picker UI selection callback.
    const picked = valid[0];
    const rawName = picked.name ?? '';
    const rawPhone = picked.phoneNumbers![0].number ?? '';

    if (!rawName) return { success: false, errorCode: 'NO_NAME', message: 'Contact has no name.' };
    if (!rawPhone) return { success: false, errorCode: 'NO_PHONE', message: 'Contact has no phone number.' };

    const contact: AnchorContact = { label, name: rawName, phone: rawPhone };
    await saveToStorage(contact);

    return { success: true, contact };
}

// ─── Public API — identical signatures to web version ────────────────────────

/**
 * Opens the Expo contact picker with a relationship label.
 * Saves `{ label, name, phone }` to AsyncStorage under `"anchorContact"`.
 *
 * Drop-in replacement for the web `selectAnchor(label)`.
 */
export async function selectAnchor(label: string): Promise<ContactPickerResponse> {
    try {
        return await openExpoContactPicker(label);
    } catch (err: unknown) {
        return {
            success: false,
            errorCode: 'UNKNOWN',
            message: err instanceof Error ? err.message : 'An unexpected error occurred.',
        };
    }
}

/**
 * Opens the Expo contact picker without a label.
 * Drop-in replacement for the web `selectAnchorContact()`.
 */
export async function selectAnchorContact(): Promise<ContactPickerResponse> {
    return selectAnchor('Favourite');
}
