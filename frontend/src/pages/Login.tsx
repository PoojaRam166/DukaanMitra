import { useState } from "react";
import type { Page } from "../App";
import { Store, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

export default function Login({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { refreshUser } = useAuth();
  const { t } = useSettings();
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Forgot password states
  const [isForgot, setIsForgot] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<1 | 2>(1); // 1 = request OTP, 2 = verify OTP & reset

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

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        throw new Error("Please enter a valid 10-digit mobile number.");
      }
      const res = await authApi.forgotPassword(phoneDigits);
      setSuccess(`OTP Sent! (Demo OTP: ${res.demo_otp})`);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const phoneDigits = phone.replace(/\D/g, '');
      await authApi.resetPassword(phoneDigits, otp, newPassword);
      setSuccess("Password reset successfully! Please login with your new password.");
      setIsForgot(false);
      setStep(1);
      setOtp("");
      setNewPassword("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

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

        <p className="text-slate-500 text-xs">© 2024 DukaanMitra. Your shop, smarter and simpler.</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <button
          onClick={() => isForgot ? setIsForgot(false) : onNavigate("landing")}
          className="self-start mb-8 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} /> {isForgot ? "Back to Login" : t("backToHome")}
        </button>

        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#3B5BDB] flex items-center justify-center">
              <Store size={15} color="#fff" />
            </div>
            <span className="font-display font-extrabold text-lg">DukaanMitra</span>
          </div>

          <h1 className="font-display font-extrabold text-2xl text-[#1E2A3B] mb-1">
            {isForgot ? "Reset Password" : t("welcomeBack")}
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            {isForgot ? "Enter your mobile number to receive an OTP." : t("signInSubtitle")}
          </p>

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200">
              <p className="text-sm text-green-700 font-medium">{success}</p>
            </div>
          )}

          {!isForgot ? (
            /* LOGIN FORM */
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-[#1E2A3B]">{t("password")}</label>
                  <a 
                    onClick={() => { setIsForgot(true); setError(""); setSuccess(""); }} 
                    className="text-xs text-[#3B5BDB] cursor-pointer hover:underline"
                  >
                    {t("forgotPassword")}
                  </a>
                </div>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded accent-[#3B5BDB]" />
                <label htmlFor="remember" className="text-sm text-gray-600">{t("rememberMe")}</label>
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 text-[15px]" style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? t("signingIn") : t("signInToMyShop")}
              </button>
            </form>
          ) : step === 1 ? (
            /* FORGOT PASSWORD: STEP 1 (REQUEST OTP) */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1E2A3B] mb-1.5">Mobile Number</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 text-[15px]" style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? "Sending OTP..." : "Send Reset OTP"}
              </button>
            </form>
          ) : (
            /* FORGOT PASSWORD: STEP 2 (VERIFY OTP & RESET) */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1E2A3B] mb-1.5">Enter OTP</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1E2A3B] mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    className="input-field pr-10"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 text-[15px]" style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          {!isForgot && (
            <p className="text-center text-sm text-gray-500 mt-6">
              {t("dontHaveAccount")}{" "}
              <button onClick={() => onNavigate("register")} className="text-[#3B5BDB] font-semibold hover:underline">
                {t("createAccount")}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
