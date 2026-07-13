const express = require('express');
const { query } = require('../config/db');
const { verifyUser } = require('../middleware/userAuth');
const { ensureUserRecord } = require('../middleware/ensureUser');
const { asyncHandler } = require('../lib/asyncHandler');
const {
  fetchUserContext,
  buildWelcomeMessage,
  buildSystemPrompt,
} = require('../services/userContext');
const {
  generateChatReply,
  historyFromMessages,
} = require('../services/openaiChat');

const router = express.Router();
const HISTORY_LIMIT = 20;
const DEFAULT_CHAT_TITLE = 'Yeni Sohbet';

router.use(verifyUser);
router.use(ensureUserRecord);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const chats = await query(
      `SELECT id, title, emoji, last_message, updated_at
     FROM chats
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
      [req.userId],
    );
    res.json({ chats });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { id, title = DEFAULT_CHAT_TITLE, emoji = '💬' } = req.body;

    if (!id || !title) {
      return res.status(400).json({ error: 'id_and_title_required' });
    }

    const ctx = await fetchUserContext(req.userId);
    const welcome = buildWelcomeMessage(ctx);

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
      `SELECT id, content, sender, created_at
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
      'DELETE FROM chats WHERE id = ? AND user_id = ?',
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
      'SELECT id FROM chats WHERE id = ? AND user_id = ? LIMIT 1',
      [chatId, req.userId],
    );
    if (!chat.length) {
      return res.status(404).json({ error: 'chat_not_found' });
    }

    const messages = await query(
      `SELECT id, content, sender, created_at
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
    const { id, content } = req.body;

    if (!id || !content?.trim()) {
      return res.status(400).json({ error: 'id_and_content_required' });
    }

    const chatRows = await query(
      'SELECT id, title FROM chats WHERE id = ? AND user_id = ? LIMIT 1',
      [chatId, req.userId],
    );
    if (!chatRows.length) {
      return res.status(404).json({ error: 'chat_not_found' });
    }

    const trimmed = content.trim();

    await query(
      `INSERT INTO messages (id, chat_id, content, sender)
     VALUES (?, ?, ?, 'user')`,
      [id, chatId, trimmed],
    );

    const historyRows = await query(
      `SELECT content, sender
     FROM messages
     WHERE chat_id = ? AND id != ?
     ORDER BY created_at DESC
     LIMIT ?`,
      [chatId, id, HISTORY_LIMIT],
    );
    historyRows.reverse();

    const ctx = await fetchUserContext(req.userId);
    const systemPrompt = buildSystemPrompt(ctx);
    const history = historyFromMessages(historyRows);

    const aiContent = await generateChatReply({
      systemPrompt,
      history,
      userMessage: trimmed,
    });

    const aiId = `${id}_ai`;
    await query(
      `INSERT INTO messages (id, chat_id, content, sender)
     VALUES (?, ?, ?, 'ai')`,
      [aiId, chatId, aiContent],
    );

    const chatTitle = chatRows[0].title;
    if (chatTitle === DEFAULT_CHAT_TITLE) {
      const shortTitle =
        trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
      await query('UPDATE chats SET title = ? WHERE id = ?', [shortTitle, chatId]);
    }

    await query(
      `UPDATE chats
     SET last_message = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
      [aiContent, chatId],
    );

    const messages = await query(
      `SELECT id, content, sender, created_at
     FROM messages
     WHERE chat_id = ? AND id IN (?, ?)
     ORDER BY created_at ASC`,
      [chatId, id, aiId],
    );

    res.status(201).json({ messages });
  }),
);

module.exports = router;
