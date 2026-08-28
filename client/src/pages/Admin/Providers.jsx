import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import VerifiedBadge from "../../components/VerifiedBadge";
import {
  Search, Users, Trophy, MessageSquare, Ban, CheckCircle2,
  Trash2, UserPlus, Megaphone, X, Send, ShieldAlert, AlertTriangle,
  Phone, Mail, Plus, ShieldCheck, Clock, ExternalLink, Copy
} from "lucide-react";

export default function Providers() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Blocked providers state tracking
  const [blockedIds, setBlockedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sg_blocked_providers") || "[]");
    } catch { return []; }
  });

  // Modal / Split View states
  const [messageModalUser, setMessageModalUser] = useState(null); // null, "ALL", or provider object
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

  useEffect(() => {
    (async () => {
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
      } catch {
        const localInvited = JSON.parse(localStorage.getItem("sg_invited_providers") || "[]");
        if (localInvited.length > 0) setItems(localInvited);
      } finally { setLoading(false); }
    })();
  }, []);

  // Filter providers
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        (p.userId?.name || "").toLowerCase().includes(q) ||
        (p.userId?.email || "").toLowerCase().includes(q) ||
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
      showToast(`Worker ${workerName || ""} unblocked. Dispatch job alerts enabled.`);
    } else {
      updated = [...blockedIds, providerId];
      showToast(`Worker ${workerName || ""} BLOCKED! Job dispatch alerts disabled for this worker.`);
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

  const [, setRefreshKey] = useState(0);

  useEffect(() => {
    loadCoopMessages();
    const handleStorage = () => {
      loadCoopMessages();
      setRefreshKey((k) => k + 1);
    };
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
    showToast("🗑️ Announcement alert removed successfully.");
  }

  // Remove Worker from Agency
  function removeWorker(providerId, workerName) {
    if (window.confirm(`Are you sure you want to remove ${workerName || "this worker"} from your agency roster?`)) {
      setItems((prev) => prev.filter((p) => p._id !== providerId));
      showToast(`Worker ${workerName || ""} removed from agency roster.`);
    }
  }

  // Handle Send Message or Broadcast Alert
  function handleSendMessage(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    // Direct ID extraction from DOM for 100% guarantee
    const ta = document.getElementById("broadcast_message_textarea");
    const textValue = (ta ? ta.value : messageText || "").trim();

    if (!textValue) {
      showToast("⚠️ Please type a message before sending!");
      return;
    }

    const isBroadcast = messageModalUser === "ALL";
    const recipient = isBroadcast
      ? "All Connected Agency Workers"
      : messageModalUser?.userId?.name || "Worker";

    const durationMinsNum = isBroadcast ? (parseInt(durationMins, 10) || 0) : 0;
    const expiresAt = (isBroadcast && durationMinsNum > 0) ? Date.now() + durationMinsNum * 60 * 1000 : null;

    const msgObj = {
      id: "msg_" + Date.now(),
      sender: "Karol Bagh Labour Cooperative Agency",
      senderRole: "Cooperative Admin",
      recipient: recipient,
      recipientId: isBroadcast ? "ALL" : (messageModalUser?._id || messageModalUser?.userId?._id),
      title: isBroadcast
        ? (messageType === "urgent" ? "🚨 URGENT DISPATCH ALERT" : messageType === "bonus" ? "🎁 BONUS PAY INCENTIVE" : "📢 COOPERATIVE ANNOUNCEMENT")
        : `💬 Direct Message from Cooperative Admin`,
      body: textValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(),
      type: isBroadcast ? (messageType || "announcement") : "direct",
      durationMins: durationMinsNum,
      expiresAt: expiresAt,
      read: false
    };

    // Save to localStorage
    const existingMsgs = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]");
    localStorage.setItem("sg_coop_messages", JSON.stringify([msgObj, ...existingMsgs]));
    
    // Broadcast events for instant marquee update
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("coop_message_updated"));
    try {
      socket.emit("notification", msgObj);
    } catch {}

    // Clear textarea & close panel
    if (ta) ta.value = "";
    setMessageText("");
    loadCoopMessages();
    showToast(isBroadcast ? `📢 Broadcast alert sent to all workers!` : `💬 Direct message sent to ${recipient}!`);
  }

  const [inviteModalData, setInviteModalData] = useState(null);

  // Add New Worker to Roster & Send Real Agency Email Invitation
  async function handleAddNewWorker(e) {
    e.preventDefault();
    if (!newWorkerName.trim() || !newWorkerEmail.trim()) return;

    const coopName = "Karol Bagh Labour Cooperative";
    const name = newWorkerName.trim();
    const email = newWorkerEmail.trim();
    const phone = (newWorkerPhone || "+91 98112 44556").trim();
    const skill = newWorkerSkill || "Electrician";
    const rate = newWorkerRate || "350";

    const queryStr = new URLSearchParams({
      name,
      email,
      phone,
      skill,
      rate,
      coopName
    }).toString();

    const inviteUrl = `${window.location.origin}/signup?${queryStr}`;

    const validObjectId = "65a9" + Date.now().toString(16).padStart(12, '0').slice(-20);

    const newProvider = {
      _id: validObjectId,
      userId: {
        name,
        email,
        phone,
      },
      skills: [skill],
      hourlyRate: parseInt(rate) || 350,
      verified: false,
      accountCreated: false,
      status: "invited",
      createdAt: new Date().toISOString(),
    };

    const existingInvites = JSON.parse(localStorage.getItem("sg_invited_providers") || "[]");
    localStorage.setItem("sg_invited_providers", JSON.stringify([newProvider, ...existingInvites]));

    setItems((prev) => [newProvider, ...prev]);
    setAddWorkerModalOpen(false);

    // Dispatch Real Gmail SMTP Email via Public Backend Endpoint
    try {
      await api.post('/providers/invite-worker', {
        name,
        email,
        phone,
        skill,
        hourlyRate: rate,
        coopName
      });
      showToast(`📧 Invitation email sent directly to ${email}! Check inbox.`);
    } catch (err) {
      console.warn("Real email delivery note:", err);
      showToast(`✉️ Invitation link created for ${name}!`);
    }

    setNewWorkerName("");
    setNewWorkerEmail("");
    setNewWorkerPhone("");
  }

  function nameMatch(p, term) {
    const n = (p?.userId?.name || p?.name || "").toLowerCase();
    const e = (p?.userId?.email || p?.email || "").toLowerCase();
    return n.includes(term) || e.includes(term);
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-20 space-y-5">

      {/* ── Toast Alert ── */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-[9999] rounded-2xl px-5 py-3.5 bg-[#0f172a] text-white text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2.5 animate-bounce">
          <ShieldAlert size={16} className="text-[#84cc16]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Page Header & Action Bar ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Agency Connected Workers
            </h1>
            <span className="orvia-badge-lime text-xs">
              <Users size={13} /> {totalCount} Connected Workers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your agency worker roster, broadcast alerts, send direct messages, and manage active announcements.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setMessageModalUser("ALL")}
            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
              messageModalUser !== null
                ? "border-[#1e6b65] bg-[#1e6b65] text-white"
                : "border-[#1e6b65] bg-[#e6f4f1] text-[#145e58] hover:bg-[#1e6b65] hover:text-white"
            }`}
          >
            <Megaphone size={15} />
            <span>Broadcast Alert to All</span>
          </button>

          <button
            type="button"
            onClick={() => setAddWorkerModalOpen(true)}
            className="orvia-btn-primary text-xs py-2 px-4 cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Add New Worker</span>
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="orvia-card p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Agency Roster</span>
          <p className="text-2xl font-black text-slate-900">{totalCount}</p>
          <span className="text-[11px] text-[#1e6b65] font-semibold">Registered Workers</span>
        </div>

        <div className="orvia-card p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Workers</span>
          <p className="text-2xl font-black text-[#4d7c0f]">{activeCount}</p>
          <span className="text-[11px] text-[#65a30d] font-semibold">Receiving Job Alerts</span>
        </div>

        <div className="orvia-card p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Blocked Workers</span>
          <p className="text-2xl font-black text-red-600">{blockedCount}</p>
          <span className="text-[11px] text-red-500 font-semibold">Alerts Suspended</span>
        </div>

        <div className="orvia-card p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cooperative Verified</span>
          <p className="text-2xl font-black text-[#145e58]">{verifiedCount}</p>
          <span className="text-[11px] text-[#1e6b65] font-semibold">Verified Badged</span>
        </div>
      </div>

      {/* ── Ultra-Compact Active Broadcast Pills ── */}
      {messageModalUser === null && coopMessages.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#84cc16]/20 text-[#4d7c0f] shrink-0">
            Active Broadcasts ({coopMessages.length})
          </span>
          {coopMessages.map((m) => (
            <div
              key={m.id}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7fee7] border border-[#d9f99d] text-xs font-bold text-[#4d7c0f] shrink-0 shadow-2xs"
            >
              <span className="truncate max-w-[280px] sm:max-w-[360px]">
                {m.title}: {m.body}
              </span>
              <button
                type="button"
                onClick={() => deleteAnnouncement(m.id)}
                className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer ml-1 p-0.5 rounded-full hover:bg-red-50"
                title="Delete Announcement"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Split Screen 2-Column View or Full Table View ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── LEFT COLUMN: Worker Roster Table ── */}
        <div className="lg:col-span-12 space-y-3">
          
          {/* Search & Filters */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workers by name, skill, email..."
                className="w-full h-10 pl-9 pr-4 rounded-full border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium shrink-0">Showing {filtered.length}</span>
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="orvia-card p-6 space-y-3">
              {[0,1,2,3].map((i) => (
                <div key={i} className="animate-pulse h-12 bg-slate-100 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="orvia-card p-12 text-center space-y-3">
              <Users size={40} className="mx-auto text-slate-300" />
              <p className="text-base font-bold text-slate-700">No connected workers found</p>
              <p className="text-xs text-slate-400">Try adjusting your search query or add a new worker to your roster.</p>
            </div>
          ) : (
            <div className="orvia-card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Worker</th>
                      <th className="px-4 py-3">Skill</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((p, idx) => {
                      const isBlocked = blockedIds.includes(p._id);
                      const savedAvatar = localStorage.getItem("sg_provider_avatar");
                      const savedProfile = (() => { try { return JSON.parse(localStorage.getItem("sg_provider_profile") || "{}"); } catch { return {}; } })();
                      
                      const name = (nameMatch(p, "ramesh") && savedProfile.name) ? savedProfile.name : (p.userId?.name || p.name || "Worker Member");
                      const email = (nameMatch(p, "ramesh") && savedProfile.email) ? savedProfile.email : (p.userId?.email || p.email || "");
                      const phone = (nameMatch(p, "ramesh") && savedProfile.phone) ? savedProfile.phone : (p.userId?.phone || p.phone || "");
                      const isSelected = messageModalUser?._id === p._id;
                      
                      const avatarUrl = p.userId?.avatarUrl || p.avatarUrl || p.avatar || p.userId?.profileImage || p.profileImage || (nameMatch(p, "ramesh") ? savedAvatar : null);

                      return (
                        <tr
                          key={p._id}
                          onClick={() => {
                            const queryStr = new URLSearchParams({
                              id: p._id,
                              name,
                              email,
                              phone,
                              skill: (p.skills || ["Plumber"])[0],
                              coopId: p.cooperativeId?.name || "Karol Bagh Labour Cooperative",
                              role: "Provider",
                              verified: "true"
                            }).toString();
                            navigate(`/admin/providers/detail?${queryStr}`);
                          }}
                          className={`hover:bg-[#e6f4f1]/40 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-[#e6f4f1]/60 font-bold border-l-4 border-l-[#1e6b65]"
                              : isBlocked
                              ? "bg-red-50/20"
                              : ""
                          }`}
                        >
                          {/* Worker Info */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {/* Worker Avatar Photo or Initials Badge */}
                              <div className="relative w-9 h-9 shrink-0">
                                {avatarUrl && (
                                  <img
                                    src={avatarUrl}
                                    alt={name}
                                    className="w-9 h-9 rounded-full object-cover shrink-0 border-2 border-slate-100 shadow-2xs"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      const fallback = e.target.parentElement?.querySelector('.avatar-initials-badge');
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                )}
                                <div
                                  className={`avatar-initials-badge w-9 h-9 rounded-full items-center justify-center text-xs font-extrabold shadow-2xs ${
                                    isBlocked
                                      ? "bg-red-100 text-red-700 border border-red-200"
                                      : "bg-[#1e6b65] text-white"
                                  }`}
                                  style={{ display: avatarUrl ? 'none' : 'flex' }}
                                >
                                  {name.split(" ").map(n => n.charAt(0)).join("").substring(0, 2) || "WK"}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 truncate text-xs">{name}</p>
                                <p className="text-slate-400 font-medium text-[10.5px] truncate">{email}{phone ? ` • ${phone}` : ""}</p>
                              </div>
                            </div>
                          </td>

                          {/* Skill */}
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {(p.skills || ["Plumber"])[0]}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            {isBlocked ? (
                              <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[10px] font-extrabold border border-red-200 dark:border-red-800">
                                Blocked ✕
                              </span>
                            ) : (p.status === "invited" || (p.verified === false && !p.accountCreated)) ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold border border-amber-200 dark:border-amber-800 flex items-center gap-1 w-fit">
                                Invited ✉️
                              </span>
                            ) : (p.status === "pending" || (p.verified === false && p.accountCreated)) ? (
                              <span className="px-2.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 text-[10px] font-extrabold border border-cyan-200 dark:border-cyan-800 flex items-center gap-1 w-fit">
                                Verification Pending ⏳
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-[#f7fee7] dark:bg-emerald-950/60 text-[#4d7c0f] dark:text-emerald-300 text-[10px] font-extrabold border border-[#d9f99d] dark:border-emerald-800 flex items-center gap-1 w-fit">
                                Active ✓
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {/* Quick Verify & Activate Button for Invited / Pending Workers */}
                              {(p.status === "invited" || p.status === "pending" || p.verified === false) && !isBlocked && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItems(prev => prev.map(item => item._id === p._id ? { ...item, verified: true, accountCreated: true, status: "active" } : item));
                                    showToast(`✅ ${name} verified & activated on agency roster!`);
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-[10.5px] font-extrabold hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title="Approve verification and activate worker on agency roster"
                                >
                                  <CheckCircle2 size={12} />
                                  <span>Verify Worker</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  const queryStr = new URLSearchParams({
                                    id: p._id,
                                    name,
                                    email,
                                    phone,
                                    skill: (p.skills || ["Plumber"])[0],
                                    coopId: p.cooperativeId?.name || "Karol Bagh Labour Cooperative",
                                    role: "Provider",
                                    verified: "true"
                                  }).toString();
                                  navigate(`/admin/providers/detail?${queryStr}`);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-[#e6f4f1] text-[#145e58] text-[11px] font-extrabold hover:bg-[#1e6b65] hover:text-white transition-all cursor-pointer flex items-center gap-1 border border-[#1e6b65]/20 shadow-2xs"
                                title="Open Dedicated Complex Grid Worker Console Page"
                              >
                                <span>Full Console</span>
                                <ExternalLink size={12} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setMessageModalUser(p)}
                                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-[#1e6b65] text-white"
                                    : "bg-slate-100 hover:bg-[#e6f4f1] text-slate-600 hover:text-[#145e58]"
                                }`}
                                title="Quick Alert Message"
                              >
                                <MessageSquare size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleBlockWorker(p._id, name)}
                                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                                  isBlocked
                                    ? "bg-[#f7fee7] text-[#4d7c0f]"
                                    : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                                }`}
                                title={isBlocked ? "Unblock Worker" : "Block Worker"}
                              >
                                <Ban size={14} />
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
          )}
        </div>

        {/* ── CENTERED POPUP MODAL: Messaging & Worker Profile Hub ── */}
        {messageModalUser !== null && (
          <div className="fixed inset-0 z-[999999] bg-slate-900/80 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 relative my-auto max-h-[90vh] overflow-y-auto">

            {/* Split Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                {messageModalUser !== "ALL" ? (
                  (() => {
                    const panelImg = messageModalUser?.userId?.avatarUrl || messageModalUser?.avatarUrl || messageModalUser?.avatar || (nameMatch(messageModalUser, "ramesh") ? localStorage.getItem("sg_provider_avatar") : null);
                    const workerName = messageModalUser?.userId?.name || messageModalUser?.name || "Worker";
                    return panelImg ? (
                      <img
                        src={panelImg}
                        alt={workerName}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-[#1e6b65] shadow-xs"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#1e6b65] text-white flex items-center justify-center text-sm font-extrabold shrink-0">
                        {workerName.charAt(0)}
                      </div>
                    );
                  })()
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#1e6b65] text-white flex items-center justify-center font-bold shrink-0">
                    <Megaphone size={18} />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900 truncate">
                    {messageModalUser === "ALL"
                      ? "📢 Broadcast Alert to All Workers"
                      : `${messageModalUser?.userId?.name || "Ramesh Kumar"}`}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {messageModalUser === "ALL"
                      ? "Posts high-priority announcement to top Marquee Ticker & all worker inboxes"
                      : `${messageModalUser?.userId?.email || "worker@agency.com"} • ${messageModalUser?.userId?.phone || "+91 98765 12345"}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMessageModalUser(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="Close Worker Profile Panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* If Individual Worker Selected: Rich Worker Profile Details & Performance Stats */}
            {messageModalUser !== "ALL" && (
              <div className="space-y-3 pb-2 border-b border-slate-100">
                {/* Credentials & Badge Grid */}
                <div className="grid grid-cols-2 gap-2 bg-[#e6f4f1]/50 p-3 rounded-2xl border border-[#1e6b65]/15 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-[#145e58] uppercase tracking-wider block">e-Shram National ID</span>
                    <span className="font-extrabold text-slate-900">{messageModalUser?.eshramCardNo || "IN-ES-0000000123"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#145e58] uppercase tracking-wider block">Coop License No</span>
                    <span className="font-extrabold text-slate-900">{messageModalUser?.licenseNo || "DL/COO/2024/001"}</span>
                  </div>
                </div>

                {/* Performance Stats Cards */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Earned</span>
                    <p className="text-sm font-extrabold text-[#4d7c0f]">₹{messageModalUser?.totalEarnings || 12450}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Completed</span>
                    <p className="text-sm font-extrabold text-slate-900">{messageModalUser?.completedJobs || 18} Jobs</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Trust Score</span>
                    <p className="text-sm font-extrabold text-[#145e58]">⭐ {messageModalUser?.trustScore || 4.9}</p>
                  </div>
                </div>

                {/* Skill Badges & Hourly Rate */}
                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500">Skills:</span>
                    {(messageModalUser?.skills || ["Plumber", "Electrician"]).map((s) => (
                      <span key={s} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10.5px]">
                        {s}
                      </span>
                    ))}
                  </div>
                  <span className="font-black text-slate-900 bg-[#f7fee7] text-[#4d7c0f] px-2.5 py-0.5 rounded-full border border-[#d9f99d] text-[11px]">
                    ₹{messageModalUser?.hourlyRate || 300}/hr
                  </span>
                </div>

                {/* Recent Job Dispatches assigned to this worker */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    Recent Job Dispatches & Service Record
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                      <div>
                        <p className="font-extrabold text-slate-900">⚡ Emergency Electrical Repair</p>
                        <p className="text-slate-400 text-[10px]">Client: Anita Sharma • Karol Bagh</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-[#4d7c0f]">₹650</span>
                        <span className="block text-[9.5px] text-[#65a30d] font-bold">✓ Completed</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                      <div>
                        <p className="font-extrabold text-slate-900">💧 Pipe Leakage & Valve Fix</p>
                        <p className="text-slate-400 text-[10px]">Client: Rajesh Verma • Connaught Place</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-[#4d7c0f]">₹450</span>
                        <span className="block text-[9.5px] text-[#65a30d] font-bold">✓ Completed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: Active Agency Broadcasts with Delete Button (If Broadcast Mode) */}
            {messageModalUser === "ALL" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Active Agency Broadcasts ({coopMessages.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">1-Click Remove / Cancel</span>
                </div>

                {coopMessages.length === 0 ? (
                  <div className="p-4 text-center rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">No active broadcasts currently running.</p>
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {coopMessages.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9.5px] font-extrabold px-2 py-0.2 rounded-full bg-[#84cc16]/20 text-[#4d7c0f] uppercase">
                              {m.type || "Broadcast"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{m.timestamp}</span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 truncate">{m.title}</h4>
                          <p className="text-[11px] text-slate-600 line-clamp-1 leading-snug">{m.body}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteAnnouncement(m.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer shrink-0"
                          title="Delete / Cancel this Announcement"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section 2: Compose & Send Message Form */}
            <form onSubmit={handleSendMessage} className="space-y-3 pt-2 border-t border-slate-100">
              {messageModalUser === "ALL" && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Alert Category
                    </label>
                    <select
                      value={messageType}
                      onChange={(e) => setMessageType(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white"
                    >
                      <option value="announcement">📢 General Agency Announcement</option>
                      <option value="urgent">🚨 Urgent Dispatch & High Demand Alert</option>
                      <option value="bonus">🎁 Bonus Payout Incentive</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Display Duration (Top Marquee Ticker)
                    </label>
                    <select
                      value={durationMins}
                      onChange={(e) => setDurationMins(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white"
                    >
                      <option value="5">⏱️ 5 Minutes Active Duration</option>
                      <option value="15">⏱️ 15 Minutes Active Duration</option>
                      <option value="30">⏱️ 30 Minutes Active Duration</option>
                      <option value="60">⏱️ 1 Hour Active Duration</option>
                      <option value="1440">⏱️ 24 Hours Active Duration</option>
                      <option value="0">♾️ Permanent Announcement</option>
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  {messageModalUser === "ALL" ? "Broadcast Message Details" : `Direct Message for ${messageModalUser?.userId?.name || "Worker"}`}
                </label>
                <textarea
                  id="broadcast_message_textarea"
                  rows={3}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={
                    messageModalUser === "ALL"
                      ? "Type urgent dispatch announcement or agency bulletin..."
                      : `Type a direct message or work instruction for ${messageModalUser?.userId?.name || "Worker"}...`
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white leading-relaxed resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMessageModalUser(null)}
                  className="px-3.5 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Close Panel
                </button>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="orvia-btn-primary cursor-pointer text-xs py-2 px-5"
                >
                  <Send size={14} />
                  <span>{messageModalUser === "ALL" ? "Send Public Broadcast" : "Send Direct Message"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>

      {/* ── Add New Worker Modal ── */}
      {addWorkerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md orvia-card p-6 space-y-4 animate-alert-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#f7fee7] text-[#4d7c0f] flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Add Worker to Agency</h3>
                  <p className="text-[11px] text-slate-400">Connect a new provider to your cooperative agency roster</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddWorkerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewWorker} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Worker Full Name
                </label>
                <input
                  type="text"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  placeholder="e.g. Vikram Singh"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newWorkerEmail}
                  onChange={(e) => setNewWorkerEmail(e.target.value)}
                  placeholder="e.g. vikram.worker@gmail.com"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newWorkerPhone}
                    onChange={(e) => setNewWorkerPhone(e.target.value)}
                    placeholder="+91 98112 44556"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Skill Category
                  </label>
                  <select
                    value={newWorkerSkill}
                    onChange={(e) => setNewWorkerSkill(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                  >
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="AC Repair">AC Repair</option>
                    <option value="Painter">Painter</option>
                    <option value="Cleaning">Cleaning</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Hourly Rate (₹/hr)
                </label>
                <input
                  type="number"
                  value={newWorkerRate}
                  onChange={(e) => setNewWorkerRate(e.target.value)}
                  placeholder="350"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddWorkerModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="orvia-btn-primary text-xs py-2 px-5 cursor-pointer flex items-center gap-1.5"
                >
                  <Mail size={14} />
                  <span>Send Invite to Worker ✉️</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
