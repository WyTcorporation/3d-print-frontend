// src/shared/api/endpoints.ts
export const API = {
    auth: {
        login: "/v1/auth/login",
        me: "/v1/auth/me",
    },

    files: {
        presignUpload: "/v1/files/presign-upload",
        complete: "/v1/files/complete",
        presignGet: "/v1/files/presign-get",
        previewPng: (modelId: number) => `/v1/files/preview/${modelId}.png`,
    },

    catalog: {
        list: "/v1/catalog",
        facets: "/v1/catalog/facets",
        categories: "/v1/catalog/categories",
        product: (slug: string) => `/v1/catalog/products/${slug}`,
        // у нас матеріали з локаллю:
        materials: (locale: string) => `/v1/catalog/materials?locale=${encodeURIComponent(locale)}`,
    },

    quotes: "/v1/quotes",

    cart: {
        me: "/v1/cart",

        // новий шлях (канонічний):
        addItem: "/v1/cart/items",                        // POST { type:"print"|"sku", ... }
        remove: (itemId: number) => `/v1/cart/items/${itemId}`, // DELETE

        update: (itemId: number) => `/v1/cart/item/${itemId}`,  // PATCH { qty }
        sync: "/v1/cart/sync",                            // PUT { items: [...] }
        clear: "/v1/cart/clear",

        applyCoupon: "/v1/cart/apply-coupon",
        removeCoupon: "/v1/cart/coupon",

        // 🔙 аліас для старого коду (додати квоту в кошик):
        add: (quoteId: number) => `/v1/cart/add/${quoteId}`,
    },

    orders: {
        // нові:
        listMine: "/v1/orders",
        get: (id: number) => `/v1/orders/${id}`,
        jobs: (id: number) => `/v1/orders/${id}/print-jobs`,
        checkoutFromCart: "/v1/orders/checkout_from_cart",
        checkoutMixed: "/v1/orders/checkout_mixed",

        // 🔙 аліаси на перехідний період:
        checkout: "/v1/orders/checkout_from_cart", // щоб старий код працював
        list: "/v1/orders",                        // щоб старий OrdersPage не падав
    },

    payments: {
        checkout: "/v1/payments/checkout",
    },

    jobs: {
        // адмін: список джобів
        me: "/v1/print-jobs",

        // 🔙 аліас для старого коду:
        list: "/v1/print-jobs",

        preflight: (id: number) => `/v1/print-jobs/${id}/preflight`,
        start: (id: number) => `/v1/print-jobs/${id}/start`,
        pause: (id: number) => `/v1/print-jobs/${id}/pause`,
        resume: (id: number) => `/v1/print-jobs/${id}/resume`,
        cancel: (id: number) => `/v1/print-jobs/${id}/cancel`,
    },
} as const;
