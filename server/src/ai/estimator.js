const { chatLLM } = require('../lib/llm');

const SERVICE_BASE_PRICES = {
  Electrician: { min: 300, max: 600, hourly: 350 },
  Plumber: { min: 350, max: 700, hourly: 350 },
  Cook: { min: 300, max: 500, hourly: 300 },
  Tutor: { min: 250, max: 600, hourly: 300 },
  Cleaner: { min: 300, max: 600, hourly: 250 },
  Caregiver: { min: 400, max: 900, hourly: 400 },
  Driver: { min: 300, max: 700, hourly: 300 },
  Gardener: { min: 250, max: 550, hourly: 250 },
  Carpenter: { min: 350, max: 800, hourly: 400 },
  'AC Repair': { min: 450, max: 1200, hourly: 450 },
};

/**
 * AI Instant Job Cost Estimator & Quote Generator
 */
async function estimatePriceEngine(service, description) {
  const meta = SERVICE_BASE_PRICES[service] || { min: 300, max: 600, hourly: 350 };
  
  const systemPrompt = `You are SahakarGig's AI Cost Estimator for home & gig services in India.
Analyze the user's service requirement and generate a transparent, accurate cost breakdown in Indian Rupees (INR).
Format your response ONLY as valid JSON with these exact keys:
{
  "minPrice": number,
  "maxPrice": number,
  "estimatedDurationMins": number,
  "partsAllowance": number,
  "cooperativeDiscount": number,
  "escrowDeposit": number,
  "breakdown": [string],
  "reasoning": string
}`;

  const userPrompt = `Service: ${service}\nJob Description: "${description || 'Standard service request'}"\nBase Price Range: ₹${meta.min} - ₹${meta.max}`;

  try {
    const llm = await chatLLM([{ role: 'user', content: userPrompt }], systemPrompt);
    if (llm && llm.reply) {
      const match = llm.reply.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.minPrice && parsed.maxPrice) {
          return {
            service,
            description,
            minPrice: Math.max(200, Number(parsed.minPrice)),
            maxPrice: Math.max(Number(parsed.minPrice) + 100, Number(parsed.maxPrice)),
            estimatedDurationMins: Number(parsed.estimatedDurationMins) || 60,
            partsAllowance: Number(parsed.partsAllowance) || 0,
            cooperativeDiscount: Number(parsed.cooperativeDiscount) || 50,
            escrowDeposit: Number(parsed.minPrice),
            breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown : [`Base Labor: ₹${parsed.minPrice}`, `Cooperative Member Subsidy: -₹50`],
            reasoning: parsed.reasoning || `Itemized AI estimate for ${service} in India.`,
            via: `${llm.provider}:${llm.model}`,
          };
        }
      }
    }
  } catch (err) {
    console.error('AI Estimator LLM error, using heuristic fallback:', err.message);
  }

  // Heuristic Fallback
  const minPrice = meta.min;
  const maxPrice = meta.max;
  return {
    service,
    description,
    minPrice,
    maxPrice,
    estimatedDurationMins: 60,
    partsAllowance: service === 'AC Repair' || service === 'Electrician' ? 200 : 0,
    cooperativeDiscount: 50,
    escrowDeposit: minPrice,
    breakdown: [
      `Standard Labor Charge: ₹${minPrice}`,
      `Government Certified Cooperative Member Subsidy: -₹50`,
      `Razorpay Escrow Protection Guarantee: Included`,
    ],
    reasoning: `Standard baseline estimate for ${service} based on verified cooperative society pricing tiers.`,
    via: 'local-heuristic',
  };
}

module.exports = { estimatePriceEngine };
