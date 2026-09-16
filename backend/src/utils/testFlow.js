require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const app = require('../app');
const http = require('http');

// Models
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const AcademicYear = require('../models/AcademicYear');
const ClassBatch = require('../models/ClassBatch');
const Course = require('../models/Course');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const OnDuty = require('../models/OnDuty');
const DefaulterLog = require('../models/DefaulterLog');

const { computeStudentCourseAttendance, computeAllDefaulters } = require('../services/defaulterService');
const { generateToken } = require('../utils/generateToken');

async function runFullFlowTest() {
  console.log('====================================================');
  console.log('   STARTING FULL SYSTEM FLOW & ON-DUTY TEST');
  console.log('====================================================\n');

  // 1. Connect to DB
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_system';
  console.log(`[1] Connecting to MongoDB: ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log(' -> Connected successfully.\n');

  // 2. Setup or Ensure Academic Data
  console.log('[2] Setting up test academic environment...');
  let dept = await Department.findOne({ code: 'CSE_TEST' });
  if (!dept) dept = await Department.create({ name: 'Computer Science Test', code: 'CSE_TEST' });

  let acYear = await AcademicYear.findOne({ label: '2026-2027_TEST' });
  if (!acYear) acYear = await AcademicYear.create({ label: '2026-2027_TEST', startDate: new Date('2026-07-01'), endDate: new Date('2027-06-30'), isActive: true });

  let batch = await ClassBatch.findOne({ name: 'TY-CSE-TEST' });
  if (!batch) batch = await ClassBatch.create({ name: 'TY-CSE-TEST', department: dept._id, academicYear: acYear._id, semester: 5 });

  let course = await Course.findOne({ code: 'CS501_TEST' });
  if (!course) course = await Course.create({ name: 'Cloud Computing Test', code: 'CS501_TEST', department: dept._id, academicYear: acYear._id, semester: 5, type: 'theory', weeklyHours: 4, defaulterThresholdPercent: 75 });

  // 3. Setup Users (Admin, Faculty, Student)
  console.log('[3] Creating / verifying test users...');
  let admin = await Faculty.findOne({ email: 'admin.test@college.edu' });
  if (!admin) admin = await Faculty.create({ name: 'Admin Test', email: 'admin.test@college.edu', password: 'Password@123', role: 'admin', department: dept._id });

  let faculty = await Faculty.findOne({ email: 'faculty.test@college.edu' });
  if (!faculty) faculty = await Faculty.create({ name: 'Prof. Sharma Test', email: 'faculty.test@college.edu', password: 'Password@123', role: 'faculty', department: dept._id });

  let student1 = await Student.findOne({ email: 'student1.test@college.edu' });
  if (!student1) student1 = await Student.create({ name: 'Rahul Verma Test', rollNo: 'CSE2601', email: 'student1.test@college.edu', password: 'Password@123', department: dept._id, academicYearJoined: acYear._id, currentAcademicYear: acYear._id, classBatch: batch._id, mustChangePassword: false });

  let student2 = await Student.findOne({ email: 'student2.test@college.edu' });
  if (!student2) student2 = await Student.create({ name: 'Ananya Roy Test', rollNo: 'CSE2602', email: 'student2.test@college.edu', password: 'Password@123', department: dept._id, academicYearJoined: acYear._id, currentAcademicYear: acYear._id, classBatch: batch._id, mustChangePassword: false });

  console.log(' -> Admin, Faculty, and 2 Students ready.\n');

  // 4. Test Tokens & Auth
  console.log('[4] Verifying JWT token generation & Roles...');
  const adminToken = generateToken({ id: admin._id, role: 'admin' });
  const facultyToken = generateToken({ id: faculty._id, role: 'faculty' });
  const studentToken = generateToken({ id: student1._id, role: 'student' });
  console.log(' -> Tokens generated successfully for all roles.\n');

  // 5. Clean up old test sessions & attendance
  await Attendance.deleteMany({ student: { $in: [student1._id, student2._id] } });
  await Session.deleteMany({ course: course._id });
  await OnDuty.deleteMany({ students: { $in: [student1._id, student2._id] } });

  // 6. Schedule Multi-Day Sessions (Day 1, Day 2, Day 3)
  console.log('[5] Creating 3 classroom sessions across consecutive days...');
  const day1Date = new Date('2026-09-15T09:00:00.000Z');
  const day2Date = new Date('2026-09-16T09:00:00.000Z');
  const day3Date = new Date('2026-09-17T09:00:00.000Z');

  const session1 = await Session.create({
    course: course._id,
    faculty: faculty._id,
    classBatch: batch._id,
    academicYear: acYear._id,
    date: day1Date,
    startTime: '09:00',
    endTime: '10:00',
    durationHours: 1,
    type: 'theory',
    status: 'held',
  });

  const session2 = await Session.create({
    course: course._id,
    faculty: faculty._id,
    classBatch: batch._id,
    academicYear: acYear._id,
    date: day2Date,
    startTime: '09:00',
    endTime: '10:00',
    durationHours: 1,
    type: 'theory',
    status: 'held',
  });

  const session3 = await Session.create({
    course: course._id,
    faculty: faculty._id,
    classBatch: batch._id,
    academicYear: acYear._id,
    date: day3Date,
    startTime: '09:00',
    endTime: '10:00',
    durationHours: 1,
    type: 'theory',
    status: 'held',
  });
  console.log(` -> Created Session 1 (Date: 15 Sep), Session 2 (Date: 16 Sep), Session 3 (Date: 17 Sep).\n`);

  // 7. Day 1: Student 1 attends via QR Check-in, Student 2 is Absent
  console.log('[6] Simulating Day 1 regular QR check-in...');
  await Attendance.create({
    session: session1._id,
    student: student1._id,
    status: 'present',
    method: 'qr',
  });
  await Attendance.create({
    session: session1._id,
    student: student2._id,
    status: 'absent',
    method: 'manual',
  });
  console.log(' -> Day 1: Student 1 marked PRESENT (via QR), Student 2 marked ABSENT.\n');

  // Check initial calculation before On-Duty
  console.log('[7] Computing attendance metrics before On-Duty...');
  let resS1 = await computeStudentCourseAttendance(student1._id, course._id);
  let resS2 = await computeStudentCourseAttendance(student2._id, course._id);
  console.log(` -> Student 1: ${resS1.attendedHours}/${resS1.totalHeldHours}h = ${resS1.attendancePercent}% (Defaulter: ${resS1.isDefaulter})`);
  console.log(` -> Student 2: ${resS2.attendedHours}/${resS2.totalHeldHours}h = ${resS2.attendancePercent}% (Defaulter: ${resS2.isDefaulter})\n`);

  // 8. Grant Multi-Day On-Duty for Student 2 for 2-Day Industrial Visit (16 Sep to 17 Sep)
  console.log('[8] Testing Multi-Day On-Duty Grant for Student 2 (16 Sep - 17 Sep: Industrial Visit)...');
  const onDutyService = require('../services/onDutyService');
  const onDutyRecord = await OnDuty.create({
    academicYear: acYear._id,
    classBatch: batch._id,
    students: [student2._id],
    activityType: 'industrial_visit',
    eventTitle: 'Industrial Tour to ISRO Propulsion Complex',
    fromDate: new Date('2026-09-16T00:00:00.000Z'),
    toDate: new Date('2026-09-17T23:59:59.000Z'),
    status: 'approved',
    approvedBy: admin._id,
    remarks: 'Approved per HOD letter #IV-2026',
  });

  const odResult = await onDutyService.applyOnDutyToSessions({
    onDutyId: onDutyRecord._id,
    studentIds: [student2._id],
    fromDate: onDutyRecord.fromDate,
    toDate: onDutyRecord.toDate,
    eventTitle: onDutyRecord.eventTitle,
    markedBy: admin._id,
  });

  console.log(` -> On-Duty Applied: ${odResult.attendanceMarked} attendance records across ${odResult.sessionsCount} sessions.`);

  // Verify attendance records in DB
  const s2Atts = await Attendance.find({ student: student2._id, session: { $in: [session2._id, session3._id] } });
  console.log(` -> Found ${s2Atts.length} attendance records for Student 2 in OD window:`);
  s2Atts.forEach((a, i) => {
    console.log(`    Session ${i + 2}: status = "${a.status}", method = "${a.method}", reason = "${a.dutyReason}"`);
    if (a.status !== 'on_duty' || a.method !== 'on_duty') {
      throw new Error(`Assertion failed: Expected status on_duty, got ${a.status}`);
    }
  });
  console.log(' -> PASSED: Multi-day attendance auto-populated correctly.\n');

  // 9. Recompute Attendance & Defaulter Protection
  console.log('[9] Recomputing attendance with On-Duty credit...');
  resS2 = await computeStudentCourseAttendance(student2._id, course._id);
  console.log(` -> Student 2 after OD:`);
  console.log(`    Attended Hours (incl. OD): ${resS2.attendedHours}h / ${resS2.totalHeldHours}h`);
  console.log(`    On-Duty Hours: ${resS2.onDutyHours}h`);
  console.log(`    Attendance %: ${resS2.attendancePercent}%`);
  console.log(`    Threshold: ${resS2.threshold}%`);
  console.log(`    Is Defaulter: ${resS2.isDefaulter}`);

  if (resS2.attendedHours !== 2 || resS2.onDutyHours !== 2) {
    throw new Error(`Assertion failed: Expected 2 attended/OD hours, got attended=${resS2.attendedHours}, OD=${resS2.onDutyHours}`);
  }
  console.log(' -> PASSED: On-Duty hours correctly credited towards positive attendance.\n');

  // 10. Test Student On-Duty Endpoint Query
  console.log('[10] Testing Student On-Duty lookup...');
  const studentODs = await OnDuty.find({ students: student2._id }).populate('classBatch');
  console.log(` -> Student 2 has ${studentODs.length} active OD record: "${studentODs[0].eventTitle}" (${studentODs[0].activityType})`);
  console.log(' -> PASSED.\n');

  // 11. Test Revocation / Delete of On-Duty
  console.log('[11] Testing On-Duty Revocation / Deletion...');
  await onDutyService.removeOnDutyAttendance(onDutyRecord._id);
  await OnDuty.findByIdAndDelete(onDutyRecord._id);

  const remainingAtt = await Attendance.find({ session: { $in: [session2._id, session3._id] }, student: student2._id });
  console.log(` -> Remaining attendance records after revocation: ${remainingAtt.length} (expected 0)`);
  if (remainingAtt.length !== 0) {
    throw new Error('Assertion failed: Linked attendance records were not cleaned up');
  }
  console.log(' -> PASSED: Revocation and cleanup completed cleanly.\n');

  // 12. HTTP API Endpoint Tests
  console.log('[12] Testing HTTP REST API endpoints directly...');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Test Admin OD creation via HTTP POST
  const createRes = await fetch(`${baseUrl}/api/onduty`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      classBatch: batch._id.toString(),
      students: [student1._id.toString(), student2._id.toString()],
      activityType: 'hackathon_tech',
      eventTitle: 'Smart India Hackathon 2026',
      fromDate: '2026-09-15',
      toDate: '2026-09-17',
      remarks: 'National Level Hackathon Finalist',
    }),
  });

  if (!createRes.ok) {
    const errBody = await createRes.text();
    throw new Error(`HTTP POST /api/onduty failed (${createRes.status}): ${errBody}`);
  }
  const createJson = await createRes.json();
  console.log(` -> HTTP POST /api/onduty: 201 Created (ID: ${createJson.onDuty._id})`);

  // Test GET /api/onduty
  const getRes = await fetch(`${baseUrl}/api/onduty`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const listJson = await getRes.json();
  console.log(` -> HTTP GET /api/onduty: ${listJson.length} records returned.`);

  // Test Student GET /api/onduty/student/:id
  const studentGetRes = await fetch(`${baseUrl}/api/onduty/student/${student1._id}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentJson = await studentGetRes.json();
  console.log(` -> HTTP GET /api/onduty/student/:id: ${studentJson.length} records found for Student 1.`);

  // Test Excel Export with On-Duty
  const excelRes = await fetch(`${baseUrl}/api/export/defaulters/excel`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(` -> HTTP GET /api/export/defaulters/excel: Status ${excelRes.status} (Content-Type: ${excelRes.headers.get('content-type')})`);

  // Test PDF Export
  const pdfRes = await fetch(`${baseUrl}/api/export/defaulters/pdf`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(` -> HTTP GET /api/export/defaulters/pdf: Status ${pdfRes.status} (Content-Type: ${pdfRes.headers.get('content-type')})`);

  // Test DELETE /api/onduty/:id
  const delRes = await fetch(`${baseUrl}/api/onduty/${createJson.onDuty._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(` -> HTTP DELETE /api/onduty/:id: Status ${delRes.status}`);

  await new Promise((resolve) => server.close(resolve));
  console.log(' -> PASSED: All HTTP REST API endpoints verified successfully.\n');

  // 13. Clean up test records
  console.log('[13] Cleaning up test data...');
  await Attendance.deleteMany({ student: { $in: [student1._id, student2._id] } });
  await Session.deleteMany({ course: course._id });
  await Course.findByIdAndDelete(course._id);
  await Student.deleteMany({ _id: { $in: [student1._id, student2._id] } });
  await Faculty.deleteMany({ _id: { $in: [admin._id, faculty._id] } });
  await ClassBatch.findByIdAndDelete(batch._id);
  await AcademicYear.findByIdAndDelete(acYear._id);
  await Department.findByIdAndDelete(dept._id);

  await mongoose.disconnect();
  console.log(' -> Disconnected from DB.\n');
  console.log('====================================================');
  console.log('   ALL FULL FLOW & ON-DUTY TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runFullFlowTest().catch((err) => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
