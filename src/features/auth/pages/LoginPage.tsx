import Page from "@/app/layout/Page";
import { API } from "@/shared/api/endpoints";
import { api } from "@/shared/api/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { LoginReq, LoginRes } from "@/shared/api/types";

export default function LoginPage() {
    const nav = useNavigate();
    const [email, setEmail] = useState("admin@example.com");
    const [password, setPassword] = useState("admin");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null); setLoading(true);
        try {
            const body: LoginReq = { email, password };
            const res = await api<LoginRes>(API.auth.login, {
                method: "POST",
                body: JSON.stringify(body),
            });
            localStorage.setItem("token", res.access_token);
            nav("/upload"); // після логіна одразу на Upload
        } catch (e: any) {
            setErr(e?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Page title="Login">
            <form onSubmit={submit} className="grid gap-3 max-w-sm">
                <label className="grid gap-1">
                    <span className="text-sm">Email</span>
                    <input
                        type="email"
                        className="rounded-md border px-3 py-2"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        autoComplete="username"
                    />
                </label>
                <label className="grid gap-1">
                    <span className="text-sm">Password</span>
                    <input
                        type="password"
                        className="rounded-md border px-3 py-2"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </label>

                {err && <div className="text-sm text-red-700">{err}</div>}

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-50"
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>

            <div className="mt-4 text-sm text-neutral-600">
                Demo: <code>admin@example.com / admin</code> або <code>user@example.com / user</code>
            </div>
        </Page>
    );
}
