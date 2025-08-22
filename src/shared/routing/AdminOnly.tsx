import { Navigate } from "react-router-dom";
import { isAdmin } from "../auth/role.ts";

export default function AdminOnly({ children }: { children: React.ReactNode }) {
    if (!isAdmin()) return <Navigate to="/" replace />;
    return <>{children}</>;
}
