import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  Percent, Save, IndianRupee, TrendingUp, Users,
  Printer, ShieldCheck, CheckCircle2,
  Building2, Sparkles, RefreshCw
} from "lucide-react";
import FairWageBreakdown from "../../components/FairWageBreakdown";

const CATEGORIES = [
  { name: "Electrician", avgPrice: 650, icon: "⚡" },
  { name: "Plumber", avgPrice: 600, icon: "🔧" },
  { name: "Carpenter", avgPrice: 750, icon: "🪚" },
  { name: "Home Cleaner", avgPrice: 500, icon: "🧹" },
  { name: "AC Technician", avgPrice: 850, icon: "❄️" },
];

export default function Commission() {
  const [rate, setRate] = useState("");
  const [savedRate, setSavedRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avgBooking, setAvgBooking] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Electrician");
  const [simPrice, setSimPrice] = useState(650);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/admin/commission");
        setSavedRate(data.commissionRate ?? 8);
        setRate(String(data.commissionRate ?? 8));
        setAvgBooking(data.avgBookingValue ?? 650);
        if (data.avgBookingValue) setSimPrice(Math.round(data.avgBookingValue));
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.patch("/admin/commission", { rate: Number(rate) });
      setSavedRate(data.commissionRate ?? Number(rate));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const booking = Math.round(avgBooking || simPrice || 650);
  const current = savedRate ?? 8;
  const commission = (booking * current) / 100;
  const provider = booking - commission;

  // Simulator calculations
  const simVal = Number(simPrice) || 650;
  const simCoop = (simVal * current) / 100;
  const simWelfare = (simVal * 0.05);
  const simWorker = simVal - simCoop - simWelfare;

  const summaryCards = [
    { label: "Current Rate", value: `${current}%`, Icon: Percent, bg: "bg-primary/10", ic: "text-primary" },
    { label: "Avg Booking Value", value: `₹${booking.toLocaleString("en-IN")}`, Icon: IndianRupee, bg: "bg-amber-500/10", ic: "text-amber-600 dark:text-amber-400" },
    { label: "Cooperative Earns", value: `₹${commission.toFixed(0)}`, Icon: TrendingUp, bg: "bg-emerald-500/10", ic: "text-emerald-600 dark:text-emerald-400" },
    { label: "Provider Earns", value: `₹${provider.toFixed(0)}`, Icon: Users, bg: "bg-primary/10", ic: "text-primary" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 text-on-surface">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Analytics &amp; Fair Wage Commission
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Configure cooperative retention commission, social security splits, and member wage payouts.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all shrink-0"
        >
          <Printer size={14} className="text-primary" />
          <span>Download Report</span>
        </button>
      </div>

      {/* Summary cards (Compact Sleek Horizontal Tiles) */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-outline-variant bg-surface p-3.5 h-16" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {summaryCards.map(({ label, value, Icon, bg, ic }) => (
            <div key={label} className="rounded-xl border border-outline-variant/60 bg-surface p-3 sm:p-3.5 shadow-2xs hover:border-primary/40 transition-all flex items-center justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal truncate">{label}</p>
                <p className="text-xl sm:text-2xl font-black tracking-tight text-on-surface">{value}</p>
              </div>
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={15} strokeWidth={2.2} className={ic} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Configurable Fair Wage Distribution Engine */}
      <FairWageBreakdown
        customerPays={booking || 650}
        workerSharePercent={100 - (current || 8) - 5}
        coopSharePercent={current || 8}
        welfareSharePercent={5}
        adminSharePercent={5}
      />

      {/* Main Grid: Rate Editor & Category Simulation */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5 items-start">
        {/* Rate Editor */}
        <div className="lg:col-span-3 rounded-2xl border border-outline-variant/60 bg-surface p-4 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-on-surface">Cooperative Commission Rate</h2>
              <p className="text-[11.5px] text-on-surface-variant mt-0.5">
                Applied uniformly to every booking settled through the cooperative escrow.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20 shrink-0">
              Active: {current}%
            </span>
          </div>

          <div className="relative">
            <input
              type="number"
              className="h-12 sm:h-14 w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 pr-12 text-2xl sm:text-[28px] font-black text-on-surface outline-none transition-all focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
              value={rate}
              min="0"
              max="25"
              step="0.5"
              onChange={(e) => setRate(e.target.value)}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl sm:text-[22px] font-bold text-on-surface-variant">%</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <p className="text-xs text-on-surface-variant">Recommended statutory benchmark: 5% - 10%</p>
            <button
              className={`h-10 inline-flex items-center justify-center gap-2 px-6 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                saved
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                  : "bg-primary text-on-primary hover:opacity-90 active:scale-98"
              }`}
              disabled={saving}
              onClick={save}
            >
              <Save size={14} strokeWidth={2.5} />
              <span>{saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* Live Category Simulator */}
        <div className="lg:col-span-2 rounded-2xl border border-outline-variant/60 bg-surface p-4 sm:p-6 space-y-3.5 shadow-2xs">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-on-surface">Trade Category Simulator</h2>
            <p className="text-[11.5px] text-on-surface-variant mt-0.5">Test real-time wage take-home across trades.</p>
          </div>

          {/* Trade Category Selector */}
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setSimPrice(cat.avgPrice);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedCategory === cat.name
                    ? "bg-primary text-on-primary shadow-2xs"
                    : "bg-surface-container-low border border-outline-variant/60 text-on-surface hover:bg-surface-container"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/40">
              <span className="text-on-surface-variant">Customer Invoice Value</span>
              <span className="font-bold text-on-surface">₹{simVal}.00</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/40">
              <span className="text-on-surface-variant">Cooperative Retention ({current}%)</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{simCoop.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/40">
              <span className="text-on-surface-variant">Welfare &amp; Insurance (5%)</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">₹{simWelfare.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="font-bold text-emerald-700 dark:text-emerald-300">Worker Net Take-Home</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{simWorker.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
