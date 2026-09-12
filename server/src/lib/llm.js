// Multi-provider LLM dispatch with automatic fallback.
// Chain (only providers with a configured key are tried):
//   Groq → Gemini → OpenRouter → HuggingFace
// Returns the first successful completion; each call is time-boxed
// so the whole chain stays responsive ("real-time").
//
// Env keys:
//   GROQ_API_KEY          candidates: openai/gpt-oss-120b, qwen/qwen3.8-27b, openai/gpt-oss-20b
//   GEMINI_API_KEY        candidates: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash
//   OPENROUTER_API_KEY    candidates: deepseek-chat-v3:free, gemini-2.0-flash-001:free, llama-3.3-70b-instruct:free
//   HF_API_KEY            candidates: Qwen/Qwen2.5-7B-Instruct, microsoft/Phi-3.5-mini-instruct
// Per-provider model override: GROQ_MODEL, GEMINI_MODEL, OPENROUTER_MODEL, HF_MODEL

const PROMPT_PREAMBLE =
  'Return ONLY one valid JSON object, no markdown, no extra text, with exactly these keys: {"reply":"...","actionCategory":null,"isEmergency":false}. ';

const PROVIDERS = [
  {
    name: 'groq',
    key: () => process.env.GROQ_API_KEY,
    models: () => process.env.GROQ_MODEL
      ? [process.env.GROQ_MODEL, 'groq/compound', 'groq/compound-mini', 'qwen/qwen3.6-27b', 'openai/gpt-oss-120b']
      : ['groq/compound', 'groq/compound-mini', 'qwen/qwen3.6-27b', 'openai/gpt-oss-120b'],
    async call(model, messages, system, timeoutMs) {
      const resp = await timeoutFetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: PROMPT_PREAMBLE + system }, ...messages],
            temperature: 0.7,
            max_tokens: 500,
          }),
        },
        timeoutMs
      );
      return openAiText(resp, model);
    },
  },
  {
    name: 'gemini',
    key: () => process.env.GEMINI_API_KEY,
    models: () => process.env.GEMINI_MODEL
      ? [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro']
      : ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro'],
    async call(model, messages, system, timeoutMs) {
      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const key = process.env.GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const resp = await timeoutFetch(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: PROMPT_PREAMBLE + system }] },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
          }),
        },
        timeoutMs
      );
      const data = await parseJson(resp);
      if (data.error) {
        throw new Error(`Gemini API Error (${data.error.code || resp.status}): ${data.error.message}`);
      }
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      if (!text.trim()) throw new Error('Gemini returned an empty reply payload');
      return text.trim();
    },
  },
  {
    name: 'openrouter',
    key: () => process.env.OPENROUTER_API_KEY,
    models: () => process.env.OPENROUTER_MODEL
      ? [process.env.OPENROUTER_MODEL]
      : null,
    async call(model, messages, system, timeoutMs) {
      const resp = await timeoutFetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.CLIENT_ORIGIN || 'http://localhost:5173',
            'X-Title': 'SahakarGig',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: PROMPT_PREAMBLE + system }, ...messages],
            temperature: 0.7,
            max_tokens: 500,
          }),
        },
        timeoutMs
      );
      return openAiText(resp, model);
    },
  },
  {
    name: 'huggingface',
    key: () => process.env.HF_API_KEY,
    models: () => process.env.HF_MODEL
      ? [process.env.HF_MODEL, 'Qwen/Qwen2.5-7B-Instruct', 'microsoft/Phi-3.5-mini-instruct']
      : ['Qwen/Qwen2.5-7B-Instruct', 'microsoft/Phi-3.5-mini-instruct'],
    async call(model, messages, system, timeoutMs) {
      const resp = await timeoutFetch(
        `https://router.huggingface.co/hf-inference/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: PROMPT_PREAMBLE + system }, ...messages],
            temperature: 0.7,
            max_tokens: 500,
          }),
        },
        timeoutMs
      );
      return openAiText(resp, model);
    },
  },
];

const DEFAULT_TIMEOUT_MS = 15000;

const FALLBACK_OPENROUTER_MODELS = [
  'google/gemma-2-9b-it:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
];

// Discover free chat models from OpenRouter so we always pick one that works.
async function discoverOpenRouterModels() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/models', {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const list = Array.isArray(data?.data) ? data.data : [];
    const free = list
      .filter((m) =>
        m &&
        typeof m.id === 'string' &&
        !(m.deprecation?.is_deprecated) &&
        (m.id.endsWith(':free') || (m.pricing && parseFloat(m.pricing.prompt) === 0))
      )
      .slice(0, 5)
      .map((m) => m.id);
    return free.length ? free : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function timeoutFetch(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function parseJson(resp) {
  let text = '';
  if (resp && typeof resp.text === 'function') text = await resp.text();
  else if (resp && typeof resp.json === 'function') return resp.json();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON upstream response: ${text.slice(0, 200)}`);
  }
}

async function openAiText(resp, model) {
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`${model} ${resp.status}: ${detail.slice(0, 200)}`);
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text.trim()) throw new Error(`${model} empty reply`);
  return text.trim();
}

let hasLoggedNotice = false;

// Chat with the full chain. Returns { reply, provider, model } or null if every provider failed.
async function chatLLM(messages, system) {
  const failures = [];
  let configuredProvidersCount = 0;

  for (const provider of PROVIDERS) {
    const key = provider.key();
    if (!key || !key.trim()) {
      failures.push(`${provider.name}: API key unconfigured in .env`);
      continue;
    }
    configuredProvidersCount++;
    let models = provider.models() || [];
    if (models.length === 0 && provider.name === 'openrouter') {
      try { models = await discoverOpenRouterModels(); } catch {}
      if (!models || models.length === 0) models = FALLBACK_OPENROUTER_MODELS;
    }
    for (const model of models) {
      try {
        const liveSystem = `${system}\n\n[LIVE RUNTIME: You are powered by ${provider.name} model "${model}". Answer dynamically.]`;
        const text = await provider.call(model, messages, liveSystem);
        console.log(`   ✅ Dynamic Cloud AI [${provider.name}:${model}] generated response successfully`);
        return { reply: text, provider: provider.name, model };
      } catch (err) {
        failures.push(`${provider.name}/${model}: ${err.message}`);
        console.warn(`   ⚠️ Dynamic AI Provider Error [${provider.name}:${model}]:`, err.message);
      }
    }
  }

  if (configuredProvidersCount === 0 && !hasLoggedNotice) {
    console.log(`\n🤖 [AI Engine Setup Required]`);
    console.log(`   No active Cloud AI key set in server/.env.`);
    console.log(`   To activate 100% Dynamic Cloud AI, get a FREE key from:`);
    console.log(`   👉 Google AI Studio: https://aistudio.google.com/app/apikey`);
    console.log(`   👉 Groq Cloud: https://console.groq.com/keys`);
    console.log(`   Then paste key into server/.env -> GEMINI_API_KEY or GROQ_API_KEY\n`);
    hasLoggedNotice = true;
  }
  return null;
}

module.exports = { chatLLM };