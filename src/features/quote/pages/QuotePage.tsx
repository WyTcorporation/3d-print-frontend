import Page from "@/app/layout/Page";
import { api, API_BASE } from "@/shared/api/client";
import { API } from "@/shared/api/endpoints";
import Modal from "@/shared/ui/Modal";
import { useModal } from "@/shared/ui/useModal";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLocale } from "@/shared/i18n/LocaleContext";

/* ───────── helpers ───────── */

type Material = { id: number; name?: string; color?: string };
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
    breakdown_labels?: Record<string, string>;
};

const INFILL_PRESETS = ["15% grid", "20% gyroid", "25% cubic", "30% cubic", "40% gyroid"];

/** простий placeholder-бокс (коли прев’ю немає) */
function PlaceholderBox({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" className={className}>
            <rect x="1" y="1" width="62" height="62" rx="8" fill="#f3f4f6" stroke="#e5e7eb" />
            <path d="M10 44l12-14 10 12 8-8 14 16H10z" fill="#e5e7eb" />
            <circle cx="24" cy="22" r="5" fill="#e5e7eb" />
        </svg>
    );
}

/**
 * Картинка з авторизацією: тягне blob через fetch із Bearer токеном,
 * віддає тимчасовий object URL. Якщо впало — показує Placeholder.
 */
function AuthImage({
                       path,
                       alt,
                       className = "",
                   }: {
    path: string | null;
    alt: string;
    className?: string;
}) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let canceled = false;
        let revoke: string | null = null;

        async function run() {
            if (!path) {
                setSrc(null);
                return;
            }
            try {
                const token = localStorage.getItem("token") || "";
                const res = await fetch(`${API_BASE}${path}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) throw new Error(String(res.status));
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
    }, [path]);

    if (!src) return <PlaceholderBox className={className} />;
    return <img src={src} alt={alt} className={className} loading="lazy" />;
}

/** компактна кнопка, щоб не «роздувалась» */
function Btn({
                 children,
                 className = "",
                 ...rest
             }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
    return (
        <button
            {...rest}
            className={
                "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium " +
                className
            }
        >
            {children}
        </button>
    );
}

/* ───────── page ───────── */

export default function QuotePage() {
    const nav = useNavigate();
    const [sp] = useSearchParams();
    const modelId = Number(sp.get("model") || "0");
    const { locale } = useLocale();

    const [materials, setMaterials] = useState<Material[]>([]);
    const [loadingMats, setLoadingMats] = useState(true);
    const [labels, setLabels] = useState<Record<string, string>>({});
    const [form, setForm] = useState({
        material_id: 0,
        layer_height: 0.2,
        infill: "20% gyroid",
        qty: 1,
    });

    const [busy, setBusy] = useState(false);
    const [quote, setQuote] = useState<QuoteResp | null>(null);
    const [error, setError] = useState<string | null>(null);

    const added = useModal(false); // «додано в кошик»
    const failed = useModal(false); // помилка
    const preview = useModal(false); // прев’ю повний розмір

    // 1) матеріали
    useEffect(() => {
        (async () => {
            try {
                setLoadingMats(true);
                const url = API.catalog.materials(locale);
                const mats = await api<Material[]>(url);
                const sorted = (mats || [])
                    .slice()
                    .sort(
                        (a, b) =>
                            (a.name || "").localeCompare(b.name || "", locale) ||
                            (a.color || "").localeCompare(b.color || "", locale),
                    );
                setMaterials(sorted);
                if (sorted.length && !form.material_id)
                    setForm((f) => ({ ...f, material_id: sorted[0].id }));
            } catch (e: any) {
                setError(e?.message || "Не вдалося завантажити матеріали");
                failed.show();
            } finally {
                setLoadingMats(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locale]);

    const onChange = (k: keyof typeof form, v: any) =>
        setForm((s) => ({ ...s, [k]: v }));

    // 2) розрахунок
    const makeQuote = async () => {
        if (!modelId) {
            setError("Нема ідентифікатора моделі. Перейди з Upload або вкажи ?model=ID.");
            failed.show();
            return;
        }
        setBusy(true);
        setError(null);
        setQuote(null);
        try {
            const payload = {
                model_id: modelId,
                material_id: Number(form.material_id),
                layer_height: Number(form.layer_height),
                infill: form.infill,
                qty: Number(form.qty),
            };
            const res = await api<QuoteResp>(
                API.quotes + `?locale=${encodeURIComponent(locale)}`,
                { method: "POST", body: JSON.stringify(payload) },
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
            await api(API.cart.add(quote.id), {
                method: "POST",
                body: JSON.stringify({ qty: form.qty }),
            });
            added.show();
        } catch (e: any) {
            setError(e?.message || "Не вдалося додати в кошик");
            failed.show();
        } finally {
            setBusy(false);
        }
    };

    // const breakdown = useMemo(() => {
    //     if (!quote) return null;
    //     const b = quote.breakdown;
    //     const list = Object.entries(b.costs || {});
    //     return { ...b, list };
    // }, [quote]);

    const previewPath = modelId ? `/v1/files/preview/${modelId}.png` : null;

    return (
        <Page title="Quote">
            {!modelId && (
                <div className="mb-4 p-3 rounded border border-amber-300 bg-amber-50 text-sm">
                    Немає параметра <code>?model=ID</code>.{" "}
                    <Link className="underline" to="/upload">
                        Завантаж модель
                    </Link>{" "}
                    і повертайся.
                </div>
            )}

            {/* компактна двоколонка: форма + вузький aside 20rem */}
            <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6">
                {/* форма */}
                <div className="grid gap-3">
                    <label className="block">
                        <span className="text-sm">Матеріал</span>
                        <select
                            disabled={loadingMats || busy}
                            value={form.material_id}
                            onChange={(e) => onChange("material_id", Number(e.target.value))}
                            className="mt-1 block w-full rounded-md border px-3 py-2"
                        >
                            {materials.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {[m.name, m.color].filter(Boolean).join(" — ")}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm">Висота шару (мм)</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0.06"
                            max="0.4"
                            value={form.layer_height}
                            onChange={(e) => onChange("layer_height", Number(e.target.value))}
                            className="mt-1 block w-full rounded-md border px-3 py-2"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm">Заповнення</span>
                        <select
                            value={form.infill}
                            onChange={(e) => onChange("infill", e.target.value)}
                            className="mt-1 block w-full rounded-md border px-3 py-2"
                        >
                            {INFILL_PRESETS.map((x) => (
                                <option key={x} value={x}>
                                    {x}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm">Кількість</span>
                        <input
                            type="number"
                            min={1}
                            value={form.qty}
                            onChange={(e) => onChange("qty", Number(e.target.value || 1))}
                            className="mt-1 block w-full rounded-md border px-3 py-2"
                        />
                    </label>

                    <div className="flex gap-2">
                        <Btn
                            onClick={makeQuote}
                            disabled={busy || !modelId}
                            className="bg-black text-white disabled:opacity-50"
                        >
                            {busy ? "Рахуємо…" : "Розрахувати"}
                        </Btn>

                        {quote?.id && (
                            <Btn onClick={addToCart} disabled={busy} className="border">
                                Додати в кошик
                            </Btn>
                        )}
                    </div>
                </div>

                {/* aside 20rem — компактні картки з фіксованими min-height */}
                <div className="space-y-3">
                    {/* ціна */}
                    <section className="rounded-lg border p-3 min-h-[136px]">
                        {!quote ? (
                            <div className="animate-pulse space-y-2">
                                <div className="h-5 w-32 bg-neutral-200 rounded" />
                                <div className="h-4 w-40 bg-neutral-200 rounded" />
                                <div className="h-3 w-full bg-neutral-200 rounded" />
                            </div>
                        ) : (
                            <>
                                <div className="text-base font-medium">Ціна: {quote.price_eur} €</div>
                                <div className="text-xs text-neutral-600">
                                    за {quote.breakdown.qty} шт · {quote.breakdown.unit_price_eur} € / шт
                                </div>
                                <div className="mt-2 text-xs">
                                    <div>Час: {Math.round(quote.breakdown.est_time_min)} хв</div>
                                    <div>Філамент: {quote.breakdown.est_filament_g} г</div>
                                </div>

                                {quote.breakdown.costs && (
                                    <details className="mt-2 text-xs">
                                        <summary className="cursor-pointer select-none text-neutral-700">
                                            Деталі собівартості
                                        </summary>
                                        <ul className="mt-1 list-disc pl-4 space-y-0.5">
                                            {Object.entries(quote.breakdown.costs).map(([k, v]) => (
                                                <li key={k}>
                                                    {(labels[k] ?? k)}: {k === "margin_mult" ? `×${v}` : (v as any)}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                            </>
                        )}
                    </section>

                    {/* прев’ю */}
                    <section className="rounded-lg border p-3 min-h-[220px]">
                        <div className="mb-1 text-sm font-medium">Прев’ю моделі</div>
                        <button
                            type="button"
                            onClick={preview.show}
                            className="group w-full h-[170px] rounded border bg-white overflow-hidden flex items-center justify-center cursor-zoom-in"
                            title="Збільшити"
                        >
                            {quote ? (
                                <AuthImage
                                    path={previewPath}
                                    alt={`Model ${modelId}`}
                                    className="h-full w-full object-contain group-hover:opacity-90"
                                />
                            ) : (
                                <div className="h-full w-full bg-neutral-100" />
                            )}
                        </button>
                        <div className="mt-1 text-[11px] text-neutral-500">Клік, щоб збільшити</div>
                    </section>
                </div>
            </div>

            {/* успіх додавання в кошик */}
            <Modal
                open={added.open}
                onClose={added.hide}
                title="Додано в кошик"
                footer={
                    <>
                        <Btn onClick={added.hide} className="border">
                            Продовжити
                        </Btn>
                        <Btn onClick={() => nav("/cart")} className="bg-black text-white">
                            Перейти в кошик
                        </Btn>
                    </>
                }
            >
                <div className="text-sm text-neutral-700">
                    Пропозицію додано. Можеш оформити замовлення в кошику.
                </div>
            </Modal>

            {/* модалка прев’ю */}
            <Modal
                open={preview.open}
                onClose={preview.hide}
                title="Прев’ю моделі"
                footer={
                    <Btn onClick={preview.hide} className="bg-black text-white">
                        Закрити
                    </Btn>
                }
            >
                <div className="aspect-[4/3] w-full max-h-[70vh] overflow-hidden rounded border bg-white">
                    <AuthImage
                        path={previewPath}
                        alt={`Model ${modelId}`}
                        className="w-full h-full object-contain"
                    />
                </div>
            </Modal>

            {/* помилка */}
            <Modal
                open={failed.open}
                onClose={failed.hide}
                title="Помилка"
                footer={
                    <Btn onClick={failed.hide} className="bg-black text-white">
                        Гаразд
                    </Btn>
                }
            >
                <div className="text-sm text-red-700">{error}</div>
            </Modal>
        </Page>
    );
}
