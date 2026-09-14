const { chatLLM } = require('../lib/llm');

async function translateContentEngine(text, targetLang = 'hi') {
  if (!text || !text.trim() || targetLang === 'en') {
    return { translatedText: text || '' };
  }

  try {
    const prompt = `Translate the following text into target language "${targetLang}". Return ONLY the exact translated text without quotes or explanations.\n\nText: ${text}`;
    const llm = await chatLLM([{ role: 'user', content: prompt }], 'You are a professional translator for Indian languages.');

    if (llm && llm.reply && llm.reply.trim()) {
      return { translatedText: llm.reply.trim().replace(/^["']|["']$/g, '') };
    }

    const langCode = targetLang === 'mai' ? 'hi' : targetLang;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${langCode}`;
    const resp = await fetch(url);
    const data = await resp.json();
    const translatedText = data?.responseData?.translatedText || text;

    return { translatedText };
  } catch (err) {
    return { translatedText: text };
  }
}

module.exports = { translateContentEngine };
