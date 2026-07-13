const { openaiApiKey, openaiModel } = require('../config/env');

const FALLBACK_REPLY =
  'Şu an yanıt oluşturamıyorum. Lütfen biraz sonra tekrar dene veya doktoruna danış.';

async function generateChatReply({ systemPrompt, history, userMessage }) {
  if (!openaiApiKey) {
    console.warn('[openai] OPENAI_API_KEY tanımlı değil.');
    return FALLBACK_REPLY;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
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
      max_tokens: 700,
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

module.exports = { generateChatReply, historyFromMessages, FALLBACK_REPLY };
