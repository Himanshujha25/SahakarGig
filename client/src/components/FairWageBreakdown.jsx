import { IndianRupee, PieChart, Info, ShieldCheck, HeartPulse, Building2 } from 'lucide-react';

export default function FairWageBreakdown({
  customerPays = 1000,
  workerSharePercent = 75,
  coopSharePercent = 10,
  welfareSharePercent = 5,
  adminSharePercent = 10,
}) {
  const workerEarning = Math.round((customerPays * workerSharePercent) / 100);
  const coopFund = Math.round((customerPays * coopSharePercent) / 100);
  const welfareFund = Math.round((customerPays * welfareSharePercent) / 100);
  const adminPlatform = Math.round((customerPays * adminSharePercent) / 100);

  return (
    <div className="w-full rounded-2xl border border-outline-variant/60 bg-surface p-4 sm:p-5 space-y-3.5 shadow-2xs">
      {/* Title */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <PieChart size={17} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-on-surface">Transparent Fair Wage Engine</h3>
            <p className="text-[11px] text-on-surface-variant">Configurable Cooperative Revenue Split</p>
          </div>
        </div>
        <span className="text-xs sm:text-sm font-black text-primary bg-primary/10 px-2.5 py-1 rounded-xl border border-primary/20">
          Total: ₹{customerPays.toLocaleString()}
        </span>
      </div>

      {/* Visual Split Bar */}
      <div className="space-y-1">
        <div className="h-2.5 sm:h-3 w-full rounded-full bg-surface-container-highest overflow-hidden flex">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${workerSharePercent}%` }} title={`Worker: ${workerSharePercent}%`} />
          <div className="h-full bg-emerald-600 transition-all duration-300" style={{ width: `${coopSharePercent}%` }} title={`Cooperative: ${coopSharePercent}%`} />
          <div className="h-full bg-amber-600 transition-all duration-300" style={{ width: `${welfareSharePercent}%` }} title={`Welfare: ${welfareSharePercent}%`} />
          <div className="h-full bg-slate-500 transition-all duration-300" style={{ width: `${adminSharePercent}%` }} title={`Admin: ${adminSharePercent}%`} />
        </div>
      </div>

      {/* Breakdown Items */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 space-y-0.5">
          <div className="flex items-center justify-between text-primary font-bold text-[11px]">
            <span>Worker Earning</span>
            <span>{workerSharePercent}%</span>
          </div>
          <p className="text-sm sm:text-base font-black text-primary">₹{workerEarning.toLocaleString()}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
            <span>Coop Fund</span>
            <span>{coopSharePercent}%</span>
          </div>
          <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">₹{coopFund.toLocaleString()}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-bold text-[11px]">
            <span>Welfare &amp; Cover</span>
            <span>{welfareSharePercent}%</span>
          </div>
          <p className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">₹{welfareFund.toLocaleString()}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-0.5">
          <div className="flex items-center justify-between text-on-surface-variant font-bold text-[11px]">
            <span>Platform Admin</span>
            <span>{adminSharePercent}%</span>
          </div>
          <p className="text-sm sm:text-base font-black text-on-surface">₹{adminPlatform.toLocaleString()}</p>
        </div>
      </div>

      <p className="text-[10.5px] text-on-surface-variant/80 flex items-center gap-1">
        <Info size={12} className="shrink-0" /> Percentages are dynamically configured by your local cooperative administration board.
      </p>
    </div>
  );
}
