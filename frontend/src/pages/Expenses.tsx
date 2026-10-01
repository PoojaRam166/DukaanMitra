import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Edit2, TrendingDown, Mic } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Modal } from "../components/ui/Modal";
import { FormInput } from "../components/ui/FormInput";
import { expenseApi, chatApi } from "../services/api";
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
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleVoiceExpense = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice Input.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = async (event: any) => {
      recognition.stop();
      setIsListening(false);
      const transcript = event.results[0][0].transcript;
      try {
        setLoading(true);
        const res = await chatApi.parseExpense(transcript);
        if (res.data) {
           setForm({
              category: res.data.category || "Miscellaneous",
              amount: res.data.amount.toString(),
              desc: res.data.description || transcript,
              date: getLocalDateStr()
           });
           setEditItem(null);
           setShowAdd(true);
        }
      } catch (e) {
        alert("Could not parse expense from voice.");
      } finally {
        setLoading(false);
      }
    };
    recognition.start();
  };

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
  const currentMonthStr = todayStr.slice(0, 7); // "YYYY-MM"

  const today = expenses.filter((e) => String(e.date).slice(0, 10) === todayStr).reduce((s, e) => s + parseFloat(e.amount), 0);
  const month = expenses.filter((e) => String(e.date).slice(0, 7) === currentMonthStr).reduce((s, e) => s + parseFloat(e.amount), 0);
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
        <div className="flex gap-2">
          <button 
            className={`btn-secondary ${isListening ? 'animate-pulse text-red-500 border-red-500' : ''}`}
            onClick={toggleVoiceExpense}
          >
            <Mic size={15} /> {isListening ? "Listening..." : "Speak to Add"}
          </button>
          <button className="btn-primary" onClick={() => { setForm({ category: "Rent", amount: "", desc: "", date: getLocalDateStr() }); setEditItem(null); setShowAdd(true); }}>
            <Plus size={15} /> Add Expense
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        {[
          { label: "Today's Expenses", val: `₹${today.toLocaleString("en-IN")}`, color: "text-[#DC2626]" },
          { label: "This Month", val: `₹${month.toLocaleString("en-IN")}`, color: "text-[#D97706]" },
          { label: "Largest Expense", val: `₹${largest.toLocaleString("en-IN")}`, color: "text-[#3B5BDB]" },
        ].map(({ label, val, color }, idx) => (
          <StatCard className={idx === 2 ? "col-span-2 md:col-span-1" : ""} key={label} label={label} value={val} valueColor={color} centered />
        ))}
      </div>

      <Card noPadding>
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 text-sm">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-[#FEE2E2] rounded-2xl flex items-center justify-center mb-4">
              <TrendingDown size={26} className="text-[#DC2626]" />
            </div>
            <h3 className="font-display font-extrabold text-base text-[#1E2A3B] mb-1">No expenses yet</h3>
            <p className="text-sm text-gray-500 mb-4">Add your first expense to start tracking</p>
            <button className="btn-primary" onClick={() => { setForm({ category: "Rent", amount: "", desc: "", date: getLocalDateStr() }); setEditItem(null); setShowAdd(true); }}>
              <Plus size={14} /> Add Expense
            </button>
          </div>
        ) : (
          <Table columns={["Date", "Category", "Description", "Amount", "Actions"]} minWidth="500px">
            {expenses.map((e) => (
              <tr key={e.id} className="table-row border-b border-[#F3F4F6] last:border-0">
                <td className="py-3 px-4 text-gray-500 text-[13px] whitespace-nowrap">{new Date(e.date).toLocaleDateString("en-IN")}</td>
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
