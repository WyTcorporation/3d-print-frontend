import React, { useEffect } from "react";

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    widthClass?: string;
    closeOnBackdrop?: boolean;
};

export default function Modal({
                                  open, onClose, title, children, footer,
                                  widthClass = "max-w-md", closeOnBackdrop = true,
                              }: ModalProps) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[1000]">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => closeOnBackdrop && onClose()} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div role="dialog" aria-modal="true"
                     className={`w-full ${widthClass} bg-white rounded-2xl shadow-xl border border-neutral-200`}>
                    {title && <div className="px-5 py-4 border-b"><h3 className="text-lg font-semibold">{title}</h3></div>}
                    <div className="px-5 py-4">{children}</div>
                    {footer && <div className="px-5 py-3 border-t flex justify-end gap-2 bg-neutral-50 rounded-b-2xl">{footer}</div>}
                </div>
            </div>
        </div>
    );
}
