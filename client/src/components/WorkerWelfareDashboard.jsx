import { ShieldCheck, IndianRupee, Briefcase, Star, Clock, AlertTriangle, CheckCircle2, Award, HeartPulse } from 'lucide-react';

export default function WorkerWelfareDashboard({ monthlyEarnings = 28400, jobsCompleted = 47, rating = 4.8, workingHours = 164, emergencyFund = 1200 }) {
  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-md">
            <HeartPulse size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-on-surface tracking-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Worker Welfare Dashboard
            </h2>
            <p className="text-[12px] text-on-surface-variant font-medium">
              Ministry of Cooperation Aligned Social Security & Welfare Trust
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#e6f9ec] text-[#006d30] text-[12px] font-bold border border-[#006d30]/20 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#006d30] animate-pulse" /> Active Protection
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant text-[12px] font-medium mb-1">
            <span>Insurance</span>
            <ShieldCheck size={16} className="text-[#006d30]" />
          </div>
          <p className="text-[16px] font-bold text-[#006d30]">Active</p>
          <p className="text-[11px] text-on-surface-variant/70 mt-0.5">PMSBY ₹2 Lakh Cover</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant text-[12px] font-medium mb-1">
            <span>Monthly Earnings</span>
            <IndianRupee size={16} className="text-primary" />
          </div>
          <p className="text-[16px] font-bold text-primary">₹{monthlyEarnings.toLocaleString()}</p>
          <p className="text-[11px] text-on-surface-variant/70 mt-0.5">Direct Coop Payout</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant text-[12px] font-medium mb-1">
            <span>Jobs Completed</span>
            <Briefcase size={16} className="text-primary" />
          </div>
          <p className="text-[16px] font-bold text-on-surface">{jobsCompleted}</p>
          <p className="text-[11px] text-on-surface-variant/70 mt-0.5">⭐ {rating} Avg Rating</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant text-[12px] font-medium mb-1">
            <span>Working Hours</span>
            <Clock size={16} className="text-on-surface-variant" />
          </div>
          <p className="text-[16px] font-bold text-on-surface">{workingHours} hrs</p>
          <p className="text-[11px] text-on-surface-variant/70 mt-0.5">This Month</p>
        </div>
      </div>

      {/* Secondary Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
          <span className="text-[12px] text-on-surface-variant font-medium">Emergency Relief Fund</span>
          <span className="text-[14px] font-bold text-primary">₹{emergencyFund.toLocaleString()}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
          <span className="text-[12px] text-on-surface-variant font-medium">Insurance Claims</span>
          <span className="text-[14px] font-bold text-[#006d30]">None (0 Active)</span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
          <span className="text-[12px] text-on-surface-variant font-medium">NLCF Skill Certification</span>
          <span className="text-[13px] font-bold text-on-surface">Valid until 2027</span>
        </div>
      </div>

      {/* Smart Welfare Alerts */}
      <div className="space-y-2 pt-1">
        <h3 className="text-[13px] font-bold text-on-surface uppercase tracking-wider">Automated Welfare Alerts</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#fff3e0] border border-[#6b4200]/20 text-[13px] font-semibold text-[#6b4200]">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>Worker approaching excessive weekly workload (42 hrs logged this week)</span>
            </div>
            <span className="text-[11px] bg-white/60 px-2 py-0.5 rounded-md">Health Advisory</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#fff3e0] border border-[#6b4200]/20 text-[13px] font-semibold text-[#6b4200]">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>Safety Certification renewal due in 30 days</span>
            </div>
            <span className="text-[11px] bg-white/60 px-2 py-0.5 rounded-md">Action Required</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#e6f9ec] border border-[#006d30]/20 text-[13px] font-semibold text-[#006d30]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Monthly Welfare Contribution deposited into Provident Account (₹1,420)</span>
            </div>
            <span className="text-[11px] bg-white/60 px-2 py-0.5 rounded-md">Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
