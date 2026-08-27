import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Bot, X, Send, Mic, Zap, ArrowRight, RefreshCw, MessageSquare, Building2 } from "lucide-react";

const KNOWLEDGE_BASE = [
  {
    triggers: ["electric", "light", "bijli", "current", "power", "switch", "line", "chali", "nhi", "elctric", "बिजली"],
    reply: "Electrical issue detected! Our Geospatial Broadcast system can alert nearby certified cooperative electricians in your locality immediately.",
    actionCategory: "Electrician",
    isEmergency: true,
  },
  {
    triggers: ["pipe", "leak", "paani", "water", "tap", "flush", "drain", "sink", "पानी", "पाइप"],
    reply: "Water leakage or plumbing emergency detected! I can broadcast your request to verified cooperative plumbers right now.",
    actionCategory: "Plumber",
    isEmergency: false,
  },
  {
    triggers: ["escrow", "payment", "razorpay", "paisa", "fee", "cost"],
    reply: "SahakarGig holds your funds safely in Razorpay Escrow. No money is charged until a worker accepts your broadcast job request!",
    actionCategory: null,
  },
  {
    triggers: ["eshram", "uan", "welfare", "pmsby", "insurance"],
    reply: "All providers on SahakarGig are verified against official government e-Shram UAN and PMSBY insurance databases for 100% security.",
    actionCategory: null,
  },
  {
    triggers: ["tutor", "study", "math", "teacher", "padhai", "पढ़ाई"],
    reply: "Need a qualified home tutor? We have verified educational cooperatives ready for home or online coaching.",
    actionCategory: "Tutor",
    isEmergency: false,
  },
];

export default function AIChatbot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Namaste! 🙏 I am Sahakar Assistant, your official cooperative service guide. How can I help you today?",
      actionCategory: null,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function handleSend(userText) {
    const query = userText || input;
    if (!query || !query.trim()) return;

    const userMsg = { sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!userText) setInput("");
    setIsTyping(true);

    try {
      const { data } = await api.post("/ai/chat", { message: query });
      const aiMsg = {
        sender: "ai",
        text: data.reply || `I processed your request "${query}". Sahakar Assistant can auto-broadcast your request to nearby verified cooperative workers.`,
        actionCategory: data.actionCategory,
        isEmergency: !!data.isEmergency,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const lower = query.toLowerCase();
      let matchedKb = KNOWLEDGE_BASE.find((kb) =>
        kb.triggers.some((trig) => lower.includes(trig))
      );
      const aiMsg = {
        sender: "ai",
        text: matchedKb ? matchedKb.reply : `Namaste! I processed "${query}". Sahakar Assistant can auto-broadcast your request to nearby verified cooperative workers.`,
        actionCategory: matchedKb ? matchedKb.actionCategory : (lower.includes("electric") ? "Electrician" : null),
        isEmergency: matchedKb ? matchedKb.isEmergency : false,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "hi-IN";
        rec.onstart = () => setIsMicActive(true);
        rec.onresult = (e) => {
          const spoken = e.results[0][0].transcript;
          setInput(spoken);
          handleSend(spoken);
          setIsMicActive(false);
        };
        rec.onerror = () => setIsMicActive(false);
        rec.onend = () => setIsMicActive(false);
        rec.start();
        return;
      } catch {}
    }

    setIsMicActive(false);
  }

  function triggerDispatch(cat, emergency) {
    setIsOpen(false);
    navigate(`/household/dispatch?category=${encodeURIComponent(cat)}&emergency=${emergency ? "true" : "false"}`);
  }

  return (
    <>
      {/* Official Institutional Floating Support Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-full bg-[#00288e] text-white shadow-[0_8px_24px_rgba(0,40,142,0.28)] hover:bg-[#173bab] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-[#c4c5d5]/40"
        >
          <Building2 size={18} className="text-white" />
          <span className="text-[13.5px] font-bold tracking-tight">Sahakar Support</span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] sm:w-[400px] h-[520px] rounded-3xl border border-[#c4c5d5]/80 bg-white text-[#0d1c2e] shadow-[0_20px_50px_rgba(0,40,142,0.20)] flex flex-col overflow-hidden animate-fadeIn">
          {/* Drawer Header */}
          <div className="p-4 px-5 bg-[#00288e] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center border border-white/20">
                <Building2 size={19} className="text-white" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold leading-tight" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                  Sahakar Assistant
                </h3>
                <p className="text-[11px] text-white/80">Ministry of Cooperation Guide</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#f8f9ff]">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-[13px] leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#00288e] text-white rounded-br-none shadow-xs font-medium"
                      : "bg-white text-[#0d1c2e] border border-[#c4c5d5]/60 rounded-bl-none shadow-xs"
                  }`}
                >
                  {msg.text}
                </div>

                {/* AI Action Dispatch Button */}
                {msg.sender === "ai" && msg.actionCategory && (
                  <button
                    type="button"
                    onClick={() => triggerDispatch(msg.actionCategory, msg.isEmergency)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00288e] text-white text-[12px] font-bold shadow-xs hover:bg-[#173bab] transition-all cursor-pointer"
                  >
                    <Zap size={13} fill="currentColor" />
                    <span>Auto-Broadcast {msg.actionCategory} Request</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-[#c4c5d5]/60 text-[12px] text-[#757684] w-fit">
                <RefreshCw size={13} className="animate-spin text-[#00288e]" />
                <span>Processing query…</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-white border-t border-[#c4c5d5]/50 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
            {[
              "⚡ Mere ghar me electric nahi hai",
              "💧 Pipe leak ho raha hai",
              "🛡️ Escrow payment info",
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSend(chip)}
                className="whitespace-nowrap text-[11px] font-semibold text-[#00288e] bg-[#e8edff] hover:bg-[#d7e3ff] px-2.5 py-1 rounded-full transition-all cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Input Row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-[#c4c5d5]/50 flex items-center gap-2 shrink-0"
          >
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isMicActive
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-[#e8edff] text-[#00288e] hover:bg-[#d7e3ff]"
              }`}
            >
              <Mic size={18} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask in Hindi or English…"
              className="flex-1 h-10 px-3 rounded-xl border border-[#c4c5d5]/70 bg-[#f8f9ff] text-[13px] text-[#0d1c2e] outline-none focus:border-[#00288e]"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-10 h-10 rounded-xl bg-[#00288e] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#173bab] transition-all cursor-pointer"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
