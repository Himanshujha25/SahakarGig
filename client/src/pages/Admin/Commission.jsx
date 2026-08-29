import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  Percent, Save, IndianRupee, TrendingUp, Users,
  Download, Printer, Sliders, ShieldCheck, CheckCircle2,
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
    { label: "Current Rate", value: `${current}%`, Icon: Percent, bg: "bg-[#e8edff]", ic: "text-[#00288e]" },
    { label: "Avg Booking Value", value: `₹${booking.toLocaleString("en-IN")}`, Icon: IndianRupee, bg: "bg-amber-50", ic: "text-amber-800" },
    { label: "Cooperative Earns", value: `₹${commission.toFixed(0)}`, Icon: TrendingUp, bg: "bg-emerald-50", ic: "text-emerald-700" },
    { label: "Provider Earns", value: `₹${provider.toFixed(0)}`, Icon: Users, bg: "bg-[#e8edff]", ic: "text-[#00288e]" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-24 lg:pb-10 space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Analytics &amp; Fair Wage Commission
          </h1>
          <p className="text-[14px] text-slate-500 mt-0.5">
            Configure cooperative retention commission, social security splits, and member wage payouts.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all shrink-0"
        >
          <Printer size={14} className="text-[#00288e]" />
          <span>Download Commission Report</span>
        </button>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(({ label, value, Icon, bg, ic }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={15} strokeWidth={2.5} className={ic} />
                </div>
              </div>
              <p className="text-[24px] font-black tracking-tight text-slate-900">{value}</p>
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Rate Editor */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Cooperative Commission Rate</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Applied uniformly to every booking settled through the cooperative escrow.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
              Active: {current}%
            </span>
          </div>

          <div className="relative">
            <input
              type="number"
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 pr-12 text-[28px] font-black text-slate-900 outline-none transition-all focus:border-[#00288e] focus:bg-white focus:ring-2 focus:ring-[#00288e]/20"
              value={rate}
              min="0"
              max="25"
              step="0.5"
              onChange={(e) => setRate(e.target.value)}
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[22px] font-bold text-slate-400">%</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-500">Recommended statutory benchmark: 5% - 10%</p>
            <button
              className={`h-10 inline-flex items-center gap-2 px-6 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                saved
                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                  : "bg-[#00288e] text-white hover:bg-[#001f70]"
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
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900">Trade Category Simulator</h2>
            <p className="text-xs text-slate-500 mt-0.5">Test real-time wage take-home across trades.</p>
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedCategory === cat.name
                    ? "bg-[#00288e] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Customer Invoice Value</span>
              <span className="font-bold text-slate-900">₹{simVal}.00</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Cooperative Retention ({current}%)</span>
              <span className="font-bold text-emerald-700">₹{simCoop.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Welfare &amp; Insurance (5%)</span>
              <span className="font-bold text-amber-700">₹{simWelfare.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="font-bold text-emerald-900">Worker Net Take-Home</span>
              <span className="text-base font-black text-emerald-700">₹{simWorker.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
