/**
 * One-time setup script: creates Academic Year 2026-2027, the IT department,
 * and three class batches (SE-IT, TE-IT, BE-IT) under it.
 *
 * Safe to re-run - uses upserts, so running it twice won't create duplicates.
 *
 * Run with: node src/utils/setupAcademicYear2026.js
 * (make sure MONGO_URI in .env points at your database first)
 */
require('dotenv').config();
const connectDB = require('../config/db');
const AcademicYear = require('../models/AcademicYear');
const Department = require('../models/Department');
const ClassBatch = require('../models/ClassBatch');

// SE = Second Year (Semester 3, start of the year), TE = Third Year (Sem 5),
// BE = Final Year (Sem 7) - standard odd-semester start for a new academic year.
const BATCHES = [
  { name: 'SE-IT', semester: 3 },
  { name: 'TE-IT', semester: 5 },
  { name: 'BE-IT', semester: 7 },
];

async function run() {
  await connectDB();

  // Academic year - deactivate any existing active year, then create/activate this one
  await AcademicYear.updateMany({}, { isActive: false });
  const year = await AcademicYear.findOneAndUpdate(
    { label: '2026-2027' },
    {
      label: '2026-2027',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-05-31'),
      isActive: true,
    },
    { upsert: true, new: true }
  );
  console.log(`Academic Year ready: ${year.label} (active)`);

  // Department
  const dept = await Department.findOneAndUpdate(
    { code: 'IT' },
    { name: 'Information Technology', code: 'IT' },
    { upsert: true, new: true }
  );
  console.log(`Department ready: ${dept.name} (${dept.code})`);

  // Class batches
  for (const b of BATCHES) {
    const batch = await ClassBatch.findOneAndUpdate(
      { name: b.name, academicYear: year._id },
      { name: b.name, department: dept._id, semester: b.semester, academicYear: year._id },
      { upsert: true, new: true }
    );
    console.log(`Class batch ready: ${batch.name} (semester ${batch.semester})`);
  }

  console.log('\nSetup complete. You can now import students for SE-IT, TE-IT, BE-IT.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});