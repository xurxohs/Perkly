const SESSION_KEY = 'perkly_session_id';

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
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
        id = generateUUID();
        localStorage.setItem(SESSION_KEY, id);
    }
    return id;
}
