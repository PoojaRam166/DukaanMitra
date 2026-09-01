import { useState, useEffect, useRef } from "react";
import { User, Store, Shield, Settings as SettingsIcon, Bell, Eye, EyeOff, Loader2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { settingsApi, resolveAssetUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { LANGUAGE_OPTIONS, dbValueToCode } from "../i18n/translations";

const tabs = [
  { id: "profile", key: "tabProfile", icon: User },
  { id: "shop", key: "tabShopInfo", icon: Store },
  { id: "security", key: "tabSecurity", icon: Shield },
  { id: "preferences", key: "tabPreferences", icon: SettingsIcon },
  { id: "notifications", key: "tabNotifications", icon: Bell },
];

export default function Settings() {
  const { user, setUser } = useAuth();
  const { applyPrefs, setLanguage, t } = useSettings();
  const [tab, setTab] = useState("profile");
  const [showPw, setShowPw] = useState(false);
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [shopForm, setShopForm] = useState({ shop_name: "", phone: "", gst_number: "", address: "", upi_id: "" });
  const [prefForm, setPrefForm] = useState({ language: "", currency: "", theme: "", date_format: "" });
  const [notifForm, setNotifForm] = useState({
    notify_low_stock: true, notify_out_of_stock: true, notify_daily_sales: true,
    notify_large_bills: false, notify_new_customer: false, notify_monthly_reports: true
  });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    settingsApi.get().then(res => {
      setData(res.data);
      setProfileForm({ name: res.data.profile.name, email: res.data.profile.email });
      setAvatarUrl(res.data.profile.avatar_url || null);
      setShopForm({
        shop_name: res.data.settings.shop_name || "", phone: res.data.settings.phone || "",
        gst_number: res.data.settings.gst_number || "", address: res.data.settings.address || "",
        upi_id: res.data.settings.upi_id || ""
      });
      setPrefForm({
        language: res.data.settings.language, currency: res.data.settings.currency,
        theme: res.data.settings.theme, date_format: res.data.settings.date_format
      });
      setNotifForm({
        notify_low_stock: res.data.settings.notify_low_stock, notify_out_of_stock: res.data.settings.notify_out_of_stock,
        notify_daily_sales: res.data.settings.notify_daily_sales, notify_large_bills: res.data.settings.notify_large_bills,
        notify_new_customer: res.data.settings.notify_new_customer, notify_monthly_reports: res.data.settings.notify_monthly_reports
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const showSuccess = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await settingsApi.updateProfile(profileForm);
      if (user) setUser({ ...user, name: res.data.name, email: res.data.email });
      showSuccess();
    } catch (err: any) { setError(err.message); }
  };

  const saveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsApi.update(shopForm);
      showSuccess();
    } catch (err: any) { setError(err.message); }
  };

  const savePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsApi.update(prefForm);
      applyPrefs(prefForm as any);
      showSuccess();
    } catch (err: any) { setError(err.message); }
  };

  const saveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsApi.update(notifForm);
      showSuccess();
    } catch (err: any) { setError(err.message); }
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be 2MB or smaller.");
      return;
    }

    setError("");
    setAvatarUploading(true);
    try {
      const res = await settingsApi.uploadAvatar(file);
      setAvatarUrl(res.data.avatar_url || null);
      if (user) setUser({ ...user, avatar_url: res.data.avatar_url });
      showSuccess();
    } catch (err: any) {
      setError(err.message || "Could not upload photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await settingsApi.updatePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showSuccess();
    } catch (err: any) { setError(err.message); }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">Loading settings...</div>;
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto fade-in">
      <PageHeader
        title={t("settingsTitle")}
        subtitle={t("settingsSubtitle")}
      />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab list */}
        <div className="md:w-48 flex-shrink-0">
          <div className="relative">
            <div className="bg-white rounded-xl border border-[#E4E7EC] p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible settings-tabs-scroll">
              {tabs.map(({ id, key, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${tab === id ? "bg-[#EEF2FF] text-[#3B5BDB]" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  <Icon size={15} />
                  {t(key)}
                </button>
              ))}
            </div>
            {/* Fades the right edge on mobile to hint the tab row scrolls
               further (Preferences/Notifications are otherwise easy to miss
               since they sit past the initial viewport width). */}
            <div className="md:hidden pointer-events-none absolute top-0 right-0 h-full w-8 rounded-r-xl settings-tabs-fade" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <Card>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-semibold px-4 py-3 rounded-lg mb-5 flex items-center gap-2">
                {error}
              </div>
            )}
            
            {saved && (
              <div className="bg-[#DCFCE7] text-green-700 text-sm font-semibold px-4 py-3 rounded-lg mb-5 flex items-center gap-2">
                ✓ {t("changesSaved")}
              </div>
            )}

            {tab === "profile" && (
              <form onSubmit={saveProfile} className="space-y-5">
                <h2 className="font-display font-extrabold text-lg mb-4">{t("profileInformation")}</h2>
                <div className="flex items-center gap-4 mb-6">
                  {resolveAssetUrl(avatarUrl) ? (
                    <img src={resolveAssetUrl(avatarUrl)} alt={profileForm.name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#3B5BDB] flex items-center justify-center text-white font-display font-extrabold text-2xl">
                      {(profileForm.name || "U").trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoSelected}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                      disabled={avatarUploading}
                      className="btn-secondary text-sm py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {avatarUploading ? <Loader2 size={14} className="animate-spin" /> : null}
                      {avatarUploading ? t("uploading") : t("changePhoto")}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">{t("photoHint")}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">{t("fullName")}</label>
                    <input className="input-field" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">{t("emailAddress")}</label>
                    <input type="email" className="input-field" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} required />
                  </div>
                </div>
                <button type="submit" className="btn-primary">{t("saveChanges")}</button>
              </form>
            )}

            {tab === "shop" && (
              <form onSubmit={saveShop} className="space-y-4">
                <h2 className="font-display font-extrabold text-lg mb-4">{t("shopInformation")}</h2>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">{t("shopName")}</label>
                  <input className="input-field" value={shopForm.shop_name} onChange={e => setShopForm({ ...shopForm, shop_name: e.target.value })} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">{t("phoneNumber")}</label>
                    <input type="tel" className="input-field" value={shopForm.phone} onChange={e => setShopForm({ ...shopForm, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">{t("gstNumberOptional")}</label>
                    <input className="input-field" placeholder="22AAAAA0000A1Z5" value={shopForm.gst_number} onChange={e => setShopForm({ ...shopForm, gst_number: e.target.value })} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">{t("shopAddress")}</label>
                    <input className="input-field" value={shopForm.address} onChange={e => setShopForm({ ...shopForm, address: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">{t("upiId")}</label>
                    <input className="input-field" placeholder="e.g. yournumber@ybl" value={shopForm.upi_id} onChange={e => setShopForm({ ...shopForm, upi_id: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn-primary">{t("saveChanges")}</button>
              </form>
            )}

            {tab === "security" && (
              <form onSubmit={savePassword} className="space-y-4">
                <h2 className="font-display font-extrabold text-lg mb-4">{t("changePassword")}</h2>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">{t("currentPassword")}</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} required className="input-field pr-10" placeholder="Enter current password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">{t("newPassword")}</label>
                  <input type="password" required className="input-field" placeholder="Enter new password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">{t("confirmNewPassword")}</label>
                  <input type="password" required className="input-field" placeholder="Repeat new password" value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
                </div>
                <button type="submit" className="btn-primary">{t("updatePasswordBtn")}</button>
              </form>
            )}

            {tab === "preferences" && (
              <form onSubmit={savePreferences} className="space-y-5">
                <h2 className="font-display font-extrabold text-lg mb-4">{t("preferencesTitle")}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">{t("language")}</label>
                    <select
                      className="input-field"
                      value={dbValueToCode(prefForm.language)}
                      onChange={e => {
                        const code = e.target.value as any;
                        setLanguage(code); // changes the whole app immediately
                        setPrefForm({ ...prefForm, language: LANGUAGE_OPTIONS.find(o => o.code === code)?.dbValue || prefForm.language });
                      }}
                    >
                      {LANGUAGE_OPTIONS.map(opt => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">{t("currency")}</label>
                    <select className="input-field" value={prefForm.currency} onChange={e => setPrefForm({ ...prefForm, currency: e.target.value })}>
                      <option>₹ Indian Rupee (INR)</option>
                      <option>$ US Dollar (USD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">{t("theme")}</label>
                    <select
                      className="input-field"
                      value={prefForm.theme}
                      onChange={e => {
                        const theme = e.target.value;
                        setPrefForm({ ...prefForm, theme });
                        applyPrefs({ theme }); // live preview before saving
                      }}
                    >
                      <option value="Light">{t("themeLight")}</option>
                      <option value="Dark">{t("themeDark")}</option>
                      <option value="System Default">{t("themeSystem")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">{t("dateFormat")}</label>
                    <select className="input-field" value={prefForm.date_format} onChange={e => setPrefForm({ ...prefForm, date_format: e.target.value })}>
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary">{t("savePreferences")}</button>
              </form>
            )}

            {tab === "notifications" && (
              <form onSubmit={saveNotifications} className="space-y-5">
                <h2 className="font-display font-extrabold text-lg mb-4">{t("notificationPreferences")}</h2>
                {[
                  { label: "Low stock alerts", desc: "Get notified when products fall below minimum stock", key: "notify_low_stock" },
                  { label: "Out of stock alerts", desc: "Immediate alert when a product reaches zero stock", key: "notify_out_of_stock" },
                  { label: "Daily sales summary", desc: "Receive a daily summary of your shop's sales", key: "notify_daily_sales" },
                  { label: "Large bills", desc: "Notification for bills above a certain amount", key: "notify_large_bills" },
                  { label: "New customer added", desc: "Notify when a new customer is registered", key: "notify_new_customer" },
                  { label: "Monthly reports ready", desc: "Alert when monthly reports are generated", key: "notify_monthly_reports" },
                ].map(({ label, desc, key }) => (
                  <div key={label} className="flex items-start justify-between gap-4 py-3 border-b border-[#F3F4F6] last:border-0">
                    <div>
                      <div className="text-sm font-semibold text-[#1E2A3B]">{label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input type="checkbox" checked={(notifForm as any)[key]} onChange={(e) => setNotifForm({ ...notifForm, [key]: e.target.checked })} className="sr-only peer" />
                      <div className="w-10 h-5.5 bg-gray-200 peer-checked:bg-[#3B5BDB] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4.5 after:h-4.5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" style={{ height: "22px" }} />
                    </label>
                  </div>
                ))}
                <button type="submit" className="btn-primary">{t("savePreferences")}</button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
