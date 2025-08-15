import Page from "@/app/layout/Page";
import { api } from "@/shared/api/client";
import { API } from "@/shared/api/endpoints";
import Modal from "@/shared/ui/Modal";
import { useModal } from "@/shared/ui/useModal";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/shared/i18n/LocaleContext";

type CartItem = {
    id: number;
    quote_id: number;
    qty: number;
    unit_price: number;      // € за шт
    subtotal: number;        // € за позицію
    quote: {
        id: number;
        price_eur: string;
        settings_json: any;
        material: { id: number; name?: string | null; color?: string | null };
    }
};

type CartResp = {
    id: number | null;
    items: CartItem[];
    total_eur: string;       // сума за кошик
};

export default function CartPage() {
    const { locale } = useLocale();
    const [data, setData] = useState<CartResp | null>(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const redirecting = useModal(false);
    const failed = useModal(false);

    async function load() {
        setLoading(true);
        try {
            const cart = await api<CartResp>(API.cart.me + `?locale=${locale}`);
            setData(cart);
        } catch (e: any) {
            setError(e?.message || "Не вдалося завантажити кошик");
            failed.show();
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, [locale]);

    async function removeItem(id: number) {
        setBusy(true);
        try {
            await api(API.cart.remove(id), { method: "DELETE" });
            await load();
        } catch (e: any) {
            setError(e?.message || "Не вдалося видалити позицію");
            failed.show();
        } finally {
            setBusy(false);
        }
    }

    async function checkout() {
        if (!data || !data.items?.length) return;
        setBusy(true);
        redirecting.show();
        try {
            // 1) створюємо Order з кошика
            const order = await api<{ order_id: number; total_eur: string; status: string }>(
                API.orders.checkout,
                { method: "POST" }
            );

            // збережемо для екрана успіху
            sessionStorage.setItem("last_order_id", String(order.order_id));

            // 2) отримуємо Stripe checkout session URL
            const pay = await api<{ checkout_url: string; session_id: string }>(
                API.payments.checkout,
                { method: "POST", body: JSON.stringify({ order_id: order.order_id }) }
            );

            // 3) редірект на Stripe
            window.location.href = pay.checkout_url;
        } catch (e: any) {
            redirecting.hide();
            setError(e?.message || "Оплата наразі недоступна");
            failed.show();
        } finally {
            setBusy(false);
        }
    }

    const total = useMemo(() => data?.total_eur ?? "0.00", [data]);

    return (
        <Page title="Cart">
            <div className="rounded-xl border p-4">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-left">
                        <tr className="border-b">
                            <th className="py-2 pr-4">Quote #</th>
                            <th className="py-2 pr-4">Матеріал</th>
                            <th className="py-2 pr-4 text-center">К-сть</th>
                            <th className="py-2 pr-4 text-right">Ціна/шт, €</th>
                            <th className="py-2 pr-4 text-right">Сума, €</th>
                            <th className="py-2"></th>
                        </tr>
                        </thead>
                        <tbody>
                        {data?.items?.map((it) => (
                            <tr key={it.id} className="border-b">
                                <td className="py-2 pr-4">#{it.quote_id}</td>
                                <td className="py-2 pr-4">
                                    {[it.quote.material?.name, it.quote.material?.color].filter(Boolean).join(" — ")}
                                </td>
                                <td className="py-2 pr-4 text-center">{it.qty}</td>
                                <td className="py-2 pr-4 text-right">{it.unit_price.toFixed(2)}</td>
                                <td className="py-2 pr-4 text-right">{it.subtotal.toFixed(2)}</td>
                                <td className="py-2">
                                    <button
                                        className="px-2 py-1 rounded border text-xs"
                                        disabled={busy}
                                        onClick={() => removeItem(it.id)}
                                    >
                                        Видалити
                                    </button>
                                </td>
                            </tr>
                        ))}
                        <tr>
                            <td className="py-2 pr-4" colSpan={4}><b>Всього</b></td>
                            <td className="py-2 pr-4 text-right"><b>{total}</b></td>
                            <td></td>
                        </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex gap-3">
                    <button
                        onClick={checkout}
                        disabled={busy || loading || !data?.items?.length}
                        className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
                    >
                        Перейти до оплати
                    </button>
                    <button onClick={load} disabled={busy || loading} className="px-4 py-2 rounded-md border">
                        Оновити
                    </button>
                </div>
            </div>

            {/* індикатор редіректу */}
            <Modal open={redirecting.open} onClose={() => {}} title="Переходимо до оплати">
                <div className="text-sm text-neutral-700">Зараз відкриється Stripe Checkout…</div>
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
