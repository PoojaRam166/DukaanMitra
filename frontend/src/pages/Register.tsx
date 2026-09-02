import { useState } from "react";
import type { Page } from "../App";
import { Store, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

function PasswordStrength({ password }: { password: string }) {
  const { t } = useSettings();
  const checks = [
    { label: t("pw8Chars"), pass: password.length >= 8 },
    { label: t("pwUppercase"), pass: /[A-Z]/.test(password) },
    { label: t("pwNumber"), pass: /[0-9]/.test(password) },
    { label: t("pwSpecialChar"), pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const labels = [t("pwWeak"), t("pwFair"), t("pwGood"), t("pwStrong")];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i < score ? colors[score - 1] : "bg-gray-200"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {password ? labels[score - 1] || t("pwWeak") : ""}
        </span>
        <div className="flex gap-3">
          {checks.map(({ label, pass }) => (
            <span key={label} className={`text-[10px] flex items-center gap-0.5 ${pass ? "text-green-600" : "text-gray-400"}`}>
              <CheckCircle size={10} /> {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Register({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { refreshUser } = useAuth();
  const { t } = useSettings();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "",
    shopName: "", phone: "", address: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-10 px-6 flex flex-col items-center">
      <button
        onClick={() => onNavigate("landing")}
        className="self-start mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors max-w-2xl w-full mx-auto cursor-pointer"
      >
        <ArrowLeft size={15} /> {t("backToHome")}
      </button>

      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#3B5BDB] flex items-center justify-center">
            <Store size={18} color="#fff" />
          </div>
          <span className="font-display font-extrabold text-xl">DukaanMitra</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E7EC] p-8">
          <h1 className="font-display font-extrabold text-2xl text-[#1E2A3B] mb-1">{t("createYourAccount")}</h1>
          <p className="text-sm text-gray-500 mb-8">{t("registerSubtitle")}</p>

          <form onSubmit={async (e) => {
            e.preventDefault();
            
            // Validate Phone Number (exactly 10 digits)
            const phoneDigits = form.phone.replace(/\D/g, '');
            if (phoneDigits.length !== 10) {
              setError("Please enter a valid 10-digit mobile number.");
              return;
            }

            if (form.password !== form.confirm) { setError(t("passwordsDontMatch")); return; }
            setLoading(true);
            setError("");
            try {
              // Pass the sanitized 10-digit phone number
              await authApi.register(form.name, phoneDigits, form.email, form.password);
              await refreshUser();
              onNavigate("dashboard");
            } catch (err: any) {
              setError(err.message || "Registration failed. Please try again.");
            } finally {
              setLoading(false);
            }
          }} className="space-y-6">
            {/* Personal Info */}
            <div>
              <h3 className="font-display font-bold text-sm text-gray-400 uppercase tracking-wider mb-4">{t("personalInformation")}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1E2A3B] mb-1.5">{t("fullName")}</label>
                  <input className="input-field" placeholder="Raj Sharma" value={form.name} onChange={set("name")} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1E2A3B] mb-1.5">{t("email")} <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input type="email" className="input-field" placeholder="you@example.com" autoComplete="username" value={form.email} onChange={set("email")} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1E2A3B] mb-1.5">{t("password")}</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      className="input-field pr-10"
                      placeholder={t("createPassword")}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={set("password")}
                      required
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <PasswordStrength password={form.password} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1E2A3B] mb-1.5">{t("confirmPassword")}</label>
                  <input
                    type="password"
                    className={`input-field ${form.confirm && form.confirm !== form.password ? "border-red-400 focus:border-red-400" : ""}`}
                    placeholder={t("repeatPassword")}
                    autoComplete="new-password"
                    value={form.confirm}
                    onChange={set("confirm")}
                    required
                  />
                  {form.confirm && form.confirm !== form.password && (
                    <p className="text-xs text-red-500 mt-1">{t("passwordsDontMatch")}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Shop Info */}
            <div>
              <h3 className="font-display font-bold text-sm text-gray-400 uppercase tracking-wider mb-4">{t("shopInformation")}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1E2A3B] mb-1.5">{t("shopName")}</label>
                  <input className="input-field" placeholder="Sharma General Store" value={form.shopName} onChange={set("shopName")} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1E2A3B] mb-1.5">{t("phoneNumber")}</label>
                  <input type="tel" className="input-field" placeholder="+91 98765 43210" value={form.phone} onChange={set("phone")} required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-[#1E2A3B] mb-1.5">{t("shopAddress")}</label>
                  <input className="input-field" placeholder="123, Main Market, Your City" value={form.address} onChange={set("address")} />
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-[15px]" style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? t("creatingAccount") : t("createMyShopAccount")}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t("alreadyHaveAccount")}{" "}
            <button onClick={() => onNavigate("login")} className="text-[#3B5BDB] font-semibold hover:underline">{t("signIn")}</button>
          </p>
        </div>
      </div>
    </div>
  );
}
