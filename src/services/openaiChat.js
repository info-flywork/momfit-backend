const { openaiApiKey, openaiModel } = require('../config/env');

const FALLBACK_REPLY =
  'Şu an yanıt oluşturamıyorum. Lütfen biraz sonra tekrar dene veya doktoruna danış.';

function buildUserContent({ userMessage, imageBase64, mimeType }) {
  const text =
    (userMessage && userMessage.trim()) ||
    (imageBase64
      ? 'Kullanıcı bir görsel paylaştı. Hamilelik, egzersiz veya beslenme bağlamında yardımcı ol.'
      : '');

  if (!imageBase64) return text;

  return [
    { type: 'text', text },
    {
      type: 'image_url',
      image_url: {
        url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
        // low: çok daha hızlı; chat için yeterli detay
        detail: 'low',
      },
    },
  ];
}

async function generateChatReply({
  systemPrompt,
  history,
  userMessage,
  imageBase64,
  mimeType,
}) {
  if (!openaiApiKey) {
    console.warn('[openai] OPENAI_API_KEY tanımlı değil.');
    return FALLBACK_REPLY;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    {
      role: 'user',
      content: buildUserContent({ userMessage, imageBase64, mimeType }),
    },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: openaiModel,
      messages,
      temperature: 0.6,
      max_tokens: imageBase64 ? 450 : 700,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[openai] API hatası:', response.status, errText);
    return FALLBACK_REPLY;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  return content || FALLBACK_REPLY;
}

function historyFromMessages(rows) {
  return rows
    .filter((row) => row.content?.trim())
    .map((row) => ({
      role: row.sender === 'ai' ? 'assistant' : 'user',
      content: row.content.trim(),
    }));
}

async function transcribeAudio({ base64, mimeType, fileName }) {
  if (!openaiApiKey || !base64) return null;

  try {
    const buffer = Buffer.from(base64, 'base64');
    const form = new FormData();
    form.append(
      'file',
      new Blob([buffer], { type: mimeType || 'audio/mp4' }),
      fileName || 'voice.m4a',
    );
    form.append('model', 'whisper-1');

    const response = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: form,
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[openai] whisper hatası:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    return text || null;
  } catch (err) {
    console.error('[openai] whisper exception:', err.message);
    return null;
  }
}

module.exports = {
  generateChatReply,
  historyFromMessages,
  transcribeAudio,
  FALLBACK_REPLY,
};
