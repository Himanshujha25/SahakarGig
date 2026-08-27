import { useState, useEffect } from 'react';
import { ShieldCheck, IndianRupee, Briefcase, Clock, AlertTriangle, CheckCircle2, HeartPulse, Info } from 'lucide-react';

export default function WorkerWelfareDashboard({ data, loading }) {
  const [showAlerts, setShowAlerts] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    setShowAlerts(true);
    setIsLeaving(false);

    // Start smooth ease-out exit animation at 4.4s
    const leaveTimer = setTimeout(() => {
      setIsLeaving(true);
    }, 4400);

    // Unmount from DOM completely at 5.0s
    const unmountTimer = setTimeout(() => {
      setShowAlerts(false);
    }, 5000);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(unmountTimer);
    };
  }, [data]);

  if (loading) {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-14 rounded-2xl bg-surface-container" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-surface-container" />)}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <div key={i} className="h-12 rounded-xl bg-surface-container" />)}
        </div>
      </div>
    );
  }

  const {
    insuranceOptIn = false,
    insuranceProvider = '',
    monthlyEarnings = 0,
    jobsCompleted = 0,
    avgRating = 0,
    daysWorked = 0,
    totalEarnings = 0,
    alerts = [],
    verified = false,
  } = data || {};

  // working hours estimate: daysWorked * 8
  const estHours = daysWorked * 8;

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
        <span className={`px-3 py-1 rounded-full text-[12px] font-bold border flex items-center gap-1.5 ${
          insuranceOptIn
            ? 'bg-[#e6f9ec] text-[#006d30] border-[#006d30]/20'
            : 'bg-[#fff3e0] text-[#6b4200] border-[#6b4200]/20'
        }`}>
          <span className={`w-2 h-2 rounded-full ${insuranceOptIn ? 'bg-[#006d30] animate-pulse' : 'bg-[#6b4200]'}`} />
          {insuranceOptIn ? 'Active Protection' : 'No Insurance'}
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant text-[12px] font-medium mb-1">
            <span>Insurance</span>
            <ShieldCheck size={16} className={insuranceOptIn ? 'text-[#006d30]' : 'text-on-surface-variant'} />
          </div>
          <p className={`text-[16px] font-bold ${insuranceOptIn ? 'text-[#006d30]' : 'text-error'}`}>
            {insuranceOptIn ? 'Active' : 'Not Active'}
          </p>
          <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
            {insuranceOptIn ? (insuranceProvider || 'PMSBY ₹2 Lakh Cover') : 'Opt in to activate'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant text-[12px] font-medium mb-1">
            <span>Monthly Earnings</span>
            <IndianRupee size={16} className="text-primary" />
          </div>
          <p className="text-[16px] font-bold text-primary">
            {monthlyEarnings > 0 ? `₹${monthlyEarnings.toLocaleString('en-IN')}` : '₹0'}
          </p>
          <p className="text-[11px] text-on-surface-variant/70 mt-0.5">Direct Coop Payout</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant text-[12px] font-medium mb-1">
            <span>Jobs Completed</span>
            <Briefcase size={16} className="text-primary" />
          </div>
          <p className="text-[16px] font-bold text-on-surface">{jobsCompleted}</p>
          <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
            {avgRating > 0 ? `⭐ ${avgRating} Avg Rating` : 'No ratings yet'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant text-[12px] font-medium mb-1">
            <span>Days Worked</span>
            <Clock size={16} className="text-on-surface-variant" />
          </div>
          <p className="text-[16px] font-bold text-on-surface">{daysWorked}</p>
          <p className="text-[11px] text-on-surface-variant/70 mt-0.5">~{estHours} hrs total</p>
        </div>
      </div>

      {/* Secondary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
          <span className="text-[12px] text-on-surface-variant font-medium">Total Earnings</span>
          <span className="text-[14px] font-bold text-primary">
            {totalEarnings > 0 ? `₹${totalEarnings.toLocaleString('en-IN')}` : '₹0'}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
          <span className="text-[12px] text-on-surface-variant font-medium">Verification Status</span>
          <span className={`text-[13px] font-bold ${verified ? 'text-[#006d30]' : 'text-error'}`}>
            {verified ? 'Verified ✓' : 'Pending'}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
          <span className="text-[12px] text-on-surface-variant font-medium">Avg Rating</span>
          <span className="text-[13px] font-bold text-on-surface">
            {avgRating > 0 ? `${avgRating} ★` : '—'}
          </span>
        </div>
      </div>

      {/* Real Alerts (Ease-in on enter, Ease-out on exit after 5 seconds) */}
      {showAlerts && alerts.length > 0 && (
        <div className={`space-y-2 pt-1 transition-all ${isLeaving ? 'animate-alert-out' : 'animate-alert-in'}`}>
          <h3 className="text-[13px] font-bold text-on-surface uppercase tracking-wider">Welfare Alerts</h3>
          <div className="space-y-2">
            {alerts.map((a, i) => {
              const isWarn = a.type === 'warning';
              const isSuccess = a.type === 'success';
              return (
                <div key={i} className={`flex items-center justify-between p-3 rounded-xl text-[13px] font-semibold border ${
                  isSuccess
                    ? 'bg-[#e6f9ec] border-[#006d30]/20 text-[#006d30]'
                    : isWarn
                    ? 'bg-[#fff3e0] border-[#6b4200]/20 text-[#6b4200]'
                    : 'bg-[#e8edff] border-[#00288e]/20 text-[#00288e]'
                }`}>
                  <div className="flex items-center gap-2">
                    {isSuccess
                      ? <CheckCircle2 size={16} className="shrink-0" />
                      : isWarn
                      ? <AlertTriangle size={16} className="shrink-0" />
                      : <Info size={16} className="shrink-0" />
                    }
                    <span>{a.message}</span>
                  </div>
                  <span className="text-[11px] bg-white/60 px-2 py-0.5 rounded-md shrink-0 ml-2">{a.tag}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
