import AdminOnly from "@/shared/auth/AdminOnly";
import WorkshopPage from "./WorkshopPage";

export default function WorkshopRoute() {
    return (
        <AdminOnly>
            <WorkshopPage />
        </AdminOnly>
    );
}
