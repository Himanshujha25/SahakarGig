const { chatLLM } = require('../lib/llm');

const SERVICE_CATEGORIES = ['Electrician', 'Plumber', 'Carpenter', 'AC Repair', 'Cook', 'Cleaner', 'Gardener', 'Tutor', 'Caregiver', 'Driver'];

const GROQ_SYSTEM_PROMPT = `You are "Saarthi" (सारथी), the warm, human-like AI assistant for SahakarGig (सहकारगीग) — India's Cooperative Gig Services platform. You speak naturally and conversationally, exactly like ChatGPT — short, friendly, helpful replies in Hinglish (mix of Hindi & English) or English matching the user's language. Use a few emojis sparingly for warmth.

PLATFORM FACTS (only claim these):
- SahakarGig connects verified gig workers (providers) to households through government-registered Cooperative Societies.
- Services: Electrician, Plumber, Carpenter, AC Repair, Home Cook, House Cleaner, Gardener, Tutor, Senior Caregiver, Private Driver.
- Approx pricing: Plumbing minor repair ₹350/hr; Electrical switch/wiring ₹350/hr; Home cleaning ₹300–400; Cook ₹350/meal; Driver ₹300/hr.
- Payments: 100% safe via Razorpay Escrow — money is released to the worker only after the household approves the completed job.
- Verification: every provider is verified against government e-Shram UAN, PMSBY insurance and DigiLocker databases.
- Dispatching: the AI Geospatial Broadcast system alerts nearby verified cooperative workers; a broadcast expires quickly if nobody nearby accepts.

BEHAVIOUR:
- Reply to EVERYTHING conversationally like a human friend, in the user's language (Hinglish/Hindi/English).
- MULTI-INTENT IS MANDATORY: if the user mentions 2+ needs (e.g. "mujhe bhook lagi hai aur ghar ka tap kharab ho gaya hai" needs BOTH Cook AND Plumber), list EVERY distinct service in "suggestions" (max 3), ordered by urgency.
- Set actionCategory to suggestions[0]?.category (exactly one of: ${SERVICE_CATEGORIES.join(', ')}, null if no service requested).
- "reply" must be a short Hinglish summary naming each detected service and nudging to book (e.g. "Lagta hai aapko Cook (bhook) aur Plumber (tap leakage) dono chahiye — neeche se turant broadcast karo 👇").
- Hinglish intent hints: bhook/bhukh/hunger → Cook; tap/nal/paani/leak/kharab tap → Plumber; bijli/light/switch/fan → Electrician; safai/jhadu → Cleaner; padhai/tutor → Tutor; buzurg/care → Caregiver; gaadi/driver → Driver; paudhe/mali → Gardener; lakdi/furniture → Carpenter; paint/deewar → Painter; AC/cooling → AC Repair.
- Set isEmergency=true only for urgent situations (short circuit, burst pipe, no water, patient care).`;

function extractStructured(text) {
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch {}
    }
  }
  if (!parsed || typeof parsed.reply !== 'string' || !parsed.reply.trim()) return null;
  const rawSugs = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  const suggestions = rawSugs
    .filter((s) => s && SERVICE_CATEGORIES.includes(s.category))
    .slice(0, 3)
    .map((s) => ({
      category: s.category,
      reason: typeof s.reason === 'string' && s.reason.trim() ? s.reason.trim().slice(0, 220) : `${s.category} service intent detected`,
      isEmergency: !!s.isEmergency,
      confidence: '98.5%',
    }));
  let actionCategory = SERVICE_CATEGORIES.includes(parsed.actionCategory) ? parsed.actionCategory : null;
  if (!actionCategory && suggestions.length) actionCategory = suggestions[0].category;
  const isEmergency = !!parsed.isEmergency || suggestions.some((s) => s.isEmergency);
  return {
    reply: parsed.reply.trim(),
    actionCategory,
    isEmergency,
    suggestions,
  };
}

// ── Local multi-intent engine (offline fallback + instant real-time path) ──
// Normalises Hinglish transliteration so "bhook", "kharb", "pulamber" still match.
function normalizeHinglish(t) {
  return (t || '')
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[^a-z\u0900-\u097F\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MULTI_INTENT_RULES = [
  {
    category: 'Electrician',
    reason: 'Bijli / light / switch / fan ka issue — Electrician book karo',
    keywords: ['electric', 'electri', 'bijli', 'bijali', 'light', 'lait', 'current', 'karant', 'power', 'switch', 'swich', 'short circuit', 'short', 'fan', 'pankha', 'wiring', 'wayring', 'fuse', 'mcb', 'tar', 'wire', 'bulb', 'bord', 'board', 'बिजली', 'लाइट', 'करंट', 'इलेक्ट्रिशियन', 'स्विच', 'पंखा', 'वायरिंग', 'फ्यूज', 'शॉर्ट'],
  },
  {
    category: 'Plumber',
    reason: 'Nal / tap / paani leakage — Plumber turant book karo',
    keywords: ['plumb', 'plumber', 'plambar', 'pulamber', 'pulambar', 'palambar', 'pipe', 'paip', 'leak', 'lik', 'leakage', 'paani', 'pani', 'water', 'tap', 'tapka', 'nal', 'nul', 'flush', 'flesh', 'drain', 'dren', 'sink', 'singk', 'tank', 'tanki', 'tanka', 'sewage', 'sivej', 'basin', 'besin', 'kharab', 'kharb', 'kharaab', 'tuti', 'प्लंबर', 'पाइप', 'पानी', 'नल', 'लीक', 'टंकी', 'बेसिन', 'ड्रेन', 'खराब'],
  },
  {
    category: 'Cook',
    reason: 'Bhook / khana — Home Cook se fresh meal book karo',
    keywords: ['cook', 'kuk', 'cuk', 'khana', 'khaana', 'khanna', 'rasoi', 'rasoee', 'chef', 'seph', 'roti', 'rotiya', 'food', 'fud', 'kitchen', 'kichan', 'lunch', 'lanch', 'dinner', 'dinar', 'breakfast', 'nashta', 'nashta', 'masi', 'maasi', 'bhook', 'bhukh', 'bhookh', 'bhuk', 'bukh', 'hunger', 'hungry', 'khila', 'meal', 'dabba', 'tiffin', 'tifin', 'कुक', 'खाना', 'रसोई', 'शेफ', 'रोटी', 'भोजन', 'भूख', 'बनाने', 'मासी', 'टिफिन'],
  },
  {
    category: 'Tutor',
    reason: 'Padhai / tuition — verified Tutor book karo',
    keywords: ['tutor', 'tution', 'tuition', 'study', 'stady', 'teacher', 'tichar', 'math', 'maths', 'padhana', 'padana', 'bacche', 'bache', 'coaching', 'kocing', 'padhai', 'padai', 'exam', 'egjam', 'class', 'clas', 'school', 'skul', 'homework', 'ट्यूटर', 'पढ़ाई', 'शिक्षक', 'टीचर', 'मैथ', 'बच्चे', 'कोचिंग', 'क्लास'],
  },
  {
    category: 'Cleaner',
    reason: 'Safai / jhadu-pocha — Cleaner book karo',
    keywords: ['clean', 'klin', 'safai', 'safaee', 'pocha', 'pochha', 'jhadu', 'jhadhu', 'dusting', 'dastig', 'washroom', 'bathroom', 'bathrum', 'deep clean', 'laundry', 'landri', 'kapde', 'क्लीनर', 'सफाई', 'झाडू', 'पोछा', 'बाथरूम', 'धुलाई'],
  },
  {
    category: 'Caregiver',
    reason: 'Buzurg / patient dekhbhal — Caregiver book karo',
    keywords: ['care', 'kear', 'elder', 'bujurg', 'bujurgh', 'budhe', 'nurse', 'nars', 'dada', 'dadi', 'patient', 'peshent', 'nursing', 'senior', 'bimar', 'bimaar', 'dekhbhal', 'dekhbhaal', 'khyal', 'केयरगिवर', 'नर्स', 'बुजुर्ग', 'मरीज', 'बीमार', 'देखभाल'],
  },
  {
    category: 'Driver',
    reason: 'Gaadi / travel — verified Driver book karo',
    keywords: ['driver', 'draivar', 'gaddi', 'gadi', 'gaadi', 'car', 'kaar', 'travel', 'trevel', 'outstation', 'drive', 'draiv', 'tour', 'tur', 'cab', 'ड्राइवर', 'गाड़ी', 'कार', 'चालक'],
  },
  {
    category: 'Gardener',
    reason: 'Paudhe / lawn — Gardener (Mali) book karo',
    keywords: ['garden', 'gardenar', 'paudhe', 'podhe', 'plants', 'plant', 'mali', 'maali', 'grass', 'ghas', 'lawn', 'lon', 'flowers', 'phool', 'ful', 'bagicha', 'माली', 'पौधे', 'बगीचा', 'फूल'],
  },
  {
    category: 'Carpenter',
    reason: 'Lakdi / furniture — Carpenter book karo',
    keywords: ['carpent', 'badai', 'badhai', 'wood', 'lakdi', 'lakadi', 'furniture', 'farnichar', 'door', 'dor', 'bed', 'table', 'tebal', 'chair', 'kursi', 'cabinet', 'lock', 'tala', 'darwaza', 'darwaja', 'कारपेंटर', 'बढ़ई', 'लकड़ी', 'फर्नीचर', 'दरवाजा', 'ताला'],
  },
  {
    category: 'Painter',
    reason: 'Deewar / paint — Painter book karo',
    keywords: ['paint', 'pent', 'color', 'colour', 'kalar', 'wall', 'vaal', 'diwar', 'deewar', 'divar', 'putty', 'patti', 'distemper', 'paint work', 'रंग', 'दीवार', 'पुट्टी', 'पेंटर', 'पेंट'],
  },
  {
    category: 'AC Repair',
    reason: 'AC cooling issue — AC Repair expert book karo',
    keywords: ['ac', 'a.c', 'air condition', 'cooling', 'kuling', 'cool', 'kul', 'fridge', 'freez', 'एसी', 'कूलिंग'],
  },
];

function localMultiClassify(message) {
  const norm = ` ${normalizeHinglish(message)} `;
  const hits = [];
  for (const rule of MULTI_INTENT_RULES) {
    let score = 0;
    const matched = [];
    for (const kw of rule.keywords) {
      const k = kw.toLowerCase();
      if (k.length <= 2) continue;
      if (norm.includes(k)) {
        score += k.length > 4 ? 3 : 2;
        matched.push(kw);
      }
    }
    if (score > 0) hits.push({ rule, score, matched });
  }
  hits.sort((a, b) => b.score - a.score);
  const textLower = (message || '').toLowerCase();
  const emergency = /urgent|emergenc|immediat|turant|short circuit|burst|no water|paani nahi|bimar|accident/.test(textLower);
  const suggestions = hits.slice(0, 3).map((h) => ({
    category: h.rule.category,
    reason: h.rule.reason,
    isEmergency: emergency || h.rule.category === 'Electrician' && /short|current|bijli.*(nahi|gayab|chali)/.test(textLower),
    confidence: h.score >= 6 ? '99.2%' : h.score >= 3 ? '96.5%' : '90.0%',
  }));
  return suggestions;
}

async function saarthiChatEngine(message, history = []) {
  if (!message || !message.trim()) {
    return { reply: 'Please type something so I can help you! 🙂' };
  }

  const rawHistory = Array.isArray(history) ? history.slice(-12) : [];
  const formattedHistory = rawHistory
    .filter((m) => m && typeof m.text === 'string' && m.text.trim() && (m.sender === 'user' || m.sender === 'ai'))
    .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text.slice(0, 1000) }));

  const messages = formattedHistory.concat([{ role: 'user', content: message.slice(0, 2000) }]);

  const llm = await chatLLM(messages, GROQ_SYSTEM_PROMPT);

  if (llm) {
    const structured = extractStructured(llm.reply);
    if (structured) {
      // Cloud returned JSON — but if it missed intents the local engine caught, merge them.
      const localSugs = localMultiClassify(message);
      const merged = [...structured.suggestions];
      for (const ls of localSugs) {
        if (merged.length >= 3) break;
        if (!merged.some((s) => s.category === ls.category)) merged.push(ls);
      }
      const finalSugs = merged.slice(0, 3);
      return {
        ...structured,
        suggestions: finalSugs,
        actionCategory: finalSugs[0]?.category || structured.actionCategory,
        isEmergency: structured.isEmergency || finalSugs.some((s) => s.isEmergency),
        via: `${llm.provider}:${llm.model}`,
      };
    }
    // Cloud returned free text — still attach local multi-intent so UI shows book buttons.
    const localSugs = localMultiClassify(message);
    return {
      reply: llm.reply,
      actionCategory: localSugs[0]?.category || null,
      isEmergency: localSugs.some((s) => s.isEmergency),
      suggestions: localSugs,
      via: `${llm.provider}:${llm.model}`,
    };
  }

  // Smart local multi-intent engine when cloud LLM is offline/unconfigured
  const textLower = message.toLowerCase();
  const suggestions = localMultiClassify(message);
  const actionCategory = suggestions[0]?.category || null;
  const isEmergency = suggestions.some((s) => s.isEmergency);

  let reply = `Namaste! 🙏 Main Saarthi (सारथी) hoon — SahakarGig AI Guide. `;

  if (suggestions.length >= 2) {
    const names = suggestions.map((s) => s.category).join(' + ');
    reply += `Lagta hai aapko ${names} — dono ki zaroorat hai! Neeche har service ke liye alag Book button hai, ek-ek karke broadcast karo 👇`;
  } else if (actionCategory) {
    reply += `Aapko ${actionCategory} service ki zaroorat hai? Humare paas verified ${actionCategory} cooperative workers available hain. Below click karke direct book kijiye!`;
  } else if (textLower.includes('price') || textLower.includes('cost') || textLower.includes('rate') || textLower.includes('charge')) {
    reply += `SahakarGig par transparent pricing hai: Electrician/Plumber ₹350/hr, Cleaning ₹300-400, Cooking ₹350/meal. Razorpay Escrow se aapka paisa 100% safe rehta hai!`;
  } else if (textLower.includes('pay') || textLower.includes('escrow') || textLower.includes('razorpay') || textLower.includes('paisa')) {
    reply += `Payments 100% safe hain! Razorpay Escrow system ke through aap job complete aur verify karne ke baad hi worker ko payout release karte hain.`;
  } else {
    reply += `Main aapko verified Electricians, Plumbers, Cooks, Tutors aur Escrow payments mein assist kar sakta hoon. Aap kaunsi service dhoondh rahe hain?`;
  }

  return {
    reply,
    actionCategory,
    isEmergency,
    suggestions,
    via: 'local-engine',
  };
}

module.exports = { saarthiChatEngine, localMultiClassify, MULTI_INTENT_RULES };
