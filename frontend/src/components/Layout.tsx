import { useState, useEffect, useRef } from "react";
import type { Page } from "../App";
import {
  LayoutDashboard, Package, Receipt, Users, TrendingDown,
  BarChart2, FileText, Lightbulb, Bell, Settings, HelpCircle,
  ChevronLeft, ChevronRight, Menu, X, Store, LogOut,
  ChevronDown, User as UserIcon, AlertTriangle, ArrowRight, Info
} from "lucide-react";
import { authApi, resolveAssetUrl, notificationApi, productApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

const navItems = [
  { id: "dashboard" as Page, key: "dashboard", icon: LayoutDashboard },
  { id: "inventory" as Page, key: "inventory", icon: Package },
  { id: "billing" as Page, key: "billing", icon: Receipt },
  { id: "customers" as Page, key: "customers", icon: Users },
  { id: "expenses" as Page, key: "expenses", icon: TrendingDown },
  { id: "sales" as Page, key: "sales", icon: BarChart2 },
  { id: "reports" as Page, key: "reports", icon: FileText },
  { id: "insights" as Page, key: "insights", icon: Lightbulb },
];

const bottomNav = [
  { id: "notifications" as Page, key: "notifications", icon: Bell },
  { id: "settings" as Page, key: "settings", icon: Settings },
];

interface Props {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Layout({ children, currentPage, onNavigate }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { user, setUser } = useAuth();
  const { t } = useSettings();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // App-wide low-stock banner: fetched here (not just on the Dashboard) so
  // it's visible no matter which page the shop owner is on — restocking
  // is time-sensitive and shouldn't require navigating to Dashboard first.
  useEffect(() => {
    let cancelled = false;
    const loadLowStock = () => {
      productApi.getAll("", "", "attention").then((res) => {
        if (cancelled) return;
        setLowStockItems(res.data || []);
      }).catch(() => { });
    };
    loadLowStock();
    const interval = setInterval(loadLowStock, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentPage]);

  // Re-show the banner if the low-stock list changes (e.g. something new
  // just went low) even if the user dismissed it earlier this session.
  const lowStockKey = lowStockItems.map((p: any) => `${p.id}:${p.stock}`).join(",");
  useEffect(() => { setBannerDismissed(false); }, [lowStockKey]);

  // Keep the bell badge in sync with real unread notifications instead of
  // always showing a static dot: fetch on mount/page change, and refresh
  // periodically so it reflects notifications created while the app is open.
  useEffect(() => {
    let cancelled = false;
    const loadUnread = () => {
      notificationApi.getAll().then((res) => {
        if (cancelled) return;
        const count = (res.data || []).filter((n: any) => !n.read).length;
        setUnreadCount(count);
      }).catch(() => { });
    };
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentPage]);

  useEffect(() => { setMobileOpen(false); }, [currentPage]);
  useEffect(() => { setProfileMenuOpen(false); }, [currentPage]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.name || "My Account";
  const displayRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Owner";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";
  const avatarUrl = resolveAssetUrl(user?.avatar_url);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch (e) { }
    setUser(null);
    onNavigate("login");
  };

  const Avatar = ({ size = 32 }: { size?: number }) => (
    avatarUrl ? (
      <img
        src={avatarUrl}
        alt={displayName}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    ) : (
      <div
        className="rounded-full bg-[#3B5BDB] flex items-center justify-center text-white font-semibold flex-shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    )
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-[#3B5BDB] flex items-center justify-center flex-shrink-0">
          <Store size={16} color="#fff" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-display font-extrabold text-white text-[15px] leading-tight">DukaanMitra</div>
            <div className="text-[10px] text-slate-400">{t("shopManagementTagline")}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ id, key, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`sidebar-link w-full ${currentPage === id ? "active" : ""} ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? t(key) : undefined}
          >
            <Icon size={18} />
            {!collapsed && <span>{t(key)}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="p-3 border-t border-white/10 space-y-0.5">
        {bottomNav.map(({ id, key, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`sidebar-link w-full ${currentPage === id ? "active" : ""} ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? t(key) : undefined}
          >
            <Icon size={18} />
            {!collapsed && <span>{t(key)}</span>}
          </button>
        ))}
        <button onClick={() => onNavigate("help")} className={`sidebar-link w-full ${currentPage === "help" ? "active" : ""} ${collapsed ? "justify-center" : ""}`} title={t("help")}>
          <HelpCircle size={18} />
          {!collapsed && <span>{t("help")}</span>}
        </button>
        <button onClick={handleLogout} className={`sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-400/10 ${collapsed ? "justify-center" : ""}`} title={t("logout")}>
          <LogOut size={18} />
          {!collapsed && <span>{t("logout")}</span>}
        </button>
      </div>

      {/* User profile */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => onNavigate("settings")}
          className={`flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors w-full ${collapsed ? "justify-center" : ""}`}
        >
          <Avatar size={32} />
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-bold text-white truncate">{displayName}</div>
              <div className="text-[11px] text-slate-400 truncate">{displayRole}</div>
            </div>
          )}
          {!collapsed && <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA]">
      {/* App-wide low-stock banner — sits above BOTH the sidebar and the
          top bar (not inside the content area), spans the full window
          width, and pushes everything else down. Horizontally scrollable
          chips so it stays a single compact row no matter how many items
          need attention. */}
      {!bannerDismissed && lowStockItems.length > 0 && (
        <div className="low-stock-banner flex items-center gap-3 pl-4 pr-2 py-2 flex-shrink-0">
          <AlertTriangle size={16} className="lsb-icon flex-shrink-0" />
          <span className="lsb-label text-xs font-bold flex-shrink-0 hidden sm:inline whitespace-nowrap">{t("stockAttentionTitle")}:</span>
          <div className="flex-1 min-w-0 overflow-x-auto flex items-center gap-2 py-0.5">
            {lowStockItems.map((item: any) => (
              <button
                key={item.id}
                onClick={() => onNavigate("inventory")}
                className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${item.stock === 0 ? "low-stock-chip-urgent" : "low-stock-chip"}`}
              >
                {item.name}
                <span className="opacity-80">· {item.stock} {t("itemsLeft")}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => onNavigate("inventory")}
            className="low-stock-cta flex-shrink-0 hidden sm:flex items-center gap-1 text-xs font-bold whitespace-nowrap transition-colors"
          >
            {t("reviewInventory")} <ArrowRight size={12} />
          </button>
          <button
            onClick={() => setBannerDismissed(true)}
            className="low-stock-dismiss flex-shrink-0 p-1.5 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden md:flex flex-col bg-[#1E2A3B] transition-all duration-300 flex-shrink-0 relative ${collapsed ? "w-[60px]" : "w-[220px]"}`}
        >
          <SidebarContent />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-[72px] w-6 h-6 bg-white border border-[#E4E7EC] rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 z-10 transition-colors"
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="relative w-[220px] bg-[#1E2A3B] h-full flex flex-col">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-14 bg-white border-b border-[#E4E7EC] flex items-center px-4 gap-4 flex-shrink-0">
            <button
              className="md:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>

            <div className="ml-auto flex items-center gap-3">
              <button
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => onNavigate("notifications")}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="cursor-pointer flex items-center"
                  title={displayName}
                >
                  <Avatar size={32} />
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white border border-[#E4E7EC] rounded-xl shadow-lg py-2 z-50">
                    <div className="px-4 py-2.5 border-b border-[#E4E7EC] flex items-center gap-3">
                      <Avatar size={36} />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#1E2A3B] truncate">{displayName}</div>
                        <div className="text-[11px] text-gray-400 truncate">{user?.email || ""}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setProfileMenuOpen(false); onNavigate("settings"); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <UserIcon size={15} /> {t("profile")}
                    </button>
                    <button
                      onClick={() => { setProfileMenuOpen(false); onNavigate("settings"); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Settings size={15} /> {t("settings")}
                    </button>
                    <button
                      onClick={() => { setProfileMenuOpen(false); onNavigate("about"); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Info size={15} /> {t("aboutDukaanMitra")}
                    </button>
                    <div className="border-t border-[#E4E7EC] mt-1 pt-1">
                      <button
                        onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={15} /> {t("logout")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E4E7EC] flex md:hidden z-40">
        {[...navItems.slice(0, 4), ...bottomNav.slice(0, 1)].map(({ id, key, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${currentPage === id ? "text-[#3B5BDB]" : "text-gray-400"}`}
          >
            <Icon size={18} />
            <span>{t(key)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
