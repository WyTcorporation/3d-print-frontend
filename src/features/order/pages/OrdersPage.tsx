import Page from "@/app/layout/Page";
import { api } from "@/shared/api/client";
import { API } from "@/shared/api/endpoints";
import ProgressBar from "@/shared/ui/ProgressBar";
import { useEffect,  useState } from "react";
import { Link } from "react-router-dom";

type OrderRow = {
    id: number;
    status: string;
    total_eur: string;
    created_at: string;
    jobs_total: number;
    jobs_done: number;
};

type PrintJob = {
    id: number;
    status: string;
    printer_id: number | null;
    progress: number;
    est_time_min: number;
    started_at: string | null;
    finished_at: string | null;
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<number, { loading: boolean; jobs: PrintJob[] | null }>>({});
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const list = await api<OrderRow[]>(API.orders.list);
                setOrders(list);
            } catch (e: any) {
                setErr(e?.message || "Не вдалося завантажити замовлення");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const toggle = async (oid: number) => {
        const isOpen = !!expanded[oid]?.jobs; // чи вже розкрито

        // 1) якщо відкрито — просто згортаємо і ВИХОДИМО
        if (isOpen) {
            setExpanded(prev => {
                const copy = { ...prev };
                delete copy[oid];            // прибрати ключ = згорнути
                return copy;
            });
            return;                        // ← важливо: не фетчимо
        }

        // 2) якщо закрито — показуємо "loading" і фетчимо джоби
        setExpanded(prev => ({ ...prev, [oid]: { loading: true, jobs: null } }));
        try {
            const jobs = await api<PrintJob[]>(API.orders.jobs(oid));
            setExpanded(prev => ({ ...prev, [oid]: { loading: false, jobs } }));
        } catch (e: any) {
            setExpanded(prev => ({ ...prev, [oid]: { loading: false, jobs: [] } }));
            setErr(e?.message || "Не вдалося завантажити задачі друку");
        }
    };

    return (
        <Page title="Мої замовлення">
            {err && <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

            {loading ? (
                <div className="text-sm text-neutral-600">Завантаження…</div>
            ) : orders.length === 0 ? (
                <div className="text-sm text-neutral-600">Замовлень ще немає. Перейди до <Link className="underline" to="/upload">Upload</Link>.</div>
            ) : (
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 text-neutral-600">
                        <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Статус</th>
                            <th className="px-3 py-2 text-right">Сума, €</th>
                            <th className="px-3 py-2 text-left">Створено</th>
                            <th className="px-3 py-2 text-left">Джоби</th>
                            <th className="px-3 py-2"></th>
                        </tr>
                        </thead>
                        <tbody>
                        {orders.map(o => {
                            const ex = expanded[o.id];
                            const open = !!ex?.jobs;
                            return (
                                <Fragment key={o.id}>
                                    <tr className="border-t">
                                        <td className="px-3 py-2">#{o.id}</td>
                                        <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                          {o.status}
                        </span>
                                        </td>
                                        <td className="px-3 py-2 text-right">{o.total_eur}</td>
                                        <td className="px-3 py-2">{new Date(o.created_at).toLocaleString()}</td>
                                        <td className="px-3 py-2">
                                            {o.jobs_done}/{o.jobs_total}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button
                                                onClick={() => toggle(o.id)}
                                                className="text-sm underline inline-flex items-center gap-1"
                                                disabled={ex?.loading}
                                            >
                                                <span className={`transition ${open ? "rotate-90" : ""}`}>▶</span>
                                                {open ? "Згорнути" : ex?.loading ? "Завантаження…" : "Показати задачі"}
                                            </button>
                                            <Link to={`/orders/${o.id}`} className="ml-3 text-sm underline">Деталі</Link>
                                        </td>
                                    </tr>

                                    {open && (
                                        <tr className="border-t bg-neutral-50/50">
                                            <td colSpan={6} className="px-3 py-3">
                                                {ex?.jobs && ex.jobs.length === 0 ? (
                                                    <div className="text-sm text-neutral-600">Для цього замовлення задач поки немає.</div>
                                                ) : (
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                        <tr className="text-neutral-600">
                                                            <th className="text-left py-1">Job #</th>
                                                            <th className="text-left py-1">Статус</th>
                                                            <th className="text-left py-1">Принтер</th>
                                                            <th className="text-left py-1">Прогрес</th>
                                                            <th className="text-left py-1">Оцінка, хв</th>
                                                            <th className="text-left py-1">Старт</th>
                                                            <th className="text-left py-1">Фініш</th>
                                                        </tr>
                                                        </thead>
                                                        <tbody>
                                                        {ex?.jobs?.map(j => (
                                                            <tr key={j.id} className="border-t">
                                                                <td className="py-1">#{j.id}</td>
                                                                <td className="py-1">{j.status}</td>
                                                                <td className="py-1">{j.printer_id ?? "—"}</td>
                                                                <td className="py-1">
                                                                    <div className="w-56"><ProgressBar value={j.progress ?? 0} /></div>
                                                                </td>
                                                                <td className="py-1">{j.est_time_min ?? "—"}</td>
                                                                <td className="py-1">{j.started_at ? new Date(j.started_at).toLocaleString() : "—"}</td>
                                                                <td className="py-1">{j.finished_at ? new Date(j.finished_at).toLocaleString() : "—"}</td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </Page>
    );
}

import { Fragment } from "react";
