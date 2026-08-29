import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import {
  Megaphone, MessageSquare, Send, Search, CheckCircle2, Clock,
  Building2, User, Plus, Filter, ShieldCheck, Sparkles, X, ChevronRight, Mail
} from "lucide-react";

export default function ProviderAnnouncements() {
  const { user } = useAuth();
  const [tab, setTab] = useState("announcements"); // "announcements" | "direct"
  const [search, setSearch] = useState("");

  const [messages, setMessages] = useState([]);
  const [composeOpen, setComposeOpen] = useState(false);

  // Form state for sending a new message
  const [recipient, setRecipient] = useState("Cooperative Admin");
  const [subject, setSubject]     = useState("");
  const [body, setBody]           = useState("");
  const [sending, setSending]     = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  async function loadMessages() {
    let stored = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]");
    
    // Also try fetching server notices
    try {
      const { data } = await api.get("/admin/notices");
      if (data && Array.isArray(data.notices)) {
        const serverNotices = data.notices.map((n) => ({
          id: n._id || "srv_" + Math.random(),
          sender: "Karol Bagh Labour Cooperative Society",
          senderRole: "Cooperative Admin",
          recipient: "All Connected Cooperative Members",
          recipientId: "ALL",
          title: n.title,
          body: n.content,
          timestamp: new Date(n.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(n.createdAt || Date.now()).toLocaleDateString(),
          type: n.priority === 'Urgent' ? 'urgent' : 'announcement',
          read: false,
        }));

        // Merge without duplicating IDs or identical titles
        const existingTitles = new Set(stored.map((s) => (s.title + s.body).toLowerCase()));
        for (const sn of serverNotices) {
          if (!existingTitles.has((sn.title + sn.body).toLowerCase())) {
            stored.unshift(sn);
          }
        }
      }
    } catch {}

    // Seed default dynamic messages if empty
    if (!stored || stored.length === 0) {
      stored = [
        {
          id: "msg_default_1",
          sender: "Karol Bagh Labour Cooperative Society",
          senderRole: "Cooperative Admin",
          recipient: "All Connected Cooperative Members",
          recipientId: "ALL",
          title: "📢 Official Cooperative Notice: PMSBY Social Security Shield",
          body: "All registered gig worker members of Karol Bagh Labour Cooperative are fully covered under the Pradhan Mantri Suraksha Bima Yojana (PMSBY) insurance shield. Escrow reserve payouts operate normally every Friday at 5:00 PM.",
          timestamp: "10:30 AM",
          date: new Date().toLocaleDateString(),
          type: "announcement",
          read: false
        },
        {
          id: "msg_default_2",
          sender: "Suresh Patel (Cooperative Admin)",
          senderRole: "Cooperative Admin",
          recipient: user?.name || "Ramesh Kumar",
          recipientEmail: user?.email || "plumber.test@gmail.com",
          title: "💬 Direct Dispatch Alert: High Priority Commercial Booking",
          body: "Namaste Ramesh! We have assigned an institutional plumbing dispatch for Connaught Place commercial office building. Base pay is ₹650 with 85% net worker escrow release.",
          timestamp: "09:15 AM",
          date: new Date().toLocaleDateString(),
          type: "direct",
          read: false
        }
      ];
      localStorage.setItem("sg_coop_messages", JSON.stringify(stored));
    }

    setMessages(stored);
  }

  useEffect(() => {
    loadMessages();
    const handleStorage = () => loadMessages();
    const interval = setInterval(loadMessages, 2000);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("coop_message_updated", handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("coop_message_updated", handleStorage);
    };
  }, []);

  function handleSendMessage(e) {
    e.preventDefault();
    if (!body.trim()) return;

    setSending(true);
    setTimeout(() => {
      const newMsg = {
        id: "msg_" + Date.now(),
        sender: user?.name || "Ramesh Kumar",
        senderRole: "Member Worker",
        recipient: recipient,
        title: subject || `Direct Message to ${recipient}`,
        body: body,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
        type: "direct",
        read: true,
        isOutgoing: true
      };

      const updated = [newMsg, ...messages];
      setMessages(updated);
      localStorage.setItem("sg_coop_messages", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("coop_message_updated"));

      setSending(false);
      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        setComposeOpen(false);
        setSubject("");
        setBody("");
      }, 1200);
    }, 400);
  }

  const filtered = messages.filter((m) => {
    const isAnn = m.type === "urgent" || m.type === "bonus" || m.type === "announcement" || m.recipientId === "ALL" || (m.recipient && m.recipient.toLowerCase().includes("all"));
    const isDir = m.type === "direct" || m.isOutgoing || (m.recipientEmail && m.recipientEmail.toLowerCase() === (user?.email || "").toLowerCase()) || (m.recipient && m.recipient.toLowerCase().includes("ramesh"));

    const matchesTab = tab === "announcements" ? isAnn : isDir;
    
    const matchesSearch = !search.trim() ||
      (m.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.body || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.sender || "").toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-16 space-y-5 text-slate-900 font-sans">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Cooperative Announcements &amp; Notices
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Read broadcast alerts from your Cooperative Society or send direct inquiries to administrators.
          </p>
        </div>

        <button
          onClick={() => setComposeOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md self-start sm:self-auto shrink-0"
        >
          <Plus size={15} />
          <span>Send Message / Inquiry</span>
        </button>
      </div>

      {/* ── Tabs & Search Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setTab("announcements")}
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all ${
              tab === "announcements"
                ? "bg-[#00288e] text-white shadow-2xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Megaphone size={14} />
            <span>Cooperative Announcements</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${tab === "announcements" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-800"}`}>
              {messages.filter(m => m.type === "urgent" || m.type === "bonus" || m.type === "announcement" || m.recipientId === "ALL" || (m.recipient && m.recipient.toLowerCase().includes("all"))).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("direct")}
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all ${
              tab === "direct"
                ? "bg-[#00288e] text-white shadow-2xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <MessageSquare size={14} />
            <span>Direct Messages</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${tab === "direct" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-800"}`}>
              {messages.filter(m => m.type === "direct" || m.isOutgoing || (m.recipientEmail && m.recipientEmail.toLowerCase() === (user?.email || "").toLowerCase()) || (m.recipient && m.recipient.toLowerCase().includes("ramesh"))).length}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-all placeholder:text-slate-400 shadow-2xs"
          />
        </div>
      </div>

      {/* ── Messages Feed List ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-2 shadow-2xs">
            <Building2 size={36} className="mx-auto text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No messages found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {tab === "announcements"
                ? "No broadcast announcements posted by your cooperative society yet."
                : "You don't have any direct message conversations yet. Click 'Send Message' to compose one!"}
            </p>
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl border bg-white p-5 space-y-2.5 transition-all shadow-2xs ${
                m.type === "urgent"
                  ? "border-l-4 border-l-rose-500 bg-rose-50/20 border-slate-200"
                  : m.type === "bonus"
                  ? "border-l-4 border-l-emerald-500 bg-emerald-50/20 border-slate-200"
                  : m.isOutgoing
                  ? "border-l-4 border-l-[#00288e] bg-slate-50/40 border-slate-200"
                  : "border-l-4 border-l-[#00288e] border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    m.type === "urgent"
                      ? "bg-rose-100 text-rose-800"
                      : m.type === "bonus"
                      ? "bg-emerald-100 text-emerald-800"
                      : m.isOutgoing
                      ? "bg-blue-50 text-[#00288e]"
                      : "bg-slate-100 text-slate-800"
                  }`}>
                    {m.isOutgoing ? `To: ${m.recipient}` : `From: ${m.sender}`}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {m.timestamp} · {m.date}
                  </span>
                </div>

                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Clock size={12} /> {m.isOutgoing ? "Sent" : "Received"}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">{m.title}</h3>
                <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                  {m.body}
                </p>
              </div>

              {!m.isOutgoing && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => {
                      setRecipient(m.sender || "Cooperative Admin");
                      setSubject(`Re: ${m.title}`);
                      setComposeOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#00288e] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Send size={11} /> Reply to {m.sender?.split(" ")[0] || "Admin"}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── COMPOSE MESSAGE MODAL ── */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setComposeOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#00288e] flex items-center justify-center font-bold">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Send Direct Message / Inquiry</h3>
                  <p className="text-[11px] text-slate-400">Direct channel to your Cooperative Administrator</p>
                </div>
              </div>
              <button onClick={() => setComposeOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Recipient</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Inquiry regarding Tool Subsidy Claim..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type your inquiry, grievance, or message here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  className="px-6 py-2 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {sendSuccess ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Sent!</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>{sending ? "Sending..." : "Send Message"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
