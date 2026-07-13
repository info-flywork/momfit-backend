const express = require('express');
const { query } = require('../config/db');
const { verifyUser } = require('../middleware/userAuth');
const { ensureUserRecord } = require('../middleware/ensureUser');
const { asyncHandler } = require('../lib/asyncHandler');
const { uploadToCdn, cdnEnabled } = require('../lib/cdn');
const {
  fetchUserContext,
  buildWelcomeMessage,
  buildSystemPrompt,
} = require('../services/userContext');
const {
  generateChatReply,
  historyFromMessages,
  transcribeAudio,
} = require('../services/openaiChat');
const { extractDocumentText } = require('../services/documentExtract');

const router = express.Router();
const HISTORY_LIMIT = 20;
const FREE_CHAT_CREATE_LIMIT = 3;
const CHAT_AVATAR_EMOJIS = ['🤰', '👶🏻', '🥦', '🥱', '💬'];

function chatAvatarEmoji(id) {
  let hash = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return CHAT_AVATAR_EMOJIS[hash % CHAT_AVATAR_EMOJIS.length];
}
const DEFAULT_CHAT_TITLE = 'Yeni Sohbet';
const DEFAULT_CHAT_TITLES = new Set([
  'Yeni Sohbet',
  'New Chat',
  'Neuer Chat',
  'Nuova Chat',
  'Nouvelle discussion',
  '新しいチャット',
  'Nuevo chat',
  'Новый чат',
  '새로운 채팅',
  'नई चैट',
  'Nova Conversa',
  '新会话',
]);

function isDefaultChatTitle(title) {
  return !title || DEFAULT_CHAT_TITLES.has(String(title).trim());
}

router.use(verifyUser);
router.use(ensureUserRecord);

function imageExtFromMime(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'text/plain') return 'txt';
  if (mimeType === 'audio/mp4' || mimeType === 'audio/m4a' || mimeType === 'audio/x-m4a') {
    return 'm4a';
  }
  if (mimeType === 'audio/mpeg' || mimeType === 'audio/mp3') return 'mp3';
  if (mimeType === 'audio/aac') return 'aac';
  if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') return 'wav';
  if (mimeType === 'audio/webm') return 'webm';
  if (mimeType === 'audio/ogg') return 'ogg';
  return 'jpg';
}

function isImageMime(mimeType) {
  return typeof mimeType === 'string' && mimeType.startsWith('image/');
}

function isAudioMime(mimeType) {
  return typeof mimeType === 'string' && mimeType.startsWith('audio/');
}

async function isUserPremium(userId) {
  try {
    const userRows = await query(
      'SELECT is_premium, premium_expires_at FROM users WHERE id = ? LIMIT 1',
      [userId],
    );
    const user = userRows[0];
    if (!user || Number(user.is_premium) !== 1) return false;
    if (!user.premium_expires_at) return true;
    return new Date(user.premium_expires_at).getTime() > Date.now();
  } catch (err) {
    // Yerel DB'de abonelik kolonları henüz yoksa ücretsiz say.
    if (err && err.code === 'ER_BAD_FIELD_ERROR') return false;
    throw err;
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const chats = await query(
      `SELECT
         c.id,
         c.title,
         c.emoji,
         c.last_message,
         c.updated_at,
         (
           SELECT m.id
           FROM messages m
           WHERE m.chat_id = c.id
           ORDER BY m.created_at DESC, m.id DESC
           LIMIT 1
         ) AS last_message_id
       FROM chats c
       WHERE c.user_id = ? AND c.deleted_at IS NULL
       ORDER BY c.updated_at DESC`,
      [req.userId],
    );

    const totalRows = await query(
      'SELECT COUNT(*) AS c FROM chats WHERE user_id = ?',
      [req.userId],
    );
    const createdTotal = Number(totalRows[0]?.c ?? 0);

    res.json({ chats, created_total: createdTotal });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { id, title = DEFAULT_CHAT_TITLE } = req.body;
    const emoji =
      typeof req.body?.emoji === 'string' && req.body.emoji.trim()
        ? req.body.emoji.trim()
        : chatAvatarEmoji(id);

    if (!id || !title) {
      return res.status(400).json({ error: 'id_and_title_required' });
    }

    if (!(await isUserPremium(req.userId))) {
      const totalRows = await query(
        'SELECT COUNT(*) AS c FROM chats WHERE user_id = ?',
        [req.userId],
      );
      const createdTotal = Number(totalRows[0]?.c ?? 0);
      if (createdTotal >= FREE_CHAT_CREATE_LIMIT) {
        return res.status(403).json({
          error: 'free_chat_limit',
          message: `Ücretsiz hesapta en fazla ${FREE_CHAT_CREATE_LIMIT} sohbet oluşturulabilir.`,
          limit: FREE_CHAT_CREATE_LIMIT,
          created_total: createdTotal,
        });
      }
    }

    const locale =
      typeof req.body?.locale === 'string' ? req.body.locale : req.get('accept-language');

    const ctx = await fetchUserContext(req.userId);
    const welcome = buildWelcomeMessage(ctx, locale);

    await query(
      `INSERT INTO chats (id, user_id, title, emoji, last_message)
     VALUES (?, ?, ?, ?, ?)`,
      [id, req.userId, title, emoji, welcome],
    );

    const welcomeId = `${id}_welcome`;
    await query(
      `INSERT INTO messages (id, chat_id, content, sender)
     VALUES (?, ?, ?, 'ai')`,
      [welcomeId, id, welcome],
    );

    const rows = await query('SELECT * FROM chats WHERE id = ? LIMIT 1', [id]);
    const messages = await query(
      `SELECT id, content, sender, attachment_url, attachment_type, attachment_name, created_at
     FROM messages WHERE chat_id = ? ORDER BY created_at ASC`,
      [id],
    );

    res.status(201).json({ chat: rows[0], messages });
  }),
);

router.delete(
  '/:chatId',
  asyncHandler(async (req, res) => {
    const { chatId } = req.params;

    const result = await query(
      `UPDATE chats
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [chatId, req.userId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'chat_not_found' });
    }

    res.json({ deleted: true });
  }),
);

router.get(
  '/:chatId/messages',
  asyncHandler(async (req, res) => {
    const { chatId } = req.params;

    const chat = await query(
      'SELECT id FROM chats WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1',
      [chatId, req.userId],
    );
    if (!chat.length) {
      return res.status(404).json({ error: 'chat_not_found' });
    }

    const messages = await query(
      `SELECT id, content, sender, attachment_url, attachment_type, attachment_name, created_at
     FROM messages
     WHERE chat_id = ?
     ORDER BY created_at ASC`,
      [chatId],
    );

    res.json({ messages });
  }),
);

router.post(
  '/:chatId/messages',
  asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const {
      id,
      content,
      attachment_base64,
      mime_type,
      attachment_name,
      attachment_type,
    } = req.body;

    const trimmed = typeof content === 'string' ? content.trim() : '';
    const hasAttachment =
      typeof attachment_base64 === 'string' && attachment_base64.length > 0;

    if (!id || (!trimmed && !hasAttachment)) {
      return res.status(400).json({ error: 'id_and_content_required' });
    }

    const chatRows = await query(
      'SELECT id, title FROM chats WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1',
      [chatId, req.userId],
    );
    if (!chatRows.length) {
      return res.status(404).json({ error: 'chat_not_found' });
    }

    const mimeType =
      typeof mime_type === 'string' && mime_type ? mime_type : 'image/jpeg';
    let attType = null;
    if (hasAttachment) {
      if (
        attachment_type === 'document' ||
        attachment_type === 'image' ||
        attachment_type === 'audio'
      ) {
        attType = attachment_type;
      } else if (isAudioMime(mimeType)) {
        attType = 'audio';
      } else if (isImageMime(mimeType)) {
        attType = 'image';
      } else {
        attType = 'document';
      }
    }
    const attName =
      typeof attachment_name === 'string' && attachment_name.trim()
        ? attachment_name.trim().slice(0, 255)
        : null;

    const attachmentBuffer = hasAttachment
      ? Buffer.from(attachment_base64, 'base64')
      : null;

    // CDN, AI ile paralel — yanıt süresini CDN eklemez.
    const cdnPromise =
      attachmentBuffer && cdnEnabled
        ? uploadToCdn(
            `chat/${req.userId}/${chatId}/${id}.${imageExtFromMime(mimeType)}`,
            attachmentBuffer,
            mimeType,
          )
            .then((url) => {
              console.log('[chats] attachment CDN ok:', url);
              return url;
            })
            .catch((err) => {
              console.warn('[chats] attachment CDN upload failed:', err.message);
              return null;
            })
        : Promise.resolve(null);

    const storedContent =
      trimmed ||
      (attType === 'image'
        ? '📷 Görsel'
        : attType === 'audio'
          ? '🎤 Sesli mesaj'
          : attName
            ? `📎 ${attName}`
            : '📎 Belge');

    await query(
      `INSERT INTO messages
       (id, chat_id, content, sender, attachment_url, attachment_type, attachment_name)
     VALUES (?, ?, ?, 'user', ?, ?, ?)`,
      [id, chatId, storedContent, null, attType, attName],
    );

    const historyPromise = query(
      `SELECT id, content, sender
     FROM messages
     WHERE chat_id = ? AND id != ?
     ORDER BY created_at DESC
     LIMIT ?`,
      [chatId, id, HISTORY_LIMIT],
    );
    const ctxPromise = fetchUserContext(req.userId);

    const locale =
      typeof req.body?.locale === 'string' ? req.body.locale : req.get('accept-language');

    const aiPromise = (async () => {
      const t0 = Date.now();
      const [historyRows, ctx] = await Promise.all([historyPromise, ctxPromise]);
      historyRows.reverse();

      const systemPrompt = buildSystemPrompt(ctx, locale);
      const welcomeLocalized = buildWelcomeMessage(ctx, locale);
      const history = historyFromMessages(
        historyRows.map((row) =>
          String(row.id || '').endsWith('_welcome')
            ? { ...row, content: welcomeLocalized }
            : row,
        ),
      );

      let userMessageForAi = trimmed;
      let imageBase64 = null;
      if (hasAttachment && isImageMime(mimeType)) {
        imageBase64 = attachment_base64;
      } else if (hasAttachment && attType === 'audio') {
        const transcript = await transcribeAudio({
          base64: attachment_base64,
          mimeType,
          fileName: attName || `voice.${imageExtFromMime(mimeType)}`,
        });
        userMessageForAi =
          `${trimmed ? `${trimmed}\n\n` : ''}` +
          (transcript
            ? `Kullanıcı bir sesli mesaj gönderdi. Transkript:\n"${transcript}"`
            : 'Kullanıcı bir sesli mesaj gönderdi. Ses içeriğini duyamıyorsun; hamilelik, egzersiz veya beslenme bağlamında kısa ve sıcak bir yanıt ver, gerekirse ne sorduğunu netleştirmek için nazikçe sor.');
      } else if (hasAttachment && attType === 'document') {
        const docText = await extractDocumentText({
          base64: attachment_base64,
          mimeType,
          fileName: attName,
        });
        if (docText) {
          userMessageForAi =
            `${trimmed ? `${trimmed}\n\n` : ''}` +
            `Kullanıcı bir belge paylaştı${attName ? ` (${attName})` : ''}. ` +
            'Belge içeriğini oku ve hamilelik, egzersiz veya beslenme bağlamında yardımcı ol.\n\n' +
            `--- BELGE İÇERİĞİ ---\n${docText}\n--- BELGE SONU ---`;
        } else {
          userMessageForAi =
            `${trimmed ? `${trimmed}\n\n` : ''}` +
            `Kullanıcı bir belge paylaştı${attName ? `: ${attName}` : ''}. ` +
            'Belge metni çıkarılamadı (taranmış/görsel PDF veya desteklenmeyen format olabilir). ' +
            'Bunu kullanıcıya nazikçe söyle; belgenin özetini yazmasını veya fotoğraf olarak göndermesini iste. ' +
            'Hamilelik, egzersiz veya beslenme bağlamında genel ve güvenli rehberlik sun.';
        }
      }

      const aiContent = await generateChatReply({
        systemPrompt,
        history,
        userMessage: userMessageForAi,
        imageBase64,
        mimeType,
      });
      console.log(`[chats] ai reply ${Date.now() - t0}ms`);
      return aiContent;
    })();

    const [attachmentUrl, aiContent] = await Promise.all([cdnPromise, aiPromise]);

    if (attachmentUrl) {
      await query('UPDATE messages SET attachment_url = ? WHERE id = ?', [
        attachmentUrl,
        id,
      ]);
    }

    const aiId = `${id}_ai`;
    await query(
      `INSERT INTO messages (id, chat_id, content, sender)
     VALUES (?, ?, ?, 'ai')`,
      [aiId, chatId, aiContent],
    );

    const chatTitle = chatRows[0].title;
    if (isDefaultChatTitle(chatTitle)) {
      const shortTitle =
        storedContent.length > 42
          ? `${storedContent.slice(0, 42)}…`
          : storedContent;
      await query('UPDATE chats SET title = ? WHERE id = ?', [shortTitle, chatId]);
    }

    await query(
      `UPDATE chats
     SET last_message = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
      [aiContent, chatId],
    );

    const messages = await query(
      `SELECT id, content, sender, attachment_url, attachment_type, attachment_name, created_at
     FROM messages
     WHERE chat_id = ? AND id IN (?, ?)
     ORDER BY created_at ASC`,
      [chatId, id, aiId],
    );

    res.status(201).json({ messages });
  }),
);

module.exports = router;
