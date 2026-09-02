import { useState, useEffect } from "react";
import { Search, Plus, Minus, X, CheckCircle, Printer, Download, Receipt, ArrowLeft, Clock } from "lucide-react";
import { Card } from "../components/ui/Card";
import { SearchInput } from "../components/ui/SearchInput";
import { productApi, billApi, customerApi, settingsApi } from "../services/api";

interface CartItem { id: number; name: string; price: number; qty: number; }

export default function Billing() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<"cash" | "upi" | "card" | "credit">("upi");
  const [customerId, setCustomerId] = useState<number | "">("");
  const [customerName, setCustomerName] = useState("");
  const [success, setSuccess] = useState(false);
  const [lastBill, setLastBill] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [customerType, setCustomerType] = useState<"walk-in" | "existing">("walk-in");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [shopUpiId, setShopUpiId] = useState("shopowner@upi");
  const [newShopUpiId, setNewShopUpiId] = useState("");
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [upiTransactionId, setUpiTransactionId] = useState("");

  useEffect(() => {
    productApi.getAll().then(res => setCatalog(res.data)).catch(() => {});
    customerApi.getAll().then(res => setCustomers(res.data)).catch(() => {});
    settingsApi.get().then(res => {
      if (res.data?.settings?.upi_id) {
        setShopUpiId(res.data.settings.upi_id);
      }
    }).catch(() => {});
  }, []);

  const results = catalog.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const addToCart = (p: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === p.id);
      if (existing) return prev.map((c) => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: p.id, name: p.name, price: parseFloat(p.sell_price), qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
  };

  const removeItem = (id: number) => setCart((prev) => prev.filter((c) => c.id !== id));

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmt = Math.round(subtotal * discount / 100);
  const total = subtotal - discountAmt;

  const handleCreateBill = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      let finalCustomerId = customerId;
      
      if (customerType === "walk-in" && newCustomerName) {
        if (!newCustomerPhone) {
           alert("Please enter a phone number for the new customer.");
           setSaving(false);
           return;
        }
        const newCust = await customerApi.create({ name: newCustomerName, phone: newCustomerPhone });
        finalCustomerId = newCust.data.id;
      }

      if (customerType === "existing" && !finalCustomerId) {
         alert("Please select a customer from the dropdown list.");
         setSaving(false);
         return;
      }

      // Credit is money owed by a specific person, so it needs to be
      // trackable against a customer record rather than an anonymous
      // walk-in sale.
      if (payment === "credit" && !finalCustomerId) {
        alert("Credit (pay later) requires a customer — please select an existing customer or add their name and phone number.");
        setSaving(false);
        return;
      }

      const items = cart.map(c => ({ product_id: c.id, quantity: c.qty }));
      const res = await billApi.create({
        customer_id: finalCustomerId || null,
        items,
        discount,
        payment_method: payment,
        transaction_id: payment === "upi" ? upiTransactionId : undefined,
      });
      setLastBill(res.data);
      setSuccess(true);
      // Refresh catalog to show updated stock
      const updated = await productApi.getAll();
      setCatalog(updated.data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUpiId = async () => {
    if (!newShopUpiId.includes('@')) {
      alert("Please enter a valid UPI ID (e.g., number@upi)");
      return;
    }
    setIsSavingUpi(true);
    try {
      await settingsApi.update({ upi_id: newShopUpiId });
      setShopUpiId(newShopUpiId);
    } catch (err: any) {
      alert("Failed to save UPI ID: " + err.message);
    } finally {
      setIsSavingUpi(false);
    }
  };

  const handlePrint = () => {
    if (!lastBill) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <html>
        <head>
          <title>Receipt ${lastBill.bill_number}</title>
          <style>
            body { font-family: monospace; padding: 20px; width: 300px; margin: 0 auto; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <h2 class="center">SHOP RECEIPT</h2>
          <div class="line"></div>
          <div>Bill No: ${lastBill.bill_number}</div>
          <div>Date: ${new Date().toLocaleString()}</div>
          <div class="line"></div>
          ${cart.map(item => `
            <div class="row">
              <span>${item.name} (x${item.qty})</span>
              <span>Rs. ${item.qty * item.price}</span>
            </div>
          `).join('')}
          <div class="line"></div>
          <div class="row"><span>Subtotal:</span><span>Rs. ${subtotal}</span></div>
          <div class="row"><span>Discount:</span><span>Rs. ${discountAmt}</span></div>
          <div class="row"><strong>Total:</strong><strong>Rs. ${total}</strong></div>
          <div class="line"></div>
          <div class="center">Payment: ${lastBill.payment_method === "credit" ? "CREDIT (PAY LATER)" : lastBill.payment_method.toUpperCase()}</div>
          <div class="center" style="margin-top: 20px;">Thank you for shopping!</div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDownload = () => {
    if (!lastBill) return;
    
    let text = `================================\n`;
    text += `         SHOP RECEIPT\n`;
    text += `================================\n`;
    text += `Bill No: ${lastBill.bill_number}\n`;
    text += `Date: ${new Date().toLocaleString()}\n`;
    text += `--------------------------------\n`;
    cart.forEach(item => {
      text += `${item.name.padEnd(20)} ${item.qty}x Rs.${item.price} = Rs.${item.qty * item.price}\n`;
    });
    text += `--------------------------------\n`;
    text += `Subtotal: Rs.${subtotal}\n`;
    text += `Discount: Rs.${discountAmt}\n`;
    text += `Total: Rs.${total}\n`;
    text += `Payment: ${lastBill.payment_method === "credit" ? "CREDIT (PAY LATER)" : lastBill.payment_method.toUpperCase()}\n`;
    text += `================================\n`;
    text += `       Thank you for shopping!\n`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${lastBill.bill_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Returning from the "Bill Created" confirmation should drop the user back
  // into the same cart they just billed (items, discount, customer) so they
  // can review or adjust it, rather than wiping everything back to empty.
  const handleBackToBilling = () => {
    setSuccess(false);
    setLastBill(null);
  };

  if (success && lastBill) {
    return (
      <div className="h-full flex flex-col fade-in bg-[#F7F8FA]">
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-10 max-w-sm w-full text-center shadow-lg">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${lastBill.payment_method === "credit" ? "bg-amber-100" : "bg-[#DCFCE7]"}`}>
            {lastBill.payment_method === "credit" ? <Clock size={32} className="text-amber-600" /> : <CheckCircle size={32} className="text-green-600" />}
          </div>
          <h2 className="font-display font-extrabold text-xl text-[#1E2A3B] mb-1">Bill Created!</h2>
          <p className="text-sm text-gray-500 mb-6">
            {lastBill.payment_method === "credit" ? "Marked as credit — payment pending" : "Payment received successfully"}
          </p>

          <div className="bg-[#F7F8FA] rounded-xl p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Bill Number</span>
              <span className="font-bold text-[#3B5BDB]">{lastBill.bill_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{lastBill.payment_method === "credit" ? "Amount Due" : "Total Amount"}</span>
              <span className="font-bold text-[#1E2A3B]">₹{parseFloat(lastBill.total).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment Method</span>
              <span className={`font-semibold uppercase text-xs ${lastBill.payment_method === "credit" ? "text-amber-600" : ""}`}>
                {lastBill.payment_method === "credit" ? "Credit (Pay Later)" : lastBill.payment_method}
              </span>
            </div>
            {lastBill.payment_method === "upi" && lastBill.transaction_id && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transaction ID</span>
                <span className="font-semibold text-xs">{lastBill.transaction_id}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-secondary flex-1 justify-center text-xs py-2"><Printer size={13} /> Print</button>
            <button onClick={handleDownload} className="btn-secondary flex-1 justify-center text-xs py-2"><Download size={13} /> Download</button>
          </div>
          <button
            className="btn-primary w-full justify-center mt-3"
            onClick={handleBackToBilling}
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row fade-in overflow-hidden">
      {/* Left — Products */}
      <div className="flex-1 flex flex-col border-r border-[#E4E7EC] overflow-hidden">
        <div className="p-4 border-b border-[#E4E7EC] bg-white">
          <SearchInput placeholder="Search product to add..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {results.map((p) => (
              <Card key={p.id} className="hover:border-[#3B5BDB]/40 hover:shadow-sm transition-all cursor-pointer" noPadding>
                <div className="p-3.5" onClick={() => addToCart(p)}>
                  <div className="font-semibold text-sm text-[#1E2A3B] mb-1 leading-tight">{p.name}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-display font-extrabold text-base text-[#3B5BDB]">₹{p.sell_price}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.stock > 10 ? "bg-[#DCFCE7] text-green-700" : p.stock > 0 ? "bg-[#FEF3C7] text-amber-700" : "bg-[#FEE2E2] text-red-700"}`}>
                      {p.stock > 0 ? `${p.stock} left` : "Out of stock"}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                    disabled={p.stock === 0}
                    className="w-full mt-2.5 py-1.5 rounded-lg bg-[#EEF2FF] text-[#3B5BDB] text-xs font-bold hover:bg-[#3B5BDB] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    + Add to Bill
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Cart */}
      <div className="w-full md:w-[340px] bg-white flex flex-col overflow-hidden border-t md:border-t-0 border-[#E4E7EC] max-h-[50vh] md:max-h-none">
        <div className="p-4 border-b border-[#E4E7EC]">
          <h2 className="font-display font-extrabold text-base mb-3">Current Bill</h2>
          
          <div className="flex gap-2 mb-3">
            <button 
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${customerType === 'walk-in' ? 'bg-[#3B5BDB] text-white border-[#3B5BDB]' : 'bg-white text-gray-500 border-[#E4E7EC] hover:border-[#3B5BDB]/40'}`}
              onClick={() => { setCustomerType('walk-in'); setCustomerId(""); }}
            >Walk-in / New</button>
            <button 
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${customerType === 'existing' ? 'bg-[#3B5BDB] text-white border-[#3B5BDB]' : 'bg-white text-gray-500 border-[#E4E7EC] hover:border-[#3B5BDB]/40'}`}
              onClick={() => setCustomerType('existing')}
            >Existing Customer</button>
          </div>

          {customerType === 'walk-in' ? (
            <div className="space-y-2">
              <input 
                type="text" 
                placeholder="Customer Name (Optional)" 
                className="input-field text-sm py-1.5"
                value={newCustomerName}
                onChange={e => setNewCustomerName(e.target.value)}
              />
              {newCustomerName && (
                <input 
                  type="tel" 
                  placeholder="Phone Number (Required)" 
                  className="input-field text-sm py-1.5"
                  value={newCustomerPhone}
                  onChange={e => setNewCustomerPhone(e.target.value)}
                />
              )}
            </div>
          ) : (
            <div className="relative">
              <input 
                type="text"
                placeholder="Search by name or phone..."
                className="input-field text-sm py-1.5"
                value={customerSearch}
                onFocus={() => setShowDropdown(true)}
                onChange={e => {
                  setCustomerSearch(e.target.value);
                  setCustomerId("");
                  setShowDropdown(true);
                }}
              />
              {showDropdown && customerSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-[#E4E7EC] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).map(c => (
                    <div 
                      key={c.id} 
                      className="p-2 text-sm hover:bg-[#EEF2FF] cursor-pointer border-b border-[#F3F4F6] last:border-0"
                      onClick={() => {
                        setCustomerId(c.id);
                        setCustomerSearch(`${c.name} (${c.phone})`);
                        setShowDropdown(false);
                      }}
                    >
                      <div className="font-semibold text-[#1E2A3B]">{c.name}</div>
                      <div className="text-xs text-gray-400">{c.phone}</div>
                    </div>
                  ))}
                  {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).length === 0 && (
                    <div className="p-3 text-center text-xs text-gray-500">No customers found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center p-4">
              <Receipt size={24} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Add products to start billing</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-start gap-2 bg-[#F9FAFB] rounded-lg p-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#1E2A3B] leading-tight truncate">{item.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">₹{item.price} each</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg bg-white border border-[#E4E7EC] flex items-center justify-center hover:border-[#3B5BDB] transition-colors">
                      <Minus size={10} />
                    </button>
                    <span className="w-7 text-center text-sm font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-lg bg-white border border-[#E4E7EC] flex items-center justify-center hover:border-[#3B5BDB] transition-colors">
                      <Plus size={10} />
                    </button>
                  </div>
                  <div className="w-14 text-right flex-shrink-0">
                    <div className="text-xs font-bold">₹{(item.price * item.qty).toLocaleString("en-IN")}</div>
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors mt-1">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#E4E7EC] p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-semibold">₹{subtotal.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 flex-1">Discount</span>
            <div className="relative w-24">
              <input type="number" min="0" max="100" className="input-field text-sm pr-6 py-1.5 text-right" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
            </div>
            <span className="text-sm font-semibold text-red-500 w-16 text-right">-₹{discountAmt}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#E4E7EC]">
            <span className="font-display font-extrabold text-base">Total</span>
            <span className="font-display font-extrabold text-xl text-[#3B5BDB]">₹{total.toLocaleString("en-IN")}</span>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">Payment Method</p>
            <div className="grid grid-cols-4 gap-2">
              {(["cash", "upi", "card", "credit"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayment(m)}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide border transition-all ${
                    payment === m
                      ? m === "credit"
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-[#3B5BDB] text-white border-[#3B5BDB]"
                      : "border-[#E4E7EC] text-gray-500 hover:border-[#3B5BDB]/40"
                  }`}
                >
                  {m === "upi" ? "UPI" : m === "credit" ? "Credit" : m}
                </button>
              ))}
            </div>
          </div>

          {payment === "upi" && total > 0 && (
            (!shopUpiId || shopUpiId === "shopowner@upi" || shopUpiId === "") ? (
              <div className="mt-2 p-3 border border-[#E4E7EC] rounded-xl flex flex-col bg-[#F9FAFB] fade-in">
                <div className="text-sm font-semibold text-[#1E2A3B] mb-1">Set Up UPI Payment</div>
                <div className="text-xs text-gray-500 mb-3">Please enter your shop's UPI ID first to receive payments via QR code.</div>
                <input 
                  type="text" 
                  placeholder="e.g., 9876543210@ybl" 
                  className="input-field text-sm py-1.5 w-full mb-2 bg-white"
                  value={newShopUpiId}
                  onChange={e => setNewShopUpiId(e.target.value)}
                />
                <button 
                  className="btn-primary w-full py-1.5 text-xs justify-center" 
                  onClick={handleSaveUpiId}
                  disabled={isSavingUpi}
                >
                  {isSavingUpi ? "Saving..." : "Save & Generate QR"}
                </button>
              </div>
            ) : (
              <div
                className="mt-2 p-3 border border-[#E4E7EC] rounded-xl flex flex-col items-center bg-[#F9FAFB] cursor-pointer fade-in"
                title="Tap to pay with PhonePe or any UPI app"
                onClick={() => {
                  window.location.href = `upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=Shop%20Owner&am=${total}&cu=INR`;
                }}
              >
                <div className="text-xs font-semibold text-[#1E2A3B] mb-2">Scan to Pay ₹{total.toLocaleString("en-IN")}</div>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=${shopUpiId}&pn=Shop%20Owner&am=${total}&cu=INR`)}`} 
                  alt="UPI QR Code" 
                  className="w-24 h-24 rounded-lg mix-blend-multiply" 
                />
                <div className="text-[10px] text-gray-500 mt-2 text-center">Money goes directly to {shopUpiId}</div>
                <div className="mt-3 w-full" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="text" 
                    placeholder="Enter UPI Transaction ID (Optional)" 
                    className="input-field text-sm py-1.5 w-full bg-white"
                    value={upiTransactionId}
                    onChange={e => setUpiTransactionId(e.target.value)}
                  />
                </div>
              </div>
            )
          )}

          {payment === "credit" && total > 0 && (
            <div className="mt-2 p-3 border border-amber-200 rounded-xl bg-amber-50 flex items-start gap-2.5 fade-in">
              <Clock size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-amber-800">Pay Later — Credit</div>
                <div className="text-[11px] text-amber-700 mt-0.5">
                  No payment is collected now. ₹{total.toLocaleString("en-IN")} will be recorded as credit owed by the customer until they pay in cash, card, or UPI.
                </div>
              </div>
            </div>
          )}

          {payment === "card" && total > 0 && (
            <div className="mt-2 p-3 border border-[#E4E7EC] rounded-xl bg-[#F9FAFB] space-y-2 fade-in">
              <input 
                type="text" 
                placeholder="Card Number" 
                maxLength={19}
                className="input-field text-sm py-1.5 w-full"
              />
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="MM/YY" 
                  maxLength={5}
                  className="input-field text-sm py-1.5 flex-1"
                />
                <input 
                  type="password" 
                  placeholder="CVV" 
                  maxLength={4}
                  className="input-field text-sm py-1.5 flex-1"
                />
              </div>
            </div>
          )}

          <button
            className="btn-primary w-full justify-center py-3 text-base"
            disabled={cart.length === 0 || saving || (payment === "upi" && (!shopUpiId || shopUpiId === "shopowner@upi" || shopUpiId === ""))}
            onClick={handleCreateBill}
            style={{ opacity: cart.length === 0 || saving || (payment === "upi" && (!shopUpiId || shopUpiId === "shopowner@upi" || shopUpiId === "")) ? 0.5 : 1, cursor: cart.length === 0 ? "not-allowed" : "pointer" }}
          >
            <Receipt size={16} />
            {saving ? "Creating..." : `Create Bill${cart.length > 0 ? ` · ₹${total.toLocaleString("en-IN")}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
