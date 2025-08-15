import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./layout/NavBar";
import Page from "./layout/Page";
import { routes } from "./routes";

export default function App() {
    return (
        <div className="min-h-dvh bg-neutral-50 text-neutral-900">
            <NavBar />
            <main className="max-w-5xl mx-auto px-4 py-8">
                <Routes>
                    {/* Головна-«привітання» */}
                    <Route path="/" element={<Page title="3D-Print Shop MVP">
                        <div className="space-y-2">
                            <p>Ласкаво просимо. Пройдімо шлях: Upload → Quote → Cart/Checkout → Order Status → Workshop.</p>
                            <p className="text-sm text-neutral-600">Спочатку залогінься.</p>
                        </div>
                    </Page>} />

                    {/* Декларації сторінок із routes.tsx */}
                    {routes.map(r => (
                        <Route key={r.path} path={r.path} element={<r.element />} />
                    ))}

                    {/* запасний редірект */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}
