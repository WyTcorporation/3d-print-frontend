function b64urlToUtf8(b64: string) {
    try {
        const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
        return decodeURIComponent(escape(s));
    } catch { return "{}"; }
}

export function getUserRole(): string | null {
    const t = localStorage.getItem("token");
    if (!t) return null;
    const parts = t.split(".");
    if (parts.length < 2) return null;
    try {
        const payload = JSON.parse(b64urlToUtf8(parts[1]));
        return payload.role ?? null;
    } catch { return null; }
}

export const isAdmin = () => getUserRole() === "admin";
