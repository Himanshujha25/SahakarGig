import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import {
  Search, Users, Trophy, MessageSquare, Ban, CheckCircle2,
  Trash2, UserPlus, Megaphone, X, Send, ShieldAlert, AlertTriangle,
  Phone, Mail, Plus, ShieldCheck, Clock, ExternalLink, Copy,
  Building2, Briefcase, DollarSign, UserCheck
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
      showToast(`Worker ${workerName || ""} suspended. Job dispatch alerts disabled.`);
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
    const handleStorage = () => {
      loadCoopMessages();
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
    showToast("Announcement alert removed.");
  }

  // Remove Worker from Agency
  async function removeWorker(providerId, workerName) {
    if (window.confirm(`Are you sure you want to remove ${workerName || "this worker"} from your cooperative roster?`)) {
      try {
        await api.delete(`/admin/members/${providerId}`);
      } catch {}
      setItems((prev) => prev.filter((p) => p._id !== providerId));
      showToast(`Worker ${workerName || ""} removed from cooperative roster.`);
    }
  }

  // Handle Send Message or Broadcast Alert
  function handleSendMessage(e) {
    if (e && e.preventDefault) e.preventDefault();
    const textValue = (messageText || "").trim();

    if (!textValue) {
      showToast("Please type a message before sending!");
      return;
    }

    const isBroadcast = messageModalUser === "ALL";
    const recipient = isBroadcast
      ? "All Connected Cooperative Members"
      : messageModalUser?.userId?.name || "Worker";

    const durationMinsNum = isBroadcast ? (parseInt(durationMins, 10) || 0) : 0;
    const expiresAt = (isBroadcast && durationMinsNum > 0) ? Date.now() + durationMinsNum * 60 * 1000 : null;

    const msgObj = {
      id: "msg_" + Date.now(),
      sender: "Karol Bagh Labour Cooperative Society",
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

    const existingMsgs = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]");
    localStorage.setItem("sg_coop_messages", JSON.stringify([msgObj, ...existingMsgs]));
    
    // Also save to admin notices if broadcast
    if (isBroadcast) {
      api.post('/admin/notices', {
        title: msgObj.title,
        content: textValue,
        category: messageType === 'urgent' ? 'Urgent' : messageType === 'bonus' ? 'Incentive' : 'General',
        priority: messageType === 'urgent' ? 'Urgent' : 'Normal',
      }).catch(() => {});
    }

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("coop_message_updated"));
    try {
      socket.emit("notification", msgObj);
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
      userId: {
        name,
        email,
        phone,
      },
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
    <div className="w-full max-w-7xl mx-auto px-6 pt-6 pb-20 space-y-6 text-slate-900 font-sans">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-[99999] px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── HEADER & ACTIONS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Cooperative Member Workforce
            </h1>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-[#00288e] border border-blue-200 text-xs font-bold flex items-center gap-1">
              <Users size={13} />
              {totalCount} Connected Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your cooperative member roster, broadcast emergency notices, inspect credentials, and manage welfare enrolments.
          </p>
        </div>

        {/* Top Action CTAs in Primary Blue */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setMessageModalUser("ALL")}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Megaphone size={14} className="text-[#00288e]" />
            <span>Broadcast Notice to All</span>
          </button>

          <button
            type="button"
            onClick={() => setAddWorkerModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            <UserPlus size={14} />
            <span>Add New Worker</span>
          </button>
        </div>
      </div>

      {/* ── 4 KPI STAT TILES (Blue Aligned) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Members</p>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#00288e] flex items-center justify-center font-bold">
              <Users size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalCount}</p>
          <p className="text-[11px] font-semibold text-slate-500">Registered in Society</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Workers</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <UserCheck size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{activeCount}</p>
          <p className="text-[11px] font-bold text-emerald-700">Receiving Dispatch Alerts</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Suspended</p>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
              <Ban size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{blockedCount}</p>
          <p className="text-[11px] font-semibold text-rose-600">Alerts Paused</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Verified Badged</p>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <ShieldCheck size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{verifiedCount}</p>
          <p className="text-[11px] font-semibold text-amber-700">Cooperative Badged</p>
        </div>
      </div>

      {/* ── Active Broadcast Announcements Bar ── */}
      {coopMessages.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-blue-50 text-[#00288e] border border-blue-200 shrink-0">
            Active Broadcasts ({coopMessages.length})
          </span>
          {coopMessages.map((m) => (
            <div
              key={m.id}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 shrink-0 shadow-2xs"
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

      {/* ── SEARCH & TABLE CONTAINER ── */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search member workers by name, skill, email..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all shadow-2xs"
            />
          </div>
          <span className="text-xs text-slate-400 font-bold shrink-0">Showing {filtered.length} members</span>
        </div>

        {/* Member Table Card */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-2xs">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-12 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-2xs">
            <Users size={40} className="mx-auto text-slate-300" />
            <p className="text-base font-bold text-slate-800">No member workers found</p>
            <p className="text-xs text-slate-400">Try adjusting your search query or register a new member.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-5 py-3.5">Worker Member</th>
                    <th className="px-5 py-3.5">Trade Skill</th>
                    <th className="px-5 py-3.5">Hourly Rate</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
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
                      <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#00288e] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border-2 border-slate-100">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 hover:text-[#00288e] cursor-pointer" onClick={() => navigate(detailUrl)}>
                                {name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {email || phone || "Member"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-[#00288e] font-bold text-[11px] border border-blue-100">
                            {skill}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 font-bold text-emerald-700">
                          ₹{rate}/hr
                        </td>

                        <td className="px-5 py-3.5">
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
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
                              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#00288e] transition-all cursor-pointer shadow-2xs"
                              title="Inspect Full Worker Profile & Service Ledger"
                            >
                              <ExternalLink size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setMessageModalUser(p)}
                              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#00288e] transition-all cursor-pointer shadow-2xs"
                              title="Send Direct Admin Notice"
                            >
                              <MessageSquare size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleBlockWorker(p._id, name)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                                isBlocked
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
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
        )}
      </div>

      {/* ── MODAL 1: ADD NEW WORKER ── */}
      {addWorkerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setAddWorkerModalOpen(false)}>
          <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00288e] text-white flex items-center justify-center font-bold">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Register New Member Worker</h2>
                  <p className="text-xs text-slate-500">Add to cooperative workforce roster</p>
                </div>
              </div>
              <button onClick={() => setAddWorkerModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewWorker} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. suresh.worker@gmail.com"
                  value={newWorkerEmail}
                  onChange={(e) => setNewWorkerEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mobile Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98112 44556"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Primary Skill</label>
                  <select
                    value={newWorkerSkill}
                    onChange={(e) => setNewWorkerSkill(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
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
                  <label className="font-bold text-slate-700">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={newWorkerRate}
                    onChange={(e) => setNewWorkerRate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddWorkerModalOpen(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer"
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
          <div className="w-full max-w-lg bg-white text-slate-900 rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00288e] text-white flex items-center justify-center font-bold">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {messageModalUser === "ALL" ? "Broadcast Notice to All Workers" : `Send Direct Message: ${messageModalUser?.userId?.name || "Worker"}`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {messageModalUser === "ALL" ? "Broadcasts instant push notification to all member devices" : "Private admin instruction"}
                  </p>
                </div>
              </div>
              <button onClick={() => setMessageModalUser(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {messageModalUser === "ALL" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Notice Category</label>
                    <select
                      value={messageType}
                      onChange={(e) => setMessageType(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                    >
                      <option value="announcement">📢 General Announcement</option>
                      <option value="urgent">🚨 Urgent Dispatch Alert</option>
                      <option value="bonus">🎁 Incentive / Bonus Pay</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Display Duration</label>
                    <select
                      value={durationMins}
                      onChange={(e) => setDurationMins(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
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
                <label className="font-bold text-slate-700">Notice Content</label>
                <textarea
                  id="broadcast_message_textarea"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={3}
                  placeholder="Type official notice, safety advisory, or surge dispatch instruction..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setMessageModalUser(null)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="px-6 py-2.5 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer flex items-center gap-1.5"
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
