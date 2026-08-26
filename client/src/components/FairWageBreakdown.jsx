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
    <div className="w-full rounded-2xl border border-outline-variant/60 bg-surface p-5 space-y-4 shadow-sm">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <PieChart size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-on-surface">Transparent Fair Wage Engine</h3>
            <p className="text-[11px] text-on-surface-variant">Configurable Cooperative Revenue Split</p>
          </div>
        </div>
        <span className="text-[14px] font-bold text-primary">Total: ₹{customerPays.toLocaleString()}</span>
      </div>

      {/* Visual Split Bar */}
      <div className="space-y-1">
        <div className="h-3 w-full rounded-full bg-surface-container-low overflow-hidden flex">
          <div className="h-full bg-[#00288e] transition-all duration-300" style={{ width: `${workerSharePercent}%` }} title={`Worker: ${workerSharePercent}%`} />
          <div className="h-full bg-[#006d30] transition-all duration-300" style={{ width: `${coopSharePercent}%` }} title={`Cooperative: ${coopSharePercent}%`} />
          <div className="h-full bg-[#6b4200] transition-all duration-300" style={{ width: `${welfareSharePercent}%` }} title={`Welfare: ${welfareSharePercent}%`} />
          <div className="h-full bg-[#444653] transition-all duration-300" style={{ width: `${adminSharePercent}%` }} title={`Admin: ${adminSharePercent}%`} />
        </div>
      </div>

      {/* Breakdown Items */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[12px]">
        <div className="p-2.5 rounded-xl bg-[#e8edff] border border-[#00288e]/10">
          <div className="flex items-center justify-between text-[#00288e] font-bold">
            <span>Worker Earning</span>
            <span>{workerSharePercent}%</span>
          </div>
          <p className="text-[16px] font-bold text-[#00288e] mt-1">₹{workerEarning.toLocaleString()}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-[#e6f9ec] border border-[#006d30]/10">
          <div className="flex items-center justify-between text-[#006d30] font-bold">
            <span>Coop Fund</span>
            <span>{coopSharePercent}%</span>
          </div>
          <p className="text-[16px] font-bold text-[#006d30] mt-1">₹{coopFund.toLocaleString()}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-[#fff3e0] border border-[#6b4200]/10">
          <div className="flex items-center justify-between text-[#6b4200] font-bold">
            <span>Welfare & Cover</span>
            <span>{welfareSharePercent}%</span>
          </div>
          <p className="text-[16px] font-bold text-[#6b4200] mt-1">₹{welfareFund.toLocaleString()}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
          <div className="flex items-center justify-between text-on-surface-variant font-bold">
            <span>Platform Admin</span>
            <span>{adminSharePercent}%</span>
          </div>
          <p className="text-[16px] font-bold text-on-surface mt-1">₹{adminPlatform.toLocaleString()}</p>
        </div>
      </div>

      <p className="text-[11px] text-on-surface-variant/80 italic flex items-center gap-1">
        <Info size={12} /> Percentages are dynamically configured by your local cooperative administration board.
      </p>
    </div>
  );
}
