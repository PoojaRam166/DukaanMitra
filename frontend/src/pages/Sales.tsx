import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Receipt, ShoppingCart, Package } from "lucide-react";
import type { Page } from "../App";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { salesApi } from "../services/api";
import { useSettings } from "../context/SettingsContext";

const filters = ["Today", "Yesterday", "7 Days", "30 Days"];

export default function Sales({ onNavigate }: { onNavigate?: (p: Page) => void }) {
  const { t } = useSettings();
  const [activeFilter, setActiveFilter] = useState("7 Days");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    salesApi.get(activeFilter).then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activeFilter]);

  if (loading || !data) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">Loading sales data...</div>;
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-screen-xl mx-auto fade-in space-y-6">
      <PageHeader
        title={t("sales")}
        subtitle={t("salesSubtitle")}
      >
        <div className="flex gap-1 flex-wrap">
          {filters.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${activeFilter === f ? "bg-[#3B5BDB] text-white" : "bg-white border border-[#E4E7EC] text-gray-500 hover:bg-gray-50"}`}>
              {f}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sales", val: `₹${parseFloat(data.summary.total_sales).toLocaleString("en-IN")}`, icon: TrendingUp, color: "#3B5BDB", bg: "#EEF2FF", page: "reports" as Page },
          { label: "Bills Created", val: data.summary.bills_created, icon: Receipt, color: "#16A34A", bg: "#DCFCE7", page: "billing" as Page },
          { label: "Avg Order Value", val: `₹${parseFloat(data.summary.avg_order_value).toLocaleString("en-IN")}`, icon: ShoppingCart, color: "#D97706", bg: "#FEF3C7", page: "billing" as Page },
          { label: "Items Sold", val: data.summary.items_sold, icon: Package, color: "#DC2626", bg: "#FEE2E2", page: "inventory" as Page },
        ].map(({ label, val, icon: Icon, color, bg, page }) => (
          <StatCard
            key={label}
            title={label}
            value={val}
            icon={Icon}
            iconColor={color}
            iconBg={bg}
            valueColor={`text-[${color}]`}
            onClick={onNavigate ? () => onNavigate(page) : undefined}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2" title="Sales Trend">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.trendData}>
              <defs>
                <linearGradient id="sGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B5BDB" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3B5BDB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Sales"]} contentStyle={{ borderRadius: 8, border: "1px solid #E4E7EC", fontSize: 12 }} />
              <Area type="monotone" dataKey="sales" stroke="#3B5BDB" strokeWidth={2} fill="url(#sGrad2)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Payment Methods">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={data.paymentData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {data.paymentData.map(({ color }: any, i: number) => <Cell key={i} fill={color} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, ""]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {data.paymentData.map(({ name, value, color }: any) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-gray-600">{name === "credit" ? "Credit (Pay Later)" : String(name).charAt(0).toUpperCase() + String(name).slice(1)}</span>
                </div>
                <span className="font-bold" style={{ color }}>{value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card noPadding title="Daily Sales">
          <Table columns={["Date", "Bills", "Sales", "Avg Order"]} minWidth="400px">
            {data.dateTable.map((d: any) => (
              <tr key={d.date} className="table-row border-b border-[#F3F4F6] last:border-0">
                <td className="py-3 px-4 text-[13px] text-gray-600">{d.date}</td>
                <td className="py-3 px-4 text-[13px] font-semibold">{d.bills}</td>
                <td className="py-3 px-4 text-[13px] font-bold text-green-600">₹{parseFloat(d.sales).toLocaleString("en-IN")}</td>
                <td className="py-3 px-4 text-[13px] text-gray-500">₹{parseFloat(d.avg).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Best Selling Products">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.bestProducts} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} width={130} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#3B5BDB" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
