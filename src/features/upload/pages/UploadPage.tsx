import Page from "@/app/layout/Page";
import { api } from "@/shared/api/client.ts";
import { API } from "@/shared/api/endpoints";
import Modal from "@/shared/ui/Modal";
import { useModal } from "@/shared/ui/useModal";
import ProgressBar from "@/shared/ui/ProgressBar";
import { Link } from "react-router-dom";
import { useRef, useState } from "react";

// просте визначення типу вмісту по розширенню (коли file.type порожній)
function sniffContentType(file: File): string {
    if (file.type) return file.type;
    const ext = file.name.toLowerCase().split(".").pop();
    switch (ext) {
        case "stl":  return "model/stl";
        case "obj":  return "model/obj";
        case "gltf": return "model/gltf+json";
        case "glb":  return "model/gltf-binary";
        default:     return "application/octet-stream";
    }
}

// PUT із прогресом через XHR (fetch не дає прогрес завантаження)
function putWithProgress(url: string, file: File, contentType: string, onProgress: (pct: number) => void) {
    return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const pct = (e.loaded / e.total) * 100;
                onProgress(pct);
            }
        };
        xhr.onload = () => {
            (xhr.status >= 200 && xhr.status < 300)
                ? resolve()
                : reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.open("PUT", url, true);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(file);
    });
}

export default function UploadPage() {
    // const nav = useNavigate();
    const fileInput = useRef<HTMLInputElement | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // що повернемо після complete
    const [uploadId, setUploadId] = useState<number | null>(null);
    const [modelId, setModelId] = useState<number | null>(null);

    const success = useModal(false);
    const fail    = useModal(false);

    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null); setUploadId(null); setModelId(null); setProgress(0);
        const f = e.target.files?.[0] || null;
        setFile(f);
    };

    const reset = () => {
        setFile(null); setProgress(0); setUploadId(null); setModelId(null);
        if (fileInput.current) fileInput.current.value = "";
    };

    const startUpload = async () => {
        if (!file) { setError("Спочатку обери файл (.stl/.obj/.gltf/.glb)"); fail.show(); return; }
        setBusy(true); setError(null);

        try {
            const contentType = sniffContentType(file);

            // 1) presign
            const presign = await api<{ url: string; key: string; bucket: string }>(API.files.presignGet, {
                method: "POST",
                body: JSON.stringify({ content_type: contentType }),
            });

            // 2) PUT з прогресом у MinIO
            await putWithProgress(presign.url, file, contentType, (pct) => setProgress(pct));

            // 3) complete (бек сам перевірить розмір/etag і створить Model3D)
            const complete = await api<{
                upload: { id: number; key: string; bucket: string; status: string };
                model:  { id: number; status: string };
            }>(API.files.complete, {
                method: "POST",
                body: JSON.stringify({ key: presign.key, content_type: contentType }),
            });

            setUploadId(complete.upload?.id ?? null);
            setModelId(complete.model?.id ?? null);
            success.show();
        } catch (e: any) {
            setError(e?.message || "Помилка завантаження");
            fail.show();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Page title="Upload">
            <div className="grid gap-4 max-w-xl">
                <label className="block">
                    <span className="text-sm">Обери 3D-файл (.stl / .obj / .gltf / .glb)</span>
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".stl,.obj,.gltf,.glb,model/stl,model/obj,model/gltf-binary,model/gltf+json"
                        onChange={onPick}
                        className="mt-1 block w-full rounded-md border px-3 py-2"
                    />
                </label>

                {file && (
                    <div className="text-sm text-neutral-700">
                        Файл: <b>{file.name}</b> ({(file.size/1024).toFixed(1)} KB)
                    </div>
                )}

                {busy && (
                    <div className="grid gap-2">
                        <ProgressBar value={progress} />
                        <div className="text-xs text-neutral-500">Завантаження: {Math.round(progress)}%</div>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={startUpload}
                        disabled={!file || busy}
                        className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
                    >
                        {busy ? "Uploading…" : "Upload"}
                    </button>
                    <button
                        onClick={reset}
                        disabled={busy}
                        className="px-4 py-2 rounded-md border"
                    >
                        Скинути
                    </button>
                </div>
            </div>

            {/* успіх */}
            <Modal
                open={success.open}
                onClose={success.hide}
                title="Модель завантажено"
                footer={
                    <>
                        <button onClick={success.hide} className="px-3 py-1.5 rounded border">Закрити</button>
                        {modelId && (
                            <Link to={`/quote?model=${modelId}`} className="px-3 py-1.5 rounded bg-black text-white">
                                Перейти до Quote
                            </Link>
                        )}
                    </>
                }
            >
                <div className="text-sm text-neutral-700 space-y-1">
                    <div>Upload ID: <b>{uploadId ?? "—"}</b></div>
                    <div>Model ID: <b>{modelId ?? "—"}</b></div>
                    <div>Статус аналізу: <i>processing → analyzed</i> (можеш перейти до Quote вже зараз)</div>
                </div>
            </Modal>

            {/* помилка */}
            <Modal
                open={fail.open}
                onClose={fail.hide}
                title="Помилка"
                footer={<button onClick={fail.hide} className="px-3 py-1.5 rounded bg-black text-white">Гаразд</button>}
            >
                <div className="text-sm text-red-700">{error}</div>
                <div className="text-xs text-neutral-500 mt-2 space-y-1">
                    <p>Швидкі перевірки, якщо не залетіло:</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                        <li>Ти залогінений (Bearer токен є в localStorage)?</li>
                        <li>У бекенді CORS дозволяє <code>http://localhost:5173</code>?</li>
                        <li>MinIO CORS: <code>MINIO_API_CORS_ALLOW_ORIGIN=http://localhost:5173</code> (і <code>PUT</code> у methods)?</li>
                        <li>Бакет існує (<code>models</code>)?</li>
                    </ul>
                </div>
            </Modal>
        </Page>
    );
}
