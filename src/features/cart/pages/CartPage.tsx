import Page from "@/app/layout/Page";
import { api } from "@/shared/api/client";
import { API } from "@/shared/api/endpoints";
import Modal from "@/shared/ui/Modal";
import { useModal } from "@/shared/ui/useModal";
import { useEffect, useState } from "react";
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
    currency?: string;          // "EUR"
    subtotal_eur?: string;      // "100.00"
    discount_eur?: string;      // "10.00"
    total_eur: string;          // "90.00"
    coupon?: { code: string; description?: string } | null;
};
export default function CartPage() {
    const { locale } = useLocale();
    const [data, setData] = useState<CartResp | null>(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState("");
    const [applying, setApplying] = useState(false);

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

    async function applyCoupon() {
        if (!couponCode.trim()) return;
        setApplying(true);
        try {
            await api(API.cart.applyCoupon, { method: "POST", body: JSON.stringify({ code: couponCode.trim() }) });
            await load();            // перезавантажимо підсумки
            setCouponCode("");
        } catch (e:any) {
            setError(e?.message || "Купон не застосовано");
            failed.show();
        } finally {
            setApplying(false);
        }
    }

    async function removeCoupon() {
        setApplying(true);
        try {
            await api(API.cart.removeCoupon, { method: "DELETE" });
            await load();
        } catch (e:any) {
            setError(e?.message || "Не вдалося прибрати купон");
            failed.show();
        } finally {
            setApplying(false);
        }
    }

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

    async function setQty(itemId: number, next: number) {
        setBusy(true);
        try {
            await api(API.cart.update(itemId), {
                method: "PATCH",
                body: JSON.stringify({ qty: Math.max(0, Number(next || 0)) }),
            });
            await load();
        } catch (e: any) {
            setError(e?.message || "Не вдалося оновити кількість");
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

            const order = await api<{ order_id: number; total_eur: string; status: string }>(
                API.orders.checkoutFromCart,
                { method: "POST" }
            );

            sessionStorage.setItem("last_order_id", String(order.order_id));

            // 2) Stripe checkout
            const pay = await api<{ checkout_url: string; session_id: string }>(
                API.payments.checkout,
                { method: "POST", body: JSON.stringify({ order_id: order.order_id }) }
            );

            window.location.href = pay.checkout_url;
        } catch (e: any) {
            redirecting.hide();
            setError(e?.message || "Оплата наразі недоступна");
            failed.show();
        } finally {
            setBusy(false);
        }
    }

    // const total = useMemo(() => data?.total_eur ?? "0.00", [data]);
    const subtotal = data?.subtotal_eur ?? null;
    const discount = data?.discount_eur ?? null;
    const total = data?.total_eur ?? "0.00";

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
                                <td className="py-2 pr-4 text-center">
                                    <div className="inline-flex items-center gap-1">
                                        <button
                                            className="px-2 py-1 rounded border text-xs"
                                            disabled={busy}
                                            onClick={() => setQty(it.id, it.qty - 1)}
                                            title="–1"
                                        >−</button>
                                        <input
                                            type="number"
                                            min={0}
                                            value={it.qty}
                                            onChange={(e) => setQty(it.id, Number(e.target.value))}
                                            className="w-16 rounded border px-2 py-1 text-center"
                                            disabled={busy}
                                        />
                                        <button
                                            className="px-2 py-1 rounded border text-xs"
                                            disabled={busy}
                                            onClick={() => setQty(it.id, it.qty + 1)}
                                            title="+1"
                                        >+</button>
                                    </div>
                                </td>
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
                            <td className="py-2 pr-4 text-right" colSpan={4}><b>Разом</b></td>
                            <td className="py-2 pr-4 text-right"><b>{subtotal ?? total}</b></td>
                            <td></td>
                        </tr>
                        {discount && (
                            <tr>
                                <td className="py-2 pr-4 text-right text-emerald-700" colSpan={4}>Знижка</td>
                                <td className="py-2 pr-4 text-right text-emerald-700">−{discount}</td>
                                <td></td>
                            </tr>
                        )}
                        {subtotal && (
                            <tr>
                                <td className="py-2 pr-4 text-right" colSpan={4}><b>До сплати</b></td>
                                <td className="py-2 pr-4 text-right"><b>{total}</b></td>
                                <td></td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!data?.coupon ? (
                        <>
                            <input
                                value={couponCode}
                                onChange={e => setCouponCode(e.target.value)}
                                placeholder="Купон"
                                className="rounded border px-3 py-2 text-sm"
                            />
                            <button
                                onClick={applyCoupon}
                                disabled={busy || applying || !couponCode.trim()}
                                className="px-3 py-2 rounded-md border text-sm disabled:opacity-50"
                            >
                                Застосувати
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-sm">
      <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5">
        Купон: {data.coupon.code}
      </span>
                            {data.coupon.description && <span className="text-neutral-600">— {data.coupon.description}</span>}
                            <button onClick={removeCoupon} disabled={busy || applying} className="ml-2 underline">
                                Прибрати
                            </button>
                        </div>
                    )}
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
