const cors = require('cors');
const express = require('express');
const { port, openaiApiKey, openaiModel } = require('./config/env');
const { initFirebase } = require('./middleware/firebaseAuth');
const healthRoutes = require('./routes/health');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const exerciseRoutes = require('./routes/exercises');
const aiPlanRoutes = require('./routes/aiPlan');
const mediaRoutes = require('./routes/media');
const pregnancyRoutes = require('./routes/pregnancy');
const weeklyResultsRoutes = require('./routes/weeklyResults');
const notificationRoutes = require('./routes/notifications');
const nutritionRoutes = require('./routes/nutrition');
const revenuecatRoutes = require('./routes/revenuecat');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));

initFirebase();

app.use(healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/ai-plan', aiPlanRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/pregnancy', pregnancyRoutes);
app.use('/api/weekly-results', weeklyResultsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/webhooks', revenuecatRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`MomFit API http://localhost:${port}`);
  if (openaiApiKey) {
    console.log(`[openai] Model: ${openaiModel}`);
  } else {
    console.warn('[openai] OPENAI_API_KEY yok — AI Chat yanıt üretemez.');
  }
});
