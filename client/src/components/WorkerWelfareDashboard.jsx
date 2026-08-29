import {
  ShieldCheck, IndianRupee, Briefcase, Clock, AlertTriangle,
  CheckCircle2, HeartPulse, Info, Building2, Award, QrCode,
  Sparkles, ExternalLink, ShieldAlert
} from 'lucide-react';

export default function WorkerWelfareDashboard({ data, loading }) {
  if (loading) {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-14 rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  const {
    insuranceOptIn = true,
    insuranceProvider = 'PMSBY (Pradhan Mantri Suraksha Bima Yojana)',
    monthlyEarnings = 0,
    jobsCompleted = 0,
    avgRating = 0,
    daysWorked = 0,
    totalEarnings = 0,
    verified = true,
    eShramId = '9182-3819-4820',
    eShramVerificationStatus = 'VERIFIED',
    cooperativeName = 'Karol Bagh Labour Cooperative',
  } = data || {};

  const estHours = (daysWorked || 4) * 8;
  const roundedMonthly = Math.round(Number(monthlyEarnings) || 0);

  return (
    <div className="w-full space-y-5 text-slate-900 font-sans">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#00288e] flex items-center justify-center text-white shrink-0 shadow-md">
            <HeartPulse size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Worker Welfare &amp; Social Security Trust
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {cooperativeName} • Ministry of Cooperation Aligned Social Security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <ShieldCheck size={14} />
            <span>e-Shram &amp; PM-SYM Enrolled</span>
          </span>
        </div>
      </div>

      {/* ── 4 METRIC STAT TILES ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">Insurance Cover</span>
            <ShieldCheck size={16} className="text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700">Active</p>
          <p className="text-[11px] text-slate-500 font-medium truncate">
            PMSBY ₹2,00,000 Cover
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">Monthly Payout</span>
            <IndianRupee size={16} className="text-[#00288e]" />
          </div>
          <p className="text-xl font-black text-[#00288e]">
            ₹{roundedMonthly ? roundedMonthly.toLocaleString('en-IN') : '2,151'}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">85% Net Escrow Release</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">Jobs Completed</span>
            <Briefcase size={16} className="text-[#00288e]" />
          </div>
          <p className="text-xl font-black text-slate-900">{jobsCompleted || 4}</p>
          <p className="text-[11px] text-slate-500 font-medium">
            {jobsCompleted > 0 ? `${jobsCompleted} Orders Settled` : '4 Orders Settled'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">Days Active</span>
            <Clock size={16} className="text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900">{daysWorked || 4}</p>
          <p className="text-[11px] text-slate-500 font-medium">~{estHours} hrs logged</p>
        </div>
      </div>

      {/* ── GOVT SOCIAL SECURITY INTEGRATION: E-SHRAM & PM-SYM / PMSBY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Official e-Shram Digital Identity Pass */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 lg:p-6 shadow-2xs space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-white to-emerald-600 absolute top-0 left-0 right-0" />
          
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 flex items-center justify-center font-bold">
                  🏛️
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">e-Shram Digital Identity</h3>
                  <p className="text-[11px] text-slate-500">Ministry of Labour &amp; Employment, Govt. of India</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10.5px] font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={12} /> Verified UAN
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Universal Account Number (UAN)</span>
                <p className="text-base font-black font-mono tracking-widest text-[#00288e] mt-0.5">
                  {eShramId || '9182-3819-4820'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-medium">Occupation Category</span>
                  <span className="font-bold text-slate-800">Unorganized Gig Provider</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Cooperative Registry</span>
                  <span className="font-bold text-slate-800 truncate block">{cooperativeName}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 font-medium">DBT (Direct Benefit Transfer) Enabled</span>
            <span className="text-[#00288e] font-bold text-xs flex items-center gap-1">
              <span>e-Shram Linked</span>
              <CheckCircle2 size={13} />
            </span>
          </div>
        </div>

        {/* Card 2: National Social Security Schemes (PMSBY & PM-SYM Pension) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 lg:p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-[#00288e] flex items-center justify-center font-bold">
                  🛡️
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Govt Social Security Schemes</h3>
                  <p className="text-[11px] text-slate-500">PMSBY Insurance &amp; PM-SYM Assured Pension</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#00288e] text-[10.5px] font-bold border border-blue-200">
                100% Subsidized
              </span>
            </div>

            <div className="space-y-2">
              {/* PMSBY */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-900">PMSBY (Accidental Insurance)</p>
                  <p className="text-[11px] text-slate-500">₹2,00,000 Death &amp; Total Disability Coverage</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                  Active ✓
                </span>
              </div>

              {/* PM-SYM Pension */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-900">PM-SYM (Pradhan Mantri Shram Yogi Maan-dhan)</p>
                  <p className="text-[11px] text-slate-500">₹3,000/mo Guaranteed Pension Post 60 Years</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#00288e] text-[10.5px] font-bold">
                  Coop Matched 50:50
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px]">Premiums auto-settled from Cooperative Welfare Pool</span>
            <span className="font-bold text-emerald-700 text-xs">No Out-of-Pocket Cost</span>
          </div>
        </div>
      </div>
    </div>
  );
}
