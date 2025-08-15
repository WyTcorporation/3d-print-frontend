// src/features/workshop/pages/WorkshopPage.tsx
import Page from "@/app/layout/Page";
import { api } from "@/shared/api/client";
import { API } from "@/shared/api/endpoints";
import ProgressBar from "@/shared/ui/ProgressBar";
import Modal from "@/shared/ui/Modal";
import { useEffect, useMemo, useState } from "react";

/** ---------------- Types ---------------- */
type JobRow = {
    id: number;
    order_id?: number | null;
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
};

type JobAction = "start" | "pause" | "resume" | "cancel";

/** ---------------- Helpers ---------------- */
function toArray<T = any>(x: any): T[] {
    if (Array.isArray(x)) return x;
    if (x && Array.isArray(x.items)) return x.items;
    if (x && Array.isArray(x.data)) return x.data;
    return [];
}

export default function WorkshopPage() {
    const [raw, setRaw] = useState<JobRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState<Record<number, boolean>>({});

    // фільтри
    const [status, setStatus] = useState<string>("all");
    const [query, setQuery] = useState("");

    // пагінація
    const [page, setPage] = useState(1);
    const pageSize = 25;

    // ---- Preflight modal state ----
    const [preflightFor, setPreflightFor] = useState<JobRow | null>(null);
    const [preflight, setPreflight] = useState({
        bed_cleared: true,
        filament_ok: true,
        nozzle_ok: true,
    });

    const JOBS_LIST = (API.jobs as any).list ?? API.jobs.list;

    const load = async () => {
        try {
            setErr(null);
            setLoading(true);
            const res = await api<any>(JOBS_LIST);
            setRaw(toArray<JobRow>(res));
        } catch (e: any) {
            setErr(e?.message || "Не вдалося завантажити задачі");
            setRaw([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // застосовуємо фільтри
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return raw.filter((j) => {
            const statusOk = status === "all" ? true : j.status === status;
            if (!statusOk) return false;
            if (!q) return true;
            const txt = [`#${j.id}`, j.status, j.printer_id ?? "", j.order_id ?? ""]
                .join(" ")
                .toLowerCase();
            return txt.includes(q);
        });
    }, [raw, status, query]);

    // сторінка
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const pageRows = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, safePage]);

    const statuses: { value: string; label: string }[] = [
        { value: "all", label: "Усі" },
        { value: "awaiting_preflight", label: "awaiting_preflight" },
        { value: "ready", label: "ready" },
        { value: "queued", label: "queued" },
        { value: "printing", label: "printing" },
        { value: "paused", label: "paused" },
        { value: "needs_attention", label: "needs_attention" },
        { value: "done", label: "done" },
        { value: "canceled", label: "canceled" },
    ];

    /** -------- Actions (start/pause/resume/cancel) -------- */
    async function doAction(job: JobRow, action: JobAction) {
        if (busy[job.id]) return;
        if (action === "cancel" && !confirm(`Скасувати job #${job.id}?`)) return;

        setBusy((s) => ({ ...s, [job.id]: true }));
        try {
            const path =
                action === "start"
                    ? API.jobs.start(job.id)
                    : action === "pause"
                        ? API.jobs.pause(job.id)
                        : action === "resume"
                            ? API.jobs.resume(job.id)
                            : API.jobs.cancel(job.id);

            await api(path, { method: "POST" });
            await load();
        } catch (e: any) {
            alert(e?.message || "Не вдалося виконати дію");
        } finally {
            setBusy((s) => ({ ...s, [job.id]: false }));
        }
    }

    /** -------- Preflight flow -------- */
    function openPreflight(job: JobRow) {
        setPreflight({ bed_cleared: true, filament_ok: true, nozzle_ok: true });
        setPreflightFor(job);
    }

    async function submitPreflight() {
        const job = preflightFor;
        if (!job) return;
        setBusy((s) => ({ ...s, [job.id]: true }));
        try {
            await api(API.jobs.preflight(job.id), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(preflight),
            });
            setPreflightFor(null);
            await load();
        } catch (e: any) {
            alert(e?.message || "Не вдалося виконати preflight");
        } finally {
            setBusy((s) => ({ ...s, [job.id]: false }));
        }
    }

    function renderActions(j: JobRow) {
        const disabled = !!busy[j.id];

        switch (j.status) {
            case "awaiting_preflight":
                return (
                    <button
                        disabled={disabled}
                        onClick={() => openPreflight(j)}
                        className="rounded border px-2 py-1 text-xs"
                    >
                        Preflight
                    </button>
                );
            case "ready":
            case "queued":
                return (
                    <button
                        disabled={disabled}
                        onClick={() => doAction(j, "start")}
                        className="rounded border px-2 py-1 text-xs"
                    >
                        Start
                    </button>
                );
            case "printing":
                return (
                    <div className="flex gap-1">
                        <button
                            disabled={disabled}
                            onClick={() => doAction(j, "pause")}
                            className="rounded border px-2 py-1 text-xs"
                        >
                            Pause
                        </button>
                        <button
                            disabled={disabled}
                            onClick={() => doAction(j, "cancel")}
                            className="rounded border px-2 py-1 text-xs"
                        >
                            Cancel
                        </button>
                    </div>
                );
            case "paused":
            case "needs_attention":
                return (
                    <div className="flex gap-1">
                        <button
                            disabled={disabled}
                            onClick={() => doAction(j, "resume")}
                            className="rounded border px-2 py-1 text-xs"
                        >
                            Resume
                        </button>
                        <button
                            disabled={disabled}
                            onClick={() => doAction(j, "cancel")}
                            className="rounded border px-2 py-1 text-xs"
                        >
                            Cancel
                        </button>
                    </div>
                );
            default:
                return <span className="text-neutral-400 text-xs">—</span>;
        }
    }

    return (
        <Page title="Workshop (admin)">
            {err && (
                <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
                    {err}
                </div>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="text-sm">Статус</label>
                <select
                    value={status}
                    onChange={(e) => {
                        setStatus(e.target.value);
                        setPage(1);
                    }}
                    className="rounded border px-2 py-1"
                >
                    {statuses.map((s) => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>

                <input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Пошук: job/order/printer/status…"
                    className="ml-2 w-80 rounded border px-3 py-1"
                />

                <button
                    onClick={load}
                    className="ml-auto rounded bg-black px-3 py-1.5 text-white"
                    disabled={loading}
                >
                    Оновити
                </button>
            </div>

            <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-neutral-50">
                    <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                        <th>Job #</th>
                        <th>Order #</th>
                        <th>Статус</th>
                        <th>Принтер</th>
                        <th className="w-64">Прогрес</th>
                        <th>Оцінка, хв</th>
                        <th>Старт</th>
                        <th>Фініш</th>
                        <th>Дії</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={9} className="px-3 py-8 text-center text-neutral-600">
                                Завантаження…
                            </td>
                        </tr>
                    ) : pageRows.length === 0 ? (
                        <tr>
                            <td colSpan={9} className="px-3 py-8 text-center text-neutral-600">
                                Нічого не знайдено.
                            </td>
                        </tr>
                    ) : (
                        pageRows.map((j) => (
                            <tr key={j.id} className="border-t">
                                <td className="px-3 py-2">#{j.id}</td>
                                <td className="px-3 py-2">{j.order_id ?? "—"}</td>
                                <td className="px-3 py-2">{j.status}</td>
                                <td className="px-3 py-2">{j.printer_id ?? "—"}</td>
                                <td className="px-3 py-2">
                                    <div className="w-56">
                                        <ProgressBar value={j.progress ?? 0} />
                                    </div>
                                </td>
                                <td className="px-3 py-2">{j.est_time_min ?? "—"}</td>
                                <td className="px-3 py-2">
                                    {j.started_at ? new Date(j.started_at).toLocaleString() : "—"}
                                </td>
                                <td className="px-3 py-2">
                                    {j.finished_at ? new Date(j.finished_at).toLocaleString() : "—"}
                                </td>
                                <td className="px-3 py-2">{renderActions(j)}</td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {/* пагінація */}
            <div className="mt-3 flex items-center gap-2">
                <button
                    className="rounded border px-2 py-1 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                >
                    Попередня
                </button>
                <div className="text-sm">
                    Сторінка {safePage} з {totalPages} (всього {filtered.length})
                </div>
                <button
                    className="rounded border px-2 py-1 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                >
                    Наступна
                </button>
            </div>

            {/* -------- Preflight modal -------- */}
            <Modal
                open={!!preflightFor}
                onClose={() => setPreflightFor(null)}
                title={`Preflight для job #${preflightFor?.id ?? ""}`}
                footer={
                    <>
                        <button
                            onClick={() => setPreflightFor(null)}
                            className="px-3 py-1.5 rounded border"
                        >
                            Скасувати
                        </button>
                        <button
                            onClick={submitPreflight}
                            className="px-3 py-1.5 rounded bg-black text-white"
                        >
                            Підтвердити
                        </button>
                    </>
                }
            >
                <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={preflight.bed_cleared}
                            onChange={(e) =>
                                setPreflight((s) => ({ ...s, bed_cleared: e.target.checked }))
                            }
                        />
                        Робочий стіл очищено
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={preflight.filament_ok}
                            onChange={(e) =>
                                setPreflight((s) => ({ ...s, filament_ok: e.target.checked }))
                            }
                        />
                        Філамент заправлено / достатньо
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={preflight.nozzle_ok}
                            onChange={(e) =>
                                setPreflight((s) => ({ ...s, nozzle_ok: e.target.checked }))
                            }
                        />
                        Сопло чисте / готове
                    </label>
                </div>
            </Modal>
        </Page>
    );
}
