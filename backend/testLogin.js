// Tests the deployed backend's login route directly, bypassing the frontend
// entirely - confirms Render -> Atlas -> auth logic all work together.
//
// Run with: node testLogin.js

const https = require('https');

const data = JSON.stringify({
  email: 'hod.it@college.edu',
  password: 'Hod@1234',
});

const req = https.request(
  {
    hostname: 'student-attendance-management.onrender.com',
    port: 443,
    path: '/api/auth/faculty/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
    timeout: 120000, // Render cold start (50s+) plus app startup can exceed 70s combined
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', body);
    });
  }
);

req.on('timeout', () => {
  console.error('Request timed out after 70s - something beyond a normal cold start is wrong.');
  req.destroy();
});

req.on('error', (err) => console.error('Request failed:', err.message));
console.log('Sending request... (may take up to 60s if the backend is waking from sleep)');
req.write(data);
req.end();