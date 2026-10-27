require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const connectDB = require('./config/db');
const app = require('./app');
const { startCronJobs } = require('./cron/defaulterCron');

const PORT = process.env.PORT || 5000;

if (require.main === module && !process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[Server] Attendance API running on http://localhost:${PORT}`);
      startCronJobs();
    });
  }).catch((error) => {
    console.error('[Server] Startup failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = app;
