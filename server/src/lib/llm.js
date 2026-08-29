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
      ? [process.env.GROQ_MODEL, 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']
      : ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'],
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
            response_format: { type: 'json_object' },
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
      ? [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
      : ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
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
              responseMimeType: 'application/json',
            },
          }),
        },
        timeoutMs
      );
      const data = await parseJson(resp);
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      if (!text.trim()) throw new Error('Gemini empty response');
      return text.trim();
    },
  },
  {
    name: 'openrouter',
    key: () => process.env.OPENROUTER_API_KEY,
    models: () => process.env.OPENROUTER_MODEL
      ? [process.env.OPENROUTER_MODEL]
      : null, // discovered lazily below (free models), falls back to FALLBACK_OPENROUTER_MODELS
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
        `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`,
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
  'deepseek/deepseek-chat-v3:free',
  'google/gemini-2.0-flash-001:free',
  'meta-llama/llama-3.3-70b-instruct:free',
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
    const now = Date.now();
    const list = Array.isArray(data?.data) ? data.data : [];
    const free = list
      .filter((m) =>
        m &&
        typeof m.id === 'string' &&
        !(m.deprecation?.is_deprecated) &&
        (m.id.endsWith(':free') || (m.pricing && parseFloat(m.pricing.prompt) === 0))
      )
      .sort((a, b) => {
        const as = a.name || '';
        const bs = b.name || '';
        return (bs.includes('Llama') || bs.includes('DeepSeek') || bs.includes('Qwen') || bs.includes('Gemma')) -
               (as.includes('Llama') || as.includes('DeepSeek') || as.includes('Qwen') || as.includes('Gemma'));
      })
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

// Chat with the full chain. Returns { reply, provider, model } or null if every provider failed.
async function chatLLM(messages, system) {
  const failures = [];
  const cache = {};
  for (const provider of PROVIDERS) {
    const key = provider.key();
    if (!key) {
      failures.push(`${provider.name}: no key`);
      continue;
    }
    let models = provider.models() || [];
    if (models.length === 0 && provider.name === 'openrouter') {
      try { models = await discoverOpenRouterModels(); } catch {}
      if (!models || models.length === 0) models = FALLBACK_OPENROUTER_MODELS;
      console.log(`   🔎 openrouter: trying ${models.join(', ')}`);
      cache.openrouter = models;
    }
    for (const model of models) {
      try {
        const liveSystem = `${system}\n\n[LIVE RUNTIME: You are being served right now by the ${provider.name} provider using the model "${model}". If the user asks what AI model or provider powers you, answer this openly and honestly in one line.]`;
        const text = await provider.call(model, messages, liveSystem);
        console.log(`   ✅ ${provider.name} / ${model} responded`);
        return { reply: text, provider: provider.name, model };
      } catch (err) {
        failures.push(`${provider.name}/${model}: ${err.message}`);
      }
    }
  }
  console.log(`   ⚠️  All LLM providers failed:\n      ${failures.join('\n      ')}`);
  return null;
}

module.exports = { chatLLM };