import Page from "@/app/layout/Page";
import { Link, useSearchParams } from "react-router-dom";

export default function CheckoutSuccessPage() {
    const [sp] = useSearchParams();
    const sessionId = sp.get("session_id") || "";
    const lastOrderId = sessionStorage.getItem("last_order_id");

    return (
        <Page title="Оплата пройшла успішно 🎉">
            <div className="space-y-2">
                <div className="text-sm text-neutral-700">
                    Дякуємо! Stripe підтвердив платіж. Webhook на бекенді виставить <code>orders.status=paid</code>.
                </div>
                <div className="text-sm text-neutral-600">Session ID: <code>{sessionId}</code></div>
                {lastOrderId && (
                    <Link className="inline-block mt-3 underline" to={`/order?order=${lastOrderId}`}>
                        Перейти до статусу замовлення #{lastOrderId}
                    </Link>
                )}
                <div><Link className="underline" to="/workshop">В майстерню</Link></div>
            </div>
        </Page>
    );
}
