import { useState, useEffect } from "react";
import type { Page } from "../App";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Package, AlertTriangle, Receipt, DollarSign,
  Plus, ArrowRight, Calendar,
} from "lucide-react";
import { dashboardApi } from "../services/api";
import { useSettings } from "../context/SettingsContext";

export default function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { formatCurrency, t } = useSettings();

  const quickActions = [
    { label: t("createBill"), icon: Receipt, color: "#3B5BDB", bg: "#EEF2FF", page: "billing" },
    { label: t("addProduct"), icon: Package, color: "#16A34A", bg: "#DCFCE7", page: "inventory" },
    { label: t("addCustomer"), icon: Plus, color: "#D97706", bg: "#FEF3C7", page: "customers" },
    { label: t("addExpense"), icon: DollarSign, color: "#DC2626", bg: "#FEE2E2", page: "expenses" },
  ];

  const filters = [t("filterToday"), t("filter7Days"), t("filter30Days"), t("filterCustom")];
  const [activeFilterIdx, setActiveFilterIdx] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const [error, setError] = useState("");

  useEffect(() => {
    dashboardApi.get().then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message || "Failed to load dashboard data");
      setLoading(false);
    });
  }, []);

  // Keep the header date current even if the dashboard is left open across
  // midnight, without needing a page refresh.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? t("goodMorning") : hour < 17 ? t("goodAfternoon") : t("goodEvening");

  if (loading) {
    return <div className="p-6 flex justify-center items-center min-h-screen text-gray-500 text-sm">Loading dashboard...</div>;
  }
  
  if (error || !data) {
    return <div className="p-6 flex flex-col justify-center items-center min-h-screen text-red-500 text-sm">
      <p className="font-bold mb-2">Error loading dashboard</p>
      <p>{error || "No data received"}</p>
    </div>;
  }

  const getChange = (current: number, previous: number) => {
    if (!previous) return { text: "N/A", up: true };
    const diff = current - previous;
    const perc = (diff / previous) * 100;
    return { text: `${perc > 0 ? '+' : ''}${perc.toFixed(1)}%`, up: diff >= 0 };
  }

  const salesChange = getChange(data.today_sales, data.yesterday_sales);

  const stats = [
    { title: t("todaysSales"), value: formatCurrency(data.today_sales), change: salesChange.text, up: salesChange.up, icon: TrendingUp, accent: "#3B5BDB", bg: "#EEF2FF" },
    { title: t("yesterdaysSales"), value: formatCurrency(data.yesterday_sales), change: "", up: true, icon: TrendingUp, accent: "#16A34A", bg: "#DCFCE7" },
    { title: t("totalProducts"), value: data.total_products.toString(), change: `${data.out_of_stock} ${t("outOfStock")}`, up: data.out_of_stock === 0, icon: Package, accent: "#D97706", bg: "#FEF3C7" },
    { title: t("lowStockItems"), value: data.low_stock.toString(), change: t("needsAttention"), up: data.low_stock === 0, icon: AlertTriangle, accent: "#DC2626", bg: "#FEE2E2" },
    { title: t("billsToday"), value: data.today_bills.toString(), change: "", up: true, icon: Receipt, accent: "#3B5BDB", bg: "#EEF2FF" },
    { title: t("estProfit"), value: formatCurrency(data.est_profit), change: t("allTime"), up: data.est_profit >= 0, icon: DollarSign, accent: "#16A34A", bg: "#DCFCE7" },
  ];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-screen-xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#1E2A3B]">{greeting} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("dashboardSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E4E7EC] rounded-lg px-3 py-2 text-sm text-gray-600 cursor-pointer hover:border-[#3B5BDB]/40 transition-colors self-start sm:self-auto">
          <Calendar size={14} className="text-gray-400" />
          <span>{now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>

      {/* Low stock banner — the shop owner's #1 thing to notice at a glance,
          so it sits above everything else on the page, not buried in a
          sidebar card. Only renders when something actually needs action. */}
      {(data.out_of_stock > 0 || data.low_stock > 0) && (
        <button
          onClick={() => onNavigate("inventory")}
          className="stock-alert-card w-full flex items-center gap-4 p-4 rounded-xl hover:shadow-md transition-all text-left group"
        >
          <div className="stock-alert-icon-wrap alert-glow w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="stock-alert-icon" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="stock-alert-title text-sm font-bold">{t("stockAttentionTitle")}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {[
                data.out_of_stock > 0 ? `${data.out_of_stock} ${t("outOfStockShort")}` : null,
                data.low_stock > 0 ? `${data.low_stock} ${t("lowOnStockShort")}` : null,
              ].filter(Boolean).join(" · ")}
              {data.low_stock_products?.length > 0 && (
                <span className="text-gray-400"> — {data.low_stock_products.slice(0, 3).map((p: any) => p.name).join(", ")}{data.low_stock_products.length > 3 ? "…" : ""}</span>
              )}
            </p>
          </div>
          <span className="stock-alert-cta hidden sm:flex items-center gap-1 text-xs font-bold flex-shrink-0 group-hover:gap-1.5 transition-all">
            {t("reviewInventory")} <ArrowRight size={13} />
          </span>
        </button>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(({ title, value, change, up, icon: Icon, accent, bg }) => {
          // The low-stock card gets an extra visual nudge (red border/ring)
          // when it actually needs attention, so it doesn't blend in with
          // the five neutral stat cards next to it.
          const isUrgent = title === t("lowStockItems") && (data.low_stock > 0 || data.out_of_stock > 0);
          return (
            <div
              key={title}
              className={`stat-card fade-in ${isUrgent ? "ring-1 ring-red-100" : ""}`}
              style={isUrgent ? { borderColor: "#FCA5A5" } : undefined}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 font-medium">{title}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                  <Icon size={14} style={{ color: accent }} />
                </div>
              </div>
              <div className="font-display font-bold text-xl text-[#1E2A3B] mb-1">{value}</div>
              <div className={`text-[11px] font-semibold flex items-center gap-0.5 ${up ? "text-green-600" : "text-red-500"}`}>
                {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {change}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Sales chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E4E7EC] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h3 className="font-display font-semibold text-base text-[#1E2A3B]">{t("salesOverview")}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{t("dailyRevenueThisWeek")}</p>
            </div>
            <div className="flex gap-1 overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
              {filters.map((f, idx) => (
                <button
                  key={f}
                  onClick={() => setActiveFilterIdx(idx)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex-shrink-0 ${activeFilterIdx === idx ? "bg-[#3B5BDB] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.daily_sales.map((s: any) => ({ day: s.day, sales: parseFloat(s.sales) }))}>
              <defs>
                <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B5BDB" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3B5BDB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Sales"]} contentStyle={{ borderRadius: 8, border: "1px solid #E4E7EC", fontSize: 12 }} />
              <Area type="monotone" dataKey="sales" stroke="#3B5BDB" strokeWidth={2} fill="url(#sGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-[#E4E7EC] p-5">
          <h3 className="font-display font-semibold text-base text-[#1E2A3B] mb-4">{t("quickActions")}</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, icon: Icon, color, bg, page }) => (
              <button
                key={label}
                onClick={() => onNavigate(page as Page)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-[#E4E7EC] hover:border-transparent hover:shadow-md transition-all group"
                style={{ "--hover-bg": bg } as React.CSSProperties}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all" style={{ background: bg }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <span className="text-xs font-semibold text-gray-600 text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#E4E7EC]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("lowStockAlert")}</h4>
              {data.low_stock_products.length > 0 && (
                <button onClick={() => onNavigate("inventory")} className="text-[10px] font-semibold text-[#3B5BDB] hover:underline flex items-center gap-0.5">
                  {t("viewAll")} <ArrowRight size={10} />
                </button>
              )}
            </div>
            <div className="space-y-2">
              {data.low_stock_products.slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 truncate max-w-[130px]">{item.name}</span>
                  <span className={`badge text-[10px] py-0.5 ${item.stock === 0 ? "badge-danger" : item.stock <= item.min_stock / 2 ? "badge-warning" : "badge-gray"}`}>
                    {item.stock} {t("itemsLeft")}
                  </span>
                </div>
              ))}
              {data.low_stock_products.length === 0 && (
                <div className="text-xs text-gray-500">{t("allWellStocked")}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tables row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Top Selling Products */}
        <div className="bg-white rounded-xl border border-[#E4E7EC] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#E4E7EC]">
            <h3 className="font-display font-semibold text-base">{t("topSellingProducts")}</h3>
            <button onClick={() => onNavigate("sales")} className="text-xs text-[#3B5BDB] font-semibold flex items-center gap-1 hover:underline">
              {t("viewAll")} <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400">{t("tblProduct")}</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-400">{t("tblUnits")}</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-400">{t("tblRevenue")}</th>
                </tr>
              </thead>
              <tbody>
                {data.top_products.map((item: any) => (
                  <tr key={item.name} className="table-row border-b border-[#F3F4F6] last:border-0">
                    <td className="py-3 px-4 text-[13px] text-[#1E2A3B] font-medium">{item.name}</td>
                    <td className="py-3 px-4 text-right text-[13px] text-gray-500">{item.total_qty}</td>
                    <td className="py-3 px-4 text-right font-semibold text-[13px]">
                      <span className="text-green-600">{formatCurrency(item.total_revenue)}</span>
                    </td>
                  </tr>
                ))}
                {data.top_products.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500 text-xs">{t("noSalesDataYet")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Bills */}
        <div className="bg-white rounded-xl border border-[#E4E7EC] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#E4E7EC]">
            <h3 className="font-display font-semibold text-base">{t("recentBills")}</h3>
            <button onClick={() => onNavigate("billing")} className="text-xs text-[#3B5BDB] font-semibold flex items-center gap-1 hover:underline">
              {t("newBill")} <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400">{t("tblBillNo")}</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400">{t("tblCustomer")}</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-400">{t("tblAmount")}</th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-400">{t("tblStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_bills.map((bill: any) => (
                  <tr key={bill.bill_number} className="table-row border-b border-[#F3F4F6] last:border-0">
                    <td className="py-3 px-4 text-[13px] font-semibold text-[#3B5BDB]">{bill.bill_number}</td>
                    <td className="py-3 px-4">
                      <div className="text-[13px] text-[#1E2A3B] font-medium">{bill.customer_name || t("walkIn")}</div>
                      <div className="text-[10px] text-gray-400">{new Date(bill.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-[13px] font-bold text-[#1E2A3B]">{formatCurrency(bill.total)}</div>
                      <div className="text-[10px] text-gray-400 text-right">{bill.payment_method}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {bill.payment_method === "credit" ? (
                        <span className="badge badge-warning text-[10px]">Credit</span>
                      ) : (
                        <span className="badge badge-success text-[10px]">{t("paid")}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {data.recent_bills.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500 text-xs">{t("noBillsYet")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
