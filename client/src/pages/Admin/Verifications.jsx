import { useEffect, useState } from "react";
import api from "../../lib/api";
import { ShieldCheck, Clock, CheckCircle2 } from "lucide-react";

export default function Verifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  async function load() {
    const { data } = await api.get("/admin/verifications");
    setItems(data || []);
  }

  useEffect(() => {
    (async () => { try { await load(); } catch {} finally { setLoading(false); } })();
    const id = setInterval(() => load().catch(() => {}), 30000);
    return () => clearInterval(id);
  }, []);

  async function verify(id) {
    setBusy(id);
    try {
      await api.patch(`/admin/verify/${id}`);
      setItems((prev) => prev.filter((v) => v._id !== id));
    } finally { setBusy(null); }
  }

  return (
    <div className="w-full px-6 pt-8 pb-24 lg:pb-10 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Verifications
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Review and approve new provider applications to join your cooperative.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ${items.length > 0 ? "bg-error-container text-on-error-container" : "bg-surface-container text-on-surface-variant border border-outline-variant/50"}`}>
          <Clock size={14} strokeWidth={2} />
          {items.length} pending
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
          <p className="text-[15px] font-semibold text-on-surface">All caught up!</p>
          <p className="text-[14px] text-on-surface-variant">No pending verifications at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((v) => (
            <div key={v._id} className="flex flex-col gap-4 rounded-2xl border border-outline-variant/60 bg-surface p-5 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] hover:border-outline transition-all duration-200">

              {/* Provider info */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-[15px] font-bold text-on-primary-container shrink-0">
                  {(v.userId?.name || "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-on-surface truncate">{v.userId?.name ?? "Unknown"}</p>
                  <p className="text-[12px] text-on-surface-variant truncate">{v.userId?.email} · {v.userId?.phone}</p>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-2">
                {(v.skills || []).map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-[#e8edff] text-[#00288e] text-[12px] font-semibold">{s}</span>
                ))}
              </div>

              {/* Rate */}
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3 border border-outline-variant/30">
                <span className="text-[13px] text-on-surface-variant">Hourly Rate</span>
                <span className="text-[15px] font-bold text-on-surface">
                  ₹{v.hourlyRate ?? "—"}<span className="text-[12px] font-normal text-on-surface-variant">/hr</span>
                </span>
              </div>

              {/* Action */}
              <button
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-[14px] font-bold hover:bg-[#173bab] hover:shadow-[0_4px_16px_rgba(0,40,142,0.25)] transition-all duration-200 disabled:opacity-60"
                disabled={busy === v._id}
                onClick={() => verify(v._id)}
              >
                <ShieldCheck size={16} strokeWidth={2.5} />
                {busy === v._id ? "Verifying…" : "Verify Provider"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
