export const API = {
    login: "/v1/auth/login",
    presign: "/v1/files/presign-upload",
    complete: "/v1/files/complete",

    catalog: {
        materials: (locale: string) =>
            `/v1/catalog/materials?locale=${encodeURIComponent(locale)}`,
    },

    quotes: "/v1/quotes",

    cart: {
        me: "/v1/cart",
        add: (quoteId: number) => `/v1/cart/add/${quoteId}`,
        remove: (itemId: number) => `/v1/cart/item/${itemId}`,
    },

    orders: {
        list: "/v1/orders",
        checkout: "/v1/orders/checkout",
        get: (id: number) => `/v1/orders/${id}`,
        jobs: (id: number) => `/v1/orders/${id}/print-jobs`,
    },

    payments: {
        checkout: "/v1/payments/checkout",
    },

    files: {
        preview: (modelId: number) => `/v1/files/preview/${modelId}.png`,
    },

    jobs: {
        list: "/v1/print-jobs",
        preflight: (id: number) => `/v1/print-jobs/${id}/preflight`,
        start:    (id: number) => `/v1/print-jobs/${id}/start`,
        pause:    (id: number) => `/v1/print-jobs/${id}/pause`,
        resume:   (id: number) => `/v1/print-jobs/${id}/resume`,
        cancel:   (id: number) => `/v1/print-jobs/${id}/cancel`,
    },
} as const;
