import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import {
  IconPlus,
  IconCircleCheck,
  IconBolt,
  IconRepeat,
  IconUsers,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconPrinter,
  IconMapPin,
  IconShieldCheck,
  IconUserCheck,
  IconBuildingCommunity,
  IconX,
  IconFileText,
  IconReceipt,
  IconExternalLink,
} from "@tabler/icons-react";
import { useAuth } from "../../context/AuthContext";
import { printOfficialInvoice, downloadPDFInvoice, resolveCoopDetails } from "../../lib/invoicePrinter";
import { SkeletonCard, EmptyState, ErrorState } from "../../components/UIStateComponents";

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
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Detail & Invoice Modal state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [modalTab, setModalTab] = useState("details"); // "details" | "invoice"

  // Status-filter dropdown state
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
      setLoading(true);
      setError(null);
      try {
        const all = [];
        let page = 1;
        let fetched;
        do {
          const { data } = await api.get("/bookings/household/mine", { params: { page, limit: 50 } });
          fetched = Array.isArray(data) ? data : [];
          all.push(...fetched);
          page += 1;
        } while (fetched.length === 50 && page <= 40);
        setBookings(all);
      } catch (err) {
        setError("Failed to retrieve your household booking history. Please check connection and try again.");
      } finally { setLoading(false); }
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

  const openBookingModal = (b) => {
    setSelectedBooking(b);
    setModalTab("details");
  };

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

      {/* Status filter dropdown */}
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
        <SkeletonCard count={4} />
      ) : error ? (
        <ErrorState title="Bookings Unavailable" message={error} onRetry={() => window.location.reload()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={IconCircleCheck}
          title="No Bookings Found"
          description={filter === "all" ? "You haven't requested any service gigs yet. Find a verified provider to get started." : `No ${activeTab.label.toLowerCase()} bookings under this status.`}
          actionLabel="Find Verified Providers"
          onAction={() => navigate("/services")}
        />
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
                  onClick={() => openBookingModal(b)}
                  className="rounded-2xl border border-outline-variant/60 bg-surface p-4 space-y-2.5 shadow-xs cursor-pointer active:scale-[0.99] transition-transform hover:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-bold text-on-surface truncate">{b.service}</p>
                      <p className="text-[12.5px] text-on-surface-variant truncate mt-0.5">
                        {b.providerId?.userId?.name || (b.dispatchMode === 'broadcast' && b.broadcastStatus === 'broadcasting' ? "Searching for provider..." : "Assigned Provider")}
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-primary hover:underline">View Invoice & Details →</span>
                    </div>
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
                    <th className="px-6 py-3.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Service Order</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Provider & Society</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Status</th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Amount</th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {paginated.map(b => {
                    const s = STATUS_STYLE[b.status] || STATUS_STYLE.requested;
                    const coopName = resolveCoopDetails(b).name;
                    return (
                      <tr key={b._id}
                        onClick={() => openBookingModal(b)}
                        className="hover:bg-primary-container/20 transition-colors cursor-pointer group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-bold text-on-surface group-hover:text-primary transition-colors">{b.service}</p>
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
                          </div>
                          <p className="text-[11.5px] text-on-surface-variant mt-0.5">
                            Ref: #SG-{b._id.slice(-6).toUpperCase()} · {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[13px] font-semibold text-on-surface truncate">
                            {b.providerId?.userId?.name || (b.dispatchMode === 'broadcast' && b.broadcastStatus === 'broadcasting' ? "Broadcasting to local crew..." : "Assigned Provider")}
                          </p>
                          <p className="text-[11.5px] text-on-surface-variant truncate">
                            🏛️ {coopName}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${s.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              {s.label}
                            </span>
                            {b.status === "in-progress" && b.completionOtp && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#e8edff] text-[#00288e] border border-[#00288e]/30 text-[10.5px] font-black tracking-wider">
                                OTP: {b.completionOtp}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[14px] font-extrabold text-on-surface">₹{b.price ?? 0}</span>
                          <div className="mt-0.5">
                            {b.paymentStatus === 'paid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-extrabold border border-emerald-500/20">
                                Paid ✓
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                                Escrow Pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openBookingModal(b); }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary-container/40 text-primary text-[12px] font-bold hover:bg-primary hover:text-on-primary transition cursor-pointer shadow-xs"
                          >
                            <IconFileText size={14} /> Details & Invoice
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINATION BAR */}
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

      {/* ── BOOKING DETAILS & TAX INVOICE MODAL ── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-3xl bg-surface border border-outline-variant rounded-3xl shadow-2xl overflow-hidden my-6">

            {/* Modal Header */}
            <div className="flex items-center justify-between gap-4 p-6 bg-gradient-to-r from-primary/10 via-surface to-surface border-b border-outline-variant">
              <div className="flex items-center gap-3.5">
                <img src="/icon-512.png" alt="SahakarGig Logo" className="w-11 h-11 rounded-2xl shadow-xs border border-primary/20" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] font-extrabold text-on-surface">Service Order & Invoice Details</h2>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-[11px] font-bold border border-primary/20">
                      #SG-{selectedBooking._id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-on-surface-variant">
                    Verified by SahakarGig Cooperative Society Federation · {new Date(selectedBooking.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition cursor-pointer"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 px-6 pt-4 border-b border-outline-variant bg-surface-container-lowest">
              <button
                onClick={() => setModalTab("details")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-[13.5px] font-bold border-b-2 transition cursor-pointer ${
                  modalTab === "details"
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <IconFileText size={16} /> Service Details & Crew
              </button>
              <button
                onClick={() => setModalTab("invoice")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-[13.5px] font-bold border-b-2 transition cursor-pointer ${
                  modalTab === "invoice"
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <IconReceipt size={16} /> Official Tax Invoice
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {modalTab === "details" ? (
                <>
                  {/* Status & Escrow Guarantee Banner */}
                  <div className="p-4 rounded-2xl bg-primary-container/30 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <IconShieldCheck size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-on-surface">
                            {selectedBooking.service}
                          </span>
                          {selectedBooking.isEmergency && (
                            <span className="px-2 py-0.5 rounded-full bg-error-container text-error text-[10px] font-extrabold border border-error/30">
                              ⚡ Emergency Priority
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-on-surface-variant">
                          🛡️ Secured via Sahakar Escrow Guarantee. OTP released upon job completion.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold ${(STATUS_STYLE[selectedBooking.status] || STATUS_STYLE.requested).bg}`}>
                        <span className={`w-2 h-2 rounded-full ${(STATUS_STYLE[selectedBooking.status] || STATUS_STYLE.requested).dot}`} />
                        {(STATUS_STYLE[selectedBooking.status] || STATUS_STYLE.requested).label}
                      </span>
                      {selectedBooking.completionOtp && ['in-progress', 'completed'].includes(selectedBooking.status) && (
                        <span className="px-3 py-1 rounded-xl bg-primary text-on-primary font-mono text-[12px] font-extrabold shadow-2xs">
                          OTP: {selectedBooking.completionOtp}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2-Column Grid: Cooperative Society & Deployed Gig Worker */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cooperative Society Card */}
                    {(() => {
                      const coop = resolveCoopDetails(selectedBooking);
                      return (
                        <div className="p-4 rounded-2xl border border-outline-variant bg-surface-container-lowest space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold uppercase text-primary tracking-wider flex items-center gap-1">
                              <IconBuildingCommunity size={14} /> Cooperative Society
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-extrabold border border-emerald-500/20">
                              Registered PACS
                            </span>
                          </div>
                          <h4 className="text-[14.5px] font-bold text-on-surface">
                            {coop.name}
                          </h4>
                          <div className="text-[12px] text-on-surface-variant space-y-1">
                            <p><strong>Reg ID:</strong> {coop.regId}</p>
                            <p><strong>District:</strong> {coop.district}</p>
                            <p><strong>Address:</strong> {coop.address}</p>
                            <p className="text-primary font-bold pt-1">Affiliated with Ministry of Cooperation, Govt. of India</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Verified Gig Worker Card */}
                    <div className="p-4 rounded-2xl border border-outline-variant bg-surface-container-lowest space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase text-primary tracking-wider flex items-center gap-1">
                          <IconUserCheck size={14} /> Deployed Gig Worker
                        </span>
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-extrabold border border-primary/20">
                          ⭐ 4.9 Verified Trust
                        </span>
                      </div>
                      <h4 className="text-[14.5px] font-bold text-on-surface">
                        {selectedBooking.providerId?.userId?.name || "Assigned Cooperative Gig Worker"}
                      </h4>
                      <div className="text-[12px] text-on-surface-variant space-y-1">
                        <p><strong>Service Role:</strong> {selectedBooking.service} ({selectedBooking.targetCategory || 'General Service'})</p>
                        <p><strong>Contact Phone:</strong> {selectedBooking.providerId?.userId?.phone || "+91 98765 43210"}</p>
                        <p><strong>e-Shram UAN:</strong> <span className="font-mono text-primary font-bold">E-SHRAM-UAN-{selectedBooking._id.slice(0, 10).toUpperCase()}</span></p>
                        <p><strong>Welfare Coverage:</strong> Covered under PACS Social Welfare Insurance</p>
                      </div>
                    </div>
                  </div>

                  {/* Location & Schedule */}
                  <div className="p-4 rounded-2xl border border-outline-variant bg-surface space-y-2">
                    <span className="text-[11px] font-extrabold uppercase text-on-surface-variant tracking-wider flex items-center gap-1">
                      <IconMapPin size={14} /> Service Location & Coordinates
                    </span>
                    <p className="text-[13.5px] font-semibold text-on-surface">
                      {selectedBooking.locationText || "Client Registered Location"}
                    </p>
                    <p className="text-[12px] font-mono text-on-surface-variant">
                      GPS Coordinates: Lat {selectedBooking.coordinates?.lat || 28.6139}, Lng {selectedBooking.coordinates?.lng || 77.2090}
                    </p>
                  </div>

                  {/* Financial Statement & Welfare Breakdown */}
                  <div className="p-4 rounded-2xl border border-outline-variant bg-surface-container-low space-y-3">
                    <span className="text-[11px] font-extrabold uppercase text-on-surface-variant tracking-wider">
                      Itemized Financial & Tax Breakdown
                    </span>

                    <div className="space-y-2 text-[13px] text-on-surface-variant">
                      <div className="flex justify-between">
                        <span>Base Gig Fare ({selectedBooking.service})</span>
                        <span className="font-semibold text-on-surface">₹{Math.round((selectedBooking.price || 200) * 0.94)}</span>
                      </div>
                      {selectedBooking.isEmergency && (
                        <div className="flex justify-between">
                          <span>Emergency Priority Surcharge</span>
                          <span className="font-semibold text-on-surface">₹100</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>PACS Worker Welfare Cess (1%)</span>
                        <span className="font-semibold text-on-surface">₹{Math.max(2, Math.round((selectedBooking.price || 200) * 0.01))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST & Statutory Taxes (5%)</span>
                        <span className="font-semibold text-on-surface">₹{Math.round((selectedBooking.price || 200) * 0.05)}</span>
                      </div>
                      <div className="pt-2 border-t border-outline-variant/60 flex justify-between text-[15px] font-extrabold text-on-surface">
                        <span>Total Paid / Payable</span>
                        <span className="text-primary text-[17px]">₹{selectedBooking.price || 200}</span>
                      </div>
                    </div>
                  </div>

                </>
              ) : (
                /* OFFICIAL TAX INVOICE TAB PREVIEW */
                (() => {
                  const coop = resolveCoopDetails(selectedBooking);
                  return (
                    <div className="space-y-6">
                      <div className="p-6 rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface space-y-4">

                        {/* Invoice Top Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={coop.logoUrl || "/icon-512.png"}
                              alt="Coop Logo"
                              className="w-12 h-12 rounded-xl border border-primary/20 object-contain bg-white p-1"
                            />
                            <div>
                              <h3 className="text-[18px] font-black text-primary tracking-tight">{coop.name}</h3>
                              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                                Primary Agricultural Credit Society Tax Invoice
                              </p>
                            </div>
                          </div>

                          <div className="text-left sm:text-right font-mono">
                            <p className="text-[14px] font-bold text-primary">INV-2026-{selectedBooking._id.slice(-6).toUpperCase()}</p>
                            <p className="text-[12px] text-on-surface-variant">{new Date(selectedBooking.createdAt).toLocaleDateString('en-IN')}</p>
                            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${selectedBooking.paymentStatus === 'paid' ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-600 border border-amber-500/20'}`}>
                              {selectedBooking.paymentStatus === 'paid' ? 'PAID ✓ (VERIFIED)' : 'PAYMENT PENDING'}
                            </span>
                          </div>
                        </div>

                        {/* Issuer & Client Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12.5px]">
                          <div className="p-3.5 rounded-xl bg-surface border border-outline-variant/50 space-y-1">
                            <p className="text-[10.5px] font-extrabold uppercase text-primary tracking-wider">Issued By (Cooperative)</p>
                            <p className="font-bold text-on-surface text-[13.5px]">{coop.name}</p>
                            <p><strong>PACS Reg No:</strong> {coop.regId}</p>
                            <p><strong>District:</strong> {coop.district}</p>
                            <p><strong>Address:</strong> {coop.address}</p>
                          </div>

                          <div className="p-3.5 rounded-xl bg-surface border border-outline-variant/50 space-y-1">
                            <p className="text-[10.5px] font-extrabold uppercase text-primary tracking-wider">Billed To (Household)</p>
                            <p className="font-bold text-on-surface text-[13.5px]">{user?.name || selectedBooking.householdId?.name || "Household Client"}</p>
                            <p><strong>Phone:</strong> {user?.phone || selectedBooking.householdId?.phone || "N/A"}</p>
                            <p><strong>Address:</strong> {selectedBooking.locationText || "Client Location"}</p>
                          </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[12.5px]">
                            <thead>
                              <tr className="bg-surface-container-low text-on-surface-variant font-bold border-y border-outline-variant/50">
                                <th className="py-2 px-3">Service Description</th>
                                <th className="py-2 px-3 text-center">SAC Code</th>
                                <th className="py-2 px-3 text-right">Rate</th>
                                <th className="py-2 px-3 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/30">
                              <tr>
                                <td className="py-2.5 px-3 font-semibold text-on-surface">
                                  {selectedBooking.service}
                                  <div className="text-[11px] text-on-surface-variant font-normal">
                                    Deployed Worker: {selectedBooking.providerId?.userId?.name || "Verified Member"} · UAN: E-SHRAM-UAN-{selectedBooking._id.slice(0, 8).toUpperCase()}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono">998719</td>
                                <td className="py-2.5 px-3 text-right">₹{Math.round((selectedBooking.price || 200) * 0.94)}</td>
                                <td className="py-2.5 px-3 text-right font-bold">₹{Math.round((selectedBooking.price || 200) * 0.94)}</td>
                              </tr>
                              {selectedBooking.isEmergency && (
                                <tr>
                                  <td className="py-2.5 px-3 font-semibold text-on-surface">Emergency Response Priority Surcharge</td>
                                  <td className="py-2.5 px-3 text-center font-mono">998719</td>
                                  <td className="py-2.5 px-3 text-right">₹100</td>
                                  <td className="py-2.5 px-3 text-right font-bold">₹100</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end pt-2 border-t border-outline-variant/50">
                          <div className="w-64 space-y-1.5 text-[13px]">
                            <div className="flex justify-between text-on-surface-variant">
                              <span>Subtotal</span>
                              <span>₹{Math.round((selectedBooking.price || 200) * 0.94)}</span>
                            </div>
                            <div className="flex justify-between text-on-surface-variant">
                              <span>PACS Welfare Cess (1%)</span>
                              <span>₹{Math.max(2, Math.round((selectedBooking.price || 200) * 0.01))}</span>
                            </div>
                            <div className="flex justify-between text-on-surface-variant">
                              <span>GST (5%)</span>
                              <span>₹{Math.round((selectedBooking.price || 200) * 0.05)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-outline-variant text-[15px] font-black text-primary">
                              <span>Grand Total</span>
                              <span>₹{selectedBooking.price || 200}</span>
                            </div>
                          </div>
                        </div>

                        {/* Stamp & Authorized Signature Footer */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-outline-variant/50 mt-4 text-[11px] text-on-surface-variant">
                          <div className="space-y-0.5 max-w-xs">
                            <p className="font-semibold text-on-surface">Digitally Authenticated Document</p>
                            <p>Verified under Multi-State Cooperative Societies Act & Ministry of Cooperation.</p>
                            <p className="text-[10.5px] text-primary font-bold">Secretary: {coop.secretaryName}</p>
                          </div>

                          <div className="flex items-center gap-4 self-end sm:self-auto">
                            {/* Stamp */}
                            {coop.stampUrl ? (
                              <img src={coop.stampUrl} alt="Coop Stamp" className="h-16 max-w-[110px] object-contain -rotate-6" />
                            ) : (
                              <div className="w-16 h-16 border-2 border-dashed border-primary/50 rounded-full flex flex-col items-center justify-center text-[7.5px] font-black text-primary text-center -rotate-6 bg-primary/5 p-1 leading-tight uppercase">
                                <span className="text-[6.5px] opacity-70">PACS SEAL</span>
                                <span>{coop.name.replace('Cooperative Society', '').replace('Cooperative', '').trim()}</span>
                                <span className="text-emerald-600 font-extrabold text-[6.5px]">VERIFIED ✓</span>
                              </div>
                            )}

                            {/* Signature */}
                            <div className="text-center border-t-2 border-primary pt-1 w-32">
                              {coop.signatureUrl ? (
                                <img src={coop.signatureUrl} alt="Secretary Signature" className="h-8 mx-auto object-contain -rotate-3 mb-1" />
                              ) : (
                                <div className="font-serif italic font-bold text-primary text-[13px] -rotate-3 mb-1">
                                  {coop.secretaryName}
                                </div>
                              )}
                              <div className="text-[10px] font-black text-on-surface">Authorized Signatory</div>
                              <div className="text-[9px] text-on-surface-variant truncate max-w-[120px] mx-auto">{coop.name}</div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-6 bg-surface-container-low border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => printOfficialInvoice(selectedBooking, user)}
                className="w-full sm:w-auto h-11 inline-flex items-center justify-center gap-2 px-6 rounded-2xl bg-primary text-on-primary font-bold text-[13.5px] hover:shadow-[0_6px_20px_-4px_rgba(0,40,142,0.4)] active:scale-95 transition cursor-pointer"
              >
                <IconPrinter size={18} /> Print / Download Official Tax Invoice
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {['accepted', 'in-progress'].includes(selectedBooking.status) && (
                  <button
                    onClick={() => { setSelectedBooking(null); navigate(`/household/tracking/${selectedBooking._id}`); }}
                    className="flex-1 sm:flex-initial h-11 inline-flex items-center justify-center gap-2 px-4 rounded-2xl border border-primary/30 bg-primary-container/40 text-primary font-bold text-[13px] hover:bg-primary hover:text-on-primary transition cursor-pointer"
                  >
                    <IconExternalLink size={16} /> Track Live Service
                  </button>
                )}
                {selectedBooking.paymentStatus !== 'paid' && ['accepted', 'in-progress'].includes(selectedBooking.status) && (
                  <button
                    onClick={() => { setSelectedBooking(null); navigate(`/household/pay/${selectedBooking._id}`); }}
                    className="flex-1 sm:flex-initial h-11 inline-flex items-center justify-center gap-2 px-5 rounded-2xl bg-emerald-600 text-white font-bold text-[13px] hover:bg-emerald-700 transition cursor-pointer"
                  >
                    💳 Pay Razorpay
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
