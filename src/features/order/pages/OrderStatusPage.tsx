import Page from "@/app/layout/Page";
import { api } from "@/shared/api/client";
import { API } from "@/shared/api/endpoints";
import Modal from "@/shared/ui/Modal";
import { useModal } from "@/shared/ui/useModal";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AuthImage from "@/shared/ui/AuthImage";

type OrderDTO = {
    id: number;
    status: "pending_payment" | "paid" | "fulfilled" | string;
    total_eur: string;
    created_at: string;
};

type JobDTO = {
    id: number;
    status:
        | "awaiting_preflight"
        | "ready"
        | "queued"
        | "printing"
        | "paused"
        | "needs_attention"
        | "done"
        | "canceled"
        | string;
    printer_id: number | null;
    progress: number;
    est_time_min: number;
    started_at?: string | null;
    finished_at?: string | null;
    model: { id: number; preview_url?: string | null }; // preview_url можна ігнорити
};

// Локальний SVG-плейсхолдер (без мережевих запитів)
function PlaceholderBox({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" className={className}>
            <rect x="1" y="1" width="62" height="62" rx="8" fill="#f3f4f6" stroke="#e5e7eb" />
            <path d="M10 44l12-14 10 12 8-8 14 16H10z" fill="#e5e7eb" />
            <circle cx="24" cy="22" r="5" fill="#e5e7eb" />
        </svg>
    );
}

export default function OrderStatusPage() {
    const { id } = useParams();
    const orderId = Number(id || 0);

    const [order, setOrder] = useState<OrderDTO | null>(null);
    const [jobs, setJobs] = useState<JobDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // anti-flicker/anti-spam: кеш останньої відповіді та «активності»
    const snapshot = useRef<string>("");
    const activeRef = useRef<boolean>(false);

    // перегляд у повний розмір
    const viewer = useModal(false);
    const [activeModelId, setActiveModelId] = useState<number | null>(null);

    const fmtTime = (s?: string | null) => (s ? new Date(s).toLocaleTimeString() : "—");

    const load = async () => {
        try {
            setErr(null);
            const [o, j] = await Promise.all([
                api<OrderDTO>(API.orders.get(orderId)),
                api<JobDTO[]>(API.orders.jobs(orderId)),
            ]);

            // оновлюємо стан лише якщо є реальні зміни
            const next = JSON.stringify({ o, j });
            if (next !== snapshot.current) {
                setOrder(o);
                setJobs(j.slice().sort((a, b) => a.id - b.id));
                snapshot.current = next;
            }

            // чи ще є активні задачі
            activeRef.current = j.some((x) =>
                ["ready", "printing", "paused", "awaiting_preflight", "queued", "needs_attention"].includes(x.status)
            );
        } catch (e: any) {
            setErr(e?.message || "Не вдалося завантажити замовлення");
        } finally {
            setLoading(false);
        }
    };

    // один цикл оновлення без залежностей від isActive
    useEffect(() => {
        if (!orderId) return;

        let stopped = false;
        let timer: any;

        const loop = async () => {
            if (stopped) return;
            if (document.visibilityState === "visible") {
                await load();
            }
            // 4с коли є активні задачі, 10с — коли все спокійно
            const interval = activeRef.current ? 4000 : 10000;
            timer = setTimeout(loop, interval);
        };

        setLoading(true);
        loop();

        return () => {
            stopped = true;
            clearTimeout(timer);
        };
    }, [orderId]);

    if (!orderId) {
        return (
            <Page title="Замовлення">
                <div>Невірний ідентифікатор.</div>
            </Page>
        );
    }
    if (loading) {
        return (
            <Page title={`Замовлення №${orderId}`}>
                <div>Завантаження…</div>
            </Page>
        );
    }
    if (err) {
        return (
            <Page title={`Замовлення №${orderId}`}>
                <div className="text-red-700">{err}</div>
            </Page>
        );
    }
    if (!order) {
        return (
            <Page title={`Замовлення №${orderId}`}>
                <div>Не знайдено.</div>
            </Page>
        );
    }

    const badge =
        order.status === "paid"
            ? "bg-blue-100 text-blue-800"
            : order.status === "fulfilled"
                ? "bg-green-100 text-green-800"
                : order.status === "pending_payment"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-neutral-100 text-neutral-800";

    return (
        <Page title={`Замовлення №${order.id}`}>
            <div className="mb-4 rounded-lg border bg-neutral-50 p-4 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${badge}`}>{order.status}</span>
                        <div className="text-lg font-medium">
                            {Number(order.total_eur).toLocaleString("uk-UA")} €
                        </div>
                    </div>
                    <div className="text-sm text-neutral-600 mt-1">
                        Створено: {new Date(order.created_at).toLocaleString()}
                    </div>
                </div>
                <Link to="/orders" className="text-sm underline">
                    ← до списку
                </Link>
            </div>

            <div className="rounded-lg border overflow-hidden">
                <div className="px-4 py-2 border-b font-medium bg-neutral-50">Друкарські задачі</div>
                <table className="w-full text-sm">
                    <thead className="bg-neutral-50">
                    <tr className="[&>th]:px-4 [&>th]:py-2 text-left">
                        <th>Job #</th>
                        <th>Прев’ю</th>
                        <th>Статус</th>
                        <th>Принтер</th>
                        <th>Прогрес</th>
                        <th>Оцінка, хв</th>
                        <th>Старт</th>
                        <th>Фініш</th>
                    </tr>
                    </thead>
                    <tbody>
                    {jobs.map((j) => {
                        const previewPath = API.files.preview(j.model.id);
                        return (
                            <tr key={j.id} className="border-t">
                                <td className="px-4 py-2">#{j.id}</td>
                                <td className="px-4 py-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveModelId(j.model.id);
                                            viewer.show();
                                        }}
                                        className="h-14 w-14 border rounded overflow-hidden bg-white cursor-zoom-in"
                                        title="Відкрити у повний розмір"
                                    >
                                        <AuthImage
                                            path={previewPath}
                                            alt={`Model ${j.model.id}`}
                                            className="h-full w-full object-contain"
                                        />
                                    </button>
                                </td>
                                <td className="px-4 py-2">{j.status}</td>
                                <td className="px-4 py-2">{j.printer_id ?? "—"}</td>
                                <td className="px-4 py-2">
                                    <div className="w-40 h-2 rounded bg-neutral-200">
                                        <div className="h-2 rounded bg-neutral-800" style={{ width: `${j.progress ?? 0}%` }} />
                                    </div>
                                    <div className="text-xs text-neutral-500 mt-1">{j.progress ?? 0}%</div>
                                </td>
                                <td className="px-4 py-2">{j.est_time_min ?? "—"}</td>
                                <td className="px-4 py-2">{fmtTime(j.started_at)}</td>
                                <td className="px-4 py-2">{fmtTime(j.finished_at)}</td>
                            </tr>
                        );
                    })}
                    {!jobs.length && (
                        <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                                Немає задач
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* Модалка повнорозмірного прев’ю */}
            <Modal
                open={viewer.open}
                onClose={viewer.hide}
                title={activeModelId ? `Модель #${activeModelId}` : "Прев’ю"}
                footer={<button onClick={viewer.hide} className="px-3 py-1.5 rounded bg-black text-white">Закрити</button>}
            >
                <div className="flex items-center justify-center">
                    {activeModelId ? (
                        <AuthImage
                            path={API.files.preview(activeModelId)}
                            alt={`Model ${activeModelId}`}
                            className="max-h-[80vh] max-w-[90vw] object-contain"
                        />
                    ) : (
                        <PlaceholderBox className="h-[60vh] w-[70vw]" />
                    )}
                </div>
            </Modal>
        </Page>
    );
}
