import Page from "@/app/layout/Page";
import { Link } from "react-router-dom";

export default function CheckoutCancelPage() {
    return (
        <Page title="Оплату скасовано">
            <div className="space-y-2">
                <div className="text-sm text-neutral-700">Платіж не завершено. Можеш повторити, коли будеш готовий.</div>
                <Link className="underline" to="/cart">Повернутись у кошик</Link>
            </div>
        </Page>
    );
}
