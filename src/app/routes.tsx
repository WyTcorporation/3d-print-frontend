import Page from "./layout/Page";
import LoginPage from "@/features/auth/pages/LoginPage";
import UploadPage from "@/features/upload/pages/UploadPage";
import QuotePage from "@/features/quote/pages/QuotePage";
import CartPage from "@/features/cart/pages/CartPage";
import CheckoutSuccessPage from "@/features/order/pages/CheckoutSuccessPage";
import CheckoutCancelPage from "@/features/order/pages/CheckoutCancelPage";
import OrdersPage from "@/features/order/pages/OrdersPage";
import OrderStatusPage from "@/features/order/pages/OrderStatusPage";

const NotReady = ({name}:{name:string}) => (
    <Page title={name}><div>Сторінка в процесі.</div></Page>
);

export const routes = [
    { path: "/login",    element: LoginPage },
    { path: "/upload", element: UploadPage },
    { path: "/quote", element: QuotePage },
    { path: "/cart", element: CartPage },
    { path: "/checkout/success", element: CheckoutSuccessPage },
    { path: "/checkout/cancel", element: CheckoutCancelPage },
    { path: "/orders", element: OrdersPage },
    { path: "/orders/:id", element: OrderStatusPage },
    { path: "/workshop", element: () => <NotReady name="Workshop" /> },
] as const;
