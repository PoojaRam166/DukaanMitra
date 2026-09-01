import { useState, useEffect } from "react";
import { FileText, TrendingUp, TrendingDown, Package, Users, BarChart2, Download, ArrowRight, Loader2 } from "lucide-react";
import type { Page } from "../App";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { reportsApi } from "../services/api";
import { downloadPdf } from "../utils/pdf";
import { useSettings } from "../context/SettingsContext";

export default function Reports({ onNavigate }: { onNavigate?: (p: Page) => void }) {
  const { t } = useSettings();
  const [filter, setFilter] = useState("This Month");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [generating, setGenerating] = useState(false);
  const [customError, setCustomError] = useState("");

  useEffect(() => {
    setLoading(true);
    reportsApi.get(filter).then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filter]);

  if (loading || !data) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">Loading reports...</div>;
  }

  const reports = [
    {
      icon: BarChart2, title: "Sales Report", desc: "Complete sales breakdown with revenue, bills, and trends", color: "#3B5BDB", bg: "#EEF2FF",
      stats: [{ label: filter, val: `₹${parseFloat(data.salesStats.thisMonth).toLocaleString("en-IN")}` }, { label: "Bills", val: data.salesStats.bills }],
      page: "sales" as Page,
    },
    {
      icon: TrendingUp, title: "Profit Report", desc: "Revenue minus expenses to calculate net profit", color: "#16A34A", bg: "#DCFCE7",
      stats: [{ label: "Net Profit", val: `₹${parseFloat(data.profitStats.netProfit).toLocaleString("en-IN")}` }, { label: "Margin", val: data.profitStats.margin }],
      page: "dashboard" as Page,
    },
    {
      icon: TrendingDown, title: "Expense Report", desc: "All business expenses categorized and summarized", color: "#DC2626", bg: "#FEE2E2",
      stats: [{ label: filter, val: `₹${parseFloat(data.expenseStats.thisMonth).toLocaleString("en-IN")}` }, { label: "Categories", val: data.expenseStats.categories }],
      page: "expenses" as Page,
    },
    {
      icon: Package, title: "Inventory Report", desc: "Stock movement, valuation, and low stock analysis", color: "#D97706", bg: "#FEF3C7",
      stats: [{ label: "Total Value", val: `₹${parseFloat(data.inventoryStats.totalValue).toLocaleString("en-IN")}` }, { label: "Products", val: data.inventoryStats.products }],
      page: "inventory" as Page,
    },
    {
      icon: Users, title: "Customer Report", desc: "Customer activity, top buyers, and purchase frequency", color: "#7C3AED", bg: "#F5F3FF",
      stats: [{ label: "Total Customers", val: data.customerStats.totalCustomers }, { label: "Active", val: data.customerStats.active }],
      page: "customers" as Page,
    },
    {
      icon: FileText, title: "GST Report", desc: "Tax-ready sales and purchase data for compliance", color: "#0891B2", bg: "#ECFEFF",
      stats: [{ label: "Taxable Sales", val: `₹${parseFloat(data.gstStats.taxableSales).toLocaleString("en-IN")}` }, { label: "Est. GST", val: `₹${parseFloat(data.gstStats.gst).toLocaleString("en-IN")}` }],
      page: "billing" as Page,
    },
  ];

  const exportReportPdf = (title: string, desc: string, stats: { label: string; val: any }[]) => {
    downloadPdf(`${title.replace(/\s+/g, "_")}_${filter.replace(/\s+/g, "_")}`, {
      title,
      subtitle: `${desc} · Period: ${filter}`,
      sections: [
        {
          columns: ["Metric", "Value"],
          rows: stats.map((s) => [s.label, String(s.val)]),
        },
      ],
    });
  };

  const handleGenerateCustomReport = async () => {
    setCustomError("");
    if (!customRange.start || !customRange.end) {
      setCustomError("Please select both a start and end date.");
      return;
    }
    if (customRange.start > customRange.end) {
      setCustomError("Start date must be before end date.");
      return;
    }
    setGenerating(true);
    try {
      const res = await reportsApi.custom(customRange.start, customRange.end);
      const { summary, bills, expenses } = res.data;

      downloadPdf(`Custom_Report_${customRange.start}_to_${customRange.end}`, {
        title: "Custom Report",
        subtitle: `${customRange.start} to ${customRange.end}`,
        sections: [
          {
            heading: "Summary",
            columns: ["Metric", "Value"],
            rows: [
              ["Total Sales", summary.totalSales],
              ["Total Expenses", summary.totalExpenses],
              ["Net Profit", summary.netProfit],
              ["Bills Created", summary.billsCount],
              ["Inventory Value", summary.inventoryValue],
              ["Total Products", summary.products],
              ["Total Customers", summary.totalCustomers],
              ["Active Customers", summary.activeCustomers],
            ],
          },
          {
            heading: "Bills",
            columns: ["Bill Number", "Date", "Customer", "Payment Method", "Subtotal", "Discount %", "Total"],
            rows: bills.map((b: any) => [b.bill_number, new Date(b.created_at).toLocaleString("en-IN"), b.customer_name || "Walk-in", b.payment_method, b.subtotal, b.discount, b.total]),
          },
          {
            heading: "Expenses",
            columns: ["Date", "Category", "Description", "Amount"],
            rows: expenses.map((e: any) => [e.date, e.category, e.description || "", e.amount]),
          },
        ],
      });
    } catch (err: any) {
      setCustomError(err.message || "Could not generate report");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-screen-xl mx-auto fade-in">
      <PageHeader
        title={t("reports")}
        subtitle={t("reportsSubtitle")}
      >
        <div className="flex items-center gap-3">
          <select className="input-field w-auto text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>This Month</option>
            <option>Last Month</option>
            <option>Last 3 Months</option>
          </select>
        </div>
      </PageHeader>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {reports.map(({ icon: Icon, title, desc, color, bg, stats, page }) => (
          <Card key={title} className="hover:shadow-md transition-all group group-hover">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={22} style={{ color }} />
              </div>
              <button
                onClick={() => exportReportPdf(title, desc, stats)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Export"
              >
                <Download size={15} />
              </button>
            </div>

            <h3 className="font-display font-extrabold text-base text-[#1E2A3B] mb-1">{title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">{desc}</p>

            <div className="flex gap-4 mb-4">
              {stats.map(({ label, val }) => (
                <div key={label}>
                  <div className="font-display font-extrabold text-base" style={{ color }}>{val}</div>
                  <div className="text-[11px] text-gray-400">{label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => exportReportPdf(title, desc, stats)} className="btn-secondary flex-1 justify-center text-xs py-2 cursor-pointer" style={{ fontSize: "12px" }}>
                <Download size={12} /> Export PDF
              </button>
              <button
                onClick={() => onNavigate?.(page)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
                style={{ background: bg, color }}
              >
                View Report <ArrowRight size={12} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 bg-[#1E2A3B] rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-extrabold text-lg mb-1">Need a custom report?</h3>
            <p className="text-slate-400 text-sm">Select a date range and specific categories to generate a tailored report for your needs.</p>
            {customError && <p className="text-red-400 text-xs mt-1.5">{customError}</p>}
          </div>
          <div className="flex gap-3 flex-shrink-0 flex-wrap">
            <input
              type="date"
              className="input-field w-auto text-sm bg-white/10 border-white/20 text-white"
              value={customRange.start}
              max={customRange.end || undefined}
              onChange={(e) => setCustomRange((r) => ({ ...r, start: e.target.value }))}
            />
            <input
              type="date"
              className="input-field w-auto text-sm bg-white/10 border-white/20 text-white"
              value={customRange.end}
              min={customRange.start || undefined}
              onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))}
            />
            <button onClick={handleGenerateCustomReport} disabled={generating} className="btn-primary whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
