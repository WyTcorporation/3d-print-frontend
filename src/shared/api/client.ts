export const API_BASE =
    import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function api<T = any>(
    path: string,
    init: RequestInit = {},
    opts: { retries?: number } = {},
): Promise<T> {
    const { retries = 1 } = opts;

    const token = localStorage.getItem("token");
    const sess  = localStorage.getItem("cart_session"); // опційно, для Cart

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept-Language": navigator.language || "uk",
        ...(init.headers as any || {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (sess)  headers["x_session_id"] = sess;

    const url = `${API_BASE}${path}`;
    let lastErr: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, { ...init, headers });
            const ct = res.headers.get("content-type") || "";
            const data = ct.includes("application/json") ? await res.json() : await res.text();

            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.removeItem("token");
                    // м'який редірект на логін з поверненням
                    if (location.pathname !== "/login") {
                        const back = encodeURIComponent(location.pathname + location.search);
                        location.href = `/login?redirectTo=${back}`;
                    }
                }
                const err: any = new Error((data && (data.message || data.detail)) || res.statusText);
                err.status = res.status;
                err.requestId = res.headers.get("X-Request-ID") || undefined;
                throw err;
            }

            return data as T;
        } catch (e: any) {
            lastErr = e;
            // 1 простий ретрай для GET/нестабільних 5xx
            const isGet = !init.method || String(init.method).toUpperCase() === "GET";
            if (attempt < retries && isGet && (!e.status || e.status >= 500)) {
                await sleep(250 * (attempt + 1));
                continue;
            }
            throw e;
        }
    }

    throw lastErr;
}
