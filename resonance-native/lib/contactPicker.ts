/**
 * lib/contactPicker.ts — Expo React Native implementation
 * Drop-in replacement for the web navigator.contacts version.
 * Identical export shape — all call-sites unchanged.
 *
 * NOTE: loadAnchorContact() is now async (returns Promise).
 * Update call-sites: const s = await loadAnchorContact();
 */
import * as ExpoContacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// ─── Storage (AsyncStorage replaces localStorage) ────────────────────────────

async function saveToStorage(contact: AnchorContact): Promise<void> {
    try {
        await AsyncStorage.setItem(ANCHOR_CONTACT_KEY, JSON.stringify(contact));
    } catch {
        console.warn('[contactPicker] Could not persist contact.');
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
        console.warn('[contactPicker] Could not clear anchor contact.');
    }
}

// ─── Core picker logic ────────────────────────────────────────────────────────

async function openExpoContactPicker(label: string): Promise<ContactPickerResponse> {
    const { status } = await ExpoContacts.requestPermissionsAsync();

    if (status !== ExpoContacts.PermissionStatus.GRANTED) {
        return {
            success: false,
            errorCode: 'UNSUPPORTED',
            message: 'Contacts permission denied. Enable it in Settings → Privacy → Contacts.',
        };
    }

    const { data } = await ExpoContacts.getContactsAsync({
        fields: [ExpoContacts.Fields.Name, ExpoContacts.Fields.PhoneNumbers],
    });

    const valid = (data ?? []).filter(
        (c) => c.name && c.phoneNumbers && c.phoneNumbers.length > 0,
    );

    if (valid.length === 0) {
        return {
            success: false,
            errorCode: 'NO_PHONE',
            message: 'No contacts with phone numbers found on this device.',
        };
    }

    // Return first valid contact — UI layer (AnchorSelector) can show
    // a list for the user to pick from before calling this function.
    const picked = valid[0];
    const rawName = picked.name ?? '';
    const rawPhone = picked.phoneNumbers![0].number ?? '';

    if (!rawName) return { success: false, errorCode: 'NO_NAME', message: 'Contact has no name.' };
    if (!rawPhone) return { success: false, errorCode: 'NO_PHONE', message: 'Contact has no phone.' };

    const contact: AnchorContact = { label, name: rawName, phone: rawPhone };
    await saveToStorage(contact);

    return { success: true, contact };
}

// ─── Public exports (same signatures as web version) ─────────────────────────

export async function selectAnchor(label: string): Promise<ContactPickerResponse> {
    try {
        return await openExpoContactPicker(label);
    } catch (err: unknown) {
        return {
            success: false,
            errorCode: 'UNKNOWN',
            message: err instanceof Error ? err.message : 'Unexpected error.',
        };
    }
}

export async function selectAnchorContact(): Promise<ContactPickerResponse> {
    return selectAnchor('Favourite');
}
