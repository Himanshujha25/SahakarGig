import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { CalendarDays, Plus, CheckCircle2, Zap } from "lucide-react";

const STATUS_STYLE = {
  pending:   { bg: "bg-[#fff3e0] text-[#6b4200]",  dot: "bg-[#6b4200]",  label: "Pending"   },
  accepted:  { bg: "bg-[#e8edff] text-[#00288e]",  dot: "bg-[#00288e]",  label: "Accepted"  },
  completed: { bg: "bg-[#e6f9ec] text-[#006d30]",  dot: "bg-[#006d30]",  label: "Completed" },
  disputed:  { bg: "bg-[#fce8e8] text-[#ba1a1a]",  dot: "bg-[#ba1a1a]",  label: "Disputed"  },
  cancelled: { bg: "bg-surface-container text-on-surface-variant", dot: "bg-outline", label: "Cancelled" },
};

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/bookings/household/mine");
        setBookings(data || []);
      } catch {} finally { setLoading(false); }
    }
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const FILTERS = ["all", "pending", "accepted", "completed", "disputed"];
  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === "all" ? bookings.length : bookings.filter(b => b.status === f).length;
    return acc;
  }, {});

  return (
    <div className="w-full px-6 pt-8 pb-10 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface"
            style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            My Bookings
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Track and manage all your service bookings.
          </p>
        </div>
        <button onClick={() => navigate("/household")}
          className="h-9 inline-flex items-center gap-2 px-4 rounded-xl border border-outline-variant bg-surface text-[13px] font-semibold text-on-surface hover:border-primary/40 hover:bg-[#e8edff] hover:text-[#00288e] transition-all duration-200">
          <Plus size={14} strokeWidth={2.5} /> New Booking
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-container-low border border-outline-variant/40 w-fit flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 capitalize ${
              filter === f
                ? "bg-surface text-primary shadow-sm border border-outline-variant/40"
                : "text-on-surface-variant hover:text-on-surface"
            }`}>
            {f}
            {counts[f] > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === f ? "bg-[#e8edff] text-[#00288e]" : "bg-surface-container text-on-surface-variant"
              }`}>{counts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl border border-outline-variant bg-surface overflow-hidden">
          {[0,1,2,3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-4 px-6 py-4 border-b border-outline-variant/40 last:border-0">
              <div className="w-9 h-9 rounded-full bg-surface-container shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-surface-container" />
                <div className="h-3 w-1/4 rounded bg-surface-container" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant/60 bg-surface px-6 py-20 text-center">
          <CheckCircle2 size={44} className="text-outline-variant" strokeWidth={1.5} />
          <p className="text-[15px] font-semibold text-on-surface">No bookings found</p>
          <p className="text-[14px] text-on-surface-variant">
            {filter === "all" ? "Find a verified provider to get started." : `No ${filter} bookings.`}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-outline-variant/60 bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container-low">
                  <th className="px-6 py-3.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Service</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Provider</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Status</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filtered.map(b => {
                  const s = STATUS_STYLE[b.status] || STATUS_STYLE.pending;
                  return (
                    <tr key={b._id}
                      onClick={() => navigate(`/household/booking/${b._id}`)}
                      className="hover:bg-surface-container-low/50 transition-colors cursor-pointer">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-on-surface">{b.service}</p>
                          {b.isEmergency && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fce8e8] text-[#ba1a1a] text-[10px] font-bold">
                              <Zap size={10} /> Emergency
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-[13px] text-on-surface-variant">
                        {b.providerId?.userId?.name || "Provider"}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${s.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[14px] font-bold text-on-surface">₹{b.price ?? 0}</span>
                          {b.paymentStatus === 'paid' ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#e6f9ec] text-[#006d30] text-[10px] font-bold">
                              Paid ✓
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/household/pay/${b._id}`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-[#173bab] transition-all shadow-sm"
                            >
                              Pay Razorpay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
