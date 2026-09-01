import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Modal } from "../components/ui/Modal";
import { FormInput } from "../components/ui/FormInput";
import { expenseApi } from "../services/api";
import { useSettings } from "../context/SettingsContext";

const categories = ["Rent", "Electricity", "Staff Salary", "Packaging", "Transport", "Repairs", "Marketing", "Miscellaneous"];

// Returns today's date as YYYY-MM-DD using the browser's LOCAL time.
// (new Date().toISOString() converts to UTC first, which rolls back to
// "yesterday" for users in +ve UTC offsets like IST during early morning
// hours — this was the real cause of "Today's Expenses" being wrong.)
const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Expenses() {
  const { t } = useSettings();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: "Rent", amount: "", desc: "", date: getLocalDateStr() });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await expenseApi.getAll();
      setExpenses(res.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, []);

  // Normalize both sides to a plain YYYY-MM-DD string before comparing,
  // using LOCAL date (see getLocalDateStr above) instead of UTC so the
  // comparison stays correct regardless of the user's timezone.
  const todayStr = getLocalDateStr();
  const today = expenses.filter((e) => String(e.date).slice(0, 10) === todayStr).reduce((s, e) => s + parseFloat(e.amount), 0);
  const month = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const largest = expenses.length > 0 ? Math.max(...expenses.map((e) => parseFloat(e.amount))) : 0;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { category: form.category, amount: form.amount, description: form.desc, date: form.date };
      if (editItem) await expenseApi.update(editItem.id, payload);
      else await expenseApi.create(payload);
      setShowAdd(false);
      setEditItem(null);
      setForm({ category: "Rent", amount: "", desc: "", date: getLocalDateStr() });
      fetchExpenses();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await expenseApi.delete(id);
      fetchExpenses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEdit = (exp: any) => {
    setForm({ category: exp.category, amount: exp.amount, desc: exp.description || "", date: exp.date?.split("T")[0] || exp.date });
    setEditItem(exp);
    setShowAdd(true);
  };

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-screen-xl mx-auto fade-in">
      <PageHeader title={t("expenses")} subtitle={t("expensesSubtitle")}>
        <button className="btn-primary" onClick={() => { setForm({ category: "Rent", amount: "", desc: "", date: getLocalDateStr() }); setEditItem(null); setShowAdd(true); }}>
          <Plus size={15} /> Add Expense
        </button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Today's Expenses", val: `₹${today.toLocaleString("en-IN")}`, color: "text-[#DC2626]" },
          { label: "This Month", val: `₹${month.toLocaleString("en-IN")}`, color: "text-[#D97706]" },
          { label: "Largest Expense", val: `₹${largest.toLocaleString("en-IN")}`, color: "text-[#3B5BDB]" },
        ].map(({ label, val, color }) => (
          <StatCard key={label} label={label} value={val} valueColor={color} centered />
        ))}
      </div>

      <Card noPadding>
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading expenses...</div>
        ) : (
          <Table columns={["Date", "Category", "Description", "Amount", "Actions"]} minWidth="500px">
            {expenses.map((e) => (
              <tr key={e.id} className="table-row border-b border-[#F3F4F6] last:border-0">
                <td className="py-3 px-4 text-gray-400 text-[13px] whitespace-nowrap">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                <td className="py-3 px-4"><span className="badge badge-info text-[11px]">{e.category}</span></td>
                <td className="py-3 px-4 text-gray-600 text-[13px]">{e.description}</td>
                <td className="py-3 px-4 font-bold text-[13px] text-red-600">-₹{parseFloat(e.amount).toLocaleString("en-IN")}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setEditItem(null); }} title={editItem ? "Edit Expense" : "Add Expense"} maxWidth="max-w-md">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Category</label>
            <select className="input-field" value={form.category} onChange={set("category")}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <FormInput label="Amount (₹)" type="number" placeholder="0" value={form.amount} onChange={set("amount")} required />
          <FormInput label="Description" placeholder="What was this expense for?" value={form.desc} onChange={set("desc")} required />
          <FormInput label="Date" type="date" value={form.date} onChange={set("date")} />
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => { setShowAdd(false); setEditItem(null); }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? "Saving..." : "Save Expense"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
