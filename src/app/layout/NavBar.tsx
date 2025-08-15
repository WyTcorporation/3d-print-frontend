import { Link, NavLink, useNavigate } from "react-router-dom";
import LanguageSwitcher from "@/shared/ui/LanguageSwitcher";

function Item({ to, children }: { to: string; children: React.ReactNode }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                "px-3 py-1.5 rounded-md text-sm " +
                (isActive ? "bg-black text-white" : "hover:bg-neutral-200")
            }
        >
            {children}
        </NavLink>
    );
}

export default function NavBar() {
    const nav = useNavigate();
    const token = localStorage.getItem("token");

    const logout = () => {
        localStorage.removeItem("token");
        nav("/login");
    };

    return (
        <header className="border-b bg-white">
            <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                <Link to="/" className="font-semibold">3D-Print Shop</Link>
                <nav className="flex items-center gap-2">
                    <Item to="/upload">Upload</Item>
                    <Item to="/quote">Quote</Item>
                    <Item to="/cart">Cart</Item>
                    <Item to="/orders">Order</Item>
                    <Item to="/workshop">Workshop</Item>
                </nav>
                <div className="ml-auto flex items-center gap-3">
                    <LanguageSwitcher />
                </div>
                <div className="flex items-center gap-2">
                    {!token ? (
                        <Item to="/login">Login</Item>
                    ) : (
                        <button onClick={logout} className="px-3 py-1.5 rounded-md text-sm bg-neutral-900 text-white">
                            Logout
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
