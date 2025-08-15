export default function ProgressBar({ value }: { value: number }) {
    const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));
    return (
        <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
                className="h-full bg-emerald-600 transition-[width] duration-200"
                style={{ width: `${clamped}%` }}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={clamped}
                role="progressbar"
            />
        </div>
    );
}
