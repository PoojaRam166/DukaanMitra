import { useState } from "react";
import type { Page } from "../App";
import { Store, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';

export default function Login({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { refreshUser } = useAuth();
  const { t } = useSettings();
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true); 
    setError(""); 
    setSuccess("");
    try { 
      const phoneDigits = phone.replace(/\D/g, '');
      await authApi.login(phoneDigits, password); 
      await refreshUser(); 
      onNavigate("dashboard"); 
    } catch (err: any) { 
      setError(err.message || 'Login failed'); 
    } finally { 
      setLoading(false); 
    }
  };

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    ux_mode: 'popup',
    onSuccess: async (codeResponse) => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        await authApi.googleLogin(undefined, codeResponse.code, 'postmessage');
        await refreshUser();
        onNavigate("dashboard");
      } catch (err: any) {
        setError(err.message || 'Google Login failed');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google Login failed'),
  });

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#1E2A3B] flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#3B5BDB] flex items-center justify-center">
            <Store size={18} color="#fff" />
          </div>
          <span className="font-display font-extrabold text-xl text-white">DukaanMitra</span>
        </div>

        <div>
          <div className="bg-white/10 rounded-2xl p-6 mb-8">
            <div className="text-xs text-slate-400 mb-1 font-medium">Today's Sales</div>
            <div className="font-display font-extrabold text-3xl text-white mb-1">₹24,850</div>
            <div className="text-sm text-green-400 font-semibold">↑ 18.4% from yesterday</div>
            <div className="mt-4 flex items-end gap-1 h-14">
              {[40, 65, 50, 80, 70, 90, 75].map((h, i) => (
                <div key={i} className="flex-1 rounded-t transition-all" style={{ height: `${h}%`, background: i === 5 ? "#3B5BDB" : "rgba(255,255,255,0.2)" }} />
              ))}
            </div>
          </div>

          <blockquote className="text-slate-300 text-base leading-relaxed mb-4">
            "DukaanMitra has made managing my kirana store so easy. I can see exactly what's selling and what's running low."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#3B5BDB] flex items-center justify-center text-white font-bold text-sm">S</div>
            <div>
              <div className="text-sm font-semibold text-white">Suresh Kumar</div>
              <div className="text-xs text-slate-400">Kumar General Store, Jaipur</div>
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-xs">© {new Date().getFullYear()} DukaanMitra. Your shop, smarter and simpler.</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <button
          onClick={() => onNavigate("landing")}
          className="self-start mb-8 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} /> {t("backToHome")}
        </button>

        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#3B5BDB] flex items-center justify-center">
              <Store size={15} color="#fff" />
            </div>
            <span className="font-display font-extrabold text-lg">DukaanMitra</span>
          </div>

          <h1 className="font-display font-extrabold text-2xl text-[#1E2A3B] mb-1">
            {t("welcomeBack")}
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            {t("signInSubtitle")}
          </p>

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200">
              <p className="text-sm text-green-700 font-medium">{success}</p>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#1E2A3B] mb-1.5">Mobile Number</label>
              <input
                type="tel"
                className="input-field"
                placeholder="+91 98765 43210"
                autoComplete="username"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1E2A3B] mb-1.5">
                {t("password")}
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className="input-field pr-10"
                  placeholder={t("enterYourPassword")}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 transition-colors"
                >
                  {!showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded accent-[#3B5BDB]" required />
                <label htmlFor="remember" className="text-sm text-gray-600">{t("rememberMe")}</label>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 text-[15px]" style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? t("signingIn") : t("signInToMyShop")}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#F7F8FA] text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => googleLogin()}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg py-2.5 hover:bg-gray-50 transition-colors font-semibold text-gray-700"
              >
                <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Sign in with Google
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t("dontHaveAccount")}{" "}
            <button onClick={() => onNavigate("register")} className="text-[#3B5BDB] font-semibold hover:underline">
              {t("createAccount")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
