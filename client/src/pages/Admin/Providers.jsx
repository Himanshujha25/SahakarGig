import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { SERVER_URL } from "../../lib/config";
import socket from "../../lib/socket";
import {
  Search, Users, MessageSquare, Ban, CheckCircle2,
  Trash2, UserPlus, Megaphone, X, Send, ShieldAlert,
  Phone, Mail, ShieldCheck, ExternalLink, UserCheck
} from "lucide-react";
import { SkeletonTable, EmptyState, ErrorState } from "../../components/UIStateComponents";

export default function Providers() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  // Blocked providers state tracking
  const [blockedIds, setBlockedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sg_blocked_providers") || "[]");
    } catch { return []; }
  });

  // Modal / Split View states
  const [messageModalUser, setMessageModalUser] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState("announcement");
  const [durationMins, setDurationMins] = useState("15");

  const [addWorkerModalOpen, setAddWorkerModalOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerEmail, setNewWorkerEmail] = useState("");
  const [newWorkerPhone, setNewWorkerPhone] = useState("");
  const [newWorkerSkill, setNewWorkerSkill] = useState("Electrician");
  const [newWorkerRate, setNewWorkerRate] = useState("350");

  const [toastMsg, setToastMsg] = useState("");

  function showToast(text) {
    setToastMsg(text);
    setTimeout(() => setToastMsg(""), 3500);
  }

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/admin/providers");
      const localInvited = JSON.parse(localStorage.getItem("sg_invited_providers") || "[]");
      const combined = [...localInvited, ...(data || [])];
      const unique = [];
      const seen = new Set();
      for (const item of combined) {
        const key = item._id || item.userId?.email || item.email;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }
      setItems(unique);
    } catch (err) {
      const localInvited = JSON.parse(localStorage.getItem("sg_invited_providers") || "[]");
      if (localInvited.length > 0) {
        setItems(localInvited);
      } else {
        setError("Failed to load cooperative provider roster. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Filter providers
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        (p.userId?.name || p.name || "").toLowerCase().includes(q) ||
        (p.userId?.email || p.email || "").toLowerCase().includes(q) ||
        (p.userId?.phone || p.phone || "").toLowerCase().includes(q) ||
        (p.skills || []).some((s) => s.toLowerCase().includes(q))
    );
  }, [items, query]);

  // Counts
  const totalCount = items.length;
  const verifiedCount = items.filter((p) => p.verified).length;
  const blockedCount = items.filter((p) => blockedIds.includes(p._id)).length;
  const activeCount = totalCount - blockedCount;

  // Toggle Block / Unblock Worker
  function toggleBlockWorker(providerId, workerName) {
    let updated;
    if (blockedIds.includes(providerId)) {
      updated = blockedIds.filter((id) => id !== providerId);
      showToast(`Worker ${workerName || ""} unblocked. Dispatch alerts enabled.`);
    } else {
      updated = [...blockedIds, providerId];
      showToast(`Worker ${workerName || ""} suspended. Job alerts disabled.`);
    }
    setBlockedIds(updated);
    localStorage.setItem("sg_blocked_providers", JSON.stringify(updated));
  }

  // Active agency announcements tracking
  const [coopMessages, setCoopMessages] = useState([]);

  function loadCoopMessages() {
    try {
      const stored = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]")
        .filter(m => !m.id?.startsWith("msg_seed_"));
      setCoopMessages(stored);
    } catch {}
  }

  useEffect(() => {
    loadCoopMessages();
    const handleStorage = () => { loadCoopMessages(); };
    const interval = setInterval(loadCoopMessages, 2000);
    window.addEventListener("coop_message_updated", loadCoopMessages);
    window.addEventListener("storage", handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("coop_message_updated", loadCoopMessages);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function deleteAnnouncement(msgId) {
    const existingMsgs = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]");
    const updated = existingMsgs.filter(m => m.id !== msgId);
    localStorage.setItem("sg_coop_messages", JSON.stringify(updated));
    setCoopMessages(updated);
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("coop_message_updated"));
    showToast("Announcement alert removed.");
  }

  // Handle Send Message or Broadcast Alert
  function handleSendMessage(e) {
    if (e && e.preventDefault) e.preventDefault();
    const textValue = (messageText || "").trim();
    if (!textValue) return;

    const isBroadcast = messageModalUser === "ALL";
    const recipient = isBroadcast ? "All Active Cooperative Workers" : (messageModalUser?.userId?.name || "Member Worker");

    const newMsg = {
      id: "msg_" + Date.now(),
      target: isBroadcast ? "ALL" : messageModalUser?._id,
      title: isBroadcast ? (messageType === "urgent" ? "🚨 Urgent Dispatch Advisory" : messageType === "bonus" ? "🎁 Incentive Pay Announcement" : "📢 Cooperative Federation Notice") : "Admin Notice",
      body: textValue,
      type: messageType,
      expiresAt: Date.now() + (parseInt(durationMins) || 15) * 60 * 1000,
      createdAt: new Date().toISOString(),
    };

    try {
      const existingMsgs = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]");
      localStorage.setItem("sg_coop_messages", JSON.stringify([newMsg, ...existingMsgs]));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("coop_message_updated"));
    } catch {}

    setMessageText("");
    setMessageModalUser(null);
    loadCoopMessages();
    showToast(isBroadcast ? `Broadcast notice dispatched to all members!` : `Direct message sent to ${recipient}!`);
  }

  // Add New Worker to Roster
  async function handleAddNewWorker(e) {
    e.preventDefault();
    if (!newWorkerName.trim() || !newWorkerEmail.trim()) return;

    const name = newWorkerName.trim();
    const email = newWorkerEmail.trim();
    const phone = (newWorkerPhone || "+91 98112 44556").trim();
    const skill = newWorkerSkill || "Electrician";
    const rate = newWorkerRate || "350";

    const validObjectId = "65a9" + Date.now().toString(16).padStart(12, '0').slice(-20);

    const newProvider = {
      _id: validObjectId,
      userId: { name, email, phone },
      skills: [skill],
      hourlyRate: parseInt(rate) || 350,
      verified: false,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    const existingInvites = JSON.parse(localStorage.getItem("sg_invited_providers") || "[]");
    localStorage.setItem("sg_invited_providers", JSON.stringify([newProvider, ...existingInvites]));
    setItems([newProvider, ...items]);
    setAddWorkerModalOpen(false);
    showToast(`Worker member "${name}" registered into cooperative roster!`);

    setNewWorkerName("");
    setNewWorkerEmail("");
    setNewWorkerPhone("");
  }

  return (
    <div className="space-y-4 sm:space-y-6 text-on-surface">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-[99999] px-4 py-3 rounded-2xl bg-surface border border-outline-variant text-on-surface font-bold text-xs shadow-2xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── HEADER & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Cooperative Member Workforce
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold flex items-center gap-1">
              <Users size={12} />
              {totalCount} Connected Members
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Manage your cooperative member roster, broadcast emergency notices, and inspect credentials.
          </p>
        </div>

        {/* Top Action CTAs */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMessageModalUser("ALL")}
            className="px-3.5 py-2 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Megaphone size={14} className="text-primary" />
            <span>Broadcast Notice</span>
          </button>

          <button
            type="button"
            onClick={() => setAddWorkerModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-primary hover:opacity-90 text-on-primary text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-98"
          >
            <UserPlus size={14} />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* ── 4 KPI STAT TILES (Compact 2x2 Grid on Mobile) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-5 rounded-2xl border border-outline-variant/60 bg-surface shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-1 sm:mb-2">
            <p className="text-[10.5px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider truncate">Total Members</p>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <Users size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-on-surface">{totalCount}</p>
          <p className="text-[10.5px] sm:text-[11px] font-medium text-on-surface-variant truncate">Registered in Society</p>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl border border-outline-variant/60 bg-surface shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-1 sm:mb-2">
            <p className="text-[10.5px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider truncate">Active Workers</p>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <UserCheck size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-on-surface">{activeCount}</p>
          <p className="text-[10.5px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 truncate">Receiving Alerts</p>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl border border-outline-variant/60 bg-surface shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-1 sm:mb-2">
            <p className="text-[10.5px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider truncate">Suspended</p>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
              <Ban size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-on-surface">{blockedCount}</p>
          <p className="text-[10.5px] sm:text-[11px] font-medium text-rose-600 dark:text-rose-400 truncate">Alerts Paused</p>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl border border-outline-variant/60 bg-surface shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-1 sm:mb-2">
            <p className="text-[10.5px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider truncate">Verified Badged</p>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-on-surface">{verifiedCount}</p>
          <p className="text-[10.5px] sm:text-[11px] font-medium text-amber-600 dark:text-amber-400 truncate">Cooperative Badged</p>
        </div>
      </div>

      {/* ── Active Broadcast Announcements Bar ── */}
      {coopMessages.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
            Active Broadcasts ({coopMessages.length})
          </span>
          {coopMessages.map((m) => (
            <div
              key={m.id}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant/60 text-xs font-bold text-on-surface shrink-0 shadow-2xs"
            >
              <span className="truncate max-w-[240px] sm:max-w-[360px]">
                {m.title}: {m.body}
              </span>
              <button
                type="button"
                onClick={() => deleteAnnouncement(m.id)}
                className="text-on-surface-variant hover:text-rose-600 transition-colors cursor-pointer ml-1 p-0.5 rounded-full hover:bg-rose-500/10"
                title="Delete Announcement"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── SEARCH & TABLE / CARD CONTAINER ── */}
      <div className="space-y-3 sm:space-y-4">
        {/* Search Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search member workers by name, skill, email..."
              className="w-full h-10 pl-10 pr-9 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-2xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                title="Clear search query"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <span className="text-xs text-on-surface-variant font-bold shrink-0 hidden sm:inline">Showing {filtered.length} members</span>
        </div>

        {/* Loading / Empty State */}
        {loading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : error ? (
          <ErrorState title="Provider Roster Unavailable" message={error} onRetry={fetchProviders} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Member Workers Found"
            description={query ? `No providers match "${query}". Try searching another name, email or skill.` : "No member providers registered in this cooperative society yet."}
            actionLabel={query ? "Clear Search Query" : "Register Worker Member"}
            onAction={query ? () => setQuery("") : () => setAddWorkerModalOpen(true)}
          />
        ) : (
          <>
            {/* ── MOBILE WORKER CARD VIEW (< 768px) ── */}
            <div className="md:hidden space-y-2.5">
              {filtered.map((p) => {
                const isBlocked = blockedIds.includes(p._id);
                const name = p.userId?.name || p.name || "Worker Member";
                const email = p.userId?.email || p.email || "";
                const phone = p.userId?.phone || p.phone || "";
                const skill = (p.skills || [])[0] || "Electrician";
                const rate = p.hourlyRate || 350;
                const storedProviderAvatar = localStorage.getItem("sg_provider_avatar");
                const rawAvatar =
                  localStorage.getItem("sg_worker_avatar_" + p._id) ||
                  p.userId?.avatarUrl ||
                  p.avatarUrl ||
                  p.avatar ||
                  p.userId?.profileImage ||
                  p.profileImage ||
                  storedProviderAvatar ||
                  "";
                const avatar = rawAvatar
                  ? (rawAvatar.startsWith("http") || rawAvatar.startsWith("data:")
                      ? rawAvatar
                      : `${SERVER_URL}${rawAvatar}`)
                  : null;

                const initials = name
                  .split(" ")
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "WK";

                const detailUrl = `/admin/providers/detail?id=${p._id}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&skill=${encodeURIComponent(skill)}&rate=${rate}&avatar=${encodeURIComponent(avatar || "")}&coopName=${encodeURIComponent("Karol Bagh Labour Cooperative")}`;

                return (
                  <div
                    key={p._id}
                    className="p-3.5 rounded-2xl border border-outline-variant/60 bg-surface space-y-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={name}
                            className="w-10 h-10 rounded-xl object-cover border border-outline-variant shrink-0 shadow-xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p
                            className="font-bold text-on-surface text-sm truncate hover:text-primary cursor-pointer leading-tight"
                            onClick={() => navigate(detailUrl)}
                          >
                            {name}
                          </p>
                          <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                            {phone || email || "Member"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹{rate}/hr</p>
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px]">
                          {skill}
                        </span>
                      </div>
                    </div>

                    {/* Status and Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40">
                      <div>
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[10.5px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10.5px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active Member ✓
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(detailUrl)}
                          className="p-1.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold transition cursor-pointer"
                          title="Inspect Profile"
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMessageModalUser(p)}
                          className="p-1.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold transition cursor-pointer"
                          title="Message Worker"
                        >
                          <MessageSquare size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBlockWorker(p._id, name)}
                          className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            isBlocked
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                          title={isBlocked ? "Reactivate Worker" : "Suspend Worker"}
                        >
                          <Ban size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── DESKTOP TABLE VIEW (>= 768px) ── */}
            <div className="hidden md:block rounded-2xl border border-outline-variant/60 bg-surface overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/60 text-on-surface-variant font-bold uppercase tracking-wider text-[10.5px]">
                      <th className="px-5 py-3.5">Worker Member</th>
                      <th className="px-5 py-3.5">Trade Skill</th>
                      <th className="px-5 py-3.5">Hourly Rate</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {filtered.map((p) => {
                      const isBlocked = blockedIds.includes(p._id);
                      const name = p.userId?.name || p.name || "Worker Member";
                      const email = p.userId?.email || p.email || "";
                      const phone = p.userId?.phone || p.phone || "";
                      const skill = (p.skills || [])[0] || "Electrician";
                      const rate = p.hourlyRate || 350;

                      const initials = name
                        .split(" ")
                        .map((n) => n[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "WK";

                      const detailUrl = `/admin/providers/detail?id=${p._id}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&skill=${encodeURIComponent(skill)}&rate=${rate}&coopName=${encodeURIComponent("Karol Bagh Labour Cooperative")}`;

                      return (
                        <tr key={p._id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-on-surface hover:text-primary cursor-pointer truncate" onClick={() => navigate(detailUrl)}>
                                  {name}
                                </p>
                                <p className="text-[11px] text-on-surface-variant truncate">
                                  {email || phone || "Member"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-bold text-[11px] border border-primary/20">
                              {skill}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{rate}/hr
                          </td>

                          <td className="px-5 py-3.5">
                            {isBlocked ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Suspended
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active Member ✓
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => navigate(detailUrl)}
                                className="p-2 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all cursor-pointer shadow-2xs"
                                title="Inspect Full Worker Profile"
                              >
                                <ExternalLink size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setMessageModalUser(p)}
                                className="p-2 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all cursor-pointer shadow-2xs"
                                title="Send Direct Admin Notice"
                              >
                                <MessageSquare size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleBlockWorker(p._id, name)}
                                className={`p-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                                  isBlocked
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                    : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                                }`}
                                title={isBlocked ? "Reactivate Worker" : "Suspend Worker"}
                              >
                                <Ban size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── MODAL 1: ADD NEW WORKER ── */}
      {addWorkerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setAddWorkerModalOpen(false)}>
          <div className="w-full max-w-md bg-surface text-on-surface rounded-3xl p-6 lg:p-8 space-y-4 border border-outline-variant shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Register Member Worker</h2>
                  <p className="text-xs text-on-surface-variant">Add to cooperative workforce roster</p>
                </div>
              </div>
              <button onClick={() => setAddWorkerModalOpen(false)} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewWorker} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low outline-none focus:border-primary text-on-surface"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. suresh.worker@gmail.com"
                  value={newWorkerEmail}
                  onChange={(e) => setNewWorkerEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low outline-none focus:border-primary text-on-surface"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant">Mobile Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98112 44556"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low outline-none focus:border-primary text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Primary Skill</label>
                  <select
                    value={newWorkerSkill}
                    onChange={(e) => setNewWorkerSkill(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low outline-none focus:border-primary text-on-surface"
                  >
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Cleaner">Cleaner</option>
                    <option value="Painter">Painter</option>
                    <option value="AC Technician">AC Technician</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={newWorkerRate}
                    onChange={(e) => setNewWorkerRate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low outline-none focus:border-primary text-on-surface"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setAddWorkerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 shadow-xs cursor-pointer"
                >
                  Add Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: BROADCAST OR DIRECT MESSAGE ── */}
      {messageModalUser !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setMessageModalUser(null)}>
          <div className="w-full max-w-lg bg-surface text-on-surface rounded-3xl p-6 lg:p-8 space-y-4 border border-outline-variant shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface">
                    {messageModalUser === "ALL" ? "Broadcast Notice to All Workers" : `Send Direct Message: ${messageModalUser?.userId?.name || "Worker"}`}
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    {messageModalUser === "ALL" ? "Broadcasts instant push notification to all member devices" : "Private admin instruction"}
                  </p>
                </div>
              </div>
              <button onClick={() => setMessageModalUser(null)} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {messageModalUser === "ALL" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Notice Category</label>
                    <select
                      value={messageType}
                      onChange={(e) => setMessageType(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low outline-none focus:border-primary text-on-surface"
                    >
                      <option value="announcement">📢 General Announcement</option>
                      <option value="urgent">🚨 Urgent Dispatch Alert</option>
                      <option value="bonus">🎁 Incentive / Bonus Pay</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Display Duration</label>
                    <select
                      value={durationMins}
                      onChange={(e) => setDurationMins(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low outline-none focus:border-primary text-on-surface"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="60">1 Hour</option>
                      <option value="1440">24 Hours</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant">Notice Content</label>
                <textarea
                  id="broadcast_message_textarea"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={3}
                  placeholder="Type official notice, safety advisory, or surge dispatch instruction..."
                  className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-low outline-none focus:border-primary text-on-surface resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setMessageModalUser(null)}
                  className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>Send Broadcast</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
