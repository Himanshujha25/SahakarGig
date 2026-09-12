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
- Reply to EVERYTHING conversationally like a human friend.
- If the user asks for a service, detect it and set actionCategory to exactly one of: ${SERVICE_CATEGORIES.join(', ')} (null if no service requested).
- Set isEmergency=true only for urgent situations.`;

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
  return {
    reply: parsed.reply.trim(),
    actionCategory: SERVICE_CATEGORIES.includes(parsed.actionCategory) ? parsed.actionCategory : null,
    isEmergency: !!parsed.isEmergency,
  };
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
      return { ...structured, via: `${llm.provider}:${llm.model}` };
    }
    return { reply: llm.reply, actionCategory: null, isEmergency: false, via: `${llm.provider}:${llm.model}` };
  }

  // Smart local rule-based intent engine when cloud LLM is offline/unconfigured
  const textLower = message.toLowerCase();
  let actionCategory = null;
  let isEmergency = false;

  if (textLower.includes('electric') || textLower.includes('light') || textLower.includes('wiring') || textLower.includes('switch') || textLower.includes('bijli') || textLower.includes('fuse')) {
    actionCategory = 'Electrician';
  } else if (textLower.includes('plumb') || textLower.includes('pipe') || textLower.includes('tap') || textLower.includes('leak') || textLower.includes('drain') || textLower.includes('water') || textLower.includes('nal')) {
    actionCategory = 'Plumber';
  } else if (textLower.includes('ac') || textLower.includes('cool') || textLower.includes('air condition')) {
    actionCategory = 'AC Repair';
  } else if (textLower.includes('cook') || textLower.includes('food') || textLower.includes('chef') || textLower.includes('khana') || textLower.includes('rasoi')) {
    actionCategory = 'Cook';
  } else if (textLower.includes('clean') || textLower.includes('sweep') || textLower.includes('mop') || textLower.includes('jhadu') || textLower.includes('safai')) {
    actionCategory = 'Cleaner';
  } else if (textLower.includes('carpent') || textLower.includes('wood') || textLower.includes('furniture') || textLower.includes('door') || textLower.includes('table')) {
    actionCategory = 'Carpenter';
  } else if (textLower.includes('garden') || textLower.includes('plant') || textLower.includes('grass') || textLower.includes('mal')) {
    actionCategory = 'Gardener';
  } else if (textLower.includes('tutor') || textLower.includes('teacher') || textLower.includes('study') || textLower.includes('math') || textLower.includes('padhai')) {
    actionCategory = 'Tutor';
  } else if (textLower.includes('care') || textLower.includes('elder') || textLower.includes('senior') || textLower.includes('patient') || textLower.includes('nursery')) {
    actionCategory = 'Caregiver';
  } else if (textLower.includes('driv') || textLower.includes('car') || textLower.includes('gaadi') || textLower.includes('chauffeur')) {
    actionCategory = 'Driver';
  }

  if (textLower.includes('urgent') || textLower.includes('emergenc') || textLower.includes('immediately') || textLower.includes('turant') || textLower.includes('short circuit') || textLower.includes('burst')) {
    isEmergency = true;
  }

  let reply = `Namaste! 🙏 Main Saarthi (सारथी) hoon — SahakarGig AI Guide. `;

  if (actionCategory) {
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
    via: 'local-engine',
  };
}

module.exports = { saarthiChatEngine };
