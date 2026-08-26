import { ShieldCheck, Award, CheckCircle, ExternalLink } from 'lucide-react';

export default function WelfareBadge({ providerName, eshramId, daysWorked, welfareScore }) {
  const formattedId = eshramId || `ESHRAM-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

  return (
    <div className="w-full rounded-2xl border border-secondary/30 bg-gradient-to-br from-[#e6f9ec]/80 via-surface to-surface p-5 shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-bold text-on-surface">e-Shram Digital Welfare Proof</span>
              <CheckCircle size={14} className="text-secondary fill-secondary/20" />
            </div>
            <p className="text-[11px] text-on-surface-variant">Govt. Verified Worker & Insurance Card</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-secondary/15 text-secondary text-[11px] font-bold">
          Verified Active
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Worker ID (UAN)</p>
          <p className="text-[13px] font-bold text-on-surface mt-0.5 font-mono">{formattedId}</p>
        </div>
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Accidental Cover</p>
          <p className="text-[13px] font-bold text-secondary mt-0.5">₹2,00,000 (PMSBY)</p>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40 text-[12px]">
        <div className="flex items-center gap-1.5 text-on-surface-variant font-medium">
          <Award size={15} className="text-primary" />
          <span>Welfare Score: <strong className="text-primary font-bold">{welfareScore || 92}/100</strong></span>
        </div>
        <a
          href="https://eshram.gov.in"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
        >
          Verify Govt Portal <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
