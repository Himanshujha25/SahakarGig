import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { Bot, X, Send, Mic, Zap, ArrowRight, Droplets, ShieldCheck, FileText } from "lucide-react";

const KNOWLEDGE_BASE = [
  {
    triggers: ["type of help", "what help", "services", "who are you", "what can you do", "kya kar sakte ho", "help me", "service list", "what do you provide", "help"],
    reply: "Namaste! 🙏 I am Sahakar Assistant, your AI Cooperative Guide.\n\nWe provide verified cooperative services across 4 main areas:\n1. ⚡ Emergency Repairs: Electricians, Plumbers, Carpenters, AC Technicians\n2. 🧹 Home & Meal Services: Home Cooks, House Cleaners, Gardeners\n3. 📚 Education & Care: Qualified Tutors, Senior Caregivers, Private Drivers\n4. 🛡️ Escrow & Govt Security: e-Shram & DigiLocker verified workers with 100% Razorpay Escrow protection.\n\nWhat service or assistance do you need today?",
    actionCategory: null,
    isEmergency: false,
  },
  {
    triggers: ["electric", "light", "bijli", "current", "power", "switch", "line", "chali", "nhi", "elctric", "बिजली"],
    reply: "Electrical issue detected! Our Geospatial Broadcast system can alert nearby certified cooperative electricians in your locality immediately.",
    actionCategory: "Electrician",
    isEmergency: true,
  },
  {
    triggers: ["cook", "khana", "rasoi", "chef", "roti", "food", "kitchen", "lunch", "dinner", "breakfast", "masi", "kok", "bhuk", "bhook", "bhookh", "hungry", "hunger"],
    reply: "Domestic culinary & meal preparation service requested! I can connect you with verified cooperative cooks in your area right now.",
    actionCategory: "Cook",
    isEmergency: false,
  },
  {
    triggers: ["pipe", "leak", "paani", "water", "tap", "flush", "drain", "sink", "pani", "पानी", "पाइप"],
    reply: "Water leakage or plumbing emergency detected! I can broadcast your request to verified cooperative plumbers right now.",
    actionCategory: "Plumber",
    isEmergency: false,
  },
  {
    triggers: ["escrow", "payment", "razorpay", "paisa", "fee", "cost", "safe", "secure"],
    reply: "SahakarGig holds your funds safely in Razorpay Escrow. No money is charged until a worker accepts your broadcast job request!",
    actionCategory: null,
    isEmergency: false,
  },
  {
    triggers: ["eshram", "uan", "welfare", "pmsby", "insurance", "digilocker", "kyc"],
    reply: "All providers on SahakarGig are verified against official government e-Shram UAN and PMSBY insurance databases for 100% security.",
    actionCategory: null,
    isEmergency: false,
  },
  {
    triggers: ["tutor", "study", "math", "teacher", "padhai", "पढ़ाई"],
    reply: "Need a qualified home tutor? We have verified educational cooperatives ready for home or online coaching.",
    actionCategory: "Tutor",
    isEmergency: false,
  },
  {
    triggers: ["clean", "safai", "pocha", "jhadu", "dusting", "washroom", "bathroom", "cleaning"],
    reply: "Home sanitation & deep cleaning requested! We have verified cooperative cleaners ready to assist you.",
    actionCategory: "Cleaner",
    isEmergency: false,
  },
  {
    triggers: ["ac", "cooling", "air conditioner", "ac repair", "gas fill"],
    reply: "AC servicing & repair requested! Nearby certified HVAC technicians can be dispatched immediately.",
    actionCategory: "AC Repair",
    isEmergency: false,
  },
  {
    triggers: ["carpenter", "wood", "furniture", "door", "bed", "table", "lock"],
    reply: "Carpentry work detected! Our cooperative network includes certified carpenters for furniture repair and installation.",
    actionCategory: "Carpenter",
    isEmergency: false,
  }
];

const SUGGESTIONS = [
  { icon: Zap, label: "Electrical Help" },
  { icon: Droplets, label: "Plumbing Leak" },
  { icon: ShieldCheck, label: "Escrow Payout" },
  { icon: FileText, label: "e-Shram Welfare" },
];

function extractUserName(str) {
  const match = (str || "").match(/(?:mera name|my name is|mera naam|main|i am)\s+([a-zA-Z]+)/i);
  if (match && !["felling", "feeling", "a", "an", "the", "in", "on", "at", "to", "for"].includes(match[1].toLowerCase())) {
    return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  }
  return null;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function normalizeQuery(str) {
  let q = (str || "").toLowerCase().trim();
  q = q.replace(/hungary|hungri|hungr/g, "hungry");
  q = q.replace(/felling|feelin|feeling/g, "feeling");
  q = q.replace(/whta|wat|wht|waht|whatt/g, "what");
  q = q.replace(/serveice|service|services|sevic|servis|servise|serivce|serevice/g, "service");
  q = q.replace(/elctric|electrik|electrician/g, "electric");
  q = q.replace(/plumber|plmber|plumb/g, "pipe");
  q = q.replace(/kaya|kyaa|kyaah/g, "kya");
  return q;
}

function processQueryIntent(query) {
  const q = normalizeQuery(query);
  const userName = extractUserName(query);
  const greeting = userName ? `Namaste ${userName} ji! 🙏` : "Namaste! 🙏";
  const isUrgent = q.includes("urgent") || q.includes("emergency") || q.includes("jaldi") || q.includes("turant") || q.includes("tatkal") || q.includes("fast");

  // 1. Urgent / Emergency Need Intent
  if (isUrgent) {
    return {
      sender: "ai",
      text: `${greeting} Emergency & Urgent Assistance alert active! 🚨 SahakarGig ka AI Geospatial Broadcast system nearby verified Electricians, Plumbers, Cooks aur Caregivers ko 15 minutes ke andar dispatch kar sakta hai. Aapko abhi turant kaunsi service chahiye?`,
      actionCategory: null,
      isEmergency: true
    };
  }

  // 2. Identity & Introduction ("app kon ho", "who are you", "kaun ho", "tum kaun ho")
  if (q.includes("kon ho") || q.includes("kaun ho") || q.includes("who are you") || q.includes("tum kaun") || q.includes("aap kaun") || q.includes("what is your name") || q.includes("you ai")) {
    return {
      sender: "ai",
      text: `${greeting} Main Saarthi (सारथी) hoon — SahakarGig platform ka official AI Assistant. Main aapko verified cooperative workers dhoondhne, bookings karne, aur escrow payments samajhne mein help karta hoon. Aapko aaj kis cheez mein help chahiye?`,
      actionCategory: null,
      isEmergency: false
    };
  }

  // 3. Cook / Hunger / Food ("hungry", "hungary", "food", "khana", "cook", "chef", "roti", "meal", "dinner")
  if (q.includes("hungry") || q.includes("hungary") || q.includes("hunger") || q.includes("cook") || q.includes("khana") || q.includes("rasoi") || q.includes("chef") || q.includes("roti") || q.includes("food") || q.includes("bhook") || q.includes("meal") || q.includes("dinner") || q.includes("lunch")) {
    return {
      sender: "ai",
      text: `${greeting} Bhuk ya khana banane ke liye certified cook chahiye? 🍳 Humare paas verified cooperative cooks available hain jo hygienic aur swadist ghar ka khana banate hain. Kya main aapko cook connect karoon?`,
      actionCategory: "Cook",
      isEmergency: false
    };
  }

  // 4. Pricing & Budget Inquiry ("300 mai kya milega", "kitna lagega", "price", "rate", "cost", "budget")
  if (q.includes("300") || q.includes("500") || q.includes("price") || q.includes("rate") || q.includes("cost") || q.includes("budget") || q.includes("kitna") || q.includes("charge") || q.includes("kya milega") || q.includes("kya kaya")) {
    return {
      sender: "ai",
      text: `${greeting} ₹300 - ₹500 ke budget mein aapko SahakarGig pe yeh verified cooperative services mil sakti hain:\n\n• 🛠️ Plumbing Minor Repair & Leakage: ₹350/hr\n• ⚡ Electrical Switch/Wiring Check: ₹350/hr\n• 🧹 Home Sanitation & Deep Cleaning: ₹300 - ₹400\n• 🍳 Meal Preparation Cook: ₹350/meal\n• 🚗 Short Trip Driver: ₹300/hr\n\nSaare payments Razorpay Escrow mein 100% safe rehte hain! Aaj kaunsi service book karni hai?`,
      actionCategory: null,
      isEmergency: false
    };
  }

  // 5. App or Website Inquiry ("app hai ya website", "is this app", "website or app")
  if (q.includes("app") && (q.includes("website") || q.includes("hai") || q.includes("ya"))) {
    return {
      sender: "ai",
      text: `${greeting} SahakarGig ek Web Application aur Digital Platform hai 🌐📱. Aap ise apne phone ya laptop browser pe chala sakte hain! Yeh verified gig workers aur households ko direct cooperative societies se jodta hai.`,
      actionCategory: null,
      isEmergency: false
    };
  }

  // 6. Greetings ("hi", "hello", "namaste", "hey", "kaise ho")
  if (q === "hi" || q === "hello" || q === "hey" || q === "yoo" || q.includes("namaste") || q.includes("kaise ho") || q.includes("hlo") || q.includes("hy")) {
    return {
      sender: "ai",
      text: `${greeting} Welcome to SahakarGig. Main badhiya hoon! Aaj aapko kis kaam ke liye verified worker ya service chahiye?`,
      actionCategory: null,
      isEmergency: false
    };
  }

  // 7. Services Inquiry ("whta serveice do you have", "what services", "kya kaam hota hai", "services", "help")
  if (q.includes("service") || q.includes("help") || q.includes("provide") || q.includes("kaam") || q.includes("list") || q.includes("do you have")) {
    return {
      sender: "ai",
      text: `${greeting} SahakarGig pe aapko 4 main categories mein verified cooperative workers milte hain:\n\n1. ⚡ Emergency Repairs: Electrician, Plumber, Carpenter, AC Repair\n2. 🧹 Home & Food Services: Home Cook, House Cleaner, Gardener\n3. 📚 Care & Education: Tutors, Caregivers, Drivers\n4. 🛡️ Escrow Security: Government e-Shram verified workers with 100% Escrow payment protection.\n\nAapko kaunsa worker chahiye?`,
      actionCategory: null,
      isEmergency: false
    };
  }

  // 8. Electrician / Power Fault
  if (q.includes("electric") || q.includes("light") || q.includes("bijli") || q.includes("switch") || q.includes("current") || q.includes("wire") || q.includes("fan")) {
    return {
      sender: "ai",
      text: `${greeting} Bijli ya electrical issue hai? ⚡ Humari AI Geospatial Broadcast system aapke aas-paas ke verified cooperative electricians ko turant job alert bhej degi!`,
      actionCategory: "Electrician",
      isEmergency: true
    };
  }

  // 9. Plumber / Water Leakage
  if (q.includes("pipe") || q.includes("leak") || q.includes("pani") || q.includes("paani") || q.includes("water") || q.includes("tap") || q.includes("sink") || q.includes("flush")) {
    return {
      sender: "ai",
      text: `${greeting} Paani leakage ya plumbing problem hai? 💧 Aap direct plumbing broadcast trigger kar sakte hain aur verified plumber aapke ghar aayega.`,
      actionCategory: "Plumber",
      isEmergency: false
    };
  }

  // 10. Escrow / Payment Safety
  if (q.includes("escrow") || q.includes("payment") || q.includes("paisa") || q.includes("money") || q.includes("safe") || q.includes("charge")) {
    return {
      sender: "ai",
      text: `${greeting} SahakarGig pe aapka paisa 100% safe hai 🛡️! Aapka payment Razorpay Escrow account mein rehta hai. Jab tak worker kaam poora karke aapko satisfy nahi karta, tab tak paisa release nahi hota.`,
      actionCategory: null,
      isEmergency: false
    };
  }

  // Dynamic Non-Repeating Fallbacks
  const dynamicFallbacks = [
    `${greeting} Main Saarthi (सारथी) hoon — aapka official SahakarGig AI Guide. Aap mujhse Electrician, Plumber, Cook, Cleaner, Tutors ya Escrow payments ke baare mein kuch bhi pooch sakte hain. Today main aapki kya help karoon?`,
    `${greeting} SahakarGig Cooperative Network mein aapka swagat hai! Humare paas 100% e-Shram verified Electricians, Plumbers, Cooks aur Housekeeping staff available hain. Aapko kaunsi service chahiye?`,
    `${greeting} Main Saarthi (सारथी) 🤖. Aap specific service (jaise "Electrician chahiye", "Cook chahiye", "Water Leakage", "300 me kya milega") batayein aur main aapko turant verified cooperative worker connect kar dunga!`
  ];

  const selectedText = dynamicFallbacks[Math.abs(hashString(query)) % dynamicFallbacks.length];

  return {
    sender: "ai",
    text: selectedText,
    actionCategory: null,
    isEmergency: false
  };
}

export default function AIChatbot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Namaste! 🙏 Main Saarthi (सारथी) hoon, aapka official AI Cooperative Companion. Aaj main aapki kya help karoon?",
      actionCategory: null,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  async function handleSend(userText) {
    const query = userText || input;
    if (!query || !query.trim()) return;

    const userMsg = { sender: "user", text: query };
    const history = messages.slice(-12);
    setMessages((prev) => [...prev, userMsg]);
    if (!userText) setInput("");
    setIsTyping(true);

    try {
      const { data } = await api.post("/ai/chat", { message: query, history });
      const aiMsg = {
        sender: "ai",
        text: data.reply || processQueryIntent(query).text,
        actionCategory: data.actionCategory,
        isEmergency: !!data.isEmergency,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const aiMsg = processQueryIntent(query);
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
    const targetUrl = `/household/dispatch?category=${encodeURIComponent(cat)}&emergency=${emergency ? "true" : "false"}`;
    if (!user) {
      navigate(`/signup?role=Household&redirect=${encodeURIComponent(targetUrl)}`);
      return;
    }
    navigate(targetUrl);
  }

  return (
    <>
      {/* Floating Support Button — Circular Icon Only */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full bg-primary text-on-primary shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:opacity-90 hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/10 flex items-center justify-center group"
          title="Saarthi AI Assistant"
        >
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[#84cc16] ring-2 ring-surface" />
          <Bot size={24} className="group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Backdrop Blur + Scroll Lock */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md animate-chat-backdrop"
          aria-hidden="true"
        />
      )}

      {/* Floating Chat Drawer — App Theme Synced */}
      {isOpen && (
        <div className="fixed z-50 bottom-4 inset-x-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px] h-[75dvh] sm:h-[580px] max-h-[660px] rounded-2xl sm:rounded-[28px] border border-outline-variant bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden animate-chat-in">

          {/* Drawer Header — Premium Gloss */}
          <div className="relative shrink-0 px-4 py-3.5 bg-primary text-on-primary flex items-center justify-between">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl bg-on-primary/15 flex items-center justify-center border border-on-primary/20">
                <Bot size={22} className="text-on-primary" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#84cc16] border-2 border-primary" />
              </div>
              <div>
                <h3 className="text-[15px] font-black tracking-tight leading-tight" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                  Saarthi
                </h3>
                <p className="text-[10.5px] text-on-primary/80 font-medium">SahakarGig AI Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="relative w-8 h-8 rounded-full bg-on-primary/15 hover:bg-on-primary/25 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close chat"
            >
              <X size={17} />
            </button>
          </div>

          {/* Messages Container — Glass Canvas */}
          <div className="relative flex-1 p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-surface-container-low via-surface-container-low/60 to-surface">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-line ${
                    msg.sender === "user"
                      ? "bg-primary text-on-primary rounded-tr-xs shadow-xs font-semibold"
                      : "bg-surface-container-high text-on-surface border border-outline-variant rounded-tl-xs shadow-xs font-medium"
                  }`}
                >
                  {msg.text}
                </div>

                {/* AI Action Dispatch Button */}
                {msg.sender === "ai" && msg.actionCategory && (
                  <button
                    type="button"
                    onClick={() => triggerDispatch(msg.actionCategory, msg.isEmergency)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-[11.5px] font-bold shadow-xs hover:opacity-90 transition-all cursor-pointer"
                  >
                    <Zap size={13} fill="currentColor" />
                    <span>Auto-Broadcast {msg.actionCategory}</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1 px-4 py-3.5 rounded-2xl rounded-tl-xs bg-surface-container-high border border-outline-variant w-fit shadow-xs">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" style={{ animationDelay: "150ms" }} />
                <span className="chat-typing-dot" style={{ animationDelay: "300ms" }} />
              </div>
            )}

            {/* Quick Suggestions — Inline Inside Chat */}
            {!isTyping && (
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="w-full text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant/60 pl-1">
                  Quick Help
                </span>
                {SUGGESTIONS.map(({ icon: SIcon, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleSend(label)}
                    className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-on-surface bg-surface border border-outline-variant/80 hover:border-primary/50 hover:bg-primary-container/50 hover:text-on-primary-container hover:-translate-y-0.5 px-3 py-1.5 rounded-full shadow-xs transition-all cursor-pointer"
                  >
                    <SIcon size={13} strokeWidth={1.75} className="text-primary" />
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input — Floating Pill */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="shrink-0 p-3 bg-surface/90 backdrop-blur border-t border-outline-variant/50"
          >
            <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/80 focus-within:border-primary rounded-full pl-1.5 pr-1.5 py-1.5 shadow-sm transition-all">
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isMicActive
                    ? "bg-red-600 text-white animate-pulse"
                    : "text-on-surface-variant hover:text-primary hover:bg-primary-container/60"
                }`}
                title="Voice Input (Hindi / English)"
              >
                <Mic size={15} />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask in Hindi or English…"
                className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/50"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-all cursor-pointer shrink-0 shadow-sm"
                aria-label="Send"
              >
                <Send size={14} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
