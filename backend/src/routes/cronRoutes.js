const express = require('express');
const { timingSafeEqual } = require('crypto');
const { runDefaulterCheckAndNotify } = require('../cron/defaulterCron');
const router = express.Router();

router.get('/daily', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ message: 'CRON_SECRET is not configured.' });
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(req.headers.authorization || '');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  // Vercel cron only runs against Production, using the same MongoDB as the app.
  const summary = await runDefaulterCheckAndNotify();
  res.json(summary);
});

module.exports = router;
