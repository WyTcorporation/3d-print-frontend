const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function api<T=any>(path: string, init: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem("token");
    const headers: Record<string,string> = { "Content-Type": "application/json", ...(init.headers as any || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { ...init, headers });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : await res.text();
    if (!res.ok) {
        const reqId = res.headers.get("X-Request-ID") || undefined;
        const msg = (data && (data.message || data.detail)) || res.statusText;
        const e: any = new Error(msg);
        if (reqId) e.requestId = reqId;
        throw e;
    }
    return data as T;
}
