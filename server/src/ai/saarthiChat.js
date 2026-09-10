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

  return {
    reply: `Namaste! 🙏 Main Saarthi (सारथी) hoon — SahakarGig AI Guide. Main aapko verified Electricians, Plumbers, Cooks, Tutors aur Escrow payments mein assist kar sakta hoon!`,
    actionCategory: null,
    isEmergency: false,
    via: 'local-fallback',
  };
}

module.exports = { saarthiChatEngine };
