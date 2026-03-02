/**
 * @file contactPicker.ts
 * @description Reusable contact picker utility using the Web Contact Picker API.
 *
 * FUTURE-PROOF DESIGN:
 * -------------------------------------------------------------------
 * This module exports a single async function `selectAnchorContact()`.
 * When migrating to React Native / Expo, replace ONLY this file's
 * implementation with `expo-contacts` — all call-sites in the UI
 * remain unchanged.
 *
 * Web (current) example usage:
 *   import { selectAnchorContact } from '@/lib/contactPicker';
 *
 * Expo replacement (keep same export shape):
 *   import * as ExpoContacts from 'expo-contacts';
 *   export async function selectAnchorContact(): Promise<ContactPickerResponse> { ... }
 * -------------------------------------------------------------------
 *
 * Browser support: Chrome for Android 80+ (requires HTTPS or localhost).
 * MDN: https://developer.mozilla.org/en-US/docs/Web/API/Contact_Picker_API
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * The stored anchor contact shape (used throughout the app).
 * `label` is optional for backward compatibility with data
 * saved before the labelled selectAnchor() function was added.
 */
export interface AnchorContact {
    /** Human-readable relationship label, e.g. "Mom", "Dad", "Favourite" */
    label?: string;
    name: string;
    phone: string;
}

/** Discriminated error codes for fine-grained error handling. */
export type ContactPickerErrorCode =
    | 'UNSUPPORTED'       // Browser / OS does not support Contact Picker API
    | 'INSECURE_CONTEXT'  // Page not served over HTTPS / localhost
    | 'USER_CANCELLED'    // User dismissed the picker without choosing
    | 'NO_PHONE'          // Selected contact has no phone number on file
    | 'NO_NAME'           // Selected contact has no name on file
    | 'UNKNOWN';          // Unexpected error

/** A successful picker result. */
export interface ContactPickerSuccess {
    success: true;
    contact: AnchorContact;
}

/** A failed picker result. */
export interface ContactPickerError {
    success: false;
    errorCode: ContactPickerErrorCode;
    message: string;
}

/** Union type returned by `selectAnchorContact`. */
export type ContactPickerResponse = ContactPickerSuccess | ContactPickerError;

/** localStorage key used to persist the anchor contact. */
export const ANCHOR_CONTACT_KEY = 'anchorContact';

// ─── Minimal Web Contact Picker API types (not yet in lib.dom.d.ts) ──────────

interface ContactInfo {
    name?: string[];
    tel?: string[];
    email?: string[];
}

interface ContactsManagerSelectOptions {
    multiple?: boolean;
}

interface ContactsManager {
    select(
        properties: string[],
        options?: ContactsManagerSelectOptions,
    ): Promise<ContactInfo[]>;
    getProperties(): Promise<string[]>;
}

declare global {
    interface Navigator {
        contacts?: ContactsManager;
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Persist the contact to localStorage. */
function saveToStorage(contact: AnchorContact): void {
    try {
        localStorage.setItem(ANCHOR_CONTACT_KEY, JSON.stringify(contact));
    } catch {
        // Storage may be unavailable in private browsing — non-fatal
        console.warn('[contactPicker] Could not persist contact to localStorage.');
    }
}

/** Load the previously saved anchor contact from localStorage. */
export function loadAnchorContact(): AnchorContact | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(ANCHOR_CONTACT_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AnchorContact;
    } catch {
        return null;
    }
}

/** Remove the saved anchor contact from localStorage. */
export function clearAnchorContact(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(ANCHOR_CONTACT_KEY);
    }
}

// ─── Core API ────────────────────────────────────────────────────────────────

/**
 * Opens the native OS contact picker and lets the user select one contact.
 * Saves the result to localStorage under the key `"anchorContact"`.
 *
 * @returns A `ContactPickerResponse` — either a success with `{ name, phone }`,
 *          or a typed error you can switch on with `.errorCode`.
 *
 * @example
 * ```ts
 * const result = await selectAnchorContact();
 * if (result.success) {
 *   console.log(result.contact.name, result.contact.phone);
 * } else {
 *   console.error(result.errorCode, result.message);
 * }
 * ```
 *
 * @remarks
 * - Returns `UNSUPPORTED` if called during SSR (no `window`) or in an
 *   unsupported browser.
 * - Returns `INSECURE_CONTEXT` if not on HTTPS / localhost.
 * - Returns `USER_CANCELLED` if the user dismisses the picker.
 * - Returns `NO_PHONE` if the selected contact has no phone number.
 */
export async function selectAnchorContact(): Promise<ContactPickerResponse> {
    // ── Guard: SSR / non-browser environment ─────────────────────────────────
    if (typeof window === 'undefined') {
        return {
            success: false,
            errorCode: 'UNSUPPORTED',
            message: 'Contact Picker is not available in a server-side environment.',
        };
    }

    // ── Guard: Secure context (Contact Picker requires HTTPS) ─────────────────
    if (!window.isSecureContext) {
        return {
            success: false,
            errorCode: 'INSECURE_CONTEXT',
            message:
                'Contact Picker requires a secure context (HTTPS or localhost). Please serve your app over HTTPS.',
        };
    }

    // ── Guard: API availability ───────────────────────────────────────────────
    if (!('contacts' in navigator) || !navigator.contacts) {
        return {
            success: false,
            errorCode: 'UNSUPPORTED',
            message:
                'Your browser does not support the Contact Picker API. Use Chrome on Android 80+ or a compatible browser.',
        };
    }

    // ── Open the picker ───────────────────────────────────────────────────────
    try {
        const props = ['name', 'tel'] as const;
        const opts: ContactsManagerSelectOptions = { multiple: false };

        const contacts = await navigator.contacts.select([...props], opts);

        // User cancelled (empty array returned)
        if (!contacts || contacts.length === 0) {
            return {
                success: false,
                errorCode: 'USER_CANCELLED',
                message: 'No contact was selected.',
            };
        }

        const raw = contacts[0];

        // ── Validate name ─────────────────────────────────────────────────────
        const rawName = raw.name?.[0]?.trim() ?? '';
        if (!rawName) {
            return {
                success: false,
                errorCode: 'NO_NAME',
                message: 'The selected contact does not have a name.',
            };
        }

        // ── Validate phone ────────────────────────────────────────────────────
        const rawPhone = raw.tel?.[0]?.trim() ?? '';
        if (!rawPhone) {
            return {
                success: false,
                errorCode: 'NO_PHONE',
                message: 'The selected contact does not have a phone number.',
            };
        }

        const contact: AnchorContact = {
            name: rawName,
            phone: rawPhone,
        };

        // Persist to localStorage
        saveToStorage(contact);

        return { success: true, contact };
    } catch (err: unknown) {
        // DOMException thrown when user cancels on some browsers
        if (err instanceof DOMException && err.name === 'AbortError') {
            return {
                success: false,
                errorCode: 'USER_CANCELLED',
                message: 'Contact selection was cancelled.',
            };
        }

        return {
            success: false,
            errorCode: 'UNKNOWN',
            message:
                err instanceof Error ? err.message : 'An unexpected error occurred.',
        };
    }
}

// ─── Labelled Anchor Selector ─────────────────────────────────────────────────

/**
 * Opens the native contact picker with a relationship label (e.g. "Mom", "Dad").
 * Saves `{ label, name, phone }` to localStorage under `"anchorContact"`.
 *
 * This is the primary entry point for the anchor selection UI.
 * `selectAnchorContact()` (no label) remains for backward compatibility.
 *
 * FUTURE-PROOF: To migrate to Expo Contacts, replace ONLY this function's
 * body with the expo-contacts equivalent — the UI never changes.
 *
 * @param label - Human-readable relationship label shown in the UI.
 *
 * @example
 * ```ts
 * const result = await selectAnchor('Mom');
 * if (result.success) {
 *   console.log(result.contact.label, result.contact.name);
 * }
 * ```
 */
export async function selectAnchor(label: string): Promise<ContactPickerResponse> {
    // ── Guard: SSR ────────────────────────────────────────────────────────────
    if (typeof window === 'undefined') {
        return {
            success: false,
            errorCode: 'UNSUPPORTED',
            message: 'Contact Picker is not available in a server-side environment.',
        };
    }

    // ── Guard: Secure context ─────────────────────────────────────────────────
    if (!window.isSecureContext) {
        return {
            success: false,
            errorCode: 'INSECURE_CONTEXT',
            message:
                'Contact Picker requires a secure context (HTTPS or localhost).',
        };
    }

    // ── Guard: API availability ───────────────────────────────────────────────
    if (!('contacts' in navigator) || !navigator.contacts) {
        return {
            success: false,
            errorCode: 'UNSUPPORTED',
            message:
                'Contact picker is supported on mobile Chrome only. Open on your Android device.',
        };
    }

    // ── Open picker ───────────────────────────────────────────────────────────
    try {
        const contacts = await navigator.contacts.select(['name', 'tel'], {
            multiple: false,
        });

        if (!contacts || contacts.length === 0) {
            return {
                success: false,
                errorCode: 'USER_CANCELLED',
                message: 'No contact was selected.',
            };
        }

        const raw = contacts[0];

        const rawName = raw.name?.[0]?.trim() ?? '';
        if (!rawName) {
            return {
                success: false,
                errorCode: 'NO_NAME',
                message: 'The selected contact does not have a name.',
            };
        }

        const rawPhone = raw.tel?.[0]?.trim() ?? '';
        if (!rawPhone) {
            return {
                success: false,
                errorCode: 'NO_PHONE',
                message: 'The selected contact does not have a phone number.',
            };
        }

        const contact: AnchorContact = { label, name: rawName, phone: rawPhone };

        // Persist { label, name, phone } to localStorage
        saveToStorage(contact);

        return { success: true, contact };
    } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            return {
                success: false,
                errorCode: 'USER_CANCELLED',
                message: 'Contact selection was cancelled.',
            };
        }

        return {
            success: false,
            errorCode: 'UNKNOWN',
            message:
                err instanceof Error ? err.message : 'An unexpected error occurred.',
        };
    }
}
