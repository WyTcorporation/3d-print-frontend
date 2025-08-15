import Modal from "./Modal";

type ConfirmDialogProps = {
    open: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
                                          open,
                                          title = "Підтвердження",
                                          message = "Ви впевнені?",
                                          confirmText = "Підтвердити",
                                          cancelText = "Скасувати",
                                          onConfirm,
                                          onCancel,
                                      }: ConfirmDialogProps) {
    return (
        <Modal
            open={open}
            onClose={onCancel}
            title={title}
            footer={
                <>
                    <button onClick={onCancel} className="px-3 py-1.5 rounded border border-neutral-300">
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} className="px-3 py-1.5 rounded bg-black text-white">
                        {confirmText}
                    </button>
                </>
            }
        >
            <p className="text-sm text-neutral-700">{message}</p>
        </Modal>
    );
}
