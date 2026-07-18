const SESSION_KEY = 'perkly_session_id';
const CONSENT_KEY = 'perkly-consent-v1';

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Get or create session ID synchronously.
 * Used in api.ts to attach X-Session-Id header to every request.
 */
export function getSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    if (!hasAnalyticsConsent()) return null;

    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
        id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : generateUUID();
        sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
}

export function hasAnalyticsConsent(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const consent = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null') as {
            version?: number;
            analytics?: boolean;
        } | null;
        return consent?.version === 1 && consent.analytics === true;
    } catch {
        return false;
    }
}
