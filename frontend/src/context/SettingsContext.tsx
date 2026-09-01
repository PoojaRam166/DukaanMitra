import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { settingsApi } from "../services/api";
import { useAuth } from "./AuthContext";
import { LangCode, dbValueToCode, codeToDbValue, translate } from "../i18n/translations";

export interface ShopPreferences {
  language: string;
  currency: string;
  theme: string;
  date_format: string;
}

interface SettingsContextValue {
  prefs: ShopPreferences;
  /** Update local preference state immediately (e.g. right after a
   * successful save in the Settings page) so the whole app reflects the
   * change without waiting for a reload. */
  applyPrefs: (next: Partial<ShopPreferences>) => void;
  formatCurrency: (amount: number | string) => string;
  formatDate: (date: string | Date) => string;
  /** Current language mode: "en" | "te" | "bi" (English + Telugu). */
  lang: LangCode;
  /** Switches the language everywhere immediately (sidebar, headers,
   * settings, landing page) and persists it — to the backend when the
   * shop owner is signed in, otherwise to localStorage so it's remembered
   * on the public landing page too. */
  setLanguage: (code: LangCode) => void;
  /** Short translator for app chrome: nav labels, buttons, form labels. */
  t: (key: string) => string;
}

const LANG_STORAGE_KEY = "dukaanmitra_lang";

const defaultPrefs: ShopPreferences = {
  language: "English",
  currency: "₹ Indian Rupee (INR)",
  theme: "Light",
  date_format: "DD/MM/YYYY",
};

const SettingsContext = createContext<SettingsContextValue>({
  prefs: defaultPrefs,
  applyPrefs: () => {},
  formatCurrency: (a) => `₹${a}`,
  formatDate: (d) => new Date(d).toLocaleDateString(),
  lang: "en",
  setLanguage: () => {},
  t: (key) => key,
});

// Maps a currency preference string (as stored/selected in Settings) to the
// symbol used for display, and the Intl currency code used for formatting.
const CURRENCY_MAP: Record<string, { symbol: string; code: string }> = {
  "₹ Indian Rupee (INR)": { symbol: "₹", code: "INR" },
  "$ US Dollar (USD)": { symbol: "$", code: "USD" },
};

function applyThemeToDocument(theme: string) {
  const root = document.documentElement;
  const resolveIsDark = () => {
    if (theme === "Dark") return true;
    if (theme === "Light") return false;
    // "System Default"
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  root.classList.toggle("dark", resolveIsDark());
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<ShopPreferences>(() => {
    // Before login (e.g. on the landing page) we still want a remembered
    // language choice, so seed it from localStorage if present.
    let language = defaultPrefs.language;
    try {
      const savedCode = localStorage.getItem(LANG_STORAGE_KEY);
      if (savedCode === "en" || savedCode === "te" || savedCode === "bi") {
        language = codeToDbValue(savedCode);
      }
    } catch {}
    return { ...defaultPrefs, language };
  });

  const applyPrefs = useCallback((next: Partial<ShopPreferences>) => {
    setPrefs((p) => ({ ...p, ...next }));
  }, []);

  // Load the shop's saved preferences once a user is logged in, so theme/
  // currency/date-format apply app-wide immediately after login — not just
  // on the Settings page itself.
  //
  // Language is treated differently: the browser's own most-recent choice
  // (stored in localStorage — e.g. picked on the landing/login screen while
  // signed out) always wins over whatever was last saved to the account,
  // so switching languages before logging in actually sticks after login.
  // We then push that choice back to the account so it stays in sync.
  useEffect(() => {
    if (!user) return;
    settingsApi.get().then((res) => {
      const s = res.data?.settings;
      if (s) {
        let language = s.language || defaultPrefs.language;
        let localOverride = false;
        try {
          const savedCode = localStorage.getItem(LANG_STORAGE_KEY);
          if (savedCode === "en" || savedCode === "te" || savedCode === "bi") {
            const localDbValue = codeToDbValue(savedCode);
            if (localDbValue !== language) {
              language = localDbValue;
              localOverride = true;
            }
          }
        } catch {}
        setPrefs({
          language,
          currency: s.currency || defaultPrefs.currency,
          theme: s.theme || defaultPrefs.theme,
          date_format: s.date_format || defaultPrefs.date_format,
        });
        if (localOverride) {
          settingsApi.update({ language }).catch(() => {});
        }
      }
    }).catch(() => {});
  }, [user]);

  const lang = dbValueToCode(prefs.language);

  const setLanguage = useCallback((code: LangCode) => {
    const dbValue = codeToDbValue(code);
    setPrefs((p) => ({ ...p, language: dbValue }));
    try { localStorage.setItem(LANG_STORAGE_KEY, code); } catch {}
    // Persist immediately (like theme's live-preview) instead of waiting
    // for the Settings form to be submitted, so the choice sticks even if
    // the person navigates away without hitting "Save Preferences".
    if (user) {
      settingsApi.update({ language: dbValue }).catch(() => {});
    }
  }, [user]);

  const t = useCallback((key: string) => translate(key, lang), [lang]);

  useEffect(() => {
    applyThemeToDocument(prefs.theme);
    if (prefs.theme === "System Default" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => applyThemeToDocument(prefs.theme);
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, [prefs.theme]);

  const formatCurrency = useCallback((amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
    const info = CURRENCY_MAP[prefs.currency] || CURRENCY_MAP["₹ Indian Rupee (INR)"];
    return `${info.symbol}${num.toLocaleString(info.code === "INR" ? "en-IN" : "en-US")}`;
  }, [prefs.currency]);

  const formatDate = useCallback((date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    switch (prefs.date_format) {
      case "MM/DD/YYYY": return `${mm}/${dd}/${yyyy}`;
      case "YYYY-MM-DD": return `${yyyy}-${mm}-${dd}`;
      case "DD/MM/YYYY":
      default: return `${dd}/${mm}/${yyyy}`;
    }
  }, [prefs.date_format]);

  return (
    <SettingsContext.Provider value={{ prefs, applyPrefs, formatCurrency, formatDate, lang, setLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
