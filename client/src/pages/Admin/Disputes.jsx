import { useEffect, useState } from "react";
import api from "../../lib/api";
import { AlertTriangle, CheckCircle2, Undo2, Handshake, Scale } from "lucide-react";
import AIDisputeAuditModal from "../../components/AIDisputeAuditModal";

export default function Disputes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [auditBookingId, setAuditBookingId] = useState(null);

  async function load() {
    const { data } = await api.get("/admin/disputes");
    setItems(data || []);
  }

  useEffect(() => {
    (async () => { try { await load(); } catch {} finally { setLoading(false); } })();
    const id = setInterval(() => load().catch(() => {}), 30000);
    return () => clearInterval(id);
  }, []);

  async function resolve(id, outcome) {
    setBusy(id);
    try {
      await api.patch(`/admin/resolve/${id}`, { outcome });
      setItems((prev) => prev.filter((d) => d._id !== id));
    } finally { setBusy(null); }
  }

  const statusStyle = (s) =>
    s === "resolved"
      ? "bg-[#e6f9ec] text-[#006d30]"
      : "bg-[#fce8e8] text-[#ba1a1a]";

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-24 lg:pb-10 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Disputes
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Review and resolve conflict cases between households and providers.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ${items.length > 0 ? "bg-error-container text-on-error-container" : "bg-surface-container text-on-surface-variant border border-outline-variant/50"}`}>
          <AlertTriangle size={14} strokeWidth={2} />
          {items.length} active
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0,1,2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-outline-variant bg-surface p-6 h-48" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant/60 bg-surface px-6 py-20 text-center">
          <CheckCircle2 size={44} className="text-secondary" strokeWidth={1.5} />
          <p className="text-[15px] font-semibold text-on-surface">No active disputes</p>
          <p className="text-[14px] text-on-surface-variant">Everything looks healthy across your cooperative.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((d) => (
            <div key={d._id} className="flex flex-col gap-4 rounded-2xl border border-outline-variant/60 bg-surface p-5 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] hover:border-outline transition-all duration-200">

              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-error-container flex items-center justify-center text-[15px] font-bold text-on-error-container shrink-0">
                    {(d.householdId?.name || "?").charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-on-surface truncate">{d.householdId?.name ?? "Household"}</p>
                    <p className="text-[12px] text-on-surface-variant truncate">{d.service}</p>
                  </div>
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold capitalize ${statusStyle(d.status)}`}>
                  {d.status}
                </span>
              </div>

              {/* Issue */}
              <div className="rounded-xl bg-error-container/30 border border-error/10 px-4 py-3 text-[13px] text-on-error-container leading-relaxed">
                {d.issue || "A dispute has been raised on this booking."}
              </div>

              {/* On-Site Work Proofs (Before / After) */}
              {(d.startWorkProof?.photo || d.completionProof?.photo) && (
                <div className="rounded-xl bg-surface-container-low px-4 py-3 border border-outline-variant/30 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">On-Site Work Proofs</p>
                  <div className="grid grid-cols-2 gap-2">
                    {d.startWorkProof?.photo && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-purple-700 block">Before Work</span>
                        <a href={d.startWorkProof.photo} target="_blank" rel="noreferrer">
                          <img src={d.startWorkProof.photo} alt="Before Work" className="h-16 w-full rounded-lg object-cover border border-outline-variant" />
                        </a>
                        <p className="text-[10px] text-on-surface-variant truncate">"{d.startWorkProof.description}"</p>
                      </div>
                    )}
                    {d.completionProof?.photo && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 block">After Work (Solved)</span>
                        <a href={d.completionProof.photo} target="_blank" rel="noreferrer">
                          <img src={d.completionProof.photo} alt="After Work" className="h-16 w-full rounded-lg object-cover border border-outline-variant" />
                        </a>
                        <p className="text-[10px] text-on-surface-variant truncate">"{d.completionProof.description}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Category + evidence */}
              {d.disputeCategory && (
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-error-container/40 text-on-error-container text-[11px] font-bold">
                    {d.disputeCategory}
                  </span>
                </div>
              )}
              {d.disputeEvidence && d.disputeEvidence.length > 0 && (
                <div className="rounded-xl bg-surface-container-low px-4 py-3 border border-outline-variant/30">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Evidence ({d.disputeEvidence.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {d.disputeEvidence.map((src, i) => (
                      src?.startsWith("data:image") ? (
                        <a key={i} href={src} target="_blank" rel="noreferrer">
                          <img src={src} alt={`Evidence ${i + 1}`} className="h-16 w-16 rounded-lg object-cover border border-outline-variant" />
                        </a>
                      ) : (
                        <a key={i} href={src} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-[12px] font-semibold text-primary hover:border-primary/50">
                          File {i + 1}
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3 border border-outline-variant/30">
                <span className="text-[13px] text-on-surface-variant">Booking Amount</span>
                <span className="text-[15px] font-bold text-on-surface">₹{d.price ?? 0}</span>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setAuditBookingId(d._id)}
                  className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl bg-primary-container/40 text-on-primary-container border border-primary/20 text-xs font-bold hover:bg-primary-container cursor-pointer"
                >
                  <Scale size={14} /> Run AI Dispute Audit
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="h-11 flex items-center justify-center gap-2 rounded-xl border-2 border-primary text-primary text-[13px] font-bold hover:bg-primary-container transition-all duration-200 disabled:opacity-60 cursor-pointer"
                    disabled={busy === d._id}
                    onClick={() => resolve(d._id, "refund")}
                  >
                    <Undo2 size={15} strokeWidth={2.5} /> Refund
                  </button>
                  <button
                    className="h-11 flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary-container text-on-primary-container text-[13px] font-bold hover:border-primary hover:bg-primary hover:text-on-primary hover:shadow-[0_4px_14px_rgba(0,40,142,0.18)] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 cursor-pointer"
                    disabled={busy === d._id}
                    onClick={() => resolve(d._id, "provider")}
                  >
                    <Handshake size={15} strokeWidth={2.5} /> For Provider
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AIDisputeAuditModal
        isOpen={!!auditBookingId}
        onClose={() => setAuditBookingId(null)}
        bookingId={auditBookingId}
      />
    </div>
  );
}
