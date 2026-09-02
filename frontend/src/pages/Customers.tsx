import { useState, useEffect } from "react";
import { Plus, Eye, Edit2, Trash2, Users, ArrowLeft } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Modal } from "../components/ui/Modal";
import { SearchInput } from "../components/ui/SearchInput";
import { FormInput } from "../components/ui/FormInput";
import { customerApi, billApi } from "../services/api";
import { useSettings } from "../context/SettingsContext";

type CustomerFilter = "all" | "active" | "topSpenders";

export default function Customers() {
  const { t } = useSettings();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  // Which stat card is currently driving the list below — clicking a card
  // both filters (Active Customers) and sorts (Total Purchases -> top
  // spenders first) the table so the stat cards are genuinely interactive
  // shortcuts rather than static numbers.
  const [customerFilter, setCustomerFilter] = useState<CustomerFilter>("all");
  // Bill whose line items are currently shown in the "view items" modal
  // from the Purchase History table (fetched on demand via billApi.getById
  // since the customer list only carries an item *count*, not the items).
  const [viewBill, setViewBill] = useState<any | null>(null);
  const [viewBillLoading, setViewBillLoading] = useState(false);
  // Drives the Purchase History table on a single customer's detail page —
  // clicking a stat card there does something matching its own label:
  // "Total Bills" resets to show every bill (most recent first), "Total
  // Spent" re-sorts by amount (biggest first), and "Avg Order" filters
  // down to just the bills that were above that customer's average order
  // value, i.e. their unusually large purchases.
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payingCredit, setPayingCredit] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerApi.getAll(search);
      setCustomers(res.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [search]);
  useEffect(() => { setHistoryView("bills"); }, [selected?.id]);

  const totalSpent = customers.reduce((s, c) => s + parseFloat(c.total_spent || 0), 0);
  const active = customers.filter((c) => c.active).length;

  // Drives the customer list below from whichever stat card is selected:
  // "Active Customers" narrows the list, "Total Purchases" re-sorts it by
  // spend (highest first) so it doubles as a "top spenders" view, and
  // "Total Customers" resets both.
  const visibleCustomers = (() => {
    let list = customers;
    if (customerFilter === "active") list = list.filter((c) => c.active);
    if (customerFilter === "topSpenders") {
      list = [...list].sort((a, b) => parseFloat(b.total_spent || 0) - parseFloat(a.total_spent || 0));
    }
    return list;
  })();

  const handleViewBillItems = async (billId: number) => {
    setViewBillLoading(true);
    setViewBill({ id: billId });
    try {
      const res = await billApi.getById(billId);
      setViewBill(res.data);
    } catch (err: any) {
      alert(err.message);
      setViewBill(null);
    } finally {
      setViewBillLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await customerApi.create(form);
      setShowAdd(false);
      setForm({ name: "", phone: "", email: "" });
      fetchCustomers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this customer?")) return;
    try {
      await customerApi.delete(id);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (selected) {
    const avg = selected.total_bills > 0 ? Math.round(parseFloat(selected.total_spent) / parseInt(selected.total_bills)) : 0;
    const history = selected.purchase_history || [];

    // Derive what the table actually shows from the selected stat card,
    // without mutating the original array (used for the "reset" click too).
    const visibleHistory = (() => {
      if (historyView === "byAmount") return [...history].sort((a: any, b: any) => parseFloat(b.total) - parseFloat(a.total));
      if (historyView === "aboveAvg") return history.filter((b: any) => parseFloat(b.total) > avg);
      return history;
    })();

    return (
      <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto fade-in">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={15} /> Back to Customers
        </button>
        <div className="grid md:grid-cols-3 gap-5">
          <Card className="text-center p-6 flex flex-col h-full">
            <div className="w-16 h-16 rounded-full bg-[#3B5BDB] flex items-center justify-center text-white font-display font-extrabold text-2xl mx-auto mb-3">
              {selected.name[0]}
            </div>
            <h2 className="font-display font-extrabold text-lg">{selected.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{selected.phone}</p>
            <div className="mt-2 flex-grow flex items-center justify-center">
              <span className={`badge ${selected.active ? "badge-success" : "badge-gray"}`}>
                {selected.active ? "Active" : "Inactive"}
              </span>
            </div>
            {(() => {
              const pendingDue = (selected.purchase_history || []).filter((b: any) => b.payment_method === 'credit').reduce((sum: number, b: any) => sum + (parseFloat(b.total) - parseFloat(b.amount_paid || 0)), 0);
              if (pendingDue > 0) {
                return (
                  <div className="mt-4 pt-4 border-t border-[#E4E7EC]">
                    <div className="text-sm font-semibold text-gray-500 mb-1">Total Due</div>
                    <div className="font-display font-extrabold text-xl text-orange-600 mb-3">₹{pendingDue.toLocaleString("en-IN")}</div>
                    <button onClick={() => { setPayAmount(pendingDue.toString()); setShowPayModal(true); }} className="btn-primary w-full justify-center bg-orange-500 hover:bg-orange-600 border-none">
                      Settle Due
                    </button>
                  </div>
                );
              }
              return null;
            })()}
          </Card>
          <div className="md:col-span-2 grid grid-cols-3 gap-4">
            {[
              { label: "Total Bills", val: selected.total_bills, color: "text-[#3B5BDB]", view: "bills" as const },
              { label: "Total Spent", val: `₹${parseFloat(selected.total_spent || 0).toLocaleString("en-IN")}`, color: "text-green-600", view: "byAmount" as const },
              { label: "Avg Order", val: `₹${avg.toLocaleString("en-IN")}`, color: "text-[#D97706]", view: "aboveAvg" as const },
            ].map(({ label, val, color, view }) => (
              <StatCard
                key={label}
                label={label}
                value={val}
                valueColor={color}
                onClick={() => setHistoryView(view)}
                selected={historyView === view}
              />
            ))}
          </div>
        </div>

        <Card
          noPadding
          className="mt-5"
          title="Purchase History"
          action={
            historyView !== "bills" ? (
              <button onClick={() => setHistoryView("bills")} className="text-xs text-[#3B5BDB] font-semibold hover:underline">
                Show all bills
              </button>
            ) : undefined
          }
        >
          {history.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 text-center">No purchase history yet</p>
          ) : (
            <>
              <div className="px-4 pt-4 pb-1 text-xs text-gray-500">
                {historyView === "byAmount" && "Sorted by amount — biggest bills first"}
                {historyView === "aboveAvg" && `Bills above this customer's average order of ₹${avg.toLocaleString("en-IN")}`}
              </div>
              {visibleHistory.length === 0 ? (
                <p className="p-6 text-sm text-gray-400 text-center">No bills above the average order value</p>
              ) : (
                <Table columns={["Bill #", "Date", "Items", "Amount", "Method"]} minWidth="500px">
                  {visibleHistory.map((b: any) => (
                    <tr key={b.id} className="table-row border-b border-[#F3F4F6] last:border-0">
                      <td className="py-3 px-4 font-bold text-[#3B5BDB] text-[13px]">{b.bill_number}</td>
                      <td className="py-3 px-4 text-gray-500 text-[13px]">{new Date(b.created_at).toLocaleDateString("en-IN")}</td>
                      <td className="py-3 px-4 text-gray-600 text-[13px]">
                        <div className="flex items-center gap-1.5">
                          <span>{b.item_count} items</span>
                          <button
                            onClick={() => handleViewBillItems(b.id)}
                            className="p-1 rounded-md hover:bg-blue-50 text-blue-500 transition-colors flex-shrink-0"
                            title="View items"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-[13px]">₹{parseFloat(b.total).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4">
                        {b.payment_method === "credit" && parseFloat(b.amount_paid || 0) < parseFloat(b.total) ? (
                          <span className="badge badge-warning text-[11px]">
                            Credit (₹{parseFloat(b.amount_paid || 0).toLocaleString("en-IN")} paid)
                          </span>
                        ) : b.payment_method === "credit" && parseFloat(b.amount_paid || 0) >= parseFloat(b.total) ? (
                          <span className="badge badge-success text-[11px]">
                            Credit (Paid)
                          </span>
                        ) : (
                          <span className="badge badge-info text-[11px] capitalize">
                            {b.payment_method}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </>
          )}
        </Card>

        {/* This modal must be rendered here (not just in the customer-LIST
         * return below) because this detail view returns early — otherwise
         * clicking the eye icon above sets state but nothing ever appears. */}
        <Modal isOpen={!!viewBill} onClose={() => setViewBill(null)} title={viewBill?.bill_number ? `Bill ${viewBill.bill_number}` : "Bill Items"} maxWidth="max-w-md">
          {viewBillLoading || !viewBill?.items ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading items...</div>
          ) : viewBill.items.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No items found for this bill</div>
          ) : (
            <div className="space-y-2">
              {viewBill.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between bg-[#F9FAFB] rounded-lg p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1E2A3B] truncate">{item.product_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.quantity} × ₹{parseFloat(item.price).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="text-sm font-bold text-[#1E2A3B] flex-shrink-0 ml-3">₹{parseFloat(item.subtotal).toLocaleString("en-IN")}</div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#E4E7EC]">
                <span className="font-display font-extrabold text-sm">Total</span>
                <span className="font-display font-extrabold text-base text-[#3B5BDB]">₹{parseFloat(viewBill.total).toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}
        </Modal>

        {/* Record Credit Payment Modal */}
        <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Settle Customer Balance" maxWidth="max-w-sm">
          {(() => {
            const pendingDue = (selected?.purchase_history || []).filter((b: any) => b.payment_method === 'credit').reduce((sum: number, b: any) => sum + (parseFloat(b.total) - parseFloat(b.amount_paid || 0)), 0);
            return (
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                setPayingCredit(true);
                try {
                  await customerApi.payCredit(selected.id, parseFloat(payAmount));
                  setShowPayModal(false);
                  setPayAmount("");
                  const res = await customerApi.getById(selected.id);
                  setSelected(res.data);
                  fetchCustomers();
                } catch (err: any) {
                  alert(err.message);
                } finally {
                  setPayingCredit(false);
                }
              }}>
                <div className="bg-orange-50 text-orange-800 p-4 rounded-xl text-center mb-2 border border-orange-100">
                  <div className="text-sm font-semibold mb-1 text-orange-600/80 uppercase tracking-wider">Total Pending Due</div>
                  <div className="font-display font-extrabold text-3xl">₹{pendingDue.toLocaleString("en-IN")}</div>
                </div>
                
                <FormInput 
                  label="Payment Amount (₹)" 
                  type="number" 
                  max={pendingDue} 
                  step="0.01" 
                  placeholder={pendingDue.toString()}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
                
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary w-full justify-center py-1.5 text-xs bg-gray-50 border-gray-200 hover:bg-gray-100" onClick={() => setPayAmount(pendingDue.toString())}>
                    Auto-fill Full Balance (₹{pendingDue})
                  </button>
                </div>
                
                <div className="flex gap-3 pt-3 mt-4 border-t border-gray-100">
                  <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => setShowPayModal(false)}>Cancel</button>
                  <button type="submit" disabled={payingCredit} className="btn-primary flex-1 justify-center">
                    {payingCredit ? "Saving..." : "Record Payment"}
                  </button>
                </div>
              </form>
            );
          })()}
        </Modal>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-screen-xl mx-auto fade-in">
      <PageHeader title={t("customers")} subtitle={t("customersSubtitle")}>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Customer
        </button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Customers", val: customers.length, color: "text-[#3B5BDB]", filter: "all" as CustomerFilter },
          { label: "Active Customers", val: active, color: "text-green-600", filter: "active" as CustomerFilter },
          { label: "Total Purchases", val: `₹${totalSpent.toLocaleString("en-IN")}`, color: "text-[#D97706]", filter: "topSpenders" as CustomerFilter },
        ].map(({ label, val, color, filter }) => (
          <StatCard
            key={label}
            label={label}
            value={val}
            valueColor={color}
            onClick={() => setCustomerFilter(filter)}
            selected={customerFilter === filter}
          />
        ))}
      </div>
      {customerFilter !== "all" && (
        <div className="flex items-center gap-2 -mt-3 mb-4 text-xs text-gray-500">
          <span>
            {customerFilter === "active" ? "Showing active customers only" : "Sorted by total purchases (highest first)"}
          </span>
          <button onClick={() => setCustomerFilter("all")} className="text-[#3B5BDB] font-semibold hover:underline">
            Clear
          </button>
        </div>
      )}

      <Card noPadding>
        <div className="p-4 border-b border-[#E4E7EC]">
          <SearchInput wrapperClassName="max-w-sm" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 bg-[#EEF2FF] rounded-2xl flex items-center justify-center mb-4">
              <Users size={26} className="text-[#3B5BDB]" />
            </div>
            <h3 className="font-display font-bold text-base mb-1">No customers yet</h3>
            <p className="text-sm text-gray-400 mb-4">Add your first customer to get started</p>
            <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Customer</button>
          </div>
        ) : visibleCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-gray-400 mb-2">No active customers to show</p>
            <button onClick={() => setCustomerFilter("all")} className="text-[#3B5BDB] text-sm font-semibold hover:underline">Show all customers</button>
          </div>
        ) : (
          <Table columns={["Name", "Phone", "Total Bills", "Total Spent", "Status", "Actions"]} minWidth="600px">
            {visibleCustomers.map((c) => (
              <tr key={c.id} className="table-row border-b border-[#F3F4F6] last:border-0">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#3B5BDB] font-bold text-sm flex-shrink-0">{c.name[0]}</div>
                    <span className="font-semibold text-[13px] text-[#1E2A3B]">{c.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-500 text-[13px]">{c.phone}</td>
                <td className="py-3 px-4 font-semibold text-[13px]">{c.total_bills}</td>
                <td className="py-3 px-4 font-bold text-[13px] text-green-600">₹{parseFloat(c.total_spent || 0).toLocaleString("en-IN")}</td>
                <td className="py-3 px-4">
                  <span className={`badge text-[11px] ${c.active ? "badge-success" : "badge-gray"}`}>
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <button onClick={async () => { const res = await customerApi.getById(c.id); setSelected(res.data); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="View"><Eye size={14} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Customer" maxWidth="max-w-md">
        <form className="space-y-4" onSubmit={handleAdd}>
          <FormInput label="Full Name" placeholder="Customer name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <FormInput label="Phone Number" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
          <FormInput label="Email (optional)" type="email" placeholder="customer@email.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? "Saving..." : "Save Customer"}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!viewBill} onClose={() => setViewBill(null)} title={viewBill?.bill_number ? `Bill ${viewBill.bill_number}` : "Bill Items"} maxWidth="max-w-md">
        {viewBillLoading || !viewBill?.items ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading items...</div>
        ) : viewBill.items.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No items found for this bill</div>
        ) : (
          <div className="space-y-2">
            {viewBill.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between bg-[#F9FAFB] rounded-lg p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#1E2A3B] truncate">{item.product_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.quantity} × ₹{parseFloat(item.price).toLocaleString("en-IN")}</div>
                </div>
                <div className="text-sm font-bold text-[#1E2A3B] flex-shrink-0 ml-3">₹{parseFloat(item.subtotal).toLocaleString("en-IN")}</div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#E4E7EC]">
              <span className="font-display font-extrabold text-sm">Total</span>
              <span className="font-display font-extrabold text-base text-[#3B5BDB]">₹{parseFloat(viewBill.total).toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
