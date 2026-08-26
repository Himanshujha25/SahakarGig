import { CheckCircle2, ShieldCheck, Award, Star, UserCheck, Briefcase } from 'lucide-react';

export default function TrustSystemBadge({
  providerName = "Provider",
  rating = 4.8,
  jobsCompleted = 126,
  identityVerified = true,
  coopVerified = true,
  skillCertified = true,
  insuranceActive = true,
}) {
  const STAGES = [
    { label: "Identity Verified", pass: identityVerified, Icon: UserCheck },
    { label: "Cooperative Verified", pass: coopVerified, Icon: ShieldCheck },
    { label: "Skill Certified", pass: skillCertified, Icon: Award },
    { label: "Insurance Active", pass: insuranceActive, Icon: CheckCircle2 },
    { label: `${jobsCompleted} Jobs Completed`, pass: jobsCompleted > 0, Icon: Briefcase },
  ];

  return (
    <div className="w-full rounded-2xl border border-secondary/30 bg-gradient-to-br from-[#e6f9ec]/50 via-surface to-surface p-5 space-y-4 shadow-sm">
      {/* Badge Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-on-surface">5-Stage Trusted Worker Verification</h3>
            <p className="text-[11px] text-on-surface-variant">Ministry of Cooperation Institutional Vetting</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[#fff3e0] text-[#6b4200] px-3 py-1 rounded-full text-[12px] font-bold">
          <Star size={13} className="fill-[#6b4200]" /> {rating} Rating
        </div>
      </div>

      {/* Stage Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {STAGES.map(({ label, pass, Icon }, idx) => (
          <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-[12px] font-semibold text-on-surface">
            <Icon size={15} className={pass ? "text-secondary" : "text-outline"} strokeWidth={2.5} />
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
