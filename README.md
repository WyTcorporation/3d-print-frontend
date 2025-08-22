stripe listen --forward-to localhost:8000/v1/payments/webhook

4242 4242 4242 4242

sanity‑тест
// десь у dev-панелі або тимчасовому effect
await fetchCatalog({ q: "pla", page: 1, per_page: 12 });
await fetchFacets({ q: "pla" });
const p = await fetchProduct("ender-pla-black");

const presign = await http.post("/files/presign-upload", { content_type: "application/sla" });
// PUT -> presign.url
await http.post("/files/complete", { key: presign.data.key, content_type: "application/sla" });

const quote = await http.post(API.quotes.create("uk"), { model_id: 1, material_id: 7, layer_height: 0.2, infill: 20, qty: 2 });
await http.post(API.cart.addQuote(quote.data.id));
await http.get(API.cart.me);

const order = await http.post(API.orders.checkoutFromCart);
await http.post(API.payments.checkout, { order_id: order.data.id, success_url: location.origin + "/checkout/success?order_id=" + order.data.id, cancel_url: location.origin + "/checkout/cancel" });
