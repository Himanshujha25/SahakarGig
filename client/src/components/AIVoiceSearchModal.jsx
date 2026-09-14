import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import {
  Mic, X, Zap, ArrowRight, Volume2, LoaderCircle,
  Wrench, GraduationCap, Utensils, HeartPulse, Car, Flower2,
  Hammer, Palette, CheckCircle2, Building2, Flame
} from "lucide-react";

const CATEGORY_META = {
  Electrician: { icon: Zap, bg: "bg-[#e8edff] border-[#00288e]/30 text-[#00288e]" },
  Plumber:     { icon: Wrench, bg: "bg-[#e0f2fe] border-[#0284c7]/30 text-[#0284c7]" },
  Cook:        { icon: Utensils, bg: "bg-[#ffedd5] border-[#ea580c]/30 text-[#ea580c]" },
  'AC Repair': { icon: Zap, bg: "bg-[#e0f2fe] border-[#0284c7]/30 text-[#0284c7]" },
  Tutor:       { icon: GraduationCap, bg: "bg-[#f3e8ff] border-[#7c3aed]/30 text-[#7c3aed]" },
  Cleaner:     { icon: CheckCircle2, bg: "bg-[#ccfbf1] border-[#0d9488]/30 text-[#0d9488]" },
  Caregiver:   { icon: HeartPulse, bg: "bg-[#ffe4e6] border-[#e11d48]/30 text-[#e11d48]" },
  Driver:      { icon: Car, bg: "bg-[#f1f5f9] border-[#475569]/30 text-[#475569]" },
  Gardener:    { icon: Flower2, bg: "bg-[#dcfce7] border-[#16a34a]/30 text-[#16a34a]" },
  Carpenter:   { icon: Hammer, bg: "bg-[#fef3c7] border-[#d97706]/30 text-[#d97706]" },
  Painter:     { icon: Palette, bg: "bg-[#fae8ff] border-[#c084fc]/30 text-[#c084fc]" },
};

// ── Instant on-device multi-intent matcher (0ms, runs every keystroke / speech chunk)
// Mirrors server MULTI_INTENT_RULES so UI feels real-time even before cloud replies.
const INSTANT_RULES = [
  { category: 'Electrician', reason: 'Bijli / light / switch issue — Electrician book karo', kws: ['electric','electri','bijli','bijali','light','lait','current','karant','switch','swich','short','fan','pankha','wiring','fuse','bulb','बिजली','लाइट','स्विच','पंखा'] },
  { category: 'Plumber', reason: 'Nal / tap / paani leakage — Plumber turant book karo', kws: ['plumb','plambar','pulamber','pulambar','pipe','paip','leak','lik','paani','pani','water','tap','tapka','nal','nul','flush','drain','dren','sink','tank','tanki','sewage','basin','kharab','kharb','tuti','पानी','नल','लीक','टंकी','खराब','प्लंबर'] },
  { category: 'Cook', reason: 'Bhook / khana — Home Cook se fresh meal book karo', kws: ['cook','kuk','khana','khaana','rasoi','chef','roti','food','fud','kitchen','lunch','dinner','nashta','masi','maasi','bhook','bhukh','bhookh','bhuk','hunger','hungry','meal','dabba','tiffin','भूख','खाना','रसोई','टिफिन'] },
  { category: 'Cleaner', reason: 'Safai / jhadu-pocha — Cleaner book karo', kws: ['clean','klin','safai','pocha','jhadu','dusting','bathroom','laundry','सफाई','झाडू','पोछा'] },
  { category: 'Tutor', reason: 'Padhai / tuition — verified Tutor book karo', kws: ['tutor','tution','tuition','study','teacher','math','padhana','padhai','exam','class','school','पढ़ाई','टीचर'] },
  { category: 'Caregiver', reason: 'Buzurg / patient dekhbhal — Caregiver book karo', kws: ['care','elder','bujurg','nurse','dada','dadi','patient','senior','bimar','dekhbhal','नर्स','बुजुर्ग','बीमार'] },
  { category: 'Driver', reason: 'Gaadi / travel — verified Driver book karo', kws: ['driver','draivar','gaddi','gadi','gaadi','car','travel','drive','tour','cab','ड्राइवर','गाड़ी'] },
  { category: 'Gardener', reason: 'Paudhe / lawn — Gardener book karo', kws: ['garden','paudhe','plant','mali','grass','lawn','flower','phool','माली','पौधे'] },
  { category: 'Carpenter', reason: 'Lakdi / furniture — Carpenter book karo', kws: ['carpent','badai','wood','lakdi','furniture','door','table','chair','lock','darwaza','बढ़ई','लकड़ी','फर्नीचर'] },
  { category: 'Painter', reason: 'Deewar / paint — Painter book karo', kws: ['paint','pent','color','colour','wall','diwar','deewar','putty','रंग','दीवार','पेंट'] },
  { category: 'AC Repair', reason: 'AC cooling issue — AC expert book karo', kws: ['ac ','a.c','air condition','cooling','cool','fridge','एसी'] },
];

function instantMultiClassify(text) {
  if (!text || !text.trim()) return [];
  const norm = ` ${text.toLowerCase().replace(/[^a-z\u0900-\u097F\s]/g, ' ').replace(/\s+/g, ' ')} `;
  const hits = [];
  for (const r of INSTANT_RULES) {
    let score = 0;
    for (const k of r.kws) {
      if (k.length <= 2) continue;
      if (norm.includes(k)) score += k.length > 4 ? 3 : 2;
    }
    if (score > 0) hits.push({ ...r, score });
  }
  hits.sort((a, b) => b.score - a.score);
  const emerg = /urgent|emergenc|turant|short|burst|paani nahi/.test(norm);
  return hits.slice(0, 3).map((h) => ({
    category: h.category,
    reason: h.reason,
    isEmergency: emerg,
    confidence: h.score >= 6 ? '99.2%' : '94.0%',
    live: true,
  }));
}

const INTENT_RULES = [
  {
    category: "Electrician",
    keywords: ["electric", "light", "bijli", "current", "power", "switch", "short circuit", "fan", "wiring", "fuse", "mcb", "line", "chali", "nhi", "nahin", "elctric", "बिजली", "लाइट", "करंट", "इलेक्ट्रिशियन", "इलेक्ट्रिक", "स्विच", "पंखा", "वायरिंग", "फ्यूज", "शॉर्ट"],
    reason: "Electrical line outage or circuit fault detected",
    isEmergency: true,
  },
  {
    category: "Cook",
    keywords: ["cook", "khana", "rasoi", "chef", "roti", "food", "kitchen", "lunch", "dinner", "breakfast", "masi", "kok", "कुक", "कोक", "खाना", "रसोई", "शेफ", "रोटी", "भोजन", "बनाने", "बनाना", "मासी"],
    reason: "Domestic culinary & meal preparation service requested",
    isEmergency: false,
  },
  {
    category: "Plumber",
    keywords: ["pipe", "leak", "paani", "water", "tap", "flush", "drain", "sink", "tank", "sewage", "nal", "basin", "प्लंबर", "पाइप", "पानी", "नल", "लीक", "टंकी", "बेसिन", "ड्रेन"],
    reason: "Water leakage or plumbing breakdown detected",
    isEmergency: false,
  },
  {
    category: "Tutor",
    keywords: ["tutor", "study", "teacher", "math", "padhana", "bacche", "coaching", "padhai", "exam", "class", "ट्यूटर", "पढ़ाई", "शिक्षक", "टीचर", "मैथ", "पढ़ाने", "बच्चे", "कोचिंग", "क्लास"],
    reason: "Home education & academic tutoring requested",
    isEmergency: false,
  },
  {
    category: "Cleaner",
    keywords: ["clean", "safai", "pocha", "jhadu", "dusting", "washroom", "bathroom", "deep clean", "laundry", "क्लीनर", "सफाई", "झाडू", "पोछा", "बाथरूम", "धुलाई"],
    reason: "Home sanitation & housekeeping service requested",
    isEmergency: false,
  },
  {
    category: "Caregiver",
    keywords: ["care", "elder", "bujurg", "nurse", "dada", "dadi", "patient", "nursing", "senior", "bimar", "केयरगिवर", "नर्स", "बुजुर्ग", "मरीज", "बीमार", "दादा", "दादी", "देखभाल"],
    reason: "Elderly caregiving or patient nursing requested",
    isEmergency: true,
  },
  {
    category: "Driver",
    keywords: ["driver", "gaddi", "car", "travel", "outstation", "drive", "tour", "ड्राइवर", "गाड़ी", "कार", "चालक", "ड्राइव"],
    reason: "Private chauffeur & vehicular transportation requested",
    isEmergency: false,
  },
  {
    category: "Gardener",
    keywords: ["garden", "paudhe", "plants", "mali", "grass", "lawn", "flowers", "माली", "पौधे", "गार्डनर", "बगीचा", "फूल"],
    reason: "Horticulture & lawn maintenance service requested",
    isEmergency: false,
  },
  {
    category: "Carpenter",
    keywords: ["wood", "furniture", "lakdi", "door", "bed", "table", "chair", "cabinet", "lock", "darwaza", "कारपेंटर", "बढ़ई", "लकड़ी", "फर्नीचर", "दरवाजा", "ताला"],
    reason: "Carpentry & furniture restoration requested",
    isEmergency: false,
  },
  {
    category: "Painter",
    keywords: ["paint", "color", "wall", "diwar", "putty", "distemper", "paint work", "पेंटर", "पेंट", "रंग", "दीवार", "पुट्टी"],
    reason: "Wall painting & surface finishing requested",
    isEmergency: false,
  },
];

function fallbackClassify(text) {
  if (!text || !text.trim()) return null;
  const lower = text.toLowerCase();
  
  let best = null;
  let maxScore = 0;

  for (const rule of INTENT_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += kw.length > 3 ? 3 : 2;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      best = rule;
    }
  }

  if (best) {
    return {
      category: best.category,
      reason: best.reason,
      isEmergency: best.isEmergency,
      confidence: "99.2%",
    };
  }

  return {
    category: null,
    reason: "General service query",
    isEmergency: false,
    confidence: "95.0%",
  };
}

export default function AIVoiceSearchModal({ isOpen, onClose, initialQuery = "" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState(initialQuery);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedIntent, setParsedIntent] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [aiReply, setAiReply] = useState("");
  const [aiVia, setAiVia] = useState("");
  const recognitionRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const lastCloudTextRef = useRef("");

  async function analyzeWithGroq(text) {
    if (!text || !text.trim()) {
      setParsedIntent(null);
      setSuggestions([]);
      setAiReply("");
      return;
    }
    lastCloudTextRef.current = text;
    setIsAnalyzing(true);
    try {
      const { data } = await api.post("/ai/chat", { message: text });
      if (lastCloudTextRef.current !== text) return; // stale response guard
      const cloudSugs = Array.isArray(data?.suggestions) && data.suggestions.length
        ? data.suggestions
        : data?.actionCategory
          ? [{ category: data.actionCategory, reason: data.reason || `${data.actionCategory} service intent`, isEmergency: !!data.isEmergency, confidence: data.confidence || '98.5%' }]
          : [];
      // Merge: cloud first, then any instant hits cloud missed (e.g. 2nd intent)
      const instant = instantMultiClassify(text);
      const merged = [...cloudSugs];
      for (const s of instant) {
        if (merged.length >= 3) break;
        if (!merged.some((m) => m.category === s.category)) merged.push({ ...s, live: false });
      }
      const finalSugs = merged.slice(0, 3);
      setSuggestions(finalSugs);
      setParsedIntent(finalSugs[0] ? { category: finalSugs[0].category, reason: finalSugs[0].reason, isEmergency: finalSugs[0].isEmergency, confidence: finalSugs[0].confidence, reply: data?.reply } : fallbackClassify(text));
      setAiReply(data?.reply || "");
      setAiVia(data?.via || "");
    } catch {
      const instant = instantMultiClassify(text);
      setSuggestions(instant);
      setParsedIntent(instant[0] ? { category: instant[0].category, reason: instant[0].reason, isEmergency: instant[0].isEmergency, confidence: instant[0].confidence } : fallbackClassify(text));
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleQueryUpdate(newText) {
    setTranscript(newText);
    // 1) INSTANT real-time path (0ms): show dynamic suggestions as user speaks/types
    const instant = instantMultiClassify(newText);
    if (instant.length) {
      setSuggestions(instant);
      setParsedIntent({ category: instant[0].category, reason: instant[0].reason, isEmergency: instant[0].isEmergency, confidence: instant[0].confidence });
    } else if (!newText.trim()) {
      setSuggestions([]);
      setParsedIntent(null);
      setAiReply("");
    }
    // 2) Debounced cloud path (Gemini/Groq): enriches reply + confirms intents
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      analyzeWithGroq(newText);
    }, 450);
  }

  useEffect(() => {
    if (initialQuery) {
      setTranscript(initialQuery);
      analyzeWithGroq(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (isOpen && !transcript) {
      startListening();
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) onClose?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      stopListening();
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "hi-IN";
        rec.maxAlternatives = 1;

        rec.onstart = () => setIsListening(true);
        rec.onresult = (event) => {
          // Accumulate ALL finals + current interim so multi-sentence Hinglish stays live
          let interim = "";
          let fin = "";
          for (let i = 0; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) fin += t + " ";
            else interim += t;
          }
          handleQueryUpdate((fin + interim).trim());
        };
        rec.onerror = () => setIsListening(false);
        rec.onend = () => {
          // Auto-restart while modal open & user still wants mic (mobile Chrome quirk)
          if (recognitionRef.current === rec && isOpen) {
            try { rec.start(); return; } catch {}
          }
          setIsListening(false);
        };

        recognitionRef.current = rec;
        rec.start();
        return;
      } catch (err) {
        console.error("Speech Recognition Error:", err);
      }
    }

    // Web Speech API fallback
    setIsListening(false);
  }

  function stopListening() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  }

  function handleDispatchRedirect(catOverride, emergOverride) {
    const cat = catOverride || parsedIntent?.category || suggestions[0]?.category || "Electrician";
    const emerg = emergOverride ?? parsedIntent?.isEmergency ?? suggestions[0]?.isEmergency ?? false;
    onClose();
    const targetUrl = `/household/dispatch?category=${encodeURIComponent(cat)}&emergency=${emerg ? "true" : "false"}`;
    if (!user) {
      navigate(`/signup?role=Household&redirect=${encodeURIComponent(targetUrl)}`);
      return;
    }
    navigate(targetUrl);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center min-h-screen px-4 pt-[84px] pb-6 bg-black/60 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg max-h-[calc(100vh-110px)] rounded-2xl border border-outline-variant bg-surface text-on-surface p-6 sm:p-7 shadow-2xl overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close voice search"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-container text-on-surface-variant hover:text-primary hover:bg-primary-container flex items-center justify-center transition-all cursor-pointer border border-outline-variant"
        >
          <X size={18} />
        </button>

        {/* Institutional Badge — app tokens */}
        <div className="flex items-center gap-2 mb-5 pr-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-container border border-primary/20 text-xs font-bold text-primary">
            <Building2 size={14} />
            <span>Ministry of Cooperation</span>
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span className="text-on-surface-variant font-semibold">Voice Intent Parser</span>
          </span>
        </div>

        {/* Microphone Station */}
        <div className="flex flex-col items-center justify-center text-center my-5">
          <div className="relative mb-4">
            {isListening && (
              <div className="absolute -inset-3 rounded-full border-2 border-primary/30 animate-ping" />
            )}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              aria-label={isListening ? 'Stop listening' : 'Start voice search'}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center bg-primary text-on-primary shadow-[0_10px_25px_rgba(0,40,142,0.35)] transition-all duration-200 cursor-pointer hover:opacity-90 active:scale-95 ${
                isListening ? 'scale-105' : ''
              }`}
            >
              {isListening ? (
                <Volume2 size={32} className="animate-bounce" />
              ) : (
                <Mic size={32} />
              )}
            </button>
          </div>

          <p className="text-[15px] font-bold text-on-surface tracking-tight">
            {isListening ? 'Listening (Hindi / English)…' : 'Tap Microphone to Speak'}
          </p>
          <p className="text-[12.5px] text-on-surface-variant mt-1">
            Speak your requirement: <span className="italic text-primary font-semibold">"मेरा पानी नहीं आ रहा घर में"</span>
          </p>
        </div>

        {/* Input Bar — app .input token */}
        <div className="relative mb-5">
          <input
            type="text"
            value={transcript}
            onChange={(e) => handleQueryUpdate(e.target.value)}
            placeholder="Or type here e.g. Mera paani nahi aa raha…"
            className="input pr-10"
          />
          {transcript && (
            <button
              onClick={() => handleQueryUpdate('')}
              aria-label="Clear search text"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* AI Analyzing Indicator */}
        {isAnalyzing && (
          <div className="flex items-center justify-center gap-2 p-3 text-[13px] font-semibold text-primary">
            <LoaderCircle size={16} className="animate-spin" />
            <span>{suggestions.length ? 'Confirming with AI…' : 'Analyzing service intent…'} {aiVia ? `(${aiVia})` : ''}</span>
          </div>
        )}

        {/* Dynamic multi-service suggestion cards (AI reply text hidden — cards only) */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                {suggestions.length > 1 ? `${suggestions.length} Services Detected — Book Each` : 'Service Intent Classified'}
              </span>
              <span className="text-[10.5px] font-semibold text-on-surface-variant">live suggestions</span>
            </div>
            {suggestions.map((s) => {
              const m = CATEGORY_META[s.category] || CATEGORY_META.Electrician;
              const Ico = m.icon || Zap;
              return (
                <div key={s.category} className="card p-4 space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-container text-primary border border-primary/20 flex items-center justify-center shrink-0">
                      <Ico size={22} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[18px] font-extrabold text-on-surface tracking-tight">{s.category}</h4>
                        {s.isEmergency ? (
                          <span className="badge-emergency status-pill">
                            <Flame size={11} fill="currentColor" /> Emergency
                          </span>
                        ) : (
                          <span className="badge-completed status-pill">
                            <CheckCircle2 size={11} /> Ready
                          </span>
                        )}
                        <span className="status-pill bg-primary text-on-primary">{s.confidence || '98%'}</span>
                      </div>
                      <p className="text-[12.5px] text-on-surface-variant mt-1 leading-relaxed">{s.reason}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDispatchRedirect(s.category, s.isEmergency)}
                      className="btn-primary flex-1 !h-10 !text-[13px]"
                    >
                      <span>Book {s.category} Now</span>
                      <ArrowRight size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { onClose(); navigate(`/household/find?query=${encodeURIComponent(s.category)}`); }}
                      className="btn-secondary flex-1 !h-10 !text-[13px]"
                    >
                      <span>Find in Directory</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Quick Test Pills */}
        <div className="mt-5 pt-4 border-t border-outline-variant flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-on-surface-variant">Try:</span>
          {[
            'Mujhe bhook lagi hai mere ghar ka tap kharab ho gaya hai',
            'Mere ghar me electric nahi hai',
            'मेरा पानी नहीं आ रहा घर में',
            'मुझे खाना बनाने के लिए कुक चाहिए',
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => handleQueryUpdate(sample)}
              className="text-[11.5px] font-semibold text-primary bg-primary-container hover:opacity-80 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
            >
              &ldquo;{sample}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
