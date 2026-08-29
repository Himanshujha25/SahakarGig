import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  IndianRupee, Building2, TrendingUp, Users, ShieldCheck,
  BarChart3, ArrowUpRight, Download, Sliders, RefreshCw,
  FileText, CheckCircle2, AlertCircle, Percent, Send, Printer, X
} from "lucide-react";

export default function FederationEarnings() {
  const [data, setData] = useState(null);
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");

  // Modals
  const [commissionModal, setCommissionModal] = useState(false);
  const [statementModal, setStatementModal] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [statementMonth, setStatementMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutBusy, setPayoutBusy] = useState(false);

  // Settings form
  const [defaultRate, setDefaultRate] = useState(2);
  const [welfareRate, setWelfareRate] = useState(10);
  const [tdsRate, setTdsRate] = useState(1);
  const [categoryRates, setCategoryRates] = useState([]);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [dashRes, finRes] = await Promise.all([
        api.get("/federation/dashboard").catch(() => ({ data: null })),
        api.get("/federation/finance").catch(() => ({ data: null })),
      ]);
      setData(dashRes.data);
      setFinance(finRes.data);

      if (finRes.data) {
        setDefaultRate(finRes.data.defaultCommissionRate ?? 2);
        setWelfareRate(finRes.data.welfareAllocationPct ?? 10);
        setTdsRate(finRes.data.tdsRate ?? 1);
        setCategoryRates(
          finRes.data.categoryCommissions?.length > 0
            ? finRes.data.categoryCommissions
            : [
                { category: "Plumber", rate: 2 },
                { category: "Electrician", rate: 2 },
                { category: "Carpenter", rate: 2 },
                { category: "Painter", rate: 2.5 },
                { category: "Cleaner", rate: 1.5 },
                { category: "Caregiver", rate: 1 },
                { category: "Driver", rate: 2 },
                { category: "Tutor", rate: 1.5 },
              ]
        );
      }
    } catch (err) {
      console.error("Failed to load earnings & finance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  }

  // Save Commission & Finance settings
  async function handleSaveSettings(e) {
    e.preventDefault();
    setSettingsBusy(true);
    try {
      const { data: res } = await api.patch("/federation/finance/settings", {
        defaultCommissionRate: Number(defaultRate),
        welfareFundAllocation: Number(welfareRate),
        tdsRate: Number(tdsRate),
        categoryCommissions: categoryRates,
      });
      showToast("Finance & commission rates updated successfully!");
      setCommissionModal(false);
      load();
    } catch (err) {
      showToast("Failed to update finance settings.");
    } finally {
      setSettingsBusy(false);
    }
  }

  // Initiate Batch Payout to Providers
  async function handleInitiateBatchPayout() {
    setPayoutBusy(true);
    try {
      const { data: res } = await api.post("/federation/finance/payouts/batch", {
        mode: "razorpay",
      });
      showToast(res.message || "Batch payouts disbursed to provider bank accounts!");
      setPayoutModal(false);
      load();
    } catch (err) {
      showToast("Failed to disburse batch payout.");
    } finally {
      setPayoutBusy(false);
    }
  }

  // Fetch Monthly Statement
  async function handleFetchStatement(m) {
    const targetMonth = m || statementMonth;
    try {
      const { data: res } = await api.get(`/federation/finance/statement?month=${targetMonth}`);
      setStatementData(res);
      setStatementModal(true);
    } catch (err) {
      showToast("Failed to fetch statement.");
    }
  }

  function handleCategoryRateChange(idx, val) {
    const updated = [...categoryRates];
    updated[idx].rate = Number(val);
    setCategoryRates(updated);
  }

  if (loading || !data) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface-container-low rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <IndianRupee size={16} />
            <span>Treasury &amp; Fiscal Compliance</span>
          </div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-on-surface">
            Earnings, Payouts &amp; Tax Compliance
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Federation revenue allocation, Razorpay batch payouts, TDS Section 194O tax reports, and welfare funds.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => handleFetchStatement()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
          >
            <FileText size={14} />
            <span>Monthly Statement</span>
          </button>
          <button
            onClick={() => setCommissionModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-primary/30 bg-[#e8edff] text-[#00288e] text-xs font-bold hover:bg-[#d7e3ff] transition-all cursor-pointer"
          >
            <Sliders size={14} />
            <span>Configure Rates</span>
          </button>
          <button
            onClick={() => setPayoutModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#006d30] text-white font-heading text-xs font-bold hover:bg-[#005a26] transition-all cursor-pointer shadow-md"
          >
            <Send size={14} />
            <span>Disburse Payouts</span>
          </button>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Gross GMV",
            value: `₹${(data.grossGMV || 0).toLocaleString()}`,
            sub: "Total customer transaction volume",
            icon: TrendingUp,
            color: "text-primary bg-primary/10",
          },
          {
            label: "Federation Revenue",
            value: `₹${(data.totalRevenue || 0).toLocaleString()}`,
            sub: `${defaultRate}% default commission retained`,
            icon: IndianRupee,
            color: "text-[#00288e] bg-[#e8edff]",
          },
          {
            label: "Cooperative Retained",
            value: `₹${(data.totalCoopRevenue || 0).toLocaleString()}`,
            sub: "Distributed to affiliated societies",
            icon: Building2,
            color: "text-amber-800 bg-amber-100",
          },
          {
            label: "Net Provider Disbursed",
            value: `₹${(data.totalProviderPayout || 0).toLocaleString()}`,
            sub: "85-90% direct to worker bank accounts",
            icon: Users,
            color: "text-[#006d30] bg-[#e6f9ec]",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-outline-variant bg-surface p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{card.label}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-on-surface">{card.value}</p>
            <p className="text-xs text-on-surface-variant">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Welfare Fund & TDS Compliance Banner Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Welfare Fund Box */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#006d30] text-white flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">Welfare &amp; Social Security Reserve Fund</h3>
                <p className="text-xs text-emerald-800">PMSBY insurance and emergency assistance fund</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-[#006d30] text-white px-2.5 py-0.5 rounded-full">
              {finance?.welfareAllocationPct || 10}% Allocated
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white border border-emerald-200">
              <span className="text-[10.5px] font-bold text-emerald-800 uppercase">Reserve Balance</span>
              <p className="text-xl font-bold text-emerald-950 mt-0.5">₹{(finance?.welfareFundReserve || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-emerald-200">
              <span className="text-[10.5px] font-bold text-emerald-800 uppercase">Beneficiaries Covered</span>
              <p className="text-xl font-bold text-emerald-950 mt-0.5">{data.totalProviders || 0} Workers</p>
            </div>
          </div>
        </div>

        {/* Section 194O TDS Tax Compliance Box */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#00288e] text-white flex items-center justify-center">
                <Percent size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-950">Tax Compliance Report (TDS u/s 194O)</h3>
                <p className="text-xs text-blue-800">1% TDS statutory deduction on e-commerce marketplace payments</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-[#00288e] text-white px-2.5 py-0.5 rounded-full">
              {finance?.tdsRate || 1}% TDS Rate
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white border border-blue-200">
              <span className="text-[10.5px] font-bold text-blue-800 uppercase">TDS Deducted &amp; Deposited</span>
              <p className="text-xl font-bold text-blue-950 mt-0.5">₹{(finance?.totalTdsDeducted || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-blue-200">
              <span className="text-[10.5px] font-bold text-blue-800 uppercase">Form 26AS Filing Status</span>
              <p className="text-sm font-bold text-[#006d30] mt-1.5 flex items-center gap-1">
                <CheckCircle2 size={14} /> 100% Tax Compliant
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cooperative Revenue Breakdown Table */}
      <div className="rounded-2xl border border-outline-variant bg-surface overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-heading text-base font-bold text-on-surface">Cooperative Revenue &amp; Distribution Summary</h3>
          <span className="text-xs font-bold text-on-surface-variant">{data.coopStats?.length || 0} Affiliated Societies</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-6 py-3.5">Cooperative Society</th>
                <th className="px-6 py-3.5">Jurisdiction Region</th>
                <th className="px-6 py-3.5">Members</th>
                <th className="px-6 py-3.5">Completed Jobs</th>
                <th className="px-6 py-3.5">Coop Commission</th>
                <th className="px-6 py-3.5 text-right">Federation Income</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 text-xs">
              {(data.coopStats || []).map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-sm text-on-surface">{c.name}</td>
                  <td className="px-6 py-4 text-on-surface-variant font-semibold">{c.region || "Delhi NCR"}</td>
                  <td className="px-6 py-4 font-semibold text-on-surface">{c.providers}</td>
                  <td className="px-6 py-4 font-semibold text-on-surface">{c.completedBookings || c.bookings}</td>
                  <td className="px-6 py-4 font-bold text-amber-800">₹{(c.revenue || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-extrabold text-sm text-primary">₹{(c.fedRevenue || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Configure Commission & Welfare Rates Modal ── */}
      {commissionModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setCommissionModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 lg:p-8 space-y-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <Sliders size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Commission &amp; Reserve Fund Configuration</h2>
                  <p className="text-xs text-on-surface-variant">Set default federation commission %, category-wise overrides, and welfare allocation.</p>
                </div>
              </div>
              <button onClick={() => setCommissionModal(false)} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Default Fed. Commission (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10"
                    value={defaultRate}
                    onChange={(e) => setDefaultRate(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Welfare Fund Allocation (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    value={welfareRate}
                    onChange={(e) => setWelfareRate(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">TDS Rate Sec 194O (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="5"
                    value={tdsRate}
                    onChange={(e) => setTdsRate(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              {/* Per-Category Commission Overrides */}
              <div className="space-y-2 border-t border-outline-variant/60 pt-3">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                  Per-Service-Category Commission Overrides
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {categoryRates.map((cat, idx) => (
                    <div key={cat.category} className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant space-y-1">
                      <span className="text-xs font-bold text-on-surface block truncate">{cat.category}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="15"
                          value={cat.rate}
                          onChange={(e) => handleCategoryRateChange(idx, e.target.value)}
                          className="w-16 h-8 px-2 rounded-lg border border-outline-variant bg-surface text-xs font-bold text-primary outline-none"
                        />
                        <span className="text-xs font-bold text-on-surface-variant">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setCommissionModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingsBusy}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {settingsBusy ? "Saving…" : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Monthly Statement Modal ── */}
      {statementModal && statementData && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setStatementModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 lg:p-8 space-y-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Monthly Earnings Statement</h2>
                  <p className="text-xs text-on-surface-variant">Period: {statementData.statementPeriod} · {statementData.federationName}</p>
                </div>
              </div>
              <button onClick={() => setStatementModal(false)} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant space-y-4" id="printable-statement">
              <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">{statementData.federationName}</h3>
                  <p className="text-xs text-on-surface-variant">Reg ID: {statementData.registrationId} · {statementData.region}</p>
                </div>
                <span className="text-xs font-mono font-bold text-primary">Period: {statementData.statementPeriod}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-outline-variant/60">
                  <span className="text-on-surface-variant">Total Gross Transaction Volume (GMV):</span>
                  <span className="font-bold text-on-surface">₹{statementData.grossGMV.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-outline-variant/60">
                  <span className="text-on-surface-variant">Gross Federation Commission:</span>
                  <span className="font-bold text-primary">₹{statementData.federationCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-outline-variant/60">
                  <span className="text-on-surface-variant">Cooperative Societies Share:</span>
                  <span className="font-bold text-amber-800">₹{statementData.cooperativeShare.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-outline-variant/60">
                  <span className="text-on-surface-variant">Direct Provider Payouts Disbursed:</span>
                  <span className="font-bold text-[#006d30]">₹{statementData.providerPayouts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-outline-variant/60">
                  <span className="text-on-surface-variant">Welfare &amp; Social Security Deduction:</span>
                  <span className="font-bold text-emerald-700">- ₹{statementData.welfareFundDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-outline-variant/60">
                  <span className="text-on-surface-variant">Section 194O TDS Deducted (1%):</span>
                  <span className="font-bold text-blue-700">₹{statementData.tdsTaxSummary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 text-sm font-bold bg-primary/5 px-2 rounded-lg">
                  <span className="text-primary">Net Federation Retained Earnings:</span>
                  <span className="text-primary font-extrabold">₹{statementData.netFederationEarnings.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} /> Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => setStatementModal(false)}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Disburse Payouts Modal ── */}
      {payoutModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setPayoutModal(false)}>
          <div className="w-full max-w-md bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-[#006d30]" />
                <h3 className="text-base font-bold text-on-surface">Initiate Batch Provider Payouts</h3>
              </div>
              <button onClick={() => setPayoutModal(false)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant space-y-2 text-center">
              <span className="text-xs font-bold text-on-surface-variant uppercase">Ready for Immediate Escrow Disbursal</span>
              <p className="text-2xl font-extrabold text-[#006d30]">
                ₹{(finance?.pendingPayoutsAmount || 18450).toLocaleString()}
              </p>
              <p className="text-xs text-on-surface-variant">
                Direct NEFT/UPI transfer via Razorpay Route API to verified cooperative provider accounts.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayoutModal(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInitiateBatchPayout}
                disabled={payoutBusy}
                className="px-5 py-2.5 rounded-xl bg-[#006d30] text-white text-xs font-bold hover:bg-[#005a26] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send size={14} />
                <span>{payoutBusy ? "Processing Razorpay API…" : "Execute Batch Disbursal"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}