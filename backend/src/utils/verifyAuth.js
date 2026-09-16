require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const http = require('http');
const app = require('../app');

async function testLogins() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_system');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const usersToTest = [
    { type: 'faculty', email: 'admin@college.edu', password: 'Admin@123', label: 'Principal (Admin)' },
    { type: 'faculty', email: 'hod.cse@college.edu', password: 'Hod@1234', label: 'HOD CSE (Admin)' },
    { type: 'faculty', email: 'priya.sharma@college.edu', password: 'Faculty@123', label: 'Teacher (Faculty)' },
    { type: 'student', email: 'student1@college.edu', password: 'Student@123', label: 'Student 1' },
  ];

  console.log('\n--- Testing Login Endpoints ---');
  for (const u of usersToTest) {
    const url = `${baseUrl}/api/auth/${u.type}/login`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, password: u.password }),
    });

    const data = await res.json();
    if (res.ok && data.token) {
      console.log(`✅ ${u.label} Login SUCCESS: Role = ${data.user.role}, Name = ${data.user.name}`);
    } else {
      console.error(`❌ ${u.label} Login FAILED:`, data);
    }
  }

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
}

testLogins().catch(console.error);
