import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Percent, Save, IndianRupee, TrendingUp, Users } from "lucide-react";
import FairWageBreakdown from "../../components/FairWageBreakdown";

export default function Commission() {
  const [rate, setRate] = useState("");
  const [savedRate, setSavedRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avgBooking, setAvgBooking] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/admin/commission");
        setSavedRate(data.commissionRate ?? 0);
        setRate(String(data.commissionRate ?? 0));
        setAvgBooking(data.avgBookingValue ?? 0);
      } catch {} finally { setLoading(false); }
    })();
    const id = setInterval(async () => {
      try {
        const { data } = await api.get("/admin/commission");
        setSavedRate(data.commissionRate ?? 0);
        setAvgBooking(data.avgBookingValue ?? 0);
      } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, []);

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.patch("/admin/commission", { rate: Number(rate) });
      setSavedRate(data.commissionRate ?? Number(rate));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  const booking = Math.round(avgBooking ?? 0);
  const current = savedRate ?? 0;
  const commission = (booking * current) / 100;
  const provider = booking - commission;

  const summaryCards = [
    { label: "Current Rate",       value: `${current}%`,              Icon: Percent,     bg: "bg-[#e8edff]", ic: "text-[#00288e]" },
    { label: "Avg Booking Value",  value: `₹${booking.toLocaleString("en-IN")}`, Icon: IndianRupee, bg: "bg-[#fff3e0]", ic: "text-[#6b4200]" },
    { label: "Cooperative Earns",  value: `₹${commission.toFixed(0)}`, Icon: TrendingUp,  bg: "bg-[#e6f9ec]", ic: "text-[#006d30]" },
    { label: "Provider Earns",     value: `₹${provider.toFixed(0)}`,  Icon: Users,       bg: "bg-[#e8edff]", ic: "text-[#00288e]" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-24 lg:pb-10 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
          Analytics & Commission
        </h1>
        <p className="text-[14px] text-on-surface-variant mt-0.5">
          Set the commission your cooperative earns on each completed booking.
        </p>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => <div key={i} className="animate-pulse rounded-2xl border border-outline-variant bg-surface h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(({ label, value, Icon, bg, ic }) => (
            <div key={label} className="rounded-2xl border border-outline-variant/60 bg-surface p-5 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">{label}</p>
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={15} strokeWidth={2} className={ic} />
                </div>
              </div>
              <p className="text-[24px] font-bold tracking-tight text-on-surface">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Configurable Fair Wage Distribution Engine */}
      <FairWageBreakdown
        customerPays={booking || 1000}
        workerSharePercent={100 - (current || 8) - 5}
        coopSharePercent={current || 8}
        welfareSharePercent={5}
        adminSharePercent={5}
      />

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Rate editor */}
        <div className="lg:col-span-3 rounded-2xl border border-outline-variant/60 bg-surface p-6 space-y-5">
          <div>
            <h2 className="text-[16px] font-bold text-on-surface">Commission Rate</h2>
            <p className="text-[13px] text-on-surface-variant mt-1">
              Applied uniformly to every booking settled through the cooperative.
            </p>
          </div>

          <div className="relative">
            <input
              type="number"
              className="h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-5 pr-12 text-[28px] font-bold text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              value={rate}
              min="0"
              max="100"
              onChange={(e) => setRate(e.target.value)}
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[22px] font-bold text-on-surface-variant">%</span>
          </div>

          <button
            className={`h-10 inline-flex items-center gap-2 px-5 rounded-xl border text-[13px] font-semibold transition-all duration-200 disabled:opacity-50 ${
              saved
                ? "border-[#006d30]/30 bg-[#e6f9ec] text-[#006d30]"
                : "border-outline-variant bg-surface text-on-surface hover:border-primary/40 hover:bg-[#e8edff] hover:text-[#00288e]"
            }`}
            disabled={saving}
            onClick={save}
          >
            <Save size={14} strokeWidth={2.5} />
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>

        {/* Breakdown */}
        <div className="lg:col-span-2 rounded-2xl border border-outline-variant/60 bg-surface p-6 space-y-4">
          <h2 className="text-[16px] font-bold text-on-surface">Booking Breakdown</h2>
          <p className="text-[12px] text-on-surface-variant">Based on average booking value of ₹{booking.toLocaleString("en-IN")}.</p>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between py-2.5 border-b border-outline-variant/40">
              <span className="text-[13px] text-on-surface-variant">Booking value</span>
              <span className="text-[14px] font-bold text-on-surface">₹{booking}.00</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-outline-variant/40">
              <span className="text-[13px] text-on-surface-variant">Cooperative ({current}%)</span>
              <span className="text-[14px] font-bold text-on-surface">₹{commission.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#e6f9ec] border border-[#006d30]/10">
              <span className="text-[13px] font-bold text-[#006d30]">Provider earns</span>
              <span className="text-[16px] font-bold text-[#006d30]">₹{provider.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[14px] font-bold text-on-surface">Total</span>
              <span className="text-[18px] font-bold text-primary">₹{booking}.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
