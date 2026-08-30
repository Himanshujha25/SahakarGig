import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import {
  IconWallet, IconCurrencyRupee, IconPlus, IconArrowDownLeft, IconArrowUpRight,
  IconTrendingUp, IconCalendar, IconReceipt, IconSparkles, IconShieldCheck,
  IconLoader2, IconAlertCircle, IconTrophy, IconBriefcase, IconCrown, IconCheck
} from "@tabler/icons-react";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById("rzp-wallet-script")) return resolve(true);
    const s = document.createElement("script");
    s.id = "rzp-wallet-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const fmt = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const QUICK_TOPUPS = [100, 200, 500, 1000];

export default function WalletPage() {
  const [tab, setTab] = useState("wallet");
  const [data, setData] = useState({ balance: 0, transactions: [] });
  const [insights, setInsights] = useState(null);
  const [sub, setSub] = useState(null);       // subscription overview
  const [subBusy, setSubBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(200);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [{ data: w }, { data: i }, { data: s }] = await Promise.all([
        api.get("/wallet"),
        api.get("/analytics/household").catch(() => ({ data: null })),
        api.get("/subscriptions").catch(() => ({ data: null })),
      ]);
      setData(w);
      setInsights(i);
      setSub(s);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Subscription plans (real pay from wallet or Razorpay) ──
  async function subscribePlan(plan) {
    if (subBusy) return;
    setSubBusy(true);
    setError("");
    try {
      const { data: res } = await api.post("/subscriptions/subscribe", { plan });
      if (res.paidFromWallet) {
        await load();
        return;
      }
      const order = res;
      if (!order.orderId) throw new Error("Could not create subscription order");

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay checkout could not be loaded. Please try again.");

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "SahakarGig",
          description: "Subscription Plan",
          order_id: order.orderId,
          theme: { color: "#1e6b65" },
          handler: async (response) => {
            try {
              await api.post("/subscriptions/verify", {
                plan,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              resolve();
            } catch (err) {
              reject(new Error(err?.response?.data?.message || "Subscription verification failed"));
            }
          },
          modal: { ondismiss: () => reject(new Error("cancelled")) },
        });
        rzp.open();
      });
      await load();
    } catch (err) {
      if (err?.message !== "cancelled") setError(err?.message || "Could not subscribe. Please try again.");
    } finally {
      setSubBusy(false);
    }
  }

  async function cancelSub() {
    if (subBusy || !sub?.active) return;
    if (!window.confirm("Stop auto-renewal? Your current cycle stays active until it expires.")) return;
    setSubBusy(true);
    try {
      const { data } = await api.post("/subscriptions/cancel");
      setSub(data);
    } catch {
      setError("Could not cancel the subscription right now.");
    } finally {
      setSubBusy(false);
    }
  }

  async function addMoney(useCustom) {
    const value = useCustom ? amount : amount || QUICK_TOPUPS[0];
    if (!Number.isFinite(Number(value)) || Number(value) < 100) {
      setError("Minimum top-up is ₹100");
      return;
    }
    setError("");
    setAdding(true);
    try {
      const { data: order } = await api.post("/wallet/topup", { amount: Math.floor(Number(value)) });

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay checkout could not be loaded. Please try again.");

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "SahakarGig",
          description: "Wallet Top-up",
          order_id: order.orderId,
          theme: { color: "#1e6b65" },
          handler: async (response) => {
            try {
              await api.post("/wallet/topup/verify", {
                amount: Math.floor(Number(value)),
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              resolve();
            } catch (err) {
              reject(new Error(err?.response?.data?.message || "Top-up verification failed"));
            }
          },
          modal: { ondismiss: () => reject(new Error("cancelled")) },
        });
        rzp.open();
      });

      await load();
    } catch (err) {
      if (err?.message !== "cancelled") setError(err?.message || "Top-up failed. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  const trend = insights?.monthlyTrend || [];
  const maxTrend = Math.max(1, ...trend.map((t) => t.amount));
  const catMax = Math.max(1, ...(insights?.categoryBreakdown || []).map((c) => c.value));

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="orvia-badge-lime hidden sm:inline-flex"><span className="w-2 h-2 rounded-full bg-[#65a30d] animate-pulse" />Prepaid Credits & Insights</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-on-surface"
            style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
            Wallet & Spending
          </h1>
          <p className="hidden sm:block text-sm text-on-surface-variant/80 mt-0.5">
            Top up your cooperative wallet, pay bookings instantly, and see where your money goes.
          </p>
        </div>
        <Link to="/household/bookings" className="orvia-pill-selected hidden sm:inline-flex items-center gap-2">
          <IconReceipt size={14} /> My Bookings
        </Link>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-surface-container-low border border-outline-variant">
        <button onClick={() => setTab("wallet")}
          className={`h-9 px-5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            tab === "wallet" ? "orvia-btn-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
          <IconWallet size={13} className="inline mr-1.5" />Wallet
        </button>
        <button onClick={() => setTab("insights")}
          className={`h-9 px-5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            tab === "insights" ? "orvia-btn-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
          <IconTrendingUp size={13} className="inline mr-1.5" />Insights
        </button>
        <button onClick={() => setTab("plans")}
          className={`h-9 px-5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            tab === "plans" ? "orvia-btn-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
          <IconCrown size={13} className="inline mr-1.5" />Plans
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="animate-pulse h-40 rounded-[28px] border border-outline-variant bg-surface-container-low lg:col-span-1" />
          <div className="animate-pulse h-40 rounded-[28px] border border-outline-variant bg-surface-container-low lg:col-span-2" />
        </div>
      ) : tab === "wallet" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Balance card */}
          <div className="orvia-card p-5 sm:p-6 flex flex-col gap-3.5 sm:gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-container/60 text-primary flex items-center justify-center shrink-0">
                  <IconWallet size={18} stroke={2} />
                </div>
                <span className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-on-surface">Available Balance</span>
              </div>
            </div>

            <p className="text-4xl sm:text-5xl font-black tracking-tight text-on-surface leading-none">
              {fmt(data.balance)}
              <span className="ml-1.5 align-middle text-[10px] sm:text-[11px] font-extrabold tracking-widest uppercase text-on-surface-variant/70">INR</span>
            </p>

            <div className="hidden sm:block h-px bg-outline-variant/70" />

            <p className="hidden sm:flex text-[11px] text-on-surface-variant items-center gap-1">
              <IconShieldCheck size={13} className="text-primary" />
              Wallets are escrow-protected — refunds go straight back here.
            </p>

            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {QUICK_TOPUPS.map((q) => (
                  <button key={q} onClick={() => setAmount(q)}
                    className={`px-3 sm:px-3.5 h-8 sm:h-9 rounded-full text-xs font-bold border transition-all duration-200 active:scale-95 cursor-pointer ${
                      amount === q
                        ? "bg-primary text-on-primary border-primary shadow-xs"
                        : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary/50 hover:text-primary active:scale-95"}`}>
                    ₹{q}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <IconCurrencyRupee size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
                  <input type="number" min={100} value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-10 sm:h-11 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-on-surface-variant/60 transition-all"
                    placeholder="Custom amount" />
                </div>
                <button onClick={() => addMoney(true)} disabled={adding}
                  className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs">
                  {adding ? <IconLoader2 size={14} className="animate-spin" /> : <IconPlus size={14} />}
                  Add
                </button>
              </div>
              {error && (
                <p className="text-[11px] font-bold text-error flex items-center gap-1">
                  <IconAlertCircle size={12} /> {error}
                </p>
              )}
              <p className="hidden sm:block text-[10px] text-on-surface-variant/70 font-medium">Min top-up ₹100 · Instant credit via UPI / Cards / NetBanking</p>
            </div>
          </div>

          {/* Transactions */}
          <div className="lg:col-span-2 orvia-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary-container/50 text-primary flex items-center justify-center shrink-0">
                  <IconBriefcase size={17} stroke={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">Recent Transactions</h3>
                  <p className="text-xs text-on-surface-variant/70 font-medium">Top-ups & booking payments</p>
                </div>
              </div>
            </div>

            {data.transactions.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <IconWallet size={40} className="mx-auto text-on-surface-variant/60" stroke={1.5} />
                <p className="text-sm font-semibold text-on-surface">No wallet activity yet</p>
                <p className="text-xs text-on-surface-variant/70">Add money above to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/60">
                {data.transactions.map((tx) => (
                  <div key={tx._id} className="flex items-center gap-3 py-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === "credit" ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400" : "bg-primary-container/50 text-primary"}`}>
                      {tx.type === "credit" ? <IconArrowDownLeft size={16} /> : <IconArrowUpRight size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-on-surface truncate">{tx.note || (tx.type === "credit" ? "Wallet top-up" : "Booking payment")}</p>
                      <p className="text-[11px] font-medium text-on-surface-variant/70">
                        {tx.method} · {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} {new Date(tx.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={`text-sm font-extrabold ${tx.type === "credit" ? "text-emerald-700 dark:text-emerald-300" : "text-on-surface"}`}>
                      {tx.type === "credit" ? "+" : "−"}{fmt(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : tab === "plans" ? (
        /* ── Plans tab ── */
        <div className="space-y-4">
          {sub?.active && (
            <div className={`orvia-card p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border ${sub.active.plan === "premium" ? "border-[#c9a227]/50" : "border-primary/30"}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#c9a227] to-[#e5c15c] text-[#3b2c00] flex items-center justify-center shrink-0">
                  <IconCrown size={20} />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-on-surface">
                    {sub.active.plan} Plan active
                    <span className="ml-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                      {sub.active.discountPct}% off every booking
                    </span>
                  </p>
                  <p className="text-xs text-on-surface-variant/70 font-medium">
                    {sub.active.autoRenew ? "Auto-renews from your wallet" : "Auto-renewal off"} · renews {new Date(sub.active.renewsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <button onClick={cancelSub} disabled={subBusy}
                className="h-9 px-4 rounded-full border border-error/40 text-error text-xs font-bold hover:bg-error-container/40 transition-all cursor-pointer disabled:opacity-60">
                Cancel auto-renew
              </button>
            </div>
          )}

          {error && sub?.active && (
            <p className="text-xs font-bold text-error flex items-center gap-1"><IconAlertCircle size={12} /> {error}</p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(sub?.plans || []).map((p) => {
              const isActive = sub?.active && p.plan === sub.active.plan;
              return (
                <div key={p.plan} className={`orvia-card p-6 flex flex-col gap-4 ${isActive ? "border-primary/40 ring-1 ring-primary/20" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">{p.plan}</p>
                      <p className="text-2xl font-black text-on-surface mt-1">
                        ₹{p.price}<span className="text-xs font-semibold text-on-surface-variant/70">/mo</span>
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${p.plan === "premium" ? "bg-gradient-to-br from-[#c9a227] to-[#e5c15c] text-[#3b2c00]" : "bg-primary-container/50 text-primary"}`}>
                      <IconCrown size={18} />
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant/70 font-medium leading-relaxed">{p.desc}</p>
                  <div className="space-y-2">
                    {p.perks.map((perk) => (
                      <div key={perk} className="flex items-center gap-2 text-xs font-semibold text-on-surface">
                        <IconCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" /> {perk}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => subscribePlan(p.plan)}
                    disabled={subBusy || isActive}
                    className={`mt-auto h-10 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 ${
                      isActive
                        ? "bg-surface-container-low text-on-surface-variant"
                        : p.plan === "premium"
                          ? "bg-gradient-to-r from-[#b7941d] to-[#e5c15c] text-[#3b2c00] hover:opacity-90"
                          : "orvia-btn-primary"
                    }`}>
                    {subBusy ? <IconLoader2 size={14} className="animate-spin" /> : <IconSparkles size={13} />}
                    {isActive ? "Active plan" : `Switch to ${p.plan}`}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-on-surface-variant/70 font-medium flex items-center justify-center gap-1.5">
            <IconShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
            Plans are billed monthly. Wallet debit when you have balance, Razorpay otherwise. Cancel anytime.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {!insights ? (
            <div className="orvia-card p-10 text-center space-y-2">
              <IconReceipt size={40} className="mx-auto text-on-surface-variant/60" stroke={1.5} />
              <p className="text-sm font-semibold text-on-surface">Complete a paid booking to see insights</p>
              <p className="text-xs text-on-surface-variant/70">Once you pay for jobs, trends & breakdowns appear here.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Spent", value: fmt(insights.totalPaid), Icon: IconCurrencyRupee, bg: "bg-primary-container/50 text-primary" },
                  { label: "This Month", value: fmt(insights.monthSpent), Icon: IconCalendar, bg: "bg-primary-container/50 text-primary" },
                  { label: "Paid Bookings", value: insights.paidBookings, Icon: IconBriefcase, bg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400" },
                  { label: "Avg / Booking", value: fmt(insights.avgPerBooking), Icon: IconTrophy, bg: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300" },
                ].map(({ label, value, Icon, bg }) => (
                  <div key={label} className="orvia-card flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-wider">{label}</p>
                      <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                        <Icon size={17} stroke={2} />
                      </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Monthly trend */}
                <div className="orvia-card p-5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary-container/50 text-primary flex items-center justify-center">
                      <IconTrendingUp size={17} stroke={2} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-on-surface">Spending Trend</h3>
                      <p className="text-xs text-on-surface-variant/70 font-medium">Last 6 months</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2 h-36 pt-2">
                    {trend.map((t) => (
                      <div key={t.key} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                        <span className="text-[9px] font-bold text-on-surface-variant/80">{t.amount > 0 ? fmt(t.amount) : ""}</span>
                        <div className="w-full rounded-lg bg-primary-container/50 overflow-hidden flex flex-col justify-end" style={{ height: "100%" }}>
                          <div className={`w-full rounded-lg transition-all duration-500 ${t.amount > 0 ? "bg-gradient-to-t from-[#0f172a] to-[#1e6b65]" : "bg-outline-variant"}`}
                            style={{ height: `${Math.max(4, (t.amount / maxTrend) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-on-surface-variant/80">{t.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category breakdown */}
                <div className="orvia-card p-5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <IconBriefcase size={17} stroke={2} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-on-surface">Spend by Service</h3>
                      <p className="text-xs text-on-surface-variant/70 font-medium">{insights.categoryTotal > 0 ? `${insights.categoryBreakdown.length} categories` : "No paid services yet"}</p>
                    </div>
                  </div>
                  {insights.categoryBreakdown.length === 0 ? (
                    <p className="text-xs text-on-surface-variant/70 py-6 text-center font-medium">Nothing to show yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {insights.categoryBreakdown.slice(0, 6).map((c) => (
                        <div key={c.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-on-surface truncate">{c.label}</span>
                            <span className="font-extrabold text-on-surface">{fmt(c.value)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#1e6b65] to-[#00288e]" style={{ width: `${(c.value / catMax) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {insights.topService && (
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
                      <IconTrophy size={15} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-on-surface">
                        Most used: <b className="text-emerald-700 dark:text-emerald-300">{insights.topService.label}</b> ({fmt(insights.topService.value)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}