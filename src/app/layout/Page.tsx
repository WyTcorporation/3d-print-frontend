export default function Page({ title, children }:{
    title?: string; children: React.ReactNode;
}) {
    return (
        <section className="bg-white rounded-2xl border p-6 shadow-sm">
            {title && <h1 className="text-xl font-semibold mb-4">{title}</h1>}
            {children}
        </section>
    );
}
