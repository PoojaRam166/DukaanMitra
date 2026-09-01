import { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Eye, Package, X } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Modal } from "../components/ui/Modal";
import { SearchInput } from "../components/ui/SearchInput";
import { FormInput } from "../components/ui/FormInput";
import { productApi } from "../services/api";
import { useSettings } from "../context/SettingsContext";

const statusBadge: Record<string, string> = {
  in: "badge-success",
  low: "badge-warning",
  critical: "badge-danger",
  out: "badge-danger",
};

const statusLabel: Record<string, string> = {
  in: "In Stock",
  low: "Low Stock",
  critical: "Critical",
  out: "Out of Stock",
};

const defaultCategories = ["All", "Grains", "Dairy", "Oils", "Household", "Snacks", "Spices", "Personal Care"];
const stockFilters = ["All", "In Stock", "Low Stock", "Critical", "Out of Stock"];
const emptyForm = { name: "", sku: "", category: "", buyPrice: "", sellPrice: "", stock: "", minStock: "", unit: "piece" };

export default function Inventory() {
  const { t } = useSettings();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [backendStats, setBackendStats] = useState({ total: 0, inStock: 0, low: 0, out: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  // Tracks exactly one selected summary card at a time. Defaults to "Total
  // Products" on first load, matching the default `stockFilter` of "All".
  const [selectedCard, setSelectedCard] = useState<string>("Total Products");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let stockQuery = '';
      if (stockFilter === "In Stock") stockQuery = 'in';
      else if (stockFilter === "Low Stock" || stockFilter === "Critical") stockQuery = 'low';
      else if (stockFilter === "Out of Stock") stockQuery = 'out';

      const res = await productApi.getAll(search, cat, stockQuery);
      setProducts(res.data);
      if (res.stats) {
        setBackendStats(res.stats);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    productApi.getCategories().then(res => {
      setCategories(["All", ...res.data]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, cat, stockFilter]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const openEdit = (p: any) => {
    setForm({ name: p.name, sku: p.sku || "", category: p.category || "", buyPrice: p.buy_price, sellPrice: p.sell_price, stock: p.stock, minStock: p.min_stock, unit: p.unit || "piece" });
    setEditId(p.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, sku: form.sku, category: form.category, buy_price: parseFloat(form.buyPrice) || 0, sell_price: parseFloat(form.sellPrice), stock: parseInt(form.stock) || 0, min_stock: parseInt(form.minStock) || 0, unit: form.unit };
      if (editId) await productApi.update(editId, payload);
      else await productApi.create(payload);
      setShowModal(false);
      setForm(emptyForm);
      setEditId(null);
      fetchProducts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    try {
      await productApi.delete(id);
      fetchProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-screen-xl mx-auto fade-in">
      <PageHeader title={t("inventory")} subtitle={t("inventorySubtitle")}>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }}>
          <Plus size={15} /> Add Product
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Products", filter: "All", val: backendStats.total, color: "text-[#3B5BDB]", bg: "bg-[#EEF2FF]" },
          { label: "In Stock", filter: "In Stock", val: backendStats.inStock, color: "text-green-600", bg: "bg-[#DCFCE7]" },
          { label: "Low / Critical", filter: "Low Stock", val: backendStats.low, color: "text-[#D97706]", bg: "bg-[#FEF3C7]" },
          { label: "Out of Stock", filter: "Out of Stock", val: backendStats.out, color: "text-red-600", bg: "bg-[#FEE2E2]" },
        ].map(({ label, filter, val, color, bg }) => (
          <StatCard 
            key={label} 
            label={label} 
            value={val} 
            valueColor={color} 
            bgColor={bg} 
            onClick={() => { setSelectedCard(label); setStockFilter(filter); }} 
            selected={selectedCard === label}
          />
        ))}
      </div>

      <Card noPadding>
        <div className="p-4 border-b border-[#E4E7EC] flex flex-wrap gap-3">
          <SearchInput wrapperClassName="flex-1 min-w-[180px]" placeholder="Search products or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input-field w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="input-field w-auto" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            {stockFilters.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading products...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-red-500 text-sm">{error}</div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-[#EEF2FF] rounded-2xl flex items-center justify-center mb-4">
              <Package size={26} className="text-[#3B5BDB]" />
            </div>
            <h3 className="font-display font-extrabold text-base text-[#1E2A3B] mb-1">No products found</h3>
            <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <Table columns={["Product", "SKU", "Category", "Buy Price", "Sell Price", "Stock", "Min Stock", "Status", "Actions"]} minWidth="700px">
            {products.map((p) => (
              <tr key={p.id} className="table-row border-b border-[#F3F4F6] last:border-0">
                <td className="py-3 px-4 font-semibold text-[#1E2A3B] text-[13px]">{p.name}</td>
                <td className="py-3 px-4 text-gray-400 text-xs font-mono">{p.sku}</td>
                <td className="py-3 px-4 text-gray-500 text-[13px]">{p.category}</td>
                <td className="py-3 px-4 text-gray-600 text-[13px]">₹{p.buy_price}</td>
                <td className="py-3 px-4 font-semibold text-[13px]">₹{p.sell_price}</td>
                <td className="py-3 px-4 text-[13px] font-semibold">{p.stock}</td>
                <td className="py-3 px-4 text-gray-400 text-[13px]">{p.min_stock}</td>
                <td className="py-3 px-4">
                  <span className={`badge ${statusBadge[p.status]} text-[11px]`}>{statusLabel[p.status]}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors" title="Edit"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}

        {products.length > 0 && (
          <div className="p-4 border-t border-[#E4E7EC] flex items-center justify-between text-sm text-gray-400">
            <span>Showing {products.length} of {backendStats.total} products</span>
          </div>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditId(null); }} title={editId ? "Edit Product" : "Add New Product"} maxWidth="max-w-lg">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormInput label="Product Name" placeholder="e.g. Aashirvaad Atta 10kg" value={form.name} onChange={set("name")} required />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="SKU" placeholder="ATT-001" value={form.sku} onChange={set("sku")} />
            <div>
              <label className="block text-sm font-semibold mb-1.5">Category</label>
              <select className="input-field" value={form.category} onChange={set("category")}>
                <option value="">Select...</option>
                {categories.slice(1).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <FormInput label="Purchase Price (₹)" type="number" placeholder="0" value={form.buyPrice} onChange={set("buyPrice")} />
            <FormInput label="Selling Price (₹)" type="number" placeholder="0" value={form.sellPrice} onChange={set("sellPrice")} required />
            <FormInput label="Current Stock" type="number" placeholder="0" value={form.stock} onChange={set("stock")} required />
            <FormInput label="Min Stock Level" type="number" placeholder="0" value={form.minStock} onChange={set("minStock")} />
            <div className="col-span-2">
              <label className="block text-sm font-semibold mb-1.5">Unit</label>
              <select className="input-field" value={form.unit} onChange={set("unit")}>
                {["piece", "kg", "litre", "packet", "box", "dozen"].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => { setShowModal(false); setEditId(null); }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? "Saving..." : "Save Product"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
