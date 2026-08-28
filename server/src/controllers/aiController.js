const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const { emitTo } = require('../socket');

async function demandForecast(req, res) {
  const days = parseInt(req.query.range) || 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const agg = await Booking.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { service: '$service', hour: { $hour: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const byService = {};
  for (const row of agg) {
    const svc = row._id.service;
    if (!byService[svc]) byService[svc] = [];
    byService[svc].push({ hour: row._id.hour, count: row.count });
  }

  const topServices = Object.entries(byService)
    .map(([service, hours]) => ({
      service,
      total: hours.reduce((s, h) => s + h.count, 0),
      peakHour: [...hours].sort((a, b) => b.count - a.count)[0]?.hour ?? 0,
      hours,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const hourlyTotals = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  for (const row of agg) hourlyTotals[row._id.hour].count += row.count;

  res.json({ topServices, hourlyTotals, days });
}

async function nudgeProviders(req, res) {
  const { cooperativeId } = req.body;
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const recentBookings = await Booking.find({ createdAt: { $gte: since } });
  if (recentBookings.length === 0) return res.json({ nudged: 0 });

  const svcCount = {};
  for (const b of recentBookings) svcCount[b.service] = (svcCount[b.service] || 0) + 1;
  const topService = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  const query = cooperativeId ? { cooperativeId } : {};
  const providers = await Provider.find(query).populate('userId', 'name');
  const busyIds = new Set(recentBookings.map((b) => b.providerId.toString()));
  const idle = providers.filter((p) => !busyIds.has(p._id.toString()));

  let nudged = 0;
  for (const p of idle) {
    if (p.userId?._id) {
      emitTo(p.userId._id.toString(), 'ai:nudge', {
        message: `High demand for "${topService}" right now. Accept jobs to earn more!`,
        service: topService,
      });
      nudged++;
    }
  }
  res.json({ nudged, topService });
}

const INTENT_RULES = [
  {
    category: "AppOrWebsite",
    keywords: ["app hai ya website", "app or website", "is this app", "is this a website", "yeh kya hai", "kya h yeh", "application hai ya website", "what is sahakargig"],
    reply: "SahakarGig (सहकारगीग) is a Progressive Web Application & Digital Platform that connects verified gig workers with jobs & households through government-registered Cooperative Societies! 🌐📱",
    actionCategory: null,
    isEmergency: false,
  },
  {
    category: "Identity",
    keywords: ["gemini or groq", "who are you", "kaun ho", "tum kaun ho", "who made you", "groq", "gemini", "what are you"],
    reply: "I am Sahakar Assistant 🤖, the official AI Cooperative Assistant built specifically for the SahakarGig platform.",
    actionCategory: null,
    isEmergency: false,
  },
  {
    category: "GeneralHelp",
    keywords: ["type of help", "what help", "services", "who are you", "what can you do", "kya kar sakte ho", "help me", "service list", "what do you provide", "help", "whta serveice"],
    reply: "Namaste! 🙏 I am Sahakar Assistant, your AI Cooperative Guide.\n\nWe provide verified cooperative services across 4 main areas:\n1. ⚡ Emergency Repairs: Electricians, Plumbers, Carpenters, AC Technicians\n2. 🧹 Home & Meal Services: Home Cooks, House Cleaners, Gardeners\n3. 📚 Education & Care: Qualified Tutors, Senior Caregivers, Private Drivers\n4. 🛡️ Escrow & Govt Security: e-Shram & DigiLocker verified workers with 100% Razorpay Escrow protection.\n\nWhat service or assistance do you need today?",
    actionCategory: null,
    isEmergency: false,
  },
  {
    category: "Electrician",
    keywords: ["electric", "light", "bijli", "current", "power", "switch", "short circuit", "fan", "wiring", "fuse", "mcb", "line", "chali", "nhi", "nahin", "elctric", "बिजली", "लाइट", "करंट", "इलेक्ट्रिशियन", "इलेक्ट्रिक", "स्विच", "पंखा", "वायरिंग", "फ्यूज", "शॉर्ट"],
    reply: "Electrical issue detected! Our AI Geospatial Broadcast system can alert nearby certified cooperative electricians in your locality immediately.",
    actionCategory: "Electrician",
    reason: "Power outage or electrical circuit fault detected",
    isEmergency: true,
  },
  {
    category: "Cook",
    keywords: ["cook", "khana", "rasoi", "chef", "roti", "food", "kitchen", "lunch", "dinner", "breakfast", "masi", "kok", "bhuk", "bhook", "bhookh", "hungry", "hunger", "कुक", "कोक", "खाना", "रसोई", "शेफ", "रोटी", "भोजन", "बनाने", "बनाना", "मासी", "भूख", "भूखा", "भूखे"],
    reply: "Domestic culinary & meal preparation service requested! I can connect you with verified cooperative cooks in your area right now.",
    actionCategory: "Cook",
    reason: "Domestic culinary & meal preparation service",
    isEmergency: false,
  },
  {
    category: "Plumber",
    keywords: ["pipe", "leak", "paani", "pani", "water", "tap", "flush", "drain", "sink", "tank", "sewage", "nal", "basin", "प्लंबर", "पाइप", "पानी", "नल", "लीक", "टंकी", "बेसिन", "ड्रेन"],
    reply: "Water leakage or plumbing emergency detected! I can broadcast your request to verified cooperative plumbers right now.",
    actionCategory: "Plumber",
    reason: "Water leakage or plumbing fixture breakdown",
    isEmergency: false,
  },
  {
    category: "EscrowPayment",
    keywords: ["escrow", "payment", "razorpay", "paisa", "fee", "cost", "safe", "secure"],
    reply: "SahakarGig holds your funds safely in Razorpay Escrow. No money is released to the provider until you approve the completed job! 🛡️",
    actionCategory: null,
    reason: "Payment security inquiry",
    isEmergency: false,
  },
  {
    category: "GovtVerification",
    keywords: ["eshram", "uan", "welfare", "pmsby", "insurance", "digilocker", "kyc"],
    reply: "All providers on SahakarGig are verified against official government e-Shram UAN and PMSBY insurance databases for 100% security.",
    actionCategory: null,
    reason: "Government verification inquiry",
    isEmergency: false,
  },
  {
    category: "Tutor",
    keywords: ["tutor", "study", "teacher", "math", "padhana", "bacche", "coaching", "padhai", "exam", "class", "ट्यूटर", "पढ़ाई", "शिक्षक", "टीचर", "मैथ", "पढ़ाने", "बच्चे", "कोचिंग", "क्लास"],
    reply: "Need a qualified home tutor? We have verified educational cooperatives ready for home or online coaching.",
    actionCategory: "Tutor",
    reason: "Home education & tutoring service",
    isEmergency: false,
  },
  {
    category: "Cleaner",
    keywords: ["clean", "safai", "pocha", "jhadu", "dusting", "washroom", "bathroom", "deep clean", "laundry", "कचरा", "क्लीनर", "सफाई", "झाडू", "पोछा", "बाथरूम", "धुलाई"],
    reply: "Home sanitation & housekeeping requested! We have verified cooperative cleaners ready to assist you.",
    actionCategory: "Cleaner",
    reason: "Home sanitation & housekeeping",
    isEmergency: false,
  },
  {
    category: "Caregiver",
    keywords: ["care", "elder", "bujurg", "nurse", "dada", "dadi", "patient", "nursing", "senior", "bimar", "केयरगिवर", "नर्स", "बुजुर्ग", "मरीज", "बीमार", "दादा", "दादी", "देखभाल"],
    reply: "Senior or patient caregiving service requested. Certified health caregivers can be assigned immediately.",
    actionCategory: "Caregiver",
    reason: "Elderly or patient caregiving service",
    isEmergency: true,
  },
  {
    category: "Driver",
    keywords: ["driver", "gaddi", "car", "travel", "outstation", "drive", "tour", "ड्राइवर", "गाड़ी", "कार", "चालक", "ड्राइव"],
    reply: "Private driver requested. Verified cooperative drivers available for local and outstation trips.",
    actionCategory: "Driver",
    reason: "Private vehicular chauffeur request",
    isEmergency: false,
  },
  {
    category: "Gardener",
    keywords: ["garden", "paudhe", "plants", "mali", "grass", "lawn", "flowers", "माली", "पौधे", "गार्डनर", "बगीचा", "फूल"],
    reply: "Horticulture & lawn maintenance requested! Certified cooperative gardeners are available.",
    actionCategory: "Gardener",
    reason: "Horticulture & lawn maintenance",
    isEmergency: false,
  },
  {
    category: "Carpenter",
    keywords: ["wood", "furniture", "lakdi", "door", "bed", "table", "chair", "cabinet", "lock", "darwaza", "कारपेंटर", "बढ़ई", "लकड़ी", "फर्नीचर", "दरवाजा", "ताला"],
    reply: "Carpentry work detected! Our cooperative network includes certified carpenters for furniture repair and installation.",
    actionCategory: "Carpenter",
    reason: "Carpentry & furniture restoration",
    isEmergency: false,
  },
  {
    category: "ACRepair",
    keywords: ["ac", "cooling", "air conditioner", "ac repair", "gas fill", "filter"],
    reply: "AC servicing & repair requested! Nearby certified HVAC technicians can be dispatched immediately.",
    actionCategory: "AC Repair",
    reason: "AC servicing & repair",
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

function fallbackClassify(message) {
  const q = normalizeQuery(message);
  const userName = extractUserName(message);
  const greeting = userName ? `Namaste ${userName} ji! 🙏` : "Namaste! 🙏";
  const isUrgent = q.includes("urgent") || q.includes("emergency") || q.includes("jaldi") || q.includes("turant") || q.includes("tatkal") || q.includes("fast");

  // 1. Urgent / Emergency Need Intent
  if (isUrgent) {
    return {
      reply: `${greeting} Emergency & Urgent Assistance alert active! 🚨 SahakarGig ka AI Geospatial Broadcast system nearby verified Electricians, Plumbers, Cooks aur Caregivers ko 15 minutes ke andar dispatch kar sakta hai. Aapko abhi turant kaunsi service chahiye?`,
      actionCategory: null,
      isEmergency: true,
      confidence: "99.0%"
    };
  }

  // 2. Identity & Creation ("app kon ho", "you ai", "who are you", "kaun ho", "tum kaun ho", "who made you", "kisne banaya")
  if (q.includes("kon ho") || q.includes("kaun ho") || q.includes("who are you") || q.includes("you ai") || q.includes("tum kaun") || q.includes("aap kaun") || q.includes("kisne banaya") || q.includes("who made")) {
    return {
      reply: `${greeting} Main Saarthi (सारथी) hoon — SahakarGig platform ka official AI Assistant. Main aapko verified cooperative workers dhoondhne, bookings karne, aur escrow payments samajhne mein help karta hoon. Aapko aaj kis cheez mein help chahiye?`,
      actionCategory: null,
      isEmergency: false,
      confidence: "99.0%"
    };
  }

  // 3. Pricing & Budget Inquiry ("300 mai kya milega", "300", "kitna lagega", "price", "rate", "cost", "budget")
  if (q.includes("300") || q.includes("500") || q.includes("price") || q.includes("rate") || q.includes("cost") || q.includes("budget") || q.includes("kitna") || q.includes("charge") || q.includes("kya milega") || q.includes("kya kaya")) {
    return {
      reply: `${greeting} ₹300 - ₹500 ke budget mein aapko SahakarGig pe yeh verified cooperative services mil sakti hain:\n\n• 🛠️ Plumbing Minor Repair & Leakage: ₹350/hr\n• ⚡ Electrical Switch/Wiring Check: ₹350/hr\n• 🧹 Home Sanitation & Deep Cleaning: ₹300 - ₹400\n• 🍳 Meal Preparation Cook: ₹350/meal\n• 🚗 Short Trip Driver: ₹300/hr\n\nSaare payments Razorpay Escrow mein 100% safe rehte hain! Aaj kaunsi service book karni hai?`,
      actionCategory: null,
      isEmergency: false,
      confidence: "99.0%"
    };
  }

  // 4. Cook / Hunger / Food ("hungry", "hungary", "food", "khana", "cook", "chef", "roti", "meal", "dinner")
  if (q.includes("hungry") || q.includes("hunger") || q.includes("cook") || q.includes("khana") || q.includes("rasoi") || q.includes("chef") || q.includes("roti") || q.includes("food") || q.includes("bhook") || q.includes("meal") || q.includes("dinner") || q.includes("lunch")) {
    return {
      reply: `${greeting} Bhuk ya khana banane ke liye certified cook chahiye? 🍳 Humare paas verified cooperative cooks available hain jo hygienic aur swadist ghar ka khana banate hain. Kya main aapko cook connect karoon?`,
      actionCategory: "Cook",
      isEmergency: false,
      confidence: "99.0%"
    };
  }

  // 5. App or Website Inquiry ("app hai ya website", "is this app", "website or app")
  if (q.includes("app") && (q.includes("website") || q.includes("hai") || q.includes("ya"))) {
    return {
      reply: `${greeting} SahakarGig ek Web Application aur Digital Platform hai 🌐📱. Aap ise apne phone ya laptop browser pe chala sakte hain! Yeh verified gig workers aur households ko direct cooperative societies se jodta hai.`,
      actionCategory: null,
      isEmergency: false,
      confidence: "99.0%"
    };
  }

  // 6. Greetings ("hi", "hello", "namaste", "hey", "yoo", "kaise ho")
  if (q === "hi" || q === "hello" || q === "hey" || q === "yoo" || q.includes("namaste") || q.includes("kaise ho")) {
    return {
      reply: `${greeting} Welcome to SahakarGig. Main badhiya hoon! Aaj aapko kis kaam ke liye verified worker ya service chahiye?`,
      actionCategory: null,
      isEmergency: false,
      confidence: "99.0%"
    };
  }

  // 7. Services Inquiry ("whta serveice do you have", "what services", "kya kaam hota hai", "services", "help")
  if (q.includes("service") || q.includes("help") || q.includes("provide") || q.includes("kaam") || q.includes("list") || q.includes("do you have")) {
    return {
      reply: `${greeting} SahakarGig pe aapko 4 main categories mein verified cooperative workers milte hain:\n\n1. ⚡ Emergency Repairs: Electrician, Plumber, Carpenter, AC Repair\n2. 🧹 Home & Food Services: Home Cook, House Cleaner, Gardener\n3. 📚 Care & Education: Tutors, Caregivers, Drivers\n4. 🛡️ Escrow Security: Government e-Shram verified workers with 100% Escrow payment protection.\n\nAapko kaunsa worker chahiye?`,
      actionCategory: null,
      isEmergency: false,
      confidence: "99.0%"
    };
  }

  // 8. Electrician / Power Fault
  if (q.includes("electric") || q.includes("light") || q.includes("bijli") || q.includes("switch") || q.includes("current") || q.includes("wire") || q.includes("fan")) {
    return {
      reply: `${greeting} Bijli ya electrical issue hai? ⚡ Humari AI Geospatial Broadcast system aapke aas-paas ke verified cooperative electricians ko turant job alert bhej degi!`,
      actionCategory: "Electrician",
      isEmergency: true,
      confidence: "99.0%"
    };
  }

  // 9. Plumber / Water Leakage
  if (q.includes("pipe") || q.includes("leak") || q.includes("pani") || q.includes("paani") || q.includes("water") || q.includes("tap") || q.includes("sink") || q.includes("flush")) {
    return {
      reply: `${greeting} Paani leakage ya plumbing problem hai? 💧 Aap direct plumbing broadcast trigger kar sakte hain aur verified plumber aapke ghar aayega.`,
      actionCategory: "Plumber",
      isEmergency: false,
      confidence: "99.0%"
    };
  }

  // 10. Escrow / Payment Safety
  if (q.includes("escrow") || q.includes("payment") || q.includes("paisa") || q.includes("money") || q.includes("safe") || q.includes("charge")) {
    return {
      reply: `${greeting} SahakarGig pe aapka paisa 100% safe hai 🛡️! Aapka payment Razorpay Escrow account mein rehta hai. Jab tak worker kaam poora karke aapko satisfy nahi karta, tab tak paisa release nahi hota.`,
      actionCategory: null,
      isEmergency: false,
      confidence: "99.0%"
    };
  }

  // Dynamic Non-Repeating Fallbacks
  const dynamicFallbacks = [
    `${greeting} Main Saarthi (सारथी) hoon — aapka official SahakarGig AI Guide. Aap mujhse Electrician, Plumber, Cook, Cleaner, Tutors ya Escrow payments ke baare mein kuch bhi pooch sakte hain. Today main aapki kya help karoon?`,
    `${greeting} SahakarGig Cooperative Network mein aapka swagat hai! Humare paas 100% e-Shram verified Electricians, Plumbers, Cooks aur Housekeeping staff available hain. Aapko kaunsi service chahiye?`,
    `${greeting} Main Saarthi (सारथी) 🤖. Aap specific service (jaise "Electrician chahiye", "Cook chahiye", "Water Leakage", "300 me kya milega") batayein aur main aapko turant verified cooperative worker connect kar dunga!`
  ];

  const selectedReply = dynamicFallbacks[Math.abs(hashString(message)) % dynamicFallbacks.length];

  return {
    reply: selectedReply,
    actionCategory: null,
    reason: "General customer query",
    isEmergency: false,
    confidence: "95.0%",
  };
}

async function chatWithGroq(req, res) {
  const { message } = req.body;
  const result = fallbackClassify(message);
  console.log(`\n🤖 [SahakarAI Request] Query: "${message}"`);
  console.log(`💬 [SahakarAI Response] Reply: "${result.reply.replace(/\n/g, ' ')}"\n🏷️  [Category]: ${result.actionCategory || 'General'} | Emergency: ${result.isEmergency}\n`);
  return res.json(result);
}

module.exports = { demandForecast, nudgeProviders, chatWithGroq };

