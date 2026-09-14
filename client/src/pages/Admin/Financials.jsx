import { useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from "../../lib/toast";
import {
  IndianRupee, TrendingUp, Users, ShieldCheck,
  Download, RefreshCw, CheckCircle2, AlertCircle,
  Sliders, Send, FileText, ArrowUpRight, DollarSign,
  Receipt, Building2, X, Printer, Landmark, HeartHandshake,
  Shield, Wallet, ArrowDownRight, Check, Edit
} from "lucide-react";
import { downloadPDFInvoice } from "../../lib/invoicePrinter";

export default function CooperativeFinancials() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [activeViewTab, setActiveViewTab] = useState("overview");

  // Member Payout Modal
  const [payoutModal, setPayoutModal] = useState(false);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("Razorpay Escrow Transfer");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [payoutBusy, setPayoutBusy] = useState(false);

  // Welfare Config Modal
  const [welfareModal, setWelfareModal] = useState(false);
  const [welfareRate, setWelfareRate] = useState(10);
  const [welfareBusy, setWelfareBusy] = useState(false);

  // Cooperative Treasury Withdrawal Modal (Taking out society payment)
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [destinationBank, setDestinationBank] = useState("Delhi State Cooperative Bank (Society Account)");
  const [accountLast4, setAccountLast4] = useState("8821");
  const [withdrawNotes, setWithdrawNotes] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);

  // Welfare Grant / Claim Modal
  const [welfareClaimModal, setWelfareClaimModal] = useState(false);
  const [claimMemberName, setClaimMemberName] = useState("");
  const [claimType, setClaimType] = useState("Medical Emergency");
  const [claimAmount, setClaimAmount] = useState("");
  const [claimReason, setClaimReason] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);

  // Cooperative Invoice Editing Modal
  const [editInvoiceModal, setEditInvoiceModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [customNotes, setCustomNotes] = useState("");
  const [sacCode, setSacCode] = useState("998719");
  const [terms, setTerms] = useState("");
  const [stampUrl, setStampUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [secretaryName, setSecretaryName] = useState("");
  const [savingInvoice, setSavingInvoice] = useState(false);

  async function openEditInvoiceModal(bookingId) {
    try {
      const { data: inv } = await api.get(`/payments/invoice/${bookingId}`);
      if (!inv) {
        toast.error("Invoice record not found for this booking.");
        return;
      }
      setActiveInvoice(inv);
      setCustomNotes(inv.customNotes || "");
      setSacCode(inv.sacCode || "998719");
      setTerms(inv.terms || "Payment held in Sahakar Escrow. Released upon OTP verification.");
      const coopObj = inv.cooperativeId || inv.providerId?.cooperativeId;
      setStampUrl(coopObj?.stampUrl || "");
      setSignatureUrl(coopObj?.signatureUrl || "");
      setLogoUrl(coopObj?.logoUrl || "");
      setSecretaryName(coopObj?.secretaryName || coopObj?.presidentName || "R. K. Sharma");
      setEditInvoiceModal(true);
    } catch (err) {
      toast.error("Failed to load invoice details.");
    }
  }

  async function handleSaveInvoice(e) {
    e.preventDefault();
    if (!activeInvoice?._id) return;
    setSavingInvoice(true);
    try {
      const { data: res } = await api.patch(`/payments/invoice/${activeInvoice._id}`, {
        customNotes,
        sacCode,
        terms,
        stampUrl,
        signatureUrl,
        logoUrl,
        secretaryName,
      });
      toast.success(res.message || "Cooperative invoice & society stamp updated successfully!");
      setEditInvoiceModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update invoice.");
    } finally {
      setSavingInvoice(false);
    }
  }

  const load = async () => {
    setLoading(true);
    try {
      const [finRes, provRes] = await Promise.all([
        api.get("/admin/financials"),
        api.get("/admin/providers"),
      ]);
      setData(finRes.data);
      setProviders(provRes.data || []);
      if (finRes.data?.welfareAllocationPct !== undefined) {
        setWelfareRate(finRes.data.welfareAllocationPct);
      }
    } catch (err) {
      console.error("Failed to load cooperative financials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  function showToast(msg) {
    toast.success(msg);
  }

  // 1. Initiate Member Payout
  async function handleInitiatePayout(e) {
    e.preventDefault();
    if (!selectedProvider || !payoutAmount) return;
    setPayoutBusy(true);
    try {
      const { data: res } = await api.post("/admin/financials/payout", {
        providerId: selectedProvider,
        amount: Number(payoutAmount),
        paymentMethod: payoutMethod,
        notes: payoutNotes,
      });
      showToast(res.message || "Member payout processed successfully!");
      setPayoutModal(false);
      setSelectedProvider("");
      setPayoutAmount("");
      setPayoutNotes("");
      load();
    } catch (err) {
      toast.error("Failed to process payout.");
    } finally {
      setPayoutBusy(false);
    }
  }

  // 2. Withdraw Cooperative Operating Balance
  async function handleWithdrawTreasury(e) {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return;
    if (Number(withdrawAmount) > (data.netOperatingRevenue || 0)) {
      toast.warning(`Cannot withdraw more than available net operating balance (₹${data.netOperatingRevenue || 0})`);
      return;
    }
    setWithdrawBusy(true);
    try {
      const { data: res } = await api.post("/admin/financials/withdraw", {
        amount: Number(withdrawAmount),
        destinationBank,
        accountLast4,
        notes: withdrawNotes,
      });
      showToast(res.message || "Treasury funds successfully transferred to cooperative society bank!");
      setWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawNotes("");
      load();
    } catch (err) {
      toast.error("Failed to process withdrawal.");
    } finally {
      setWithdrawBusy(false);
    }
  }

  // 3. Disburse Member Welfare Relief Grant
  async function handleDisburseWelfare(e) {
    e.preventDefault();
    if (!claimMemberName || !claimAmount) return;
    if (Number(claimAmount) > (data.welfareFundBalance || 0)) {
      toast.warning(`Claim amount exceeds available welfare pool (₹${data.welfareFundBalance || 0})`);
      return;
    }
    setClaimBusy(true);
    try {
      const { data: res } = await api.post("/admin/financials/welfare-claim", {
        memberName: claimMemberName,
        claimType,
        amount: Number(claimAmount),
        reason: claimReason,
      });
      showToast(res.message || "Welfare grant disbursed!");
      setWelfareClaimModal(false);
      setClaimMemberName("");
      setClaimAmount("");
      setClaimReason("");
      load();
    } catch (err) {
      showToast("Failed to disburse welfare grant.");
    } finally {
      setClaimBusy(false);
    }
  }

  // 4. Update Welfare Percentage Split
  async function handleUpdateWelfare(e) {
    e.preventDefault();
    setWelfareBusy(true);
    try {
      await api.patch("/admin/cooperative", {
        welfareFundAllocation: Number(welfareRate),
      });
      showToast("Welfare fund allocation percentage updated!");
      setWelfareModal(false);
      load();
    } catch (err) {
      showToast("Failed to update welfare fund allocation.");
    } finally {
      setWelfareBusy(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-8 text-slate-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#00288e] uppercase tracking-wider mb-1">
            <Building2 size={16} />
            <span>{data.cooperativeName || "Cooperative Society"} Treasury</span>
          </div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Cooperative Earnings &amp; Member Payouts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Withdraw cooperative revenue to society bank, manage member social security welfare, and disburse payouts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setWelfareModal(true)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
          >
            <Sliders size={14} />
            <span>Welfare Config ({data.welfareAllocationPct}%)</span>
          </button>

          {/* WITHDRAW COOP PAYMENT BUTTON */}
          <button
            onClick={() => setWithdrawModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <Landmark size={14} />
            <span>Withdraw Society Revenue</span>
          </button>

          {/* MEMBER PAYOUT BUTTON */}
          <button
            onClick={() => setPayoutModal(true)}
            className="px-4 py-2 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <Send size={14} />
            <span>Disburse Member Payout</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Gross Booking GMV</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#00288e] flex items-center justify-center font-bold">
              <IndianRupee size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">₹{data.grossGMV?.toLocaleString("en-IN") || "0"}</p>
          <p className="text-[11px] text-slate-500">{data.completedBookings} completed bookings</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Gross Coop Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700">₹{data.totalCoopRevenue?.toLocaleString("en-IN") || "0"}</p>
          <p className="text-[11px] text-slate-500">Based on {data.commissionRate}% retention rate</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Welfare Fund Pool</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <ShieldCheck size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700">₹{data.welfareFundBalance?.toLocaleString("en-IN") || "0"}</p>
          <p className="text-[11px] text-slate-500">{data.welfareAllocationPct}% auto-split from bookings</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Withdrawable Net Balance</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Landmark size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">₹{data.netOperatingRevenue?.toLocaleString("en-IN") || "0"}</p>
          <p className="text-[11px] text-emerald-700 font-semibold">Ready for society bank transfer</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveViewTab("overview")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeViewTab === "overview"
              ? "border-[#00288e] text-[#00288e]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Disbursal &amp; Revenue Ledger ({data.recentLedger?.length || 0})
        </button>

        <button
          onClick={() => setActiveViewTab("welfare")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeViewTab === "welfare"
              ? "border-[#00288e] text-[#00288e]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Welfare Fund &amp; Social Grants ({data.welfareClaims?.length || 0})
        </button>

        <button
          onClick={() => setActiveViewTab("withdrawals")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeViewTab === "withdrawals"
              ? "border-[#00288e] text-[#00288e]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Society Bank Settlements ({data.treasuryWithdrawals?.length || 0})
        </button>
      </div>

      {/* ── TAB 1: Booking Ledger ── */}
      {activeViewTab === "overview" && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs space-y-0">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cooperative Disbursal &amp; Revenue Ledger</h3>
              <p className="text-xs text-slate-500">Real-time breakdown of booking commissions, member payouts, and escrow releases.</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer size={13} />
              <span>Print Ledger</span>
            </button>
          </div>

          {(!data.recentLedger || data.recentLedger.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No booking transactions recorded in this cooperative yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="px-6 py-3">Transaction / Booking</th>
                    <th className="px-6 py-3">Service</th>
                    <th className="px-6 py-3">Gross Amount</th>
                    <th className="px-6 py-3">Coop Share ({data.commissionRate}%)</th>
                    <th className="px-6 py-3">Member Payout</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Tax Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.recentLedger.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                        {row.bookingId ? `BK-${row.bookingId.toString().slice(-6)}` : `TX-${row.id.slice(-6)}`}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-800">{row.service}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-900">₹{row.amount}</td>
                      <td className="px-6 py-3.5 font-bold text-emerald-700">₹{row.coopCommission}</td>
                      <td className="px-6 py-3.5 font-bold text-blue-700">₹{row.providerPayout}</td>
                      <td className="px-6 py-3.5 font-semibold text-emerald-700">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px]">
                          {row.status || "Released ✓"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 font-medium">
                        {new Date(row.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {row.bookingId && (
                          <button
                            type="button"
                            onClick={() => openEditInvoiceModal(row.bookingId)}
                            className="px-3 py-1 rounded-xl bg-[#00288e]/10 text-[#00288e] border border-[#00288e]/20 text-[11px] font-bold hover:bg-[#00288e] hover:text-white transition cursor-pointer"
                          >
                            ✏️ Edit Invoice
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Welfare Fund Management ── */}
      {activeViewTab === "welfare" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase">
                <HeartHandshake size={16} />
                <span>How Welfare is Generated</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {data.welfareAllocationPct}% Automatic Reserve Pool
              </h3>
              <p className="text-xs text-slate-500 max-w-xl">
                Every time a customer completes a gig booking, {data.welfareAllocationPct}% of the cooperative commission is automatically credited to this social security pool for emergency medical assistance, tool subsidies, and accident protection.
              </p>
            </div>

            <button
              onClick={() => setWelfareClaimModal(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <HeartHandshake size={14} />
              <span>Grant Member Welfare Relief</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Member Welfare Grants &amp; Relief Ledger</h3>
              <span className="text-xs font-bold text-amber-700">Available Pool: ₹{data.welfareFundBalance || 0}</span>
            </div>

            {(!data.welfareClaims || data.welfareClaims.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No welfare grants disbursed yet. Click &quot;Grant Member Welfare Relief&quot; to issue assistance to a worker in need.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase">
                      <th className="px-6 py-3">Beneficiary Member</th>
                      <th className="px-6 py-3">Relief Category</th>
                      <th className="px-6 py-3">Grant Amount</th>
                      <th className="px-6 py-3">Disbursal Reason</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Date Disbursed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {data.welfareClaims.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{c.memberName}</td>
                        <td className="px-6 py-3.5 font-semibold text-amber-800">{c.claimType}</td>
                        <td className="px-6 py-3.5 font-bold text-emerald-700">₹{c.amount}</td>
                        <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate">{c.reason}</td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold">
                            {c.status || "Disbursed ✓"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right text-slate-400">
                          {new Date(c.grantedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Society Bank Settlements ── */}
      {activeViewTab === "withdrawals" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase">
                <Landmark size={16} />
                <span>Direct Society Treasury Settlement</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Withdrawable Net Balance: ₹{data.netOperatingRevenue || 0}
              </h3>
              <p className="text-xs text-slate-500 max-w-xl">
                Transfer your cooperative&apos;s earned operating revenue directly to your registered cooperative bank account (e.g. DSCB / SBI / PNB) for society overheads and administrative expenses.
              </p>
            </div>

            <button
              onClick={() => setWithdrawModal(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Landmark size={14} />
              <span>Withdraw to Society Bank</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Society Bank Settlement History</h3>
              <span className="text-xs text-slate-500">Total Settled: ₹{data.totalTreasuryWithdrawn || 0}</span>
            </div>

            {(!data.treasuryWithdrawals || data.treasuryWithdrawals.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No bank settlements recorded yet. Click &quot;Withdraw to Society Bank&quot; to transfer your earned operating revenue.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase">
                      <th className="px-6 py-3">Reference No.</th>
                      <th className="px-6 py-3">Destination Account</th>
                      <th className="px-6 py-3">Withdrawal Amount</th>
                      <th className="px-6 py-3">Settlement Status</th>
                      <th className="px-6 py-3 text-right">Initiated At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {data.treasuryWithdrawals.map((w, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5 font-mono font-bold text-slate-900">{w.refNumber || `WD-DL-${i}`}</td>
                        <td className="px-6 py-3.5 font-semibold text-slate-800">{w.destinationBank} (••{w.accountLast4})</td>
                        <td className="px-6 py-3.5 font-bold text-emerald-700">₹{w.amount}</td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold">
                            {w.status || "Settled ✓"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right text-slate-400">
                          {new Date(w.initiatedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 1: WITHDRAW TREASURY REVENUE (COOPERATIVE PAYMENT) ── */}
      {withdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setWithdrawModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                  <Landmark size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Withdraw Society Operating Revenue</h2>
                  <p className="text-xs text-slate-500">Transfer cooperative earnings to your registered society bank account.</p>
                </div>
              </div>
              <button onClick={() => setWithdrawModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleWithdrawTreasury} className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <span className="font-bold text-emerald-900">Available Net Balance:</span>
                <span className="text-base font-black text-emerald-800">₹{data.netOperatingRevenue || 0}</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Withdrawal Amount (₹)</label>
                <input
                  type="number"
                  min="10"
                  max={data.netOperatingRevenue || 100000}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Max ₹${data.netOperatingRevenue || 0}`}
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-black text-slate-900 bg-slate-50 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Destination Bank Account</label>
                <select
                  value={destinationBank}
                  onChange={(e) => setDestinationBank(e.target.value)}
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                >
                  <option value="Delhi State Cooperative Bank (Society Account)">Delhi State Cooperative Bank (A/C ••8821) — Primary</option>
                  <option value="State Bank of India (Cooperative Current Account)">State Bank of India (A/C ••4419)</option>
                  <option value="Punjab National Bank (Nodal Gateway)">Punjab National Bank (A/C ••1102)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Resolution / Withdrawal Purpose</label>
                <input
                  type="text"
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  placeholder="e.g. Society monthly administrative expenses & office maintenance"
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWithdrawModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawBusy}
                  className="px-6 py-2.5 rounded-full bg-emerald-700 text-white font-bold hover:bg-emerald-800 shadow-md cursor-pointer transition-all"
                >
                  {withdrawBusy ? "Transferring..." : "Confirm & Transfer ₹" + (withdrawAmount || "0")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: GRANT MEMBER WELFARE RELIEF ── */}
      {welfareClaimModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setWelfareClaimModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold">
                  <HeartHandshake size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Grant Member Welfare Relief</h2>
                  <p className="text-xs text-slate-500">Disburse funds from social security reserve to a gig worker in need.</p>
                </div>
              </div>
              <button onClick={() => setWelfareClaimModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDisburseWelfare} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between">
                <span className="font-bold text-amber-900">Available Welfare Pool:</span>
                <span className="text-base font-black text-amber-800">₹{data.welfareFundBalance || 0}</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Beneficiary Worker / Member Name</label>
                <select
                  value={claimMemberName}
                  onChange={(e) => setClaimMemberName(e.target.value)}
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                  required
                >
                  <option value="">-- Choose Member --</option>
                  {providers.map((p) => (
                    <option key={p._id} value={p.userId?.name || p.name}>
                      {p.userId?.name || p.name || "Worker"} ({p.skills?.[0] || "General"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 uppercase">Relief Category</label>
                  <select
                    value={claimType}
                    onChange={(e) => setClaimType(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                  >
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Accident Relief">On-Duty Accident Relief</option>
                    <option value="Tool / Kit Subsidy">Tool &amp; Safety Kit Subsidy</option>
                    <option value="Maternity Support">Family Maternity Support</option>
                    <option value="Benevolence Fund">Benevolence Death Benefit</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 uppercase">Grant Amount (₹)</label>
                  <input
                    type="number"
                    min="50"
                    max={data.welfareFundBalance || 50000}
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-bold text-slate-900 bg-slate-50 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Approval Reason / Medical Hospital Details</label>
                <input
                  type="text"
                  value={claimReason}
                  onChange={(e) => setClaimReason(e.target.value)}
                  placeholder="e.g. Hospitalization medical emergency grant sanctioned"
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWelfareClaimModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={claimBusy}
                  className="px-6 py-2.5 rounded-full bg-amber-600 text-white font-bold hover:bg-amber-700 shadow-md cursor-pointer transition-all"
                >
                  {claimBusy ? "Sanctioning..." : "Sanction Grant of ₹" + (claimAmount || "0")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: DISBURSE MEMBER PAYOUT ── */}
      {payoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setPayoutModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00288e] text-white flex items-center justify-center font-bold">
                  <Send size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Disburse Member Payout</h2>
                  <p className="text-xs text-slate-500">Direct cooperative transfer to verified worker account.</p>
                </div>
              </div>
              <button onClick={() => setPayoutModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInitiatePayout} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Select Worker / Member</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                  required
                >
                  <option value="">-- Choose Member --</option>
                  {providers.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.userId?.name || p.name || "Worker"} ({p.skills?.[0] || "General"}) — Trust: {p.trustScore || 4.8}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Payout Amount (₹)</label>
                <input
                  type="number"
                  min="50"
                  step="10"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-bold text-slate-900 bg-slate-50 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Disbursal Route</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                >
                  <option value="Razorpay Escrow Transfer">Razorpay Escrow Transfer (Direct Bank)</option>
                  <option value="UPI Instant Disbursal">UPI Instant Disbursal (VPA)</option>
                  <option value="Cooperative Nodal Bank NEFT">Cooperative Nodal Bank NEFT / IMPS</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Note / Disbursal Purpose</label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="e.g. Weekly job completions payout"
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayoutModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payoutBusy}
                  className="px-6 py-2.5 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer transition-all"
                >
                  {payoutBusy ? "Processing..." : "Confirm & Transfer ₹" + (payoutAmount || "0")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: WELFARE ALLOCATION CONFIG ── */}
      {welfareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setWelfareModal(false)}>
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Welfare Fund Allocation</h2>
              <button onClick={() => setWelfareModal(false)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateWelfare} className="space-y-4 text-xs">
              <p className="text-slate-500">
                Set the percentage of cooperative commission automatically reserved for member emergency welfare and accident insurance.
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>Allocation Rate:</span>
                  <span className="text-base text-[#00288e] font-black">{welfareRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={welfareRate}
                  onChange={(e) => setWelfareRate(e.target.value)}
                  className="w-full accent-[#00288e] cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWelfareModal(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={welfareBusy}
                  className="px-5 py-2 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-xs cursor-pointer"
                >
                  {welfareBusy ? "Saving..." : "Save Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: COOPERATIVE INVOICE EDITOR ── */}
      {editInvoiceModal && activeInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setEditInvoiceModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit size={18} className="text-[#00288e]" /> Edit PACS Member Invoice
                </h2>
                <p className="text-xs text-slate-500 font-mono">Invoice #{activeInvoice.invoiceNumber || `INV-${activeInvoice._id.slice(-6)}`}</p>
              </div>
              <button onClick={() => setEditInvoiceModal(false)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs font-semibold max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">SAC / HSN Code</label>
                  <input
                    type="text"
                    value={sacCode}
                    onChange={(e) => setSacCode(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs font-bold text-slate-900 outline-none focus:border-[#00288e]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Secretary Name</label>
                  <input
                    type="text"
                    value={secretaryName}
                    onChange={(e) => setSecretaryName(e.target.value)}
                    placeholder="e.g. R. K. Sharma"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 outline-none focus:border-[#00288e]"
                  />
                </div>
              </div>

              {/* STAMP & SIGNATURE UPLOAD / URL SECTION */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-[#00288e] tracking-wider">
                    Official PACS Stamp &amp; Authorized Signature
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Auto-applies to all member invoices</span>
                </div>

                {/* Asset Preview Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Official Stamp */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="block text-slate-700 font-bold text-[11px] mb-1.5">Official Society Stamp</span>
                      <div className="w-full h-20 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden p-1 relative">
                        {stampUrl ? (
                          <img src={stampUrl} alt="PACS Stamp Preview" className="h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-[10.5px] text-slate-400 font-bold">No Stamp Uploaded</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <label className="flex-1 text-center py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-bold cursor-pointer transition">
                        Upload Stamp
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setStampUrl(ev.target.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {stampUrl && (
                        <button
                          type="button"
                          onClick={() => setStampUrl("")}
                          className="px-2 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10.5px] font-bold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Secretary Signature */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="block text-slate-700 font-bold text-[11px] mb-1.5">Authorized Signature</span>
                      <div className="w-full h-20 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden p-1 relative">
                        {signatureUrl ? (
                          <img src={signatureUrl} alt="Signature Preview" className="h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-[10.5px] text-slate-400 font-bold">No Signature Uploaded</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <label className="flex-1 text-center py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-bold cursor-pointer transition">
                        Upload Sign
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setSignatureUrl(ev.target.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {signatureUrl && (
                        <button
                          type="button"
                          onClick={() => setSignatureUrl("")}
                          className="px-2 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10.5px] font-bold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cooperative Logo */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="block text-slate-700 font-bold text-[11px] mb-1.5">Cooperative Logo</span>
                      <div className="w-full h-20 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden p-1 relative">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Coop Logo Preview" className="h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-[10.5px] text-slate-400 font-bold">No Logo Uploaded</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <label className="flex-1 text-center py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-bold cursor-pointer transition">
                        Upload Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setLogoUrl(ev.target.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
                          className="px-2 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10.5px] font-bold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Cooperative Custom Note / Tax Exemption Notice</label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Approved by PACS Managing Committee. Section 80P Tax Exempted."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 outline-none focus:border-[#00288e]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Invoice Terms &amp; Conditions</label>
                <textarea
                  rows={2}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 outline-none focus:border-[#00288e]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const mockBooking = {
                      _id: activeInvoice.bookingId,
                      createdAt: activeInvoice.generatedAt,
                      price: activeInvoice.total,
                      service: activeInvoice.items?.[0]?.description || "Gig Service",
                      paymentStatus: "paid",
                      cooperativeId: {
                        ...(activeInvoice.cooperativeId || {}),
                        stampUrl,
                        signatureUrl,
                        logoUrl,
                        secretaryName,
                      },
                      providerId: activeInvoice.providerId,
                      householdId: activeInvoice.householdId,
                      sacCode,
                      customNotes,
                    };
                    downloadPDFInvoice(mockBooking, activeInvoice.householdId);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} /> Download Updated PDF
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditInvoiceModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingInvoice}
                    className="px-5 py-2 rounded-xl bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {savingInvoice ? "Saving..." : "Save Invoice & Stamp"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
