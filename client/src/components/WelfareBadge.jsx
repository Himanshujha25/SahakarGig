import { ShieldCheck, Award, Clock, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { AIIcon, AIBadge } from './AIIcon';

export default function WelfareBadge({ eshramId, welfareScore, insuranceOptIn, insuranceProvider, verificationStatus, verifiedAt, verifiedName }) {
  const vs = verificationStatus || (eshramId ? 'self_declared' : 'unregistered');

  const config = {
    govt_verified: {
      badge: 'Govt. Verified ✓',
      badgeCls: 'bg-[#e6f9ec] text-[#006d30] border-[#006d30]/20',
      cardCls: 'border-[#006d30]/30 bg-gradient-to-br from-[#e6f9ec]/60 via-surface to-surface',
      icon: <CheckCircle size={14} className="text-[#006d30] fill-[#006d30]/20" />,
      sub: 'Govt. Verified Worker & Insurance Card',
    },
    self_declared: {
      badge: 'Pending Govt. Verification',
      badgeCls: 'bg-[#fff3e0] text-[#6b4200] border-[#6b4200]/20',
      cardCls: 'border-[#6b4200]/20 bg-surface',
      icon: <Clock size={14} className="text-[#6b4200]" />,
      sub: 'ID saved — awaiting govt. verification',
    },
    unregistered: {
      badge: 'Not Registered',
      badgeCls: 'bg-surface-container text-on-surface-variant border-outline-variant/40',
      cardCls: 'border-outline-variant/60 bg-surface',
      icon: <AlertCircle size={14} className="text-on-surface-variant" />,
      sub: 'Enter your e-Shram ID to get started',
    },
  }[vs];

  return (
    <div className={`w-full rounded-2xl border p-5 shadow-sm space-y-4 ${config.cardCls}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            vs === 'govt_verified' ? 'bg-[#e6f9ec] text-[#006d30]' : 'bg-surface-container text-on-surface-variant'
          }`}>
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[14px] font-bold text-on-surface">e-Shram Welfare Proof</span>
              {vs === 'govt_verified' && (
                <span className="px-2 py-0.5 rounded-full bg-[#00288e] text-white text-[10px] font-bold">
                  Govt. Verified ✓
                </span>
              )}
              {config.icon}
            </div>
            <p className="text-[11px] text-on-surface-variant">{config.sub}</p>
          </div>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border ${config.badgeCls}`}>
          {config.badge}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Worker ID (UAN)</p>
          {eshramId
            ? <p className="text-[13px] font-bold text-on-surface font-mono break-all">{eshramId}</p>
            : <p className="text-[12px] text-on-surface-variant italic">Not registered</p>
          }
        </div>
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Insurance</p>
          {insuranceOptIn
            ? <p className="text-[13px] font-bold text-[#006d30]">{insuranceProvider || 'PMSBY Active'}</p>
            : <p className="text-[12px] text-on-surface-variant italic">Not opted in</p>
          }
        </div>
      </div>

      {/* Govt verified name + date */}
      {vs === 'govt_verified' && verifiedName && (
        <div className="px-3 py-2 rounded-xl bg-[#e6f9ec] border border-[#006d30]/20 text-[12px] text-[#006d30] font-semibold flex items-center justify-between">
          <span>Verified as: {verifiedName}</span>
          {verifiedAt && <span className="text-[11px] font-normal">{new Date(verifiedAt).toLocaleDateString('en-IN')}</span>}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40">
        <div className="flex items-center gap-1.5 text-[12px] text-on-surface-variant font-medium">
          <Award size={15} className="text-primary" />
          <span>Welfare Score: <strong className="text-primary font-bold">{welfareScore ?? 0}/100</strong></span>
        </div>
        {vs === 'govt_verified' && (
          <a href="https://eshram.gov.in" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
            Verify Portal <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
