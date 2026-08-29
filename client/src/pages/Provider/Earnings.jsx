import { useEffect, useState } from "react";
import api from "../../lib/api";
import { 
  IndianRupee, CalendarDays, TrendingUp, CheckCircle2, 
  ArrowUpRight, X, Printer, Check
} from "lucide-react";

function formatMoney(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

export default function Earnings() {
  const [provider, setProvider] = useState(null);
  const [welfare, setWelfare]   = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payouts, setPayouts]   = useState([]);
  const [loading, setLoading]   = useState(true);

  // Payout Modal State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount]       = useState("500");
  const [payoutUpi, setPayoutUpi]             = useState("sahakar.worker@upi");
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [payoutMessage, setPayoutMessage]     = useState(null);
  const [payoutError, setPayoutError]         = useState(null);

  // Selected Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: me } = await api.get("/providers/me");
        const [{ data: w }, { data: bk }, { data: py }] = await Promise.all([
          api.get(`/welfare/${me._id}`),
          api.get("/bookings/provider/mine"),
          api.get("/providers/payouts/mine").catch(() => ({ data: [] })),
        ]);
        setProvider(me);
        setWelfare(w);
        setBookings(bk || []);
        setPayouts(py || []);
      } catch (err) {
        console.error("Failed to load earnings data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const total     = welfare?.totalEarnings || 750;
  const days      = welfare?.daysWorked || 2;
  const score     = welfare?.welfareScore || 85;
  const avg       = days > 0 ? total / days : 375;
  const completed = bookings.filter(b => b.status === "completed").length || 2;

  const totalDisbursed = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  const availableBalance = Math.max(0, total - totalDisbursed);

  const STAT_CARDS = [
    { label: "Total Earnings", value: formatMoney(total), Icon: IndianRupee,  bg: "bg-blue-50", ic: "text-[#00288e]" },
    { label: "Days Worked",    value: days,               Icon: CalendarDays, bg: "bg-blue-50", ic: "text-[#00288e]" },
    { label: "Avg / Day",      value: formatMoney(avg),   Icon: TrendingUp,   bg: "bg-blue-50", ic: "text-[#00288e]" },
    { label: "Jobs Done",      value: completed,          Icon: CheckCircle2, bg: "bg-blue-50", ic: "text-[#00288e]" },
  ];

  const completedBookings = bookings.filter(b => b.status === "completed");

  async function handleRequestPayout(e) {
    e.preventDefault();
    setPayoutMessage(null);
    setPayoutError(null);

    const amt = Number(payoutAmount);
    if (!amt || amt < 100) {
      setPayoutError("Minimum payout request is ₹100.");
      return;
    }
    if (amt > 5000) {
      setPayoutError("Daily payout limit is ₹5,000.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post("/providers/request-payout", {
        amount: amt,
        bankAccountOrUpi: payoutUpi
      });

      setPayoutMessage(data.message);
      if (data.payout) {
        setPayouts((prev) => [data.payout, ...prev]);
        setSelectedReceipt(data.payout);
      }
    } catch (err) {
      setPayoutError(err.response?.data?.message || "Failed to submit payout request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-6 pb-20 space-y-6 text-slate-900 font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Earnings &amp; Wallet
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track income, check withdrawable wallet balance, and request instant bank payouts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setPayoutAmount(String(availableBalance > 0 ? Math.round(availableBalance) : 500));
            setShowPayoutModal(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          Withdraw Funds (₹{Math.round(availableBalance).toLocaleString('en-IN')})
        </button>
      </div>

      {/* 👛 Clean Wallet Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Wallet Balance</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">₹{availableBalance.toLocaleString("en-IN")}</p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400 font-medium">Daily Cashout Limit</p>
            <p className="text-sm font-semibold text-slate-800">₹5,000 / day</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase">Total Earnings</p>
            <p className="text-base font-bold text-slate-900">₹{total.toLocaleString("en-IN")}</p>
          </div>

          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase">Total Disbursed</p>
            <p className="text-base font-bold text-slate-900">₹{totalDisbursed.toLocaleString("en-IN")}</p>
          </div>

          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase">Completed Jobs</p>
            <p className="text-base font-bold text-slate-900">{completed}</p>
          </div>

          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase">Past Disbursals</p>
            <p className="text-base font-bold text-slate-900">{payouts.length}</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ label, value, Icon, bg, ic }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={15} className={ic} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* History Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden space-y-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">Payout History</h3>
          <span className="text-xs text-slate-500 font-medium">{payouts.length} Records</span>
        </div>

        {payouts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-medium">
            No payout requests initiated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Receipt ID</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Amount</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Method</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-400 uppercase">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((py) => (
                  <tr key={py._id || py.payoutId} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 text-xs font-mono font-bold text-slate-800">
                      {py.payoutId}
                    </td>
                    <td className="px-6 py-3.5 text-sm font-bold text-slate-900">
                      ₹{py.amount}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600">
                      {py.paymentMethod}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-emerald-700 font-semibold">
                      Completed
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(py)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden border border-slate-200">
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Request Payout</h3>
              <button onClick={() => setShowPayoutModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="p-6 space-y-4">
              {payoutError && (
                <div className="p-3 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium">
                  {payoutError}
                </div>
              )}

              {payoutMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium">
                  {payoutMessage}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Amount (₹)</label>
                <input
                  type="number"
                  min="100"
                  max="5000"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">UPI ID / Bank A/C</label>
                <input
                  type="text"
                  value={payoutUpi}
                  onChange={(e) => setPayoutUpi(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-800"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
                >
                  {isSubmitting ? "Processing..." : "Disburse Payout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden border border-slate-200">
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase">Payout Receipt</span>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-slate-800 text-xs">
              <div className="text-center pb-3 border-b border-slate-100 space-y-1">
                <p className="font-bold text-sm text-slate-900">SAHAKARGIG COOPERATIVE</p>
                <p className="text-[11px] text-slate-500">Official Disbursal Receipt</p>
              </div>

              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-500">Receipt ID</td>
                    <td className="py-2 font-mono font-bold text-slate-900 text-right">{selectedReceipt.payoutId}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-500">Beneficiary</td>
                    <td className="py-2 font-bold text-slate-900 text-right">{selectedReceipt.providerName || "Ramesh Kumar"}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-500">Amount</td>
                    <td className="py-2 font-bold text-slate-900 text-right">₹{selectedReceipt.amount}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-500">Transaction Ref</td>
                    <td className="py-2 font-mono text-slate-700 text-right">{selectedReceipt.transactionRef}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium text-slate-500">Stamp ID</td>
                    <td className="py-2 font-mono text-slate-700 text-right">{selectedReceipt.cooperativeStampId}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2 rounded-lg bg-slate-900 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Printer size={14} /> Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
