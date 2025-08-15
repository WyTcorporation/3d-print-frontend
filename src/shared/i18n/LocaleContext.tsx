import { createContext, useContext, useMemo, useState } from "react";

const SUPPORTED = ["en", "uk", "pt"] as const;
type Locale = typeof SUPPORTED[number];

function detect(): Locale {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved && (SUPPORTED as readonly string[]).includes(saved)) return saved as Locale;
    const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    return (SUPPORTED as readonly string[]).includes(nav) ? (nav as Locale) : "en";
}

type Ctx = { locale: Locale; setLocale: (l: Locale) => void };
const LocaleContext = createContext<Ctx>({ locale: "en", setLocale: () => {} });

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [locale, set] = useState<Locale>(detect());
    const setLocale = (l: Locale) => { localStorage.setItem("locale", l); set(l); };
    const value = useMemo(() => ({ locale, setLocale }), [locale]);
    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
export const LOCALES = SUPPORTED;
