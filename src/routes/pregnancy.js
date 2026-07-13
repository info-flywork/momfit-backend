const express = require('express');
const {
  getPregnancyContent,
  resolvePregnancyProgress,
} = require('../services/pregnancyContentService');

const router = express.Router();

router.get('/content', (req, res) => {
  const week = Number.parseInt(req.query.week, 10);
  const day = Number.parseInt(req.query.day, 10);

  if (!Number.isFinite(week)) {
    return res.status(400).json({ error: 'week_required' });
  }

  res.json({ content: getPregnancyContent(week, Number.isFinite(day) ? day : 0) });
});

router.get('/resolve', (req, res) => {
  const week = Number.parseInt(req.query.week, 10);
  const day = Number.parseInt(req.query.day, 10);
  const anchorDate = req.query.anchorDate;

  if (!Number.isFinite(week)) {
    return res.status(400).json({ error: 'week_required' });
  }

  const resolved = resolvePregnancyProgress(
    week,
    Number.isFinite(day) ? day : 0,
    typeof anchorDate === 'string' ? anchorDate : null,
  );

  const content = getPregnancyContent(resolved.week, resolved.day);

  res.json({
    ...resolved,
    content,
  });
});

module.exports = router;
