import { useState, useEffect } from "react";
import { Lightbulb, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Modal } from "../components/ui/Modal";
import { insightsApi, productApi } from "../services/api";
import { useSettings } from "../context/SettingsContext";

const demandColors: Record<string, { badge: string; bar: string }> = {
  high: { badge: "badge-danger", bar: "#DC2626" },
  critical: { badge: "badge-danger", bar: "#7C3AED" },
  medium: { badge: "badge-warning", bar: "#D97706" },
  low: { badge: "badge-success", bar: "#16A34A" },
};

const priorityColors: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-amber-400",
};

export default function Insights() {
  const { t } = useSettings();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [restockTarget, setRestockTarget] = useState<any>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockSaving, setRestockSaving] = useState(false);
  const [restockError, setRestockError] = useState("");
  const [restockSuccess, setRestockSuccess] = useState("");

  const fetchInsights = () => {
    insightsApi.get().then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const openRestock = (suggestion: any) => {
    setRestockTarget(suggestion);
    setRestockQty("");
    setRestockError("");
  };

  const closeRestock = () => {
    setRestockTarget(null);
    setRestockQty("");
    setRestockError("");
  };

  const submitRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(restockQty, 10);
    if (!qty || qty <= 0) {
      setRestockError("Enter a valid quantity greater than 0.");
      return;
    }
    setRestockSaving(true);
    setRestockError("");
    try {
      await productApi.restock(restockTarget.id, qty);
      closeRestock();
      setRestockSuccess(`Added ${qty} units to ${restockTarget.name}.`);
      setTimeout(() => setRestockSuccess(""), 3000);
      fetchInsights();
    } catch (err: any) {
      setRestockError(err.message || "Could not restock this product.");
    } finally {
      setRestockSaving(false);
    }
  };

  if (loading || !data) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">Loading insights...</div>;
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-screen-xl mx-auto fade-in space-y-6">
      <PageHeader
        title={t("insights")}
        subtitle={t("insightsSubtitle")}
      />

      {restockSuccess && (
        <div className="bg-[#DCFCE7] text-green-700 text-sm font-semibold px-4 py-3 rounded-lg flex items-center gap-2">
          ✓ {restockSuccess}
        </div>
      )}

      {/* Sales Forecast */}
      <Card
        title={
          <div className="flex items-center gap-2.5 mb-1 mt-[-4px]">
            <div className="w-8 h-8 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
              <TrendingUp size={16} className="text-[#3B5BDB]" />
            </div>
            <span>Sales Forecast</span>
          </div>
        }
      >
        <p className="text-xs text-gray-400 mb-5 ml-10 mt-[-20px]">Based on recent sales history — estimates only</p>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: "Estimated Tomorrow's Sales", val: `₹${data.forecast.tomorrow.min.toLocaleString("en-IN")} – ₹${data.forecast.tomorrow.max.toLocaleString("en-IN")}`, icon: "📅", sub: "Based on last 7 days average" },
            { label: "Estimated Next 7 Days Sales", val: `₹${data.forecast.next7Days.min.toLocaleString("en-IN")} – ₹${data.forecast.next7Days.max.toLocaleString("en-IN")}`, icon: "📈", sub: "Based on last 30 days average" },
          ].map(({ label, val, icon, sub }) => (
            <div key={label} className="bg-[#F7F8FA] rounded-xl p-5 border border-[#E4E7EC]">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-xs text-gray-400 font-medium mb-1">{label}</div>
              <div className="font-display font-extrabold text-xl text-[#3B5BDB] mb-1">{val}</div>
              <div className="text-[11px] text-gray-400 italic">{sub}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Stock Demand */}
      <Card
        noPadding
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#FEF3C7] rounded-xl flex items-center justify-center">
              <AlertTriangle size={16} className="text-[#D97706]" />
            </div>
            <div>
              <span>Stock Demand Analysis</span>
              <p className="text-xs text-gray-400 font-normal mt-0.5">Estimated days remaining based on average daily sales</p>
            </div>
          </div>
        }
      >
        <Table columns={["Product", "Current Stock", "Avg Daily Sales", "Days Remaining", "Demand"]} minWidth="600px">
          {data.stockDemand.map((p: any) => {
            const pct = Math.min(100, (p.days / 14) * 100);
            return (
              <tr key={p.name} className="table-row border-b border-[#F3F4F6] last:border-0">
                <td className="py-3 px-4 font-semibold text-[13px] text-[#1E2A3B]">{p.name}</td>
                <td className="py-3 px-4 text-[13px]">{p.stock} units</td>
                <td className="py-3 px-4 text-[13px] text-gray-500">{p.avgDaily}/day</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: demandColors[p.demand]?.bar || "#3B5BDB" }} />
                    </div>
                    <span className="text-[13px] font-semibold w-14">{p.days} days</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`badge text-[11px] ${demandColors[p.demand]?.badge}`}>{p.demand}</span>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {/* Restock Suggestions */}
      <Card
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
              <RefreshCw size={16} className="text-[#3B5BDB]" />
            </div>
            <div>
              <span>Restock Suggestions</span>
              <p className="text-xs text-gray-400 font-normal mt-0.5">Products that may need restocking soon</p>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          {data.restockSuggestions.map((s: any) => (
            <div key={s.name} className={`border-l-4 ${priorityColors[s.priority]} bg-[#F9FAFB] rounded-r-xl p-4`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-extrabold text-sm text-[#1E2A3B]">{s.name}</span>
                    <span className={`badge text-[10px] ${s.priority === "high" ? "badge-danger" : "badge-warning"}`}>
                      {s.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{s.msg}</p>
                  <div className="flex gap-4 text-[11px] text-gray-400">
                    <span>Stock: <strong className="text-gray-600">{s.stock}</strong></span>
                    <span>Avg daily: <strong className="text-gray-600">{s.avgDaily}/day</strong></span>
                    <span>Est. remaining: <strong className="text-red-500">{s.days} days</strong></span>
                  </div>
                </div>
                <button onClick={() => openRestock(s)} className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap flex-shrink-0 cursor-pointer">
                  + Add Stock
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={!!restockTarget} onClose={closeRestock} title="Add Stock" maxWidth="max-w-sm">
        {restockTarget && (
          <form className="space-y-4" onSubmit={submitRestock}>
            <div>
              <div className="font-display font-extrabold text-sm text-[#1E2A3B]">{restockTarget.name}</div>
              <div className="text-xs text-gray-400 mt-1">Current stock: {restockTarget.stock} units · Avg daily sales: {restockTarget.avgDaily}/day</div>
            </div>
            {restockError && (
              <div className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-2 rounded-lg">{restockError}</div>
            )}
            <div>
              <label className="block text-sm font-semibold mb-1.5">Quantity to add</label>
              <input
                type="number"
                min={1}
                autoFocus
                className="input-field"
                placeholder="e.g. 50"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" className="btn-secondary flex-1 justify-center" onClick={closeRestock}>Cancel</button>
              <button type="submit" disabled={restockSaving} className="btn-primary flex-1 justify-center">{restockSaving ? "Adding..." : "Add Stock"}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
