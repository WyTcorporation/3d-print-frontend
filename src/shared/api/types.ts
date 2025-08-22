export type LoginReq = { email: string; password: string };
export type LoginRes = { access_token: string };

export type Material = {
    id: number;
    name?: string | null;
    color?: string | null
};

export type QuoteBreakdown = {
    qty: number;
    unit_price_eur: number;
    total_eur: number;
    est_time_min: number;
    est_filament_g: number;
    costs?: Record<string, number>;
};

export type QuoteOut = {
    id: number;
    price_eur: string;
    settings: any;
    breakdown: QuoteBreakdown;
    breakdown_labels?: Record<string, string>;
};

export type CartSkuItem = {
    type: "sku";
    id: number;         // item id
    sku_id: number;
    qty: number;
    unit_price: number;
    subtotal: number;
    title: string;
    variant?: Record<string, string>;
};

export type CartPrintItem = {
    type: "print";
    id: number;         // item id
    quote_id: number;
    qty: number;
    unit_price: number;
    subtotal: number;
    material?: Material;
    settings_json?: any;
};

export type CartItem = CartSkuItem | CartPrintItem;

export type CartOut = {
    id: number | null;
    items: CartItem[];
    subtotal_eur?: string;
    discount_eur?: string;
    total_eur: string;
    currency?: string;
    coupon?: { code: string; amount_eur?: string } | null;
};

export type OrderOut = {
    id: number;
    status: string;
    total_eur: string;
    created_at: string;
};

export type PrintJob = {
    id: number;
    status: string;
    printer_id: number | null;
    progress: number;
    est_time_min: number;
    started_at?: string | null;
    finished_at?: string | null;
    model?: { id: number };
};
