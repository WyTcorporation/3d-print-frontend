import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import { useModal } from "@/shared/ui/useModal";

const askCancel = useModal(false);
const [cancelId, setCancelId] = useState<number | null>(null);

const requestCancel = (id:number) => { setCancelId(id); askCancel.show(); };
const doCancel = async () => {
    if (!cancelId) return;
    await api(`/v1/print-jobs/${cancelId}/cancel`, { method: "POST" });
    askCancel.hide();
    setCancelId(null);
    await load();
};

// у рендері кнопки:
<button onClick={()=>requestCancel(j.id)} className="px-2 py-1 rounded bg-red-700 text-white">Cancel ✕</button>

<ConfirmDialog
    open={askCancel.open}
    onCancel={askCancel.hide}
    onConfirm={doCancel}
    title="Скасувати друк?"
    message={`Підтвердити скасування job #${cancelId ?? ""}?`}
/>
