import { useState, useEffect, useRef, useMemo, useDeferredValue } from "react";
import { Search, Plus, Minus, X, CheckCircle, Printer, Download, Receipt, ArrowLeft, Clock, Share2, History, Mic, MicOff } from "lucide-react";
import { Card } from "../components/ui/Card";
import { SearchInput } from "../components/ui/SearchInput";
import { productApi, billApi, customerApi, settingsApi, chatApi } from "../services/api";
import { useSettings } from "../context/SettingsContext";

interface CartItem { id: number; name: string; price: number; qty: number; }

export default function Billing() {
  const { t } = useSettings();
  const [catalog, setCatalog] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<"cash" | "upi" | "credit" | "card">("upi");
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
  const [mobileView, setMobileView] = useState<"products" | "cart">("products");
  const [shopName, setShopName] = useState("");
  const [shopGst, setShopGst] = useState("");
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const catalogRef = useRef<any[]>([]);

  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

  useEffect(() => {
    productApi.getAll().then(res => setCatalog(res.data)).catch(() => {});
    customerApi.getAll().then(res => setCustomers(res.data)).catch(() => {});
    billApi.getAll().then(res => setRecentBills((res.data || []).slice(0, 5))).catch(() => {});
    settingsApi.get().then(res => {
      if (res.data?.settings?.upi_id) {
        setShopUpiId(res.data.settings.upi_id);
      }
      if (res.data?.settings?.shop_name) setShopName(res.data.settings.shop_name);
      if (res.data?.settings?.gst_number) setShopGst(res.data.settings.gst_number);
    }).catch(() => {});
    // Auto-focus search input for fast billing (MyBillBook pattern)
    setTimeout(() => searchInputRef.current?.focus(), 300);
  }, []);

  const deferredSearch = useDeferredValue(search);
  const results = useMemo(() => {
    const lowerSearch = deferredSearch.toLowerCase();
    const filtered = catalog.filter((p) => p.name.toLowerCase().includes(lowerSearch));
    return filtered.slice(0, 50); // Limit to 50 to prevent mobile lag
  }, [catalog, deferredSearch]);

  const cartMap = useMemo(() => {
    const map = new Map();
    cart.forEach(c => map.set(c.id, c));
    return map;
  }, [cart]);

  const addToCart = (p: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === p.id);
      if (existing) return prev.map((c) => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: p.id, name: p.name, price: parseFloat(p.sell_price), qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    const product = catalog.find(p => p.id === id);
    setCart((prev) => prev.map((c) => {
      if (c.id === id) {
        const newQty = Math.max(1, c.qty + delta);
        return { ...c, qty: product ? Math.min(newQty, product.stock) : newQty };
      }
      return c;
    }));
  };

  const removeItem = (id: number) => setCart((prev) => prev.filter((c) => c.id !== id));

  const toggleVoiceBilling = () => {
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
      setSearch(transcript);
      
      try {
        const res = await chatApi.parseBilling(transcript);
        if (res.success && res.data) {
          const { product_name, quantity } = res.data;
          
          if (product_name) {
            const productWords = product_name.toLowerCase();
            const qty = quantity || 1;
            
            const match = catalogRef.current.find(p => p.name.toLowerCase().includes(productWords) || productWords.includes(p.name.toLowerCase()));
            
            // Voice Assistant TTS Feedback (ChatGPT style)
            window.speechSynthesis.cancel(); // Stop any ongoing speech
            const msg = new SpeechSynthesisUtterance();
            // te-IN handles Tanglish (English words written in English mixed with Telugu) natively
            msg.lang = 'te-IN'; 
            msg.rate = 0.95;

            if (match) {
              if (match.stock > 0) {
                msg.text = `Added ${qty} ${match.name}. ${qty} ${match.name} బిల్లులో వేశాను.`;
                window.speechSynthesis.speak(msg);

                setCart((prev) => {
                  const existing = prev.find((c) => c.id === match.id);
                  const addQty = Math.min(qty, match.stock - (existing ? existing.qty : 0));
                  if (addQty <= 0) return prev;
                  if (existing) return prev.map((c) => c.id === match.id ? { ...c, qty: c.qty + addQty } : c);
                  return [...prev, { id: match.id, name: match.name, price: parseFloat(match.sell_price), qty: addQty }];
                });
                setSearch("");
              } else {
                msg.text = `Sorry, ${match.name} is out of stock. స్టాక్ లేదు.`;
                window.speechSynthesis.speak(msg);
              }
            } else {
              msg.text = `Item not found. వస్తువు దొరకలేదు.`;
              window.speechSynthesis.speak(msg);
            }
          }
        }
      } catch (err) {
        console.error("Failed to parse voice command", err);
      }

    };
    recognition.start();
  };

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
    
    const html = `
      <html>
        <head>
          <title>Receipt ${lastBill.bill_number}</title>
          <style>
            body { font-family: monospace; padding: 20px; width: 300px; margin: 0 auto; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .shop-name { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
            .gst { font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <div class="center shop-name">${shopName || 'SHOP RECEIPT'}</div>
          ${shopGst ? `<div class="center gst">GSTIN: ${shopGst}</div>` : ''}
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
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    if (iframe.contentWindow) {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(html);
      iframe.contentWindow.document.close();
      iframe.contentWindow.focus();
      
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    } else {
      document.body.removeChild(iframe);
      alert("Printing is not supported in this browser environment.");
    }
  };

  const handleDownload = () => {
    if (!lastBill) return;
    
    let text = `================================\n`;
    text += `  ${shopName || 'SHOP RECEIPT'}\n`;
    if (shopGst) text += `  GSTIN: ${shopGst}\n`;
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

  // WhatsApp share — formats the receipt as text and opens WhatsApp
  // (the #1 way Indian shop owners share receipts, per MyBillBook)
  const handleWhatsAppShare = () => {
    if (!lastBill) return;
    let msg = `*${shopName || 'Receipt'}*\n`;
    msg += `Bill: ${lastBill.bill_number}\n`;
    msg += `Date: ${new Date().toLocaleDateString('en-IN')}\n`;
    msg += `---\n`;
    cart.forEach(item => {
      msg += `${item.name} ×${item.qty} = ₹${(item.qty * item.price).toLocaleString('en-IN')}\n`;
    });
    msg += `---\n`;
    if (discountAmt > 0) msg += `Discount: -₹${discountAmt.toLocaleString('en-IN')}\n`;
    msg += `*Total: ₹${total.toLocaleString('en-IN')}*\n`;
    msg += `Payment: ${lastBill.payment_method === 'credit' ? 'Credit (Pay Later)' : lastBill.payment_method.toUpperCase()}\n`;
    msg += `\nThank you for shopping! 🙏`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Clear everything for a fresh new bill after successful creation.
  const handleBackToBilling = () => {
    setSuccess(false);
    setLastBill(null);
    setCart([]);
    setDiscount(0);
    setCustomerId("");
    setCustomerName("");
    setCustomerSearch("");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setCustomerType("walk-in");
    setUpiTransactionId("");
  };

  if (success && lastBill) {
    return (
      <div className="h-full flex flex-col fade-in bg-[#F7F8FA]">
        <div className="flex-1 p-4 sm:p-6 pb-32 md:pb-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-6 md:p-10 max-w-md w-full mx-auto text-center shadow-lg mt-2 sm:mt-8 mb-8">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${lastBill.payment_method === "credit" ? "bg-amber-100" : "bg-[#DCFCE7]"}`}>
            {lastBill.payment_method === "credit" ? <Clock size={32} className="text-amber-600" /> : <CheckCircle size={32} className="text-green-600" />}
          </div>
          <h2 className="font-display font-extrabold text-xl text-[#1E2A3B] mb-1">Bill Created!</h2>
          <p className="text-sm text-gray-500 mb-5">
            {lastBill.payment_method === "credit" ? "Marked as credit — payment pending" : "Payment received successfully"}
          </p>

          <div className="bg-[#F7F8FA] rounded-xl p-4 text-left space-y-2 mb-4">
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

          {/* Itemized list — MyBillBook-style bill confirmation */}
          {cart.length > 0 && (
            <div className="bg-[#F7F8FA] rounded-xl p-3 text-left mb-5">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Items</div>
              <div className="space-y-1.5">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate flex-1 mr-2">{item.name} <span className="text-gray-500">×{item.qty}</span></span>
                    <span className="font-semibold text-[#1E2A3B] flex-shrink-0">₹{(item.price * item.qty).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-xs mt-2 pt-2 border-t border-[#E4E7EC]">
                  <span className="text-gray-500">Discount ({discount}%)</span>
                  <span className="text-red-500 font-semibold">-₹{discountAmt.toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button onClick={handlePrint} className="btn-secondary justify-center text-xs py-2"><Printer size={13} /> Print</button>
            <button onClick={handleDownload} className="btn-secondary justify-center text-xs py-2"><Download size={13} /> Download</button>
            <button onClick={handleWhatsAppShare} className="btn-secondary col-span-2 justify-center text-sm py-2.5 font-medium mt-1" style={{ color: '#25D366', borderColor: '#25D366', backgroundColor: '#f0fdf4' }}><Share2 size={15} /> Share on WhatsApp</button>
          </div>
          <button
            className="btn-primary w-full justify-center mt-3"
            onClick={handleBackToBilling}
          >
            <Plus size={16} /> New Bill
          </button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row fade-in relative md:h-full md:overflow-hidden">
      {/* Left — Products */}
      <div className={`flex-1 flex flex-col border-r border-[#E4E7EC] overflow-hidden ${mobileView === "cart" ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-[#E4E7EC] bg-white">
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchInput 
                ref={searchInputRef} 
                placeholder={isListening ? "Listening..." : "Search product to add... (start typing)"} 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results.length > 0 && results[0].stock > 0) {
                    addToCart(results[0]);
                    setSearch("");
                  }
                }}
              />
            </div>
            <button 
              onClick={isListening ? undefined : toggleVoiceBilling}
              className={`px-4 h-11 flex-shrink-0 rounded-xl flex items-center gap-2 transition-all font-semibold shadow-sm ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40 ring-2 ring-red-500/50' 
                  : 'bg-gradient-to-r from-[#EEF2FF] to-blue-50 text-[#3B5BDB] hover:from-[#3B5BDB] hover:to-indigo-600 hover:text-white border border-[#3B5BDB]/20'
              }`}
              title="Voice Assisted Billing"
            >
              {isListening ? (
                <>
                  <span className="relative flex h-3 w-3 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                  {t("listening")}
                </>
              ) : (
                <><Mic size={18} /> <span className="hidden sm:inline">{t("speakItem")}</span></>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24 md:pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
            {results.map((p) => {
              const cartItem = cartMap.get(p.id);
              
              return (
              <Card key={p.id} className="hover:border-[#3B5BDB]/40 hover:shadow-sm transition-all cursor-pointer flex flex-col h-full" noPadding>
                <div className="p-2.5 sm:p-3.5 flex flex-col flex-1" onClick={() => !cartItem && addToCart(p)}>
                  <div className="font-semibold text-xs sm:text-sm text-[#1E2A3B] mb-1 sm:mb-2 leading-tight flex-1">{p.name}</div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-display font-extrabold text-sm sm:text-base text-[#3B5BDB]">₹{p.sell_price}</span>
                    <span className={`text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full ${p.stock > 10 ? "bg-[#DCFCE7] text-green-700" : p.stock > 0 ? "bg-[#FEF3C7] text-amber-700" : "bg-[#FEE2E2] text-red-700"}`}>
                      {p.stock > 0 ? `${p.stock} left` : "Out of stock"}
                    </span>
                  </div>
                  
                  {cartItem ? (
                    <div className="flex items-center justify-between mt-2 sm:mt-2.5 h-7 sm:h-8 bg-[#EEF2FF] rounded-lg border border-[#3B5BDB]/20" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => cartItem.qty > 1 ? updateQty(p.id, -1) : removeItem(p.id)}
                        className="w-8 sm:w-10 h-full flex items-center justify-center text-[#3B5BDB] font-bold hover:bg-[#3B5BDB]/10 rounded-l-lg transition-colors"
                      >
                        -
                      </button>
                      <span className="font-bold text-xs sm:text-sm text-[#3B5BDB]">{cartItem.qty} <span className="text-[9px] sm:text-[10px] font-normal opacity-70">in bill</span></span>
                      <button 
                        onClick={() => addToCart(p)}
                        disabled={cartItem.qty >= p.stock}
                        className="w-8 sm:w-10 h-full flex items-center justify-center text-[#3B5BDB] font-bold hover:bg-[#3B5BDB]/10 rounded-r-lg transition-colors disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                      disabled={p.stock === 0}
                      className="w-full mt-2 sm:mt-2.5 py-1 sm:py-1.5 rounded-lg bg-[#EEF2FF] text-[#3B5BDB] text-[10px] sm:text-xs font-bold hover:bg-[#3B5BDB] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      + Add <span className="hidden xl:inline text-[9px] font-normal opacity-70 ml-1">(Enter to quick-add)</span>
                    </button>
                  )}
                </div>
              </Card>
            )})}
            {search && results.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search size={28} className="text-gray-500" />
                </div>
                <h3 className="text-lg font-bold text-[#1E2A3B] mb-2">Item not found</h3>
                <p className="text-sm font-semibold text-gray-500 mb-1">వస్తువు దొరకలేదు</p>
                <p className="text-sm text-gray-500">Vastuvu dorakaledhu</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile View Cart FAB */}
        <div className="md:hidden fixed bottom-[72px] right-4 left-4 z-10">
          <button 
            onClick={() => setMobileView("cart")}
            className="w-full bg-[#3B5BDB] text-white py-3.5 rounded-2xl shadow-xl font-bold flex items-center justify-between px-6"
          >
            <div className="flex items-center gap-2">
              <Receipt size={18} />
              <span>View Cart • {cart.length} items</span>
            </div>
            <span>₹{total.toLocaleString("en-IN")}</span>
          </button>
        </div>
      </div>

      {/* Right — Cart */}
      <div className={`w-full md:w-[340px] bg-white flex flex-col md:overflow-y-auto border-t md:border-t-0 border-[#E4E7EC] pb-24 md:pb-0 ${mobileView === "products" ? "hidden md:flex" : "flex md:h-full md:max-h-none"}`}>
        <div className="p-4 border-b border-[#E4E7EC]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                className="md:hidden p-2 -ml-2 text-gray-500 hover:text-[#3B5BDB]"
                onClick={() => setMobileView("products")}
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="font-display font-extrabold text-base">Current Bill</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRecent(!showRecent)}
                className={`p-1.5 rounded-lg transition-colors ${showRecent ? 'bg-[#EEF2FF] text-[#3B5BDB]' : 'text-gray-500 hover:text-gray-600 hover:bg-gray-50'}`}
                title="Recent Bills"
              >
                <History size={15} />
              </button>
              <span className="md:hidden text-sm font-bold text-[#3B5BDB]">₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Recent Bills — MyBillBook-style quick access */}
          {showRecent && (
            <div className="mt-3 pt-3 border-t border-[#E4E7EC] fade-in">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Recent Bills</div>
              {recentBills.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">No recent bills</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {recentBills.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between bg-[#F9FAFB] rounded-lg p-2 text-xs">
                      <div>
                        <span className="font-bold text-[#3B5BDB]">{b.bill_number}</span>
                        <span className="text-gray-500 ml-2">{new Date(b.created_at).toLocaleDateString('en-IN')}</span>
                      </div>
                      <span className="font-bold text-[#1E2A3B]">₹{parseFloat(b.total).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 border-b border-[#E4E7EC] pt-3">
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
                      <div className="text-xs text-gray-500">{c.phone}</div>
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
              <p className="text-sm text-gray-500">Add products to start billing</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-start gap-2 bg-[#F9FAFB] rounded-lg p-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#1E2A3B] leading-tight truncate">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">₹{item.price} each</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg bg-white border border-[#E4E7EC] flex items-center justify-center hover:border-[#3B5BDB] transition-colors">
                      <Minus size={10} />
                    </button>
                    <span className="w-7 text-center text-sm font-bold">{item.qty}</span>
                    <button 
                      onClick={() => updateQty(item.id, 1)} 
                      disabled={item.qty >= (catalog.find(p => p.id === item.id)?.stock || 0)}
                      className="w-6 h-6 rounded-lg bg-white border border-[#E4E7EC] flex items-center justify-center hover:border-[#3B5BDB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
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
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 flex-1">Discount</span>
            <div className="relative flex w-32 items-center">
              <input type="number" min="0" max="100" className="input-field text-sm py-1.5 w-full text-center !px-2 rounded-r-none border-r-0 focus:z-10" value={discount === 0 ? '' : discount} placeholder="0" onChange={(e) => { const v = parseInt(e.target.value); setDiscount(isNaN(v) ? 0 : Math.min(100, Math.max(0, v))); }} />
              <div className="flex items-center justify-center w-8 h-[34px] bg-[#F9FAFB] border border-l-0 border-[#E4E7EC] rounded-r-lg text-xs font-semibold text-gray-500">%</div>
            </div>
            <span className="text-sm font-bold text-red-500 w-20 text-right">-₹{discountAmt || 0}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#E4E7EC]">
            <span className="font-display font-extrabold text-base">Total</span>
            <span className="font-display font-extrabold text-xl text-[#3B5BDB]">₹{total.toLocaleString("en-IN")}</span>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Payment Method</p>
            <div className="flex flex-wrap gap-2">
              {(["cash", "upi", "card", "credit"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayment(m)}
                  className={`flex-1 min-w-[70px] py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide border transition-all ${
                    payment === m
                      ? m === "credit"
                        ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30 -translate-y-px"
                        : "bg-[#3B5BDB] text-white border-[#3B5BDB] shadow-md shadow-[#3B5BDB]/40 -translate-y-px"
                      : "border-[#E4E7EC] text-gray-500 hover:border-[#3B5BDB]/40 hover:text-[#3B5BDB]"
                  }`}
                >
                  {m === "upi" ? "UPI" : m === "credit" ? "Credit" : m === "card" ? "Card" : "Cash"}
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
            {saving ? "Creating..." : 
              payment === "upi" ? `Received UPI — Create Bill${cart.length > 0 ? ` (₹${total.toLocaleString("en-IN")})` : ""}` :
              `Create Bill${cart.length > 0 ? ` · ₹${total.toLocaleString("en-IN")}` : ""}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
