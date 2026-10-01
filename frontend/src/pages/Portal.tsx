import React, { useEffect, useState } from "react";
import { Store, User, Clock, CheckCircle } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";

export default function Portal() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the token from URL ?token=...
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
      setError("Invalid or missing portal link.");
      setLoading(false);
      return;
    }

    fetch(`http://localhost:5000/api/portal/customer/${token}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.error) {
          setError(resData.error);
        } else {
          setData(resData);
        }
        setLoading(false);
      })
      .catch(err => {
        setError("Could not connect to the server.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="w-8 h-8 border-4 border-[#3B5BDB] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA] p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={32} />
        </div>
        <h2 className="font-display font-extrabold text-2xl mb-2 text-[#1E2A3B]">Oops!</h2>
        <p className="text-gray-500 max-w-sm">{error}</p>
      </div>
    );
  }

  const creditBills = data.credit_bills || [];
  const youGave = creditBills.reduce((sum: number, b: any) => sum + parseFloat(b.total), 0);
  const youGot = creditBills.reduce((sum: number, b: any) => sum + parseFloat(b.amount_paid || 0), 0);
  const pendingDue = youGave - youGot;

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      <div className="bg-[#3B5BDB] pt-12 pb-24 px-6 text-center text-white relative">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <Store size={32} />
        </div>
        <h1 className="font-display font-extrabold text-3xl mb-1">{data.shop_name}</h1>
        <p className="text-blue-200">Customer Digital Khata</p>
      </div>

      <div className="max-w-xl mx-auto px-6 -mt-16 relative z-10 space-y-6">
        <Card className="shadow-lg border-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#EEF2FF] rounded-full flex items-center justify-center text-[#3B5BDB]">
              <User size={20} />
            </div>
            <div>
              <div className="font-display font-bold text-lg text-[#1E2A3B]">{data.customer.name}</div>
              <div className="text-sm text-gray-500">{data.customer.phone}</div>
            </div>
          </div>

          <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-5 text-center">
            <div className="text-sm font-bold text-orange-600/80 uppercase tracking-wider mb-1">Total Pending Due</div>
            <div className="font-display font-extrabold text-4xl text-orange-600">₹{pendingDue.toLocaleString("en-IN")}</div>
            <div className="text-xs text-orange-500 mt-2">Please clear this balance at your earliest convenience.</div>
          </div>
        </Card>

        <Card title="Credit History" noPadding>
          {creditBills.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 text-center">No credit history found.</p>
          ) : (
            <div className="divide-y divide-[#E4E7EC]">
              {creditBills.map((b: any) => (
                <div key={b.id} className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-[#3B5BDB] text-sm mb-0.5">{b.bill_number}</div>
                    <div className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString('en-IN')}</div>
                    {b.items && b.items.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {b.items.map((i: any) => i.product_name).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#1E2A3B]">₹{parseFloat(b.total).toLocaleString('en-IN')}</div>
                    {parseFloat(b.amount_paid || 0) > 0 && (
                      <div className="text-[10px] text-green-600 font-semibold mt-0.5">
                        ₹{parseFloat(b.amount_paid).toLocaleString('en-IN')} Paid
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="text-center text-xs text-gray-400 pb-8">
          Powered by DukaanMitra
        </div>
      </div>
    </div>
  );
}
