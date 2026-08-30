import { useEffect, useState,useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import { IconPlus, IconCircleCheck, IconBolt, IconRepeat, IconUsers, IconChevronDown, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useAuth } from "../../context/AuthContext";

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
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Premium status-filter dropdown state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPlacement, setFilterPlacement] = useState("down");
  const filterRef = useRef(null);

  const closeFilter = () => {
    setFilterOpen(false);
    document.body.style.overflow = "";
  };

  const toggleFilter = () => {
    if (filterOpen) { closeFilter(); return; }
    if (filterRef.current) {
      const r = filterRef.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const above = r.top;
      setFilterPlacement(below < 360 ? "up" : "down");
      filterRef.current.dataset.above = String(above);
    }
    setFilterOpen(true);
    document.body.style.overflow = "hidden";
  };

  useEffect(() => {
    if (!filterOpen) return;
    const onDocDown = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) closeFilter();
    };
    const onKey = (e) => { if (e.key === "Escape") closeFilter(); };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [filterOpen]);

  // Chat modal state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatBottomRef = useRef(null);
  const myId = user?.id?.toString?.() || user?._id?.toString?.();

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
        // Backend returns max 50 per page — fetch every page so the
        // total count / pagination shows all bookings, not just the first 20.
        const all = [];
        let page = 1;
        let fetched;
        do {
          const { data } = await api.get("/bookings/household/mine", { params: { page, limit: 50 } });
          fetched = Array.isArray(data) ? data : [];
          all.push(...fetched);
          page += 1;
        } while (fetched.length === 50 && page <= 40); // safety cap ~2000
        setBookings(all);
      } catch { } finally { setLoading(false); }
    }
    load();
    const id = setInterval(load, 30000);

    socket.on("booking:new", upsert);
    socket.on("booking:updated", (b) => upsert(b?.booking || b));
    socket.on("booking:assigned", (payload) => upsert(payload?.booking));
    socket.on("booking:chat", ({ bookingId, message }) => {
      setSelectedBooking((prev) => {
        if (!prev) return prev;
        if (prev._id?.toString?.() !== bookingId?.toString?.()) return prev;
        return { ...prev, chat: [...(prev.chat || []), message] };
      });
    });

    return () => {
      clearInterval(id);
      socket.off("booking:new");
      socket.off("booking:updated");
      socket.off("booking:assigned");
      socket.off("booking:chat");
    };
  }, []);

  // Scroll to latest chat message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedBooking?.chat?.length]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedBooking) return;
    setSendingChat(true);
    try {
      await api.post(`/bookings/${selectedBooking._id}/chat`, { message: chatMessage });
      setChatMessage("");
    } catch (err) {
      alert(err?.response?.data?.message || "Could not send message.");
    } finally {
      setSendingChat(false);
    }
  };

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

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeTabStatus = activeTab.statuses
    ? (STATUS_STYLE[activeTab.statuses[0]] || STATUS_STYLE.requested)
    : { dot: "bg-primary" };

  const pageItems = (() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const set = new Set(
      [1, currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, totalPages]
        .filter((n) => n >= 1 && n <= totalPages)
    );
    const sorted = [...set].sort((a, b) => a - b);
    const items = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push("gap");
      items.push(sorted[i]);
    }
    return items;
  })();

  const listMaxH = (() => {
    if (!filterOpen || !filterRef.current) return 320;
    const r = filterRef.current.getBoundingClientRect();
    const avail = filterPlacement === "up" ? r.top : window.innerHeight - r.bottom;
    return Math.max(168, Math.min(avail - 24, 320));
  })();

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-10 space-y-6 overflow-x-hidden">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface"
            style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            My Bookings
          </h1>
          <p className="hidden sm:block text-[14px] text-on-surface-variant mt-0.5">
            Track and manage all your verified service orders and institutional requests.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2.5">
          <button onClick={() => navigate("/household/bulk")}
            className="h-9 inline-flex items-center gap-2 px-3.5 rounded-xl border border-primary/30 bg-primary-container/50 text-[13px] font-bold text-primary hover:bg-primary/15 transition-all duration-200 cursor-pointer shadow-xs">
            <span>🏢 Bulk Crew RFP</span>
          </button>
          <button onClick={() => navigate("/household")}
            className="h-9 inline-flex items-center gap-2 px-4 rounded-xl border border-outline-variant bg-surface text-[13px] font-semibold text-on-surface hover:border-primary/40 hover:bg-primary-container/40 hover:text-primary transition-all duration-200 cursor-pointer">
            <IconPlus size={15} stroke={2} /> New Booking
          </button>
        </div>
      </div>

      {/* Premium status filter dropdown */}
      <div ref={filterRef} className="relative w-full sm:w-[320px]">
        <button
          type="button"
          onClick={toggleFilter}
          className={`group h-12 w-full inline-flex items-center justify-between gap-3 pl-4 pr-2 rounded-2xl border text-[13.5px] font-semibold transition-all duration-300 shadow-xs ${
            filterOpen
              ? "border-primary/70 bg-primary-container/40 text-on-primary-container ring-4 ring-primary/10"
              : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/50 hover:shadow-[0_6px_20px_-8px_rgba(0,40,142,0.30)]"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${activeTabStatus.dot}`} />
            <span className="text-[13.5px] font-bold text-on-surface truncate">{activeTab.label}</span>
            {counts[activeTab.key] > 0 && (
              <span className="inline-flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary-container/60 text-primary px-1 text-[10px] font-extrabold leading-none">
                {counts[activeTab.key]}
              </span>
            )}
          </div>
          <div className={`w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center transition-all duration-300 ${
            filterOpen
              ? "bg-primary text-on-primary rotate-180 shadow-[0_2px_8px_-2px_rgba(0,40,142,0.5)]"
              : "bg-surface-container-low text-on-surface-variant group-hover:bg-primary-container group-hover:text-primary"
          }`}>
            <IconChevronDown size={17} stroke={2.5} />
          </div>
        </button>

        {filterOpen && (
          <div
            className={`sg-dropdown-list absolute left-0 right-0 z-50 rounded-2xl border border-outline-variant/80 bg-surface shadow-[0_28px_70px_-16px_rgba(2,6,23,0.35)] overflow-hidden animate-dropdown-in ${
              filterPlacement === "up" ? "bottom-[calc(100%+10px)]" : "top-[calc(100%+10px)]"
            }`}
          >
            <div className="p-1.5 overflow-y-auto overscroll-contain space-y-0.5 no-scrollbar" style={{ maxHeight: listMaxH }}>
              {TABS.map((t) => {
                const isSel = filter === t.key;
                const st = t.statuses ? (STATUS_STYLE[t.statuses[0]] || STATUS_STYLE.requested) : { dot: "bg-primary" };
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => { setFilter(t.key); setCurrentPage(1); closeFilter(); }}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                      isSel
                        ? "bg-primary-container/70 text-on-primary-container shadow-2xs"
                        : "hover:bg-surface-container-low text-on-surface"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                    <span className="flex-1 min-w-0 text-[13.5px] font-bold truncate">{t.label}</span>
                    {counts[t.key] > 0 && (
                      <span className={`inline-flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold leading-none ${
                        isSel ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
                      }`}>
                        {counts[t.key]}
                      </span>
                    )}
                    {isSel && <IconCircleCheck size={16} stroke={2.5} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
          <IconCircleCheck size={44} stroke={1.25} className="text-outline-variant" />
          <p className="text-[15px] font-semibold text-on-surface">No bookings found</p>
          <p className="text-[14px] text-on-surface-variant">
            {filter === "all" ? "Find a verified provider to get started." : `No ${activeTab.label.toLowerCase()} bookings.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* MOBILE: compact booking cards */}
          <div className="md:hidden space-y-3">
            {paginated.map((b) => {
              const s = STATUS_STYLE[b.status] || STATUS_STYLE.requested;
              const needsPay = b.paymentStatus !== 'paid' && ['accepted', 'in-progress'].includes(b.status);
              return (
                <div
                  key={b._id}
                  onClick={() => setSelectedBooking(b)}
                  className="rounded-2xl border border-outline-variant/60 bg-surface p-4 space-y-2.5 shadow-xs cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-bold text-on-surface truncate">{b.service}</p>
                      <p className="text-[12.5px] text-on-surface-variant truncate mt-0.5">
                        {b.providerId?.userId?.name || (b.dispatchMode === 'broadcast' && b.broadcastStatus === 'broadcasting' ? "Searching for provider..." : "Provider")}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${s.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {b.isEmergency && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container/60 text-error text-[10px] font-bold border border-error/20">
                        <IconBolt size={10} /> Emergency
                      </span>
                    )}
                    {b.recurrence?.enabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant text-[10px] font-bold border border-outline-variant/40 capitalize">
                        <IconRepeat size={10} /> {b.recurrence.freq}
                      </span>
                    )}
                    {b.groupBooking?.enabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant text-[10px] font-bold border border-outline-variant/40">
                        <IconUsers size={10} /> Group · {b.groupBooking.memberCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/30">
                    <span className="text-[15px] font-black text-on-surface">₹{b.price ?? 0}</span>
                    {b.paymentStatus === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface-variant text-[11px] font-bold border border-outline-variant/40">
                        <IconCircleCheck size={12} className="text-primary" /> Paid
                      </span>
                    ) : needsPay ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/household/pay/${b._id}`); }}
                        className="inline-flex h-8 items-center gap-1 px-3.5 rounded-lg bg-primary text-on-primary text-[12px] font-bold hover:opacity-90 active:scale-95 transition cursor-pointer"
                      >
                        Pay Now
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface-variant text-[11px] font-bold border border-outline-variant/40">
                        Awaiting status
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP: bookings table */}
          <div className="hidden lg:block rounded-2xl border border-outline-variant/60 bg-surface overflow-hidden shadow-xs">
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
                  {paginated.map(b => {
                    const s = STATUS_STYLE[b.status] || STATUS_STYLE.requested;
                    return (
                      <tr key={b._id}
                        onClick={() => setSelectedBooking(b)}
                        className="hover:bg-surface-container-low/50 transition-colors cursor-pointer">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-semibold text-on-surface truncate">{b.service}</p>
                            {b.isEmergency && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container/60 text-error text-[10px] font-bold border border-error/20 shrink-0">
                                <IconBolt size={10} /> Emergency
                              </span>
                            )}
                            {b.recurrence?.enabled && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant text-[10px] font-bold border border-outline-variant/40 capitalize shrink-0">
                                <IconRepeat size={10} /> {b.recurrence.freq}
                              </span>
                            )}
                            {b.groupBooking?.enabled && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant text-[10px] font-bold border border-outline-variant/40 shrink-0">
                                <IconUsers size={10} /> Group · {b.groupBooking.memberCount}
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
                               <span className="px-2.5 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant border border-outline-variant/40 text-[10px] font-bold">
                                 Paid
                               </span>
                             ) : ['accepted', 'in-progress'].includes(b.status) ? (
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   navigate(`/household/pay/${b._id}`);
                                 }}
                                 className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-[11px] font-bold border border-primary/25 hover:border-primary hover:bg-primary hover:text-on-primary transition-all duration-200 cursor-pointer"
                               >
                                 Pay Razorpay
                               </button>
                             ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── PAGINATION BAR ── */}
        {totalPages > 1 && (
          <div className="w-full flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl bg-surface border border-outline-variant/60 shadow-xs">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-xl flex items-center justify-center border border-outline-variant/60 bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
            >
              <IconChevronLeft size={18} stroke={2.25} />
            </button>

            {pageItems.map((item, idx) =>
              item === "gap" ? (
                <span key={`gap-${idx}`} className="px-0.5 text-[13px] font-bold text-on-surface-variant/60 select-none">
                  ⋯
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCurrentPage(item)}
                  className={`w-8 h-8 rounded-xl text-[12.5px] font-bold transition cursor-pointer flex items-center justify-center ${
                    currentPage === item
                      ? "bg-primary text-on-primary shadow-xs"
                      : "border border-outline-variant/40 bg-surface text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  {item}
                </button>
              )
            )}

            <button
              type="button"
              aria-label="Next page"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-xl flex items-center justify-center border border-outline-variant/60 bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
            >
              <IconChevronRight size={18} stroke={2.25} />
            </button>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
