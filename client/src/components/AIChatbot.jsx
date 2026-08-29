import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Bot, X, Send, Mic, Zap, ArrowRight, RefreshCw, Building2, Sparkles, MessageCircle } from "lucide-react";

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
    navigate(`/household/dispatch?category=${encodeURIComponent(cat)}&emergency=${emergency ? "true" : "false"}`);
  }

  return (
    <>
      {/* Orvia UI Floating Support Button — Circular Icon Only */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#1e6b65] text-white shadow-2xl hover:bg-[#145e58] hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/30 flex items-center justify-center group"
          title="Saarthi AI Assistant"
        >
          <Bot size={26} className="text-[#84cc16] group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Orvia Styled Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[350px] sm:w-[390px] h-[520px] rounded-3xl border border-outline-variant bg-surface shadow-2xl flex flex-col overflow-hidden animate-alert-in">
          
          {/* Drawer Header — Orvia Ocean Teal */}
          <div className="p-4 px-5 bg-gradient-to-r from-slate-900 via-[#1e6b65] to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center border border-white/20">
                <Bot size={20} className="text-[#84cc16]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black tracking-tight" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                    Saarthi
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-pulse" />
                </div>
                <p className="text-[10.5px] text-slate-300 font-medium">AI Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>

          {/* Messages Container — Warm Canvas */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-surface-container-low">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-line ${
                    msg.sender === "user"
                      ? "bg-[#1e6b65] text-white rounded-tr-xs shadow-xs font-semibold"
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
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e6b65] text-white text-[11.5px] font-bold shadow-xs hover:bg-[#145e58] transition-all cursor-pointer"
                  >
                    <Zap size={13} className="text-[#84cc16]" fill="currentColor" />
                    <span>Auto-Broadcast {msg.actionCategory}</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 p-2.5 px-3 rounded-2xl bg-surface-container-high border border-outline-variant text-xs text-on-surface-variant w-fit shadow-xs">
                <RefreshCw size={13} className="animate-spin text-[#1e6b65]" />
                <span className="font-semibold">Processing query…</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestion Chips — Responsive Pills */}
          <div className="px-3 py-2 bg-surface border-t border-outline-variant/60 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
            {[
              "⚡ Electrical Help",
              "💧 Plumbing Leak",
              "🛡️ Escrow Payout",
              "📜 e-Shram Welfare"
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSend(chip)}
                className="whitespace-nowrap text-[11px] font-bold text-on-primary-container bg-primary-container hover:bg-primary hover:text-on-primary px-3 py-1 rounded-full transition-all cursor-pointer border border-primary/30"
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
            className="p-3 bg-surface border-t border-outline-variant/60 flex items-center gap-2 shrink-0"
          >
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isMicActive
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container"
              }`}
              title="Voice Input (Hindi / English)"
            >
              <Mic size={17} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask in Hindi or English…"
              className="flex-1 h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface-container transition-all placeholder:text-outline-variant"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl bg-[#1e6b65] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#145e58] transition-all cursor-pointer"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
