import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  IndianRupee, Building2, TrendingUp, Users, ShieldCheck,
  BarChart3, ArrowUpRight, Download, Sliders, RefreshCw,
  FileText, CheckCircle2, AlertCircle, Percent, Send, Printer, X,
  BadgeCheck, Landmark, ChevronRight
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
      await api.patch("/federation/finance/settings", {
        defaultCommissionRate: Number(defaultRate),
        welfareFundAllocation: Number(welfareRate),
        tdsRate: Number(tdsRate),
        categoryCommissions: categoryRates,
      });
      showToast("Finance & commission rates updated successfully!");
      setCommissionModal(false);
      load();
    } catch {
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
    } catch {
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
    } catch {
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
      <div className="space-y-4">
        <div className="animate-pulse h-6 w-48 rounded-xl bg-surface-container" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-surface-container rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const grossGMV = finance?.grossGMV ?? (data.grossGMV || 0);
  const fedRevenue = finance?.fedCommission ?? (data.totalRevenue || 0);
  const coopRevenue = finance?.coopCommission ?? (data.totalCoopRevenue || 0);
  const pendingAmount = finance?.pendingPayoutsAmount ?? (data.pendingPayoutsAmount ?? 0);
  const disbursedAmount = finance?.totalDisbursedAmount ?? (data.totalDisbursedAmount ?? data.totalProviderPayout ?? 0);

  return (
    <div className="space-y-4 sm:space-y-6 text-on-surface">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <BadgeCheck size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Header & Main Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Earnings, Payouts &amp; Tax Compliance
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              Treasury Apex
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Federation revenue allocation, Razorpay batch payouts, TDS Section 194O tax reports, and welfare funds.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => handleFetchStatement()}
            className="px-3 py-1.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <FileText size={13} className="text-primary" />
            <span>Monthly Statement</span>
          </button>
          <button
            onClick={() => setCommissionModal(true)}
            className="px-3 py-1.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Sliders size={13} className="text-primary" />
            <span>Configure Rates</span>
          </button>
          <button
            onClick={() => setPayoutModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#006d30] text-white text-xs font-bold hover:bg-[#005a26] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-98"
          >
            <Send size={13} />
            <span>Disburse Payouts</span>
          </button>
        </div>
      </div>

      {/* ── 4 Sleek Compact Horizontal KPI Stat Tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl border border-outline-variant/60 bg-surface shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal">Total Gross GMV</p>
            <p className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">₹{grossGMV.toLocaleString()}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center font-bold shrink-0">
            <TrendingUp size={15} />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-outline-variant/60 bg-surface shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal">Federation Revenue</p>
            <p className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">₹{fedRevenue.toLocaleString()}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center font-bold shrink-0">
            <IndianRupee size={15} />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-outline-variant/60 bg-surface shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal">Cooperative Retained</p>
            <p className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">₹{coopRevenue.toLocaleString()}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center font-bold shrink-0">
            <Building2 size={15} />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-outline-variant/60 bg-surface shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal">Pending Disbursal</p>
            <p className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">₹{pendingAmount.toLocaleString()}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center font-bold shrink-0">
            <Users size={15} />
          </div>
        </div>
      </div>

      {/* ── Welfare Fund & TDS Compliance Cards (Theme Tokenized) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Welfare Fund Box */}
        <div className="rounded-2xl border border-outline-variant/60 bg-surface p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-on-surface">Welfare &amp; Social Security Fund</h3>
                <p className="text-[11px] text-on-surface-variant">PMSBY insurance and emergency assistance reserve</p>
              </div>
            </div>
            <span className="text-[10.5px] font-bold bg-surface-container text-on-surface-variant border border-outline-variant/40 px-2 py-0.5 rounded-full shrink-0">
              {finance?.welfareAllocationPct || 10}% Pool
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-0.5">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">Reserve Balance</span>
              <p className="text-lg font-black text-on-surface">₹{(finance?.welfareFundReserve || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-0.5">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">Workers Covered</span>
              <p className="text-lg font-black text-on-surface">{data.totalProviders || 0} Members</p>
            </div>
          </div>
        </div>

        {/* Section 194O TDS Tax Compliance Box */}
        <div className="rounded-2xl border border-outline-variant/60 bg-surface p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Percent size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-on-surface">Tax Compliance (TDS u/s 194O)</h3>
                <p className="text-[11px] text-on-surface-variant">1% statutory marketplace TDS deduction</p>
              </div>
            </div>
            <span className="text-[10.5px] font-bold bg-surface-container text-on-surface-variant border border-outline-variant/40 px-2 py-0.5 rounded-full shrink-0">
              {finance?.tdsRate || 1}% TDS
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-0.5">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">TDS Deposited</span>
              <p className="text-lg font-black text-on-surface">₹{(finance?.totalTdsDeducted || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-0.5">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">Form 26AS Status</span>
              <p className="text-xs font-bold text-on-surface mt-1 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-500" /> Compliant ✓
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cooperative Revenue Breakdown ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-1.5">
            <Landmark size={15} className="text-primary" />
            Cooperative Revenue &amp; Distribution Summary
          </h2>
          <span className="text-xs text-on-surface-variant font-medium">
            {data.coopStats?.length || 0} Affiliated Societies
          </span>
        </div>

        {/* ── Mobile Cooperative Revenue Cards (< 768px) ── */}
        <div className="md:hidden space-y-2.5">
          {(data.coopStats || []).length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-outline-variant text-center text-xs text-on-surface-variant bg-surface">
              No cooperative transactions recorded yet.
            </div>
          ) : (
            (data.coopStats || []).map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-2xl border border-outline-variant/60 bg-surface space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-on-surface">{c.name}</h3>
                    <p className="text-[11px] text-on-surface-variant">{c.region || "Central Region"}</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-on-surface-variant px-2 py-0.5 rounded-md bg-surface-container">
                    {c.members || c.providers || 0} Members
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 space-y-0.5">
                    <span className="text-[10px] text-on-surface-variant font-medium">Coop Share</span>
                    <p className="font-bold text-on-surface">₹{(c.revenue * 0.8).toFixed(0)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 space-y-0.5">
                    <span className="text-[10px] text-on-surface-variant font-medium">Fed Income</span>
                    <p className="font-bold text-on-surface">₹{(c.revenue * 0.2).toFixed(0)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop Cooperative Table (>= 768px) ── */}
        <div className="hidden md:block rounded-2xl border border-outline-variant bg-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="px-5 py-3">Cooperative Society</th>
                  <th className="px-5 py-3">Jurisdiction Region</th>
                  <th className="px-5 py-3">Members</th>
                  <th className="px-5 py-3">Completed Jobs</th>
                  <th className="px-5 py-3">Coop Commission</th>
                  <th className="px-5 py-3 text-right">Federation Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {(data.coopStats || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-on-surface-variant">
                      No cooperative transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  (data.coopStats || []).map((c) => (
                    <tr key={c.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-on-surface">{c.name}</td>
                      <td className="px-5 py-3.5 text-on-surface-variant">{c.region || "Central Region"}</td>
                      <td className="px-5 py-3.5 font-semibold text-on-surface">{c.members || c.providers || 0}</td>
                      <td className="px-5 py-3.5 text-on-surface">{c.bookings || 0}</td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">₹{(c.revenue * 0.8).toFixed(0)}</td>
                      <td className="px-5 py-3.5 font-black text-primary text-right">₹{(c.revenue * 0.2).toFixed(0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Configure Rates Modal ── */}
      {commissionModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setCommissionModal(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 lg:p-8 space-y-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <Sliders size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Configure Commission &amp; Fiscal Rates</h2>
                  <p className="text-xs text-on-surface-variant">Update statutory deductions and category fee splits.</p>
                </div>
              </div>
              <button onClick={() => setCommissionModal(false)} className="p-1.5 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Federation Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={defaultRate}
                    onChange={(e) => setDefaultRate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Welfare Pool (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={welfareRate}
                    onChange={(e) => setWelfareRate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">TDS Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tdsRate}
                    onChange={(e) => setTdsRate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-outline-variant/60">
                <h4 className="font-bold text-on-surface">Category Override Rates</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categoryRates.map((cat, i) => (
                    <div key={cat.category} className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-1">
                      <span className="text-[11px] font-bold text-on-surface">{cat.category}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          value={cat.rate}
                          onChange={(e) => handleCategoryRateChange(i, e.target.value)}
                          className="w-full h-7 px-2 rounded-lg border border-outline-variant bg-surface text-[11px] font-bold text-on-surface outline-none focus:border-primary"
                        />
                        <span className="text-[11px] text-on-surface-variant font-bold">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setCommissionModal(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingsBusy}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {settingsBusy ? "Saving..." : "Save Rates"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Disburse Payouts Modal ── */}
      {payoutModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setPayoutModal(false)}>
          <div className="w-full max-w-md bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#006d30] text-white flex items-center justify-center font-bold">
                  <Send size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Initiate Batch Payout</h3>
                  <p className="text-[11px] text-on-surface-variant">Razorpay Payouts Gateway</p>
                </div>
              </div>
              <button onClick={() => setPayoutModal(false)} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Pending Disbursal Amount:</span>
                <span className="font-bold text-base text-on-surface">₹{pendingAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Target Beneficiaries:</span>
                <span className="font-bold text-on-surface">{data.totalProviders || 0} Registered Workers</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>Statutory TDS u/s 194O:</span>
                <span>{finance?.tdsRate || 1}% Auto-Deducted</span>
              </div>
              {pendingAmount === 0 && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>All provider earnings have been disbursed &amp; settled to bank accounts.</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setPayoutModal(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleInitiateBatchPayout}
                disabled={payoutBusy || pendingAmount === 0}
                className="px-5 py-2 rounded-xl bg-[#006d30] text-white text-xs font-bold hover:bg-[#005a26] transition cursor-pointer shadow-2xs disabled:opacity-40"
              >
                {payoutBusy ? "Disbursing..." : "Confirm & Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly Statement Modal ── */}
      {statementModal && statementData && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setStatementModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Monthly Financial Statement</h3>
                  <p className="text-[11px] text-on-surface-variant">Statement Period: {statementMonth}</p>
                </div>
              </div>
              <button onClick={() => setStatementModal(false)} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-0.5">
                <span className="text-[10px] text-on-surface-variant font-medium">Gross GMV</span>
                <p className="font-bold text-sm text-on-surface">₹{(statementData.grossVolume || grossGMV).toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-0.5">
                <span className="text-[10px] text-on-surface-variant font-medium">Fed Income</span>
                <p className="font-bold text-sm text-primary">₹{(statementData.federationIncome || fedRevenue).toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-0.5">
                <span className="text-[10px] text-on-surface-variant font-medium">Coop Retention</span>
                <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">₹{(statementData.coopRetention || coopRevenue).toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-0.5">
                <span className="text-[10px] text-on-surface-variant font-medium">Provider Payout</span>
                <p className="font-bold text-sm text-amber-600 dark:text-amber-400">₹{(statementData.providerDisbursal || providerPayout).toLocaleString()}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={13} />
                <span>Print Statement</span>
              </button>
              <button
                type="button"
                onClick={() => setStatementModal(false)}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}