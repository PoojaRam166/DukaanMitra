import React, { useState, useEffect } from "react";
import { Bell, Package, AlertTriangle, CheckCircle, Info, Check } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { notificationApi } from "../services/api";
import { useSettings } from "../context/SettingsContext";

const icons: Record<string, React.ReactElement> = {
  alert: <AlertTriangle size={16} className="text-red-600" />,
  warning: <Package size={16} className="text-amber-600" />,
  info: <Info size={16} className="text-blue-600" />,
  success: <CheckCircle size={16} className="text-green-600" />,
};

const iconBgs: Record<string, string> = {
  alert: "bg-[#FEE2E2]",
  warning: "bg-[#FEF3C7]",
  info: "bg-[#EEF2FF]",
  success: "bg-[#DCFCE7]",
};

const priorityBadge: Record<string, string> = {
  critical: "badge-danger",
  high: "badge-warning",
  medium: "badge-info",
  normal: "badge-gray",
};

// The backend stores a static "time" label at creation time, which would
// stay stuck on "Just now" forever. Compute a live relative time from
// created_at instead so it actually ages (e.g. "2h ago", "3d ago").
function timeAgo(createdAt: string): string {
  const then = new Date(createdAt).getTime();
  if (isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function Notifications() {
  const { t } = useSettings();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchNotifs = () => {
    notificationApi.getAll().then(res => {
      setNotifs(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const markRead = async (id: number) => {
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
    await notificationApi.markRead(id);
  };
  
  const markAllRead = async () => {
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
    await notificationApi.markAllRead();
  };

  const filtered = filter === "All" ? notifs : filter === "Unread" ? notifs.filter((n) => !n.read) : notifs.filter((n) => n.priority === filter.toLowerCase());
  const unread = notifs.filter((n) => !n.read).length;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">Loading notifications...</div>;
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-3xl mx-auto fade-in">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {t("notifications")}
            {unread > 0 && (
              <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{unread}</span>
            )}
          </span>
        }
        subtitle={t("notificationsSubtitle")}
      >
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm py-2">
            <Check size={13} /> Mark all read
          </button>
        )}
      </PageHeader>

      <div className="flex gap-2 mb-5 flex-wrap">
        {["All", "Unread", "Critical", "High", "Medium"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filter === f ? "bg-[#3B5BDB] text-white" : "bg-white border border-[#E4E7EC] text-gray-500 hover:bg-gray-50"}`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-[#EEF2FF] rounded-2xl flex items-center justify-center mb-4">
            <Bell size={26} className="text-[#3B5BDB]" />
          </div>
          <h3 className="font-display font-bold text-base mb-1">All caught up!</h3>
          <p className="text-sm text-gray-400">No notifications to show here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl border p-4 transition-all cursor-pointer hover:shadow-sm ${n.read ? "border-[#E4E7EC] opacity-70" : "border-[#E4E7EC] border-l-4 border-l-[#3B5BDB]"}`}
              onClick={() => markRead(n.id)}
            >
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgs[n.icon]}`}>
                  {icons[n.icon]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`text-sm font-semibold ${n.read ? "text-gray-500" : "text-[#1E2A3B]"}`}>{n.title}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge text-[10px] ${priorityBadge[n.priority]}`}>{n.priority}</span>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-[#3B5BDB]" />}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-1.5">{n.description}</p>
                  <span className="text-[11px] text-gray-300">{timeAgo(n.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
