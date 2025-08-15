import Page from "@/app/layout/Page";
import { api } from "@/shared/api/client";
import { API } from "@/shared/api/endpoints";
import Modal from "@/shared/ui/Modal";
import { useModal } from "@/shared/ui/useModal";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/shared/i18n/LocaleContext";

type Material = {
    id: number;
    name?: string;
    color?: string;
    // будь-що інше, що бек повертає — ігноруємо
};

type QuoteResp = {
    id: number;
    price_eur: string;
    settings: any;
    breakdown: {
        qty: number;
        unit_price_eur: number;
        total_eur: number;
        est_time_min: number;
        est_filament_g: number;
        costs: Record<string, number>;
    };
};

const INFILL_PRESETS = [
    "15% grid",
    "20% gyroid",
    "25% cubic",
    "30% cubic",
    "40% gyroid",
];

export default function QuotePage() {
    const nav = useNavigate();
    const [sp] = useSearchParams();
    const modelId = Number(sp.get("model") || "0");
    const { locale } = useLocale();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loadingMats, setLoadingMats] = useState(true);
    const [labels, setLabels] = useState<Record<string,string>>({});
    const [form, setForm] = useState({
        material_id: 0,
        layer_height: 0.2,
        infill: "20% gyroid",
        qty: 1,
    });

    const [busy, setBusy] = useState(false);
    const [quote, setQuote] = useState<QuoteResp | null>(null);
    const [error, setError] = useState<string | null>(null);

    const added = useModal(false);   // модалка «додано в кошик»
    const failed = useModal(false);  // модалка помилки

    // 1) тягнемо матеріали
    useEffect(() => {
        (async () => {
            try {
                setLoadingMats(true);
                const url = API.catalog.materials(locale);
                const mats = await api<Material[]>(url);

                // 3) акуратне сортування: спершу по name (PLA/PETG…), далі по color
                const sorted = (mats || []).slice().sort((a, b) =>
                    (a.name || "").localeCompare(b.name || "", locale) ||
                    (a.color || "").localeCompare(b.color || "", locale)
                );

                setMaterials(sorted);

                // 4) якщо ще не обрано — підставимо перший
                if (sorted.length && !form.material_id) {
                    setForm((f) => ({ ...f, material_id: sorted[0].id }));
                }
            } catch (e: any) {
                setError(e?.message || "Не вдалося завантажити матеріали");
                failed.show();
            } finally {
                setLoadingMats(false);
            }
        })();
    }, [locale]);

    const onChange = (k: keyof typeof form, v: any) => {
        setForm(s => ({ ...s, [k]: v }));
    };

    // 2) порахувати Quote
    const makeQuote = async () => {
        if (!modelId) {
            setError("Нема ідентифікатора моделі. Перейди з Upload або вкажи ?model=ID.");
            failed.show();
            return;
        }
        setBusy(true); setError(null); setQuote(null);
        try {
            const payload = {
                model_id: modelId,
                material_id: Number(form.material_id),
                layer_height: Number(form.layer_height),
                infill: form.infill,
                qty: Number(form.qty),
            };
            const res = await api<QuoteResp & { breakdown_labels?: Record<string,string> }>(
                API.quotes + `?locale=${encodeURIComponent(locale)}`,
                { method: "POST", body: JSON.stringify(payload) }
            );
            setQuote(res);
            setLabels(res.breakdown_labels || {});
        } catch (e: any) {
            setError(e?.message || "Помилка розрахунку ціни");
            failed.show();
        } finally {
            setBusy(false);
        }
    };


    // 3) додати в кошик
    const addToCart = async () => {
        if (!quote?.id) return;
        setBusy(true);
        try {
            await api(API.cart.add(quote.id), { method: "POST", body: JSON.stringify({ qty: form.qty }) });
            added.show();
        } catch (e: any) {
            setError(e?.message || "Не вдалося додати в кошик");
            failed.show();
        } finally {
            setBusy(false);
        }
    };

    const matLabel = (m: Material) =>
        [m.name, m.color].filter(Boolean).join(" — ");

    const breakdown = useMemo(() => {
        if (!quote) return null;
        const b = quote.breakdown;
        const list = Object.entries(b.costs || {});
        return { ...b, list };
    }, [quote]);

    return (
        <Page title="Quote">
            {!modelId && (
                <div className="mb-4 p-3 rounded border border-amber-300 bg-amber-50 text-sm">
                    Немає параметра <code>?model=ID</code>. <Link className="underline" to="/upload">Завантаж модель</Link> і повертайся.
                </div>
            )}

            <div className="grid gap-6 max-w-xl">
                {/* форма */}
                <div className="grid gap-3">
                    <label className="block">
                        <span className="text-sm">Матеріал</span>
                        <select
                            disabled={loadingMats || busy}
                            value={form.material_id}
                            onChange={e => onChange("material_id", Number(e.target.value))}
                            className="mt-1 block w-full rounded-md border px-3 py-2"
                        >
                            {materials.map(m => (
                                <option key={m.id} value={m.id}>{matLabel(m)}</option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm">Висота шару (мм)</span>
                        <input
                            type="number" step="0.01" min="0.06" max="0.4"
                            value={form.layer_height}
                            onChange={e => onChange("layer_height", Number(e.target.value))}
                            className="mt-1 block w-full rounded-md border px-3 py-2"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm">Заповнення</span>
                        <select
                            value={form.infill}
                            onChange={e => onChange("infill", e.target.value)}
                            className="mt-1 block w-full rounded-md border px-3 py-2"
                        >
                            {INFILL_PRESETS.map(x => <option key={x} value={x}>{x}</option>)}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm">Кількість</span>
                        <input
                            type="number" min={1}
                            value={form.qty}
                            onChange={e => onChange("qty", Number(e.target.value || 1))}
                            className="mt-1 block w-full rounded-md border px-3 py-2"
                        />
                    </label>

                    <div className="flex gap-2">
                        <button
                            onClick={makeQuote}
                            disabled={busy || !modelId}
                            className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
                        >
                            {busy ? "Рахуємо…" : "Розрахувати"}
                        </button>

                        {quote?.id && (
                            <button
                                onClick={addToCart}
                                disabled={busy}
                                className="px-4 py-2 rounded-md border"
                            >
                                Додати в кошик
                            </button>
                        )}
                    </div>
                </div>

                {/* результат */}
                {quote && (
                    <div className="rounded-lg border p-4">
                        <div className="text-lg font-medium">Ціна: {quote.price_eur} €</div>
                        <div className="text-sm text-neutral-600">за {quote.breakdown.qty} шт · {quote.breakdown.unit_price_eur} € / шт</div>
                        <div className="mt-3 text-sm">
                            <div>Оцінка часу: {Math.round(quote.breakdown.est_time_min)} хв</div>
                            <div>Оцінка філаменту: {quote.breakdown.est_filament_g} г</div>
                        </div>
                        {breakdown && (
                            <div className="mt-3">
                                <div className="text-sm font-medium mb-1">Собівартість</div>
                                <ul className="text-sm list-disc pl-5 space-y-0.5">
                                    {breakdown.list.map(([k, v]) => (
                                        <li key={k}>
                                            {(labels[k] ?? k)}: {k === "margin_mult" ? `×${v}` : v}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* успіх додавання в кошик */}
            <Modal
                open={added.open}
                onClose={added.hide}
                title="Додано в кошик"
                footer={
                    <>
                        <button onClick={added.hide} className="px-3 py-1.5 rounded border">Продовжити</button>
                        <button onClick={() => nav("/cart")} className="px-3 py-1.5 rounded bg-black text-white">Перейти в кошик</button>
                    </>
                }
            >
                <div className="text-sm text-neutral-700">
                    Пропозицію додано. Можеш оформити замовлення в кошику.
                </div>
            </Modal>

            {/* помилка */}
            <Modal
                open={failed.open}
                onClose={failed.hide}
                title="Помилка"
                footer={<button onClick={failed.hide} className="px-3 py-1.5 rounded bg-black text-white">Гаразд</button>}
            >
                <div className="text-sm text-red-700">{error}</div>
            </Modal>
        </Page>
    );
}
