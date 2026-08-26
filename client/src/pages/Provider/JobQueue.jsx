import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { Briefcase, CheckCircle2, Clock, Zap, Check, X, ArrowRight } from "lucide-react";

const STATUS_STYLE = {
  requested:   { bg: "bg-[#fff3e0] text-[#6b4200]", dot: "bg-[#6b4200]", label: "Requested"   },
  accepted:    { bg: "bg-[#e8edff] text-[#00288e]", dot: "bg-[#00288e]", label: "Accepted"    },
  'in-progress': { bg: "bg-[#e8edff] text-[#00288e]", dot: "bg-[#00288e]", label: "In Progress" },
  completed:   { bg: "bg-[#e6f9ec] text-[#006d30]", dot: "bg-[#006d30]", label: "Completed"   },
  disputed:    { bg: "bg-[#fce8e8] text-[#ba1a1a]", dot: "bg-[#ba1a1a]", label: "Disputed"    },
  cancelled:   { bg: "bg-surface-container text-on-surface-variant", dot: "bg-outline", label: "Cancelled" },
};

export default function JobQueue() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(null);
  const [filter, setFilter]     = useState("all");

  async function load() {
    try {
      const { data } = await api.get("/bookings/provider/mine");
      setBookings(data || []);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  async function accept(id) {
    setBusy(id);
    try { await api.patch(`/bookings/${id}/accept`); await load(); } finally { setBusy(null); }
  }
  async function reject(id) {
    setBusy(id);
    try { await api.patch(`/bookings/${id}/cancel`); await load(); } finally { setBusy(null); }
  }

  const FILTERS = ["all", "requested", "accepted", "in-progress", "completed"];
  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
  const pending  = bookings.filter(b => b.status === "requested").length;

  const STAT_CARDS = [
    { label: "Total Jobs",   value: bookings.length,                                          bg: "bg-[#e8edff]", ic: "text-[#00288e]", Icon: Briefcase  },
    { label: "Pending",      value: pending,          accent: pending > 0,                    bg: "bg-[#fff3e0]", ic: "text-[#6b4200]", Icon: Clock      },
    { label: "Active",       value: bookings.filter(b => b.status === "accepted").length,     bg: "bg-[#e8edff]", ic: "text-[#00288e]", Icon: ArrowRight },
    { label: "Completed",    value: bookings.filter(b => b.status === "completed").length,    bg: "bg-[#e6f9ec]", ic: "text-[#006d30]", Icon: CheckCircle2 },
  ];

  return (
    <div className="w-full px-6 pt-8 pb-10 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface"
            style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Job Queue
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Review incoming requests and manage your active work.
          </p>
        </div>
        {pending > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#fff3e0] text-[#6b4200] text-[13px] font-bold border border-[#6b4200]/10">
            <Clock size={14} strokeWidth={2} />
            {pending} new request{pending > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Stat cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ label, value, Icon, bg, ic, accent }) => (
            <div key={label}
              className="rounded-2xl border border-outline-variant/60 bg-surface p-5 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">{label}</p>
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={17} strokeWidth={2} className={ic} />
                </div>
              </div>
              <p className={`text-[28px] font-bold tracking-tight leading-none ${accent ? "text-[#6b4200]" : "text-on-surface"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-container-low border border-outline-variant/40 w-fit">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 capitalize ${
              filter === f
                ? "bg-surface text-primary shadow-sm border border-outline-variant/40"
                : "text-on-surface-variant hover:text-on-surface"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0,1,2].map(i => <div key={i} className="animate-pulse rounded-2xl border border-outline-variant bg-surface p-5 h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant/60 bg-surface px-6 py-20 text-center">
          <Briefcase size={44} className="text-outline-variant" strokeWidth={1.5} />
          <p className="text-[15px] font-semibold text-on-surface">No jobs found</p>
          <p className="text-[14px] text-on-surface-variant">
            {filter === "all" ? "New requests will appear here." : `No ${filter} jobs.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map(b => {
            const s = STATUS_STYLE[b.status] || STATUS_STYLE.requested;
            return (
              <div key={b._id}
                onClick={() => navigate(`/provider/job/${b._id}`)}
                className={`flex flex-col gap-4 rounded-2xl border bg-surface p-5 cursor-pointer hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] transition-all duration-200 ${
                  b.isEmergency ? "border-error/40" : "border-outline-variant/60 hover:border-outline"
                }`}>

                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-[14px] font-bold text-on-primary-container shrink-0">
                      {(b.householdId?.name || "?").charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-bold text-on-surface truncate">{b.householdId?.name || "Household"}</p>
                        {b.isEmergency && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fce8e8] text-[#ba1a1a] text-[10px] font-bold shrink-0">
                            <Zap size={10} /> Emergency
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-on-surface-variant truncate">{b.service}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${s.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>

                {/* Details row */}
                <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-2.5 border border-outline-variant/30">
                  <span className="text-[12px] text-on-surface-variant">
                    {b.scheduledTime ? new Date(b.scheduledTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Flexible timing"}
                  </span>
                  <span className="text-[14px] font-bold text-on-surface">₹{b.price ?? 0}</span>
                </div>

                {/* Accept/Reject for requested */}
                {b.status === "requested" && (
                  <div className="grid grid-cols-2 gap-3" onClick={e => e.stopPropagation()}>
                    <button
                      disabled={busy === b._id}
                      onClick={() => accept(b._id)}
                      className="h-10 flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-[#173bab] hover:shadow-[0_4px_16px_rgba(0,40,142,0.25)] transition-all duration-200 disabled:opacity-60">
                      <Check size={15} strokeWidth={2.5} /> Accept
                    </button>
                    <button
                      disabled={busy === b._id}
                      onClick={() => reject(b._id)}
                      className="h-10 flex items-center justify-center gap-2 rounded-xl border-2 border-error text-error text-[13px] font-bold hover:bg-[#fce8e8] transition-all duration-200 disabled:opacity-60">
                      <X size={15} strokeWidth={2.5} /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
