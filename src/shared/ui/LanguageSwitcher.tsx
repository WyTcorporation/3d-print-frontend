import { LOCALES, useLocale } from "@/shared/i18n/LocaleContext";

export default function LanguageSwitcher() {
    const { locale, setLocale } = useLocale();
    return (
        <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as any)}
            className="border rounded px-2 py-1 text-sm bg-white"
            title="Language"
        >
            {LOCALES.map((l) => (
                <option key={l} value={l}>
                    {l.toUpperCase()}
                </option>
            ))}
        </select>
    );
}
