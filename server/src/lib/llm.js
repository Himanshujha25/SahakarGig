// Multi-provider LLM dispatch with automatic CYCLE fallback.
// Cycle order (only providers with a configured key are tried):
//   Groq → Gemini → OpenRouter → HuggingFace → (null = local engine)
// If provider #1 fails on ALL its models, we automatically move to #2,
// then #3 — so one dead/expired key NEVER breaks voice search.
// Each call is time-boxed so the whole cycle stays responsive ("real-time").
//
// Env keys:
//   GROQ_API_KEY          verified models: llama-3.3-70b-versatile, llama-3.1-8b-instant, openai/gpt-oss-20b, openai/gpt-oss-120b
//   GEMINI_API_KEY        candidates: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash
//   OPENROUTER_API_KEY    router: openrouter/free + live-discovered :free models
//   HF_API_KEY            candidates: Qwen/Qwen2.5-7B-Instruct, microsoft/Phi-3.5-mini-instruct
// Per-provider model override: GROQ_MODEL, GEMINI_MODEL, OPENROUTER_MODEL, HF_MODEL

const PROMPT_PREAMBLE =
  'Return ONLY one valid JSON object, no markdown, no extra text, with exactly these keys: {"reply":"...","actionCategory":null,"isEmergency":false,"suggestions":[]}. "suggestions" is an array of 0-3 objects like {"category":"Plumber","reason":"...","isEmergency":false}. Include one entry per distinct service the user asked for (multi-intent supported). "actionCategory" must equal suggestions[0]?.category or null. ';

const GROQ_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'qwen/qwen3-32b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
];

const PROVIDERS = [
  {
    name: 'groq',
    key: () => process.env.GROQ_API_KEY,
    models: () => {
      const override = (process.env.GROQ_MODEL || '').trim();
      if (override) return [override, ...GROQ_MODELS.filter((m) => m !== override)];
      return [...GROQ_MODELS];
    },
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
    models: () => {
      const override = (process.env.OPENROUTER_MODEL || '').trim();
      // openrouter/free = auto-router over all live free models (most resilient first try)
      if (override) return [override];
      return null; // resolved via live discovery + fallbacks below
    },
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

const DEFAULT_TIMEOUT_MS = 12000;
const PER_MODEL_TIMEOUT_MS = 12000;

// Sep-2026 verified free endpoints (plus live discovery + openrouter/free router).
const FALLBACK_OPENROUTER_MODELS = [
  'openrouter/free',
  'google/gemma-3-27b-it:free',
  'google/gemma-2-9b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
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

// Chat with the full CYCLE. Returns { reply, provider, model } or null if every provider failed.
// Cycle: Groq → Gemini → OpenRouter → HF. A dead key/model never stops the cycle.
async function chatLLM(messages, system, opts = {}) {
  const failures = [];
  const attempted = [];
  let configuredProvidersCount = 0;
  const timeoutMs = opts.timeoutMs || PER_MODEL_TIMEOUT_MS;

  for (const provider of PROVIDERS) {
    const key = provider.key();
    if (!key || !key.trim()) {
      failures.push(`${provider.name}: API key unconfigured in .env`);
      continue;
    }
    configuredProvidersCount++;
    let models = provider.models() || [];
    if (provider.name === 'openrouter' && (!models || models.length <= 1)) {
      // Expand openrouter/free into live-discovered free models for extra resilience.
      let discovered = null;
      try { discovered = await discoverOpenRouterModels(); } catch {}
      const base = models && models.length ? models : [];
      const pool = [...base];
      if (discovered) for (const m of discovered) if (!pool.includes(m)) pool.push(m);
      for (const m of FALLBACK_OPENROUTER_MODELS) if (!pool.includes(m)) pool.push(m);
      models = pool.slice(0, 8); // cap cycle length so UX stays real-time
    }
    for (const model of models) {
      attempted.push(`${provider.name}:${model}`);
      try {
        const liveSystem = `${system}\n\n[LIVE RUNTIME: You are powered by ${provider.name} model "${model}". Answer dynamically.]`;
        const text = await provider.call(model, messages, liveSystem, timeoutMs);
        console.log(`   ✅ Dynamic Cloud AI [${provider.name}:${model}] generated response successfully`);
        return { reply: text, provider: provider.name, model, attempted, failures };
      } catch (err) {
        failures.push(`${provider.name}/${model}: ${err.message}`);
        console.warn(`   ⚠️ AI cycle: [${provider.name}:${model}] failed → trying next (${err.message})`);
      }
    }
  }

  if (configuredProvidersCount === 0 && !hasLoggedNotice) {
    console.log(`\n🤖 [AI Engine Setup Required]`);
    console.log(`   No active Cloud AI key set in server/.env.`);
    console.log(`   To activate 100% Dynamic Cloud AI, get a FREE key from:`);
    console.log(`   👉 Google AI Studio: https://aistudio.google.com/app/apikey`);
    console.log(`   👉 Groq Cloud: https://console.groq.com/keys`);
    console.log(`   👉 OpenRouter: https://openrouter.ai/keys`);
    console.log(`   Then paste key into server/.env -> GEMINI_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY\n`);
    hasLoggedNotice = true;
  } else if (configuredProvidersCount > 0) {
    console.warn(`   ❌ AI cycle exhausted (${attempted.length} attempts). Falling back to local engine.`);
  }
  const err = new Error(`AI cycle exhausted: ${failures.join(' | ').slice(0, 500)}`);
  err.attempted = attempted;
  err.failures = failures;
  return null;
}

// Non-secret status snapshot for GET /api/ai/status (never returns key values).
function getAIStatus() {
  const mask = (v) => (!v || !v.trim() ? 'missing' : `set(len=${v.trim().length}, tail=…${v.trim().slice(-4)})`);
  return {
    cycle: ['groq', 'gemini', 'openrouter', 'huggingface'],
    providers: {
      groq: { key: mask(process.env.GROQ_API_KEY || ''), models: GROQ_MODELS.slice(0, 4) },
      gemini: { key: mask(process.env.GEMINI_API_KEY || ''), models: ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'] },
      openrouter: { key: mask(process.env.OPENROUTER_API_KEY || ''), model: (process.env.OPENROUTER_MODEL || 'auto-discover').trim() || 'auto-discover' },
      huggingface: { key: mask(process.env.HF_API_KEY || '') },
    },
  };
}

module.exports = { chatLLM, getAIStatus };