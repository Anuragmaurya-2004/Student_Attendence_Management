require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('express-async-errors');
const connectDB = require('./config/db');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');

const authRoutes = require('./routes/authRoutes');
const academicRoutes = require('./routes/academicRoutes');
const studentRoutes = require('./routes/studentRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const reportRoutes = require('./routes/reportRoutes');
const rolloverRoutes = require('./routes/rolloverRoutes');
const exportRoutes = require('./routes/exportRoutes');
const onDutyRoutes = require('./routes/onDutyRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

const configuredClient = process.env.CLIENT_URL;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        !configuredClient ||
        configuredClient === '*' ||
        origin === configuredClient ||
        origin.endsWith('.vercel.app') ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
// Strips any key starting with "$" or containing "." from req.body/req.query/req.params
// so query filters built from user input (e.g. filter.department = req.query.department)
// can't be hijacked into a Mongo operator like { $ne: null }.
app.use(mongoSanitize());
app.use(morgan('dev'));

// Every entry point (including Vercel's direct app export) waits for MongoDB.
app.use('/api', async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ message: 'Backend configuration incomplete: JWT_SECRET is missing.' });
    }
    await connectDB();
    next();
  } catch (error) {
    console.error('[DB] Connection failed:', error.name);
    res.status(503).json({ message: 'Database unavailable. Check the backend MongoDB configuration and network access.' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() }));

app.use('/api/cron', require('./routes/cronRoutes'));
app.use('/api/auth', authRoutes);
app.use('/api/academic', academicRoutes); // departments, academic years, courses, class batches
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/rollover', rolloverRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/onduty', onDutyRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
