const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server');

test('Vercel app entry connects and authenticates seeded accounts', async () => {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri('attendance_test');
  process.env.JWT_SECRET = 'test-secret-used-only-for-isolated-tests';
  process.env.NODE_ENV = 'production';
  process.env.VERCEL = '1';
  process.env.GOOGLE_APPS_SCRIPT_URL = '';
  process.env.RESEND_API_KEY = '';
  process.env.CRON_SECRET = 'isolated-cron-test-secret';
  const mongoose = require('mongoose');
  let server;
  try {
    const seed = () => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['src/utils/seed.js'], {
        cwd: path.resolve(__dirname, '..'), env: process.env, stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', chunk => { output += chunk; });
      child.stderr.on('data', chunk => { output += chunk; });
      child.on('error', reject);
      child.on('close', code => code === 0 ? resolve(output) : reject(new Error(output)));
    });
    assert.match(await seed(), /DATABASE SEEDING COMPLETED SUCCESSFULLY/);
    // Import the same direct app entry that Vercel discovers, without server.js.
    const app = require('../src/app');
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).database, 'connected');
    const login = async (role, email, password) => {
      const response = await fetch(`${base}/auth/${role}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      });
      return { status: response.status, body: await response.json() };
    };
    for (const [role, email, password, expectedRole] of [
      ['faculty', ' ADMIN@college.edu ', 'Admin@123', 'admin'],
      ['faculty', 'hod.it@college.edu', 'Hod@1234', 'admin'],
      ['faculty', 'priya.sharma@college.edu', 'Faculty@123', 'faculty'],
      ['student', ' STUDENT1@college.edu ', 'Student@123', 'student'],
    ]) {
      const result = await login(role, email, password);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.user.role, expectedRole);
      assert.ok(result.body.token);
      const me = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${result.body.token}` } });
      assert.equal(me.status, 200);
    }
    const adminLogin = await login('faculty', 'admin@college.edu', 'Admin@123');
    const headers = { Authorization: 'Bearer ' + adminLogin.body.token };
    for (const route of ['/academic/departments', '/academic/academic-years', '/academic/class-batches', '/academic/courses', '/students', '/faculty', '/sessions', '/holidays', '/onduty', '/reports/all', '/reports/defaulters', '/reports/logs', '/rollover/preview', '/notifications', '/students/import/template', '/faculty/import/template', '/academic/courses/import/template', '/holidays/import/template', '/export/defaulters/excel', '/export/defaulters/pdf']) {
      const response = await fetch(base + route, { headers });
      assert.equal(response.status, 200, route + ': ' + await response.text());
    }
    const { computeAllDefaulters, computeStudentCourseAttendance } = require('../src/services/defaulterService');
    const stats = await computeAllDefaulters({ logResults: false });
    assert.ok(stats.length > 0);
    for (const stat of stats) {
      const single = await computeStudentCourseAttendance(stat.student, stat.course, stat.classBatchId);
      for (const key of ['attendedHours', 'onDutyHours', 'totalHeldHours', 'attendancePercent', 'threshold', 'hasSessions', 'isDefaulter']) {
        assert.equal(stat[key], single[key], key + ' differs from individual attendance computation');
      }
    }
    const overall = await computeAllDefaulters({ viewType: 'overall', logResults: false });
    for (const stat of overall) {
      const subjects = stats.filter(s => s.student.toString() === stat.student.toString());
      assert.equal(stat.attendedHours, subjects.reduce((sum, s) => sum + s.attendedHours, 0));
      assert.equal(stat.totalHeldHours, subjects.reduce((sum, s) => sum + s.totalHeldHours, 0));
    }
    const studentLogin = await login('student', 'student1@college.edu', 'Student@123');
    const studentHeaders = { Authorization: 'Bearer ' + studentLogin.body.token };
    for (const route of ['/attendance/student/' + studentLogin.body.user.id, '/onduty/student/' + studentLogin.body.user.id, '/notifications']) {
      const response = await fetch(base + route, { headers: studentHeaders });
      assert.equal(response.status, 200, route);
      await response.arrayBuffer();
    }
    assert.equal((await fetch(base + '/faculty', { headers: studentHeaders })).status, 403);
    assert.equal((await fetch(base + '/students')).status, 401);
    const batches = await (await fetch(base + '/academic/class-batches', { headers })).json();
    const courses = await (await fetch(base + '/academic/courses', { headers })).json();
    const studentDoc = await require('../src/models/Student').findById(studentLogin.body.user.id);
    const batch = batches.find(b => b._id === studentDoc.classBatch.toString());
    const course = courses.find(c => c.semester === batch.semester && c.department._id === studentDoc.department.toString());
    assert.ok(course);
    const post = async (route, body, authHeaders = headers) => {
      const response = await fetch(base + route, { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    };
    const created = await post('/sessions', { course: course._id, classBatch: batch._id, academicYear: studentDoc.currentAcademicYear, date: '2026-11-03', startTime: '09:00', endTime: '10:00', durationHours: 1, type: course.type });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const sessionId = created.body._id;
    const qr = await post('/sessions/' + sessionId + '/qr', {});
    assert.equal(qr.status, 200);
    assert.match(qr.body.qrDataUrl, /^data:image/);
    const checkin = { sessionId, token: qr.body.qrToken, deviceId: 'isolated-test-device', deviceInfo: 'Test browser' };
    assert.equal((await post('/attendance/check-in', checkin, studentHeaders)).status, 201);
    assert.equal((await post('/attendance/check-in', checkin, studentHeaders)).status, 400);
    const closed = await post('/sessions/' + sessionId + '/qr', { closeWindow: true });
    assert.equal(closed.status, 200);
    assert.equal(closed.body.closed, true);
    const attendance = await (await fetch(base + '/attendance/session/' + sessionId, { headers })).json();
    assert.ok(attendance.some(a => a.student._id === studentLogin.body.user.id && a.status === 'present'));
    assert.ok(attendance.some(a => a.status === 'absent'));
    assert.equal((await fetch(base + '/attendance/class-matrix/' + batch._id, { headers })).status, 200);
    // Simulate a cold-started worker with no in-memory timer after a QR window expires.
    await require('../src/models/Session').findByIdAndUpdate(sessionId, { absentMarkedAt: null, qrWindowExpiresAt: new Date(Date.now() - 1000) });
    await computeAllDefaulters({ classBatch: batch._id, logResults: false });
    const reconciled = await require('../src/models/Session').findById(sessionId);
    assert.ok(reconciled.absentMarkedAt);
    assert.equal((await fetch(base + '/cron/daily')).status, 401);
    // No email recipients exist after removal, so test the scheduled handler without sending mail.
    await require('../src/models/Student').updateMany({}, { status: 'passed_out' });
    const cronResponse = await fetch(base + '/cron/daily', { headers: { Authorization: 'Bearer ' + process.env.CRON_SECRET } });
    assert.equal(cronResponse.status, 200);

    assert.equal((await login('faculty', 'admin@college.edu', 'Wrong@123')).status, 401);
    assert.equal((await login('student', 'admin@college.edu', 'Admin@123')).status, 401);
    const Faculty = require('../src/models/Faculty');
    const admin = await Faculty.findOne({ email: 'admin@college.edu' });
    admin.password = 'Changed@123';
    await admin.save();
    assert.match(await seed(), /already claimed/);
    assert.equal((await login('faculty', 'admin@college.edu', 'Changed@123')).status, 200);
    delete process.env.JWT_SECRET;
    assert.equal((await fetch(`${base}/health`)).status, 503);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  }
});
