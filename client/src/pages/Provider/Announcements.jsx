import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
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

  useEffect(() => {
    loadMessages();
    const handleStorage = () => loadMessages();
    const interval = setInterval(loadMessages, 1500);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("coop_message_updated", handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("coop_message_updated", handleStorage);
    };
  }, []);

  function loadMessages() {
    let stored = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]");
    
    // Seed default dynamic messages if empty
    if (!stored || stored.length === 0) {
      stored = [
        {
          id: "msg_default_1",
          sender: "Karol Bagh Labour Cooperative",
          senderRole: "Cooperative Admin",
          recipient: "All Connected Agency Workers",
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

  function handleSendMessage(e) {
    e.preventDefault();
    if (!body.trim()) return;

    setSending(true);
    setTimeout(() => {
      const newMsg = {
        id: "msg_" + Date.now(),
        sender: user?.name || "Ramesh Kumar",
        senderRole: "Agency Worker",
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
    }, 500);
  }

  const filtered = messages.filter((m) => {
    const isAnn = m.type === "urgent" || m.type === "bonus" || m.type === "announcement" || m.recipientId === "ALL" || (m.recipient && m.recipient.toLowerCase().includes("all"));
    const isDir = m.type === "direct" || m.isOutgoing || (m.recipientEmail && m.recipientEmail.toLowerCase() === (user?.email || "").toLowerCase()) || (m.recipient && m.recipient.toLowerCase().includes("ramesh"));

    const matchesTab = tab === "announcements" ? isAnn : isDir;
    
    const matchesSearch = !search.trim() ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.body.toLowerCase().includes(search.toLowerCase()) ||
      m.sender.toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-12 space-y-4">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Agency Announcements & Messaging
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Read broadcast alerts from your Cooperative Society or send direct messages to administrators & customers.
          </p>
        </div>

        <button
          onClick={() => setComposeOpen(true)}
          className="orvia-btn-primary cursor-pointer text-xs py-2.5 px-4 self-start sm:self-auto shrink-0"
        >
          <Plus size={16} />
          <span>Send Message / Inquiry</span>
        </button>
      </div>

      {/* ── Tabs & Search Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Orvia Pill Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setTab("announcements")}
            className={tab === "announcements" ? "orvia-pill-selected inline-flex items-center gap-1.5 text-xs py-1.5 px-4 cursor-pointer" : "orvia-pill-unselected inline-flex items-center gap-1.5 text-xs py-1.5 px-4 cursor-pointer"}
          >
            <Megaphone size={14} />
            <span>Cooperative Announcements</span>
            <span className="ml-1 px-1.5 py-0.2 text-[10px] font-extrabold rounded-full bg-[#84cc16] text-slate-950">
              {messages.filter(m => m.type === "urgent" || m.type === "bonus" || m.type === "announcement" || m.recipientId === "ALL" || (m.recipient && m.recipient.toLowerCase().includes("all"))).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("direct")}
            className={tab === "direct" ? "orvia-pill-selected inline-flex items-center gap-1.5 text-xs py-1.5 px-4 cursor-pointer" : "orvia-pill-unselected inline-flex items-center gap-1.5 text-xs py-1.5 px-4 cursor-pointer"}
          >
            <MessageSquare size={14} />
            <span>Direct Messages</span>
            <span className="ml-1 px-1.5 py-0.2 text-[10px] font-extrabold rounded-full bg-slate-700 text-white">
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
            className="w-full h-9 pl-9 pr-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ── Messages Feed List ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="orvia-card p-12 text-center space-y-2">
            <Building2 size={36} className="mx-auto text-slate-300" />
            <h3 className="text-sm font-extrabold text-slate-700">No messages found</h3>
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
              className={`orvia-card p-5 space-y-2.5 transition-all hover:shadow-md ${
                m.type === "urgent"
                  ? "border-l-4 border-l-red-500 bg-red-50/20"
                  : m.type === "bonus"
                  ? "border-l-4 border-l-[#84cc16] bg-[#f7fee7]/40"
                  : m.isOutgoing
                  ? "border-l-4 border-l-[#1e6b65] bg-slate-50/60"
                  : "border-l-4 border-l-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    m.type === "urgent"
                      ? "bg-red-100 text-red-800"
                      : m.type === "bonus"
                      ? "bg-[#84cc16]/20 text-[#4d7c0f]"
                      : m.isOutgoing
                      ? "bg-[#e6f4f1] text-[#145e58]"
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
                <h3 className="text-sm font-extrabold text-slate-900 leading-tight">{m.title}</h3>
                <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                  {m.body}
                </p>
              </div>

              {!m.isOutgoing && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => {
                      setRecipient(m.sender);
                      setSubject(`Re: ${m.title}`);
                      setComposeOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e6b65] hover:underline cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Reply to {m.sender.split(" ")[0]}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Compose Message Modal ── */}
      {composeOpen && (
        <div
          className="fixed inset-0 z-[99999] bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-alert-in"
          onClick={() => setComposeOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#1e6b65] text-white flex items-center justify-center">
                  <Send size={16} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Compose Direct Message</h3>
                  <p className="text-xs text-slate-500">Send an inquiry or update to cooperative admin or customer.</p>
                </div>
              </div>
              <button
                onClick={() => setComposeOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {sendSuccess && (
              <div className="p-3 rounded-2xl bg-[#f7fee7] border border-[#d9f99d] text-[#4d7c0f] text-xs font-bold flex items-center gap-2 animate-alert-in">
                <CheckCircle2 size={16} className="text-[#65a30d]" />
                <span>Message sent successfully to {recipient}!</span>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Recipient
                </label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white"
                >
                  <option value="Karol Bagh Labour Cooperative Admin">🏢 Karol Bagh Labour Cooperative Admin</option>
                  <option value="Anita Sharma (Household Customer)">👤 Anita Sharma (Household Customer)</option>
                  <option value="Sahakar Platform Support">🛡️ Sahakar Platform Support</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Schedule adjustment or payout query"
                  className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Message Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Write your message details here..."
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white leading-relaxed"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="orvia-btn-primary cursor-pointer text-xs py-2 px-5 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{sending ? "Sending…" : "Send Message"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
