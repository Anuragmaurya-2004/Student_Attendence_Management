require('dotenv').config();
require('express-async-errors'); // makes async route handler errors flow to errorHandler automatically
const connectDB = require('./config/db');
const app = require('./app');
const { startCronJobs } = require('./cron/defaulterCron');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Attendance API running on http://localhost:${PORT}`);
    startCronJobs();
  });
});
