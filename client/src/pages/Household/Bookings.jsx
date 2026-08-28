import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import { Plus, CheckCircle2, Zap } from "lucide-react";

const STATUS_STYLE = {
  requested:    { bg: "badge-pending",    dot: "bg-amber-600 dark:bg-amber-400",  label: "Pending"     },
  pending:      { bg: "badge-pending",    dot: "bg-amber-600 dark:bg-amber-400",  label: "Pending"     },
  accepted:     { bg: "badge-accepted",   dot: "bg-primary-container",       label: "Accepted"    },
  "in-progress": { bg: "badge-accepted",  dot: "bg-primary-container",       label: "In Progress" },
  completed:    { bg: "badge-completed",  dot: "bg-secondary-container",     label: "Completed"   },
  disputed:     { bg: "badge-disputed",   dot: "bg-error",                   label: "Disputed"    },
  cancelled:    { bg: "bg-surface-container text-on-surface-variant border border-outline-variant/40", dot: "bg-outline", label: "Cancelled" },
};

const TABS = [
  { key: "all",         label: "All",         statuses: null },
  { key: "pending",     label: "Pending",     statuses: ["requested", "pending"] },
  { key: "accepted",    label: "Accepted",    statuses: ["accepted"] },
  { key: "in-progress", label: "In Progress", statuses: ["in-progress"] },
  { key: "completed",   label: "Completed",   statuses: ["completed"] },
  { key: "disputed",    label: "Disputed",    statuses: ["disputed"] },
  { key: "cancelled",   label: "Cancelled",   statuses: ["cancelled"] },
];

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");

  const upsert = (incoming) => {
    if (!incoming?._id) return;
    setBookings((prev) => {
      const exists = prev.some((b) => b._id === incoming._id);
      if (exists) return prev.map((b) => (b._id === incoming._id ? { ...b, ...incoming } : b));
      return [incoming, ...prev];
    });
  };

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/bookings/household/mine");
        setBookings(data || []);
      } catch { } finally { setLoading(false); }
    }
    load();
    const id = setInterval(load, 30000);

    socket.on("booking:new", upsert);
    socket.on("booking:updated", (b) => upsert(b?.booking || b));
    socket.on("booking:assigned", (payload) => upsert(payload?.booking));

    return () => {
      clearInterval(id);
      socket.off("booking:new");
      socket.off("booking:updated");
      socket.off("booking:assigned");
    };
  }, []);

  const activeTab = TABS.find((t) => t.key === filter) || TABS[0];
  const filtered = activeTab.statuses === null
    ? bookings
    : bookings.filter((b) => activeTab.statuses.includes(b.status));

  const counts = TABS.reduce((acc, t) => {
    acc[t.key] = t.statuses === null
      ? bookings.length
      : bookings.filter((b) => t.statuses.includes(b.status)).length;
    return acc;
  }, {});

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-10 space-y-6">

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
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
              filter === t.key
                ? "bg-surface text-primary shadow-sm border border-outline-variant/40"
                : "text-on-surface-variant hover:text-on-surface"
            }`}>
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === t.key ? "bg-[#e8edff] text-[#00288e]" : "bg-surface-container text-on-surface-variant"
              }`}>{counts[t.key]}</span>
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
            {filter === "all" ? "Find a verified provider to get started." : `No ${activeTab.label.toLowerCase()} bookings.`}
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
                  const s = STATUS_STYLE[b.status] || STATUS_STYLE.requested;
                  return (
                    <tr key={b._id}
                      onClick={() => navigate(`/household/booking/${b._id}`)}
                      className="hover:bg-surface-container-low/50 transition-colors cursor-pointer">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-on-surface">{b.service}</p>
                          {b.isEmergency && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full badge-emergency text-[10px] font-bold">
                              <Zap size={10} /> Emergency
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-[13px] text-on-surface-variant">
                        {b.providerId?.userId?.name || (b.dispatchMode === 'broadcast' && b.broadcastStatus === 'broadcasting' ? "Searching for provider..." : "Provider")}
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
                            <span className="px-2 py-0.5 rounded-full badge-completed text-[10px] font-bold">
                              Paid ✓
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/household/pay/${b._id}`);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#e8edff] text-[#00288e] text-[11px] font-bold border border-primary/25 hover:border-primary hover:bg-[#d7e3ff] hover:shadow-[0_3px_10px_rgba(0,40,142,0.18)] transition-all duration-200"
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
