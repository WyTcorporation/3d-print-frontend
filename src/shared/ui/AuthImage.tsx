import { useEffect, useState } from "react";
import { API_BASE } from "@/shared/api/client.ts";

/**
 * Картинка з авторизацією: тягне blob через fetch із Bearer токеном,
 * віддає тимчасовий object URL. Якщо впало — показує простий placeholder.
 * Опціонально можна відкласти завантаження через prop `load`.
 */
export default function AuthImage({
                                      path,         // бековий шлях, напр. /v1/files/preview/11.png
                                      alt,
                                      className = "",
                                      load = true,  // якщо false — не фетчимо, поки не стане true
                                  }: {
    path: string | null;
    alt: string;
    className?: string;
    load?: boolean;
}) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let canceled = false;
        let revoke: string | null = null;

        async function run() {
            if (!load || !path) {
                setSrc(null);
                return;
            }
            try {
                const token = localStorage.getItem("token") || "";
                const res = await fetch(`${API_BASE}${path}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                revoke = url;
                if (!canceled) setSrc(url);
            } catch {
                if (!canceled) setSrc(null);
            }
        }

        run();
        return () => {
            canceled = true;
            if (revoke) URL.revokeObjectURL(revoke);
        };
    }, [path, load]);

    if (!src) {
        // легкий SVG-плейсхолдер, щоб не стукатись мережею
        return (
            <svg viewBox="0 0 64 64" className={className}>
                <rect x="1" y="1" width="62" height="62" rx="8" fill="#f3f4f6" stroke="#e5e7eb" />
                <path d="M10 44l12-14 10 12 8-8 14 16H10z" fill="#e5e7eb" />
                <circle cx="24" cy="22" r="5" fill="#e5e7eb" />
            </svg>
        );
    }
    return <img src={src} alt={alt} className={className} loading="lazy" />;
}
