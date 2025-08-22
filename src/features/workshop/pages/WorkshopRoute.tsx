import AdminOnly from "@/shared/routing/AdminOnly.tsx";
import WorkshopPage from "./WorkshopPage";

export default function WorkshopRoute() {
    return (
        <AdminOnly>
            <WorkshopPage />
        </AdminOnly>
    );
}
