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
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
// Strips any key starting with "$" or containing "." from req.body/req.query/req.params
// so query filters built from user input (e.g. filter.department = req.query.department)
// can't be hijacked into a Mongo operator like { $ne: null }.
app.use(mongoSanitize());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

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

app.use(notFound);
app.use(errorHandler);

module.exports = app;
