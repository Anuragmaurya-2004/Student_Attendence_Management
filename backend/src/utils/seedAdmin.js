/**
 * One-time script: creates (or resets) the HOD/admin account for the IT
 * department. Safe to re-run - if the email already exists, it just resets
 * the password and makes sure the role is 'admin' instead of creating a
 * duplicate.
 *
 * Run with: node src/utils/seedAdmin.js
 * (make sure MONGO_URI in .env points at your database first)
 */
require('dotenv').config();
const connectDB = require('../config/db');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');

const ADMIN = {
  name: 'HOD - Information Technology',
  email: 'hod_it@theemcoe.org',
  password: 'Hod_it@123',
};

async function run() {
  await connectDB();

  const dept = await Department.findOne({ code: 'IT' });
  if (!dept) {
    console.error(
      'No IT department found. Run "npm run setup:2026" first to create the department, then re-run this script.'
    );
    process.exit(1);
  }

  let admin = await Faculty.findOne({ email: ADMIN.email });

  if (admin) {
    // Already exists - reset password and make sure role/department are correct.
    // .save() (not updateOne) so the pre('save') hook actually re-hashes the password.
    admin.password = ADMIN.password;
    admin.role = 'admin';
    admin.department = dept._id;
    await admin.save();
    console.log(`Existing admin found - password reset: ${admin.email}`);
  } else {
    admin = await Faculty.create({
      name: ADMIN.name,
      email: ADMIN.email,
      password: ADMIN.password,
      department: dept._id,
      role: 'admin',
    });
    console.log(`Admin created: ${admin.email}`);
  }

  console.log(`\nLogin with:\n  Email:    ${ADMIN.email}\n  Password: ${ADMIN.password}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Admin setup failed:', err);
  process.exit(1);
});