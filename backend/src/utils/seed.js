require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const Department = require('../models/Department');
const AcademicYear = require('../models/AcademicYear');
const ClassBatch = require('../models/ClassBatch');
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');
const OnDuty = require('../models/OnDuty');
const DefaulterLog = require('../models/DefaulterLog');
const { applyOnDutyToSessions } = require('../services/onDutyService');

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_system';
  console.log(`Connecting to MongoDB at: ${mongoUri}`);
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.\n');

  console.log('--- Cleaning up existing database records ---');
  await Promise.all([
    Department.deleteMany({}),
    AcademicYear.deleteMany({}),
    ClassBatch.deleteMany({}),
    Course.deleteMany({}),
    Faculty.deleteMany({}),
    Student.deleteMany({}),
    Session.deleteMany({}),
    Attendance.deleteMany({}),
    Holiday.deleteMany({}),
    OnDuty.deleteMany({}),
    DefaulterLog.deleteMany({}),
  ]);
  console.log('Database cleared.\n');

  // ==========================================
  // 1. ACADEMIC YEARS
  // ==========================================
  console.log('--- [1/7] Creating Academic Years ---');
  const academicYear = await AcademicYear.create({
    label: '2026-2027',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2027-05-31'),
    isActive: true,
  });

  const prevAcademicYear = await AcademicYear.create({
    label: '2025-2026',
    startDate: new Date('2026-06-10'),
    endDate: new Date('2026-10-16'),
    isActive: false,
  });
  console.log(`Created Active Academic Year: ${academicYear.label}`);

  // ==========================================
  // 2. DEPARTMENTS
  // ==========================================
  console.log('\n--- [2/7] Creating Departments ---');
  const deptCSE = await Department.create({
    name: 'Computer Engineering',
    code: 'CSE',
  });
  const deptIT = await Department.create({
    name: 'Information Technology',
    code: 'IT',
  });
  const deptAIDS = await Department.create({
    name: 'Artificial Intelligence & Data Science',
    code: 'AI-DS',
  });
  const deptEXTC = await Department.create({
    name: 'Electronics & Telecommunication',
    code: 'EXTC',
  });
  console.log('Created Departments: CSE, IT, AI-DS, EXTC');

  // ==========================================
  // 3. CLASS BATCHES
  // ==========================================
  console.log('\n--- [3/7] Creating Class Batches ---');
  const batchTECSE = await ClassBatch.create({
    name: 'TE-CSE (Sem 5)',
    department: deptCSE._id,
    academicYear: academicYear._id,
    semester: 5,
  });
  const batchBECSE = await ClassBatch.create({
    name: 'BE-CSE (Sem 7)',
    department: deptCSE._id,
    academicYear: academicYear._id,
    semester: 7,
  });
  const batchSEIT = await ClassBatch.create({
    name: 'SE-IT (Sem 3)',
    department: deptIT._id,
    academicYear: academicYear._id,
    semester: 3,
  });
  const batchTEIT = await ClassBatch.create({
    name: 'TE-IT (Sem 5)',
    department: deptIT._id,
    academicYear: academicYear._id,
    semester: 5,
  });
  const batchBEIT = await ClassBatch.create({
    name: 'BE-IT (Sem 7)',
    department: deptIT._id,
    academicYear: academicYear._id,
    semester: 7,
  });
  const batchTEAIP = await ClassBatch.create({
    name: 'TE-AIDS (Sem 5)',
    department: deptAIDS._id,
    academicYear: academicYear._id,
    semester: 5,
  });
  console.log('Created Class Batches: TE-CSE, BE-CSE, SE-IT, TE-IT, BE-IT, TE-AIDS');

  // ==========================================
  // 4. HODs, ADMIN & TEACHERS (FACULTY)
  // ==========================================
  console.log('\n--- [4/7] Creating Principal, HODs and Teachers ---');

  // Principal / Master Admin
  const adminUser = await Faculty.create({
    name: 'Dr. Sanjay Sharma (Principal)',
    email: 'admin@college.edu',
    password: 'Admin@123',
    phone: '9876543210',
    designation: 'Principal & Chief Administrator',
    department: deptCSE._id,
    role: 'admin',
  });

  // HODs (Admin Role for department governance)
  const hodCSE = await Faculty.create({
    name: 'Dr. Rajesh Kulkarni (HOD CSE)',
    email: 'hod.cse@college.edu',
    password: 'Hod@1234',
    phone: '9822011223',
    designation: 'Head of Department - Computer Engineering',
    department: deptCSE._id,
    role: 'admin',
  });

  const hodIT = await Faculty.create({
    name: 'Prof. Sneha Sankhe (HOD IT)',
    email: 'hod.it@college.edu',
    password: 'Hod@1234',
    phone: '9822033445',
    designation: 'Head of Department - Information Technology',
    department: deptIT._id,
    role: 'admin',
  });

  const hodAIDS = await Faculty.create({
    name: 'Dr. Ramesh Rao (HOD AI-DS)',
    email: 'hod.aids@college.edu',
    password: 'Hod@1234',
    phone: '9822055667',
    designation: 'Head of Department - Artificial Intelligence & Data Science',
    department: deptAIDS._id,
    role: 'admin',
  });

  // Teachers / Professors (Faculty Role)
  const facultyPriya = await Faculty.create({
    name: 'Prof. Priya Sharma',
    email: 'priya.sharma@college.edu',
    password: 'Faculty@123',
    phone: '9811002233',
    designation: 'Associate Professor',
    department: deptCSE._id,
    role: 'faculty',
  });

  const facultyAmit = await Faculty.create({
    name: 'Prof. Amit Deshmukh',
    email: 'amit.deshmukh@college.edu',
    password: 'Faculty@123',
    phone: '9811004455',
    designation: 'Assistant Professor',
    department: deptCSE._id,
    role: 'faculty',
  });

  const facultySneha = await Faculty.create({
    name: 'Prof. Simran Patil',
    email: 'simran.patil@college.edu',
    password: 'Faculty@123',
    phone: '9811006677',
    designation: 'Assistant Professor',
    department: deptIT._id,
    role: 'faculty',
  });

  const facultyVikram = await Faculty.create({
    name: 'Prof. Sonali Karthik',
    email: 'sonali.karthik@college.edu',
    password: 'Faculty@123',
    phone: '9811008899',
    designation: 'Assistant Professor',
    department: deptIT._id,
    role: 'faculty',
  });

  const facultyNeha = await Faculty.create({
    name: 'Prof. Neha Gupta',
    email: 'neha.gupta@college.edu',
    password: 'Faculty@123',
    phone: '9811001122',
    designation: 'Assistant Professor',
    department: deptAIDS._id,
    role: 'faculty',
  });

  console.log('Created Staff:');
  console.log(' - Admin: admin@college.edu');
  console.log(' - HODs: hod.cse@college.edu, hod.it@college.edu, hod.aids@college.edu');
  console.log(' - Faculty: priya.sharma, amit.deshmukh, simran.patil, sonali.karthik, neha.gupta');

  // ==========================================
  // 5. COURSES (THEORY & PRACTICAL)
  // ==========================================
  console.log('\n--- [5/7] Creating Courses (Theory & Practical) ---');

  // CSE Courses (Sem 5)
  const cseCloudTh = await Course.create({
    name: 'Cloud Computing',
    code: 'CS501',
    department: deptCSE._id,
    academicYear: academicYear._id,
    semester: 5,
    type: 'theory',
    weeklyHours: 4,
    defaulterThresholdPercent: 75,
  });

  const cseCloudPr = await Course.create({
    name: 'Cloud Computing Lab',
    code: 'CS501L',
    department: deptCSE._id,
    academicYear: academicYear._id,
    semester: 5,
    type: 'practical',
    weeklyHours: 2,
    defaulterThresholdPercent: 75,
  });

  const cseDBMSTh = await Course.create({
    name: 'Database Management Systems',
    code: 'CS502',
    department: deptCSE._id,
    academicYear: academicYear._id,
    semester: 5,
    type: 'theory',
    weeklyHours: 4,
    defaulterThresholdPercent: 75,
  });

  const cseDBMSPr = await Course.create({
    name: 'DBMS Lab',
    code: 'CS502L',
    department: deptCSE._id,
    academicYear: academicYear._id,
    semester: 5,
    type: 'practical',
    weeklyHours: 2,
    defaulterThresholdPercent: 75,
  });

  // IT Courses (Sem 5)
  const itWebTh = await Course.create({
    name: 'Cyber security laws',
    code: 'IT501',
    department: deptIT._id,
    academicYear: academicYear._id,
    semester: 5,
    type: 'theory',
    weeklyHours: 4,
    defaulterThresholdPercent: 75,
  });

  const itWebPr = await Course.create({
    name: 'Artificial Intelligence Lab',
    code: 'IT501L',
    department: deptIT._id,
    academicYear: academicYear._id,
    semester: 5,
    type: 'practical',
    weeklyHours: 2,
    defaulterThresholdPercent: 75,
  });

  // AI-DS Courses (Sem 5)
  const aidsMLTh = await Course.create({
    name: 'Machine Learning & Neural Networks',
    code: 'AI501',
    department: deptAIDS._id,
    academicYear: academicYear._id,
    semester: 5,
    type: 'theory',
    weeklyHours: 4,
    defaulterThresholdPercent: 75,
  });

  const aidsMLPr = await Course.create({
    name: 'Machine Learning Lab',
    code: 'AI501L',
    department: deptAIDS._id,
    academicYear: academicYear._id,
    semester: 5,
    type: 'practical',
    weeklyHours: 2,
    defaulterThresholdPercent: 75,
  });

  // Assign courses to faculty
  facultyPriya.coursesAssigned = [cseCloudTh._id, cseCloudPr._id];
  await facultyPriya.save();

  facultyAmit.coursesAssigned = [cseDBMSTh._id, cseDBMSPr._id];
  await facultyAmit.save();

  facultySneha.coursesAssigned = [itWebTh._id, itWebPr._id];
  await facultySneha.save();

  facultyNeha.coursesAssigned = [aidsMLTh._id, aidsMLPr._id];
  await facultyNeha.save();

  console.log('Created Theory & Practical Courses.');

  // ==========================================
  // 6. STUDENTS
  // ==========================================
  console.log('\n--- [6/7] Creating Students ---');

  const rawStudents = [
    // TE-CSE Students (Batch 1)
    { name: 'Aarav Sharma', rollNo: 'CSE2601', email: 'student1@college.edu', batch: batchTECSE._id, dept: deptCSE._id, parentEmail: 'parent.aarav@gmail.com', phone: '9820011111' },
    { name: 'Ananya Roy', rollNo: 'CSE2602', email: 'student2@college.edu', batch: batchTECSE._id, dept: deptCSE._id, parentEmail: 'parent.ananya@gmail.com', phone: '9820022222' },
    { name: 'Rohan Verma', rollNo: 'CSE2603', email: 'student3@college.edu', batch: batchTECSE._id, dept: deptCSE._id, parentEmail: 'parent.rohan@gmail.com', phone: '9820033333' },
    { name: 'Ishita Patel', rollNo: 'CSE2604', email: 'student4@college.edu', batch: batchTECSE._id, dept: deptCSE._id, parentEmail: 'parent.ishita@gmail.com', phone: '9820044444' },
    { name: 'Aditya Kulkarni', rollNo: 'CSE2605', email: 'student5@college.edu', batch: batchTECSE._id, dept: deptCSE._id, parentEmail: 'parent.aditya@gmail.com', phone: '9820055555' },
    { name: 'Pooja Deshmukh', rollNo: 'CSE2606', email: 'student6@college.edu', batch: batchTECSE._id, dept: deptCSE._id, parentEmail: 'parent.pooja@gmail.com', phone: '9820066666' },
    { name: 'Kabir Mehta', rollNo: 'CSE2607', email: 'student7@college.edu', batch: batchTECSE._id, dept: deptCSE._id, parentEmail: 'parent.kabir@gmail.com', phone: '9820077777' },
    { name: 'Tanvi Joshi', rollNo: 'CSE2608', email: 'student8@college.edu', batch: batchTECSE._id, dept: deptCSE._id, parentEmail: 'parent.tanvi@gmail.com', phone: '9820088888' },
    { name: 'Siddharth Rao', rollNo: 'CSE2609', email: 'student9@college.edu', batch: batchTECSE._id, dept: deptCSE._id, parentEmail: 'parent.sid@gmail.com', phone: '9820099999' },
    { name: 'Riya Gupta', rollNo: 'CSE2610', email: 'student10@college.edu', batch: batchTECSE._id, dept: deptCSE._id, parentEmail: 'parent.riya@gmail.com', phone: '9820010101' },

    // TE-IT Students (Batch 2)
    { name: 'Varun Nair', rollNo: 'IT2601', email: 'student11@college.edu', batch: batchTEIT._id, dept: deptIT._id, parentEmail: 'parent.varun@gmail.com', phone: '9830011111' },
    { name: 'Diya Singhania', rollNo: 'IT2602', email: 'student12@college.edu', batch: batchTEIT._id, dept: deptIT._id, parentEmail: 'parent.diya@gmail.com', phone: '9830022222' },
    { name: 'Karan Malhotra', rollNo: 'IT2603', email: 'student13@college.edu', batch: batchTEIT._id, dept: deptIT._id, parentEmail: 'parent.karan@gmail.com', phone: '9830033333' },
    { name: 'Snehal Patil', rollNo: 'IT2604', email: 'student14@college.edu', batch: batchTEIT._id, dept: deptIT._id, parentEmail: 'parent.snehal@gmail.com', phone: '9830044444' },
    { name: 'Manish Pandey', rollNo: 'IT2605', email: 'student15@college.edu', batch: batchTEIT._id, dept: deptIT._id, parentEmail: 'parent.manish@gmail.com', phone: '9830055555' },

    // TE-AIDS Students (Batch 3)
    { name: 'Zoya Khan', rollNo: 'AI2601', email: 'student16@college.edu', batch: batchTEAIP._id, dept: deptAIDS._id, parentEmail: 'parent.zoya@gmail.com', phone: '9840011111' },
    { name: 'Gaurav Sen', rollNo: 'AI2602', email: 'student17@college.edu', batch: batchTEAIP._id, dept: deptAIDS._id, parentEmail: 'parent.gaurav@gmail.com', phone: '9840022222' },
    { name: 'Neha Bhasin', rollNo: 'AI2603', email: 'student18@college.edu', batch: batchTEAIP._id, dept: deptAIDS._id, parentEmail: 'parent.nehab@gmail.com', phone: '9840033333' },
    { name: 'Nikhil Kamath', rollNo: 'AI2604', email: 'student19@college.edu', batch: batchTEAIP._id, dept: deptAIDS._id, parentEmail: 'parent.nikhil@gmail.com', phone: '9840044444' },
    { name: 'Shruti Iyer', rollNo: 'AI2605', email: 'student20@college.edu', batch: batchTEAIP._id, dept: deptAIDS._id, parentEmail: 'parent.shruti@gmail.com', phone: '9840055555' },

    //BE-IT Students (Batch 4)
    {
      name: 'Anurag Maurya',
      rollNo: 'IT3301',
      email: '233119@theemcoe.org',
      batch: batchTECSE._id,
      dept: deptCSE._id,
      parentEmail: 'anuragmaurya1114@gmail.com',
      phone: '9876543212',
    },
    { name: 'Chintan Parave', rollNo: 'IT3302', email: '233127@theemcoe.org', batch: batchBEIT._id, dept: deptCSE._id, parentEmail: 'anuragmaurya1114@gmail.com', phone: '9876543213' },
    { name: 'Atharva Patil', rollNo: 'IT3303', email: '233129@theemcoe.org', batch: batchBEIT._id, dept: deptCSE._id, parentEmail: 'anuragmaurya1114@gmail.com', phone: '9876543214' },
    { name: 'Priya Mali ', rollNo: 'IT3304', email: '233117@theemcoe.org', batch: batchBEIT._id, dept: deptCSE._id, parentEmail: 'anuragmaurya1114@gmail.com', phone: '9876543215' }
  ];

  const createdStudents = [];
  for (const s of rawStudents) {
    const st = await Student.create({
      name: s.name,
      rollNo: s.rollNo,
      email: s.email,
      password: 'Student@123',
      phone: s.phone,
      parentEmail: s.parentEmail,
      department: s.dept,
      classBatch: s.batch,
      academicYearJoined: academicYear._id,
      currentAcademicYear: academicYear._id,
      status: 'active',
      mustChangePassword: false,
    });
    createdStudents.push(st);
  }
  console.log(`Created ${createdStudents.length} Students with credentials (student1@college.edu ... student20@college.edu | Password: Student@123).`);

  // ==========================================
  // 7. SESSIONS, ATTENDANCE & MULTI-DAY ON-DUTY
  // ==========================================
  console.log('\n--- [7/7] Creating Sessions, Attendance & Multi-Day On-Duty Grants ---');

  // Dates for sessions: Sep 1 to Sep 14
  const cseStudents = createdStudents.filter((s) => s.department.toString() === deptCSE._id.toString());

  const sessionDates = [
    '2026-09-01',
    '2026-09-02',
    '2026-09-03',
    '2026-09-04',
    '2026-09-07',
    '2026-09-08',
    '2026-09-09',
    '2026-09-10',
    '2026-09-11',
    '2026-09-14',
  ];

  const heldSessions = [];

  for (let i = 0; i < sessionDates.length; i++) {
    const dStr = sessionDates[i];
    const sDate = new Date(`${dStr}T09:00:00.000Z`);

    // Theory Session (Cloud Computing)
    const sTh = await Session.create({
      course: cseCloudTh._id,
      faculty: facultyPriya._id,
      classBatch: batchTECSE._id,
      academicYear: academicYear._id,
      date: sDate,
      startTime: '09:00',
      endTime: '10:00',
      durationHours: 1,
      type: 'theory',
      status: 'held',
    });
    heldSessions.push(sTh);

    // Practical Session on alternate days (Cloud Computing Lab, 2 hrs)
    if (i % 2 === 0) {
      const sPr = await Session.create({
        course: cseCloudPr._id,
        faculty: facultyPriya._id,
        classBatch: batchTECSE._id,
        academicYear: academicYear._id,
        date: sDate,
        startTime: '10:15',
        endTime: '12:15',
        durationHours: 2,
        type: 'practical',
        status: 'held',
      });
      heldSessions.push(sPr);
    }
  }

  // Create baseline attendance for CSE students across the held sessions
  for (const sess of heldSessions) {
    for (let idx = 0; idx < cseStudents.length; idx++) {
      const st = cseStudents[idx];
      const isTargetDefaulter = st.email === '233119@theemcoe.org';

      // Simulate realistic attendance pattern:
      // Student 1, 2, 3: High attendance (~90%)
      // Student 4, 5, 6: Moderate attendance (~75-80%)
      // Student 7, 8: Defaulters initially (~50%)
      // The target email is always forced to be absent for defaulter testing.
      let status = 'present';
      const rand = (idx * 7 + sess.date.getDate()) % 10;

      if (isTargetDefaulter || (idx >= 6 && rand > 4)) {
        status = 'absent';
      } else if (rand === 9) {
        status = 'late';
      }

      await Attendance.create({
        session: sess._id,
        student: st._id,
        status,
        method: status === 'present' ? 'qr' : 'manual',
        markedBy: facultyPriya._id,
      });
    }
  }

  // Create Multi-Day On-Duty (OD) / Visit Grants
  console.log('Applying realistic Multi-Day On-Duty & Activity Grants...');

  // 1. Industrial Visit (3 Days: 08 Sep to 10 Sep) for 4 students (Aarav, Ananya, Rohan, Ishita)
  const ivStudents = [cseStudents[0]._id, cseStudents[1]._id, cseStudents[2]._id, cseStudents[3]._id];
  const ivGrant = await OnDuty.create({
    academicYear: academicYear._id,
    classBatch: batchTECSE._id,
    students: ivStudents,
    activityType: 'industrial_visit',
    eventTitle: 'Industrial Tour to ISRO Satellite Center',
    fromDate: new Date('2026-09-08T00:00:00.000Z'),
    toDate: new Date('2026-09-10T23:59:59.000Z'),
    status: 'approved',
    approvedBy: hodCSE._id,
    remarks: 'Approved by HOD and Principal per Order #ISRO-2026',
  });

  await applyOnDutyToSessions({
    onDutyId: ivGrant._id,
    studentIds: ivStudents,
    fromDate: ivGrant.fromDate,
    toDate: ivGrant.toDate,
    eventTitle: ivGrant.eventTitle,
    markedBy: hodCSE._id,
  });

  // 2. Hackathon On-Duty (3 Days: 11 Sep to 14 Sep) for Student 5 & Student 6 (Aditya & Pooja)
  const hackStudents = [cseStudents[4]._id, cseStudents[5]._id];
  const hackGrant = await OnDuty.create({
    academicYear: academicYear._id,
    classBatch: batchTECSE._id,
    students: hackStudents,
    activityType: 'hackathon_tech',
    eventTitle: 'Smart India Hackathon 2026 Grand Finale',
    fromDate: new Date('2026-09-11T00:00:00.000Z'),
    toDate: new Date('2026-09-14T23:59:59.000Z'),
    status: 'approved',
    approvedBy: hodCSE._id,
    remarks: 'National Level Hackathon Finalist Team',
  });

  await applyOnDutyToSessions({
    onDutyId: hackGrant._id,
    studentIds: hackStudents,
    fromDate: hackGrant.fromDate,
    toDate: hackGrant.toDate,
    eventTitle: hackGrant.eventTitle,
    markedBy: hodCSE._id,
  });

  // 3. Holidays
  await Holiday.create([
    { name: 'Independence Day', date: new Date('2026-08-15'), academicYear: academicYear._id },
    { name: 'Ganesh Chaturthi', date: new Date('2026-09-14'), academicYear: academicYear._id },
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02'), academicYear: academicYear._id },
    { name: 'Diwali Break Day 1', date: new Date('2026-10-28'), academicYear: academicYear._id },
    { name: 'Diwali Break Day 2', date: new Date('2026-10-29'), academicYear: academicYear._id },
    { name: 'Diwali Break Day 3', date: new Date('2026-10-30'), academicYear: academicYear._id },
    { name: 'Republic Day', date: new Date('2027-01-26'), academicYear: academicYear._id },
  ]);

  console.log('Created College Holidays.');

  // ==========================================
  // PRINT SUMMARY & CREDENTIALS
  // ==========================================
  console.log('\n================================================================');
  console.log('   ✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
  console.log('\n--- 🔑 DEMO LOGIN CREDENTIALS ---');
  console.log('----------------------------------------------------------------');
  console.log('| Role / Designation     | Email                     | Password     |');
  console.log('----------------------------------------------------------------');
  console.log('| Principal (Admin)      | admin@college.edu         | Admin@123    |');
  console.log('| HOD CSE (Admin)        | hod.cse@college.edu       | Hod@1234     |');
  console.log('| HOD IT (Admin)         | hod.it@college.edu        | Hod@1234     |');
  console.log('| HOD AI-DS (Admin)      | hod.aids@college.edu      | Hod@1234     |');
  console.log('| Teacher (CSE)          | priya.sharma@college.edu  | Faculty@123  |');
  console.log('| Teacher (CSE)          | amit.deshmukh@college.edu | Faculty@123  |');
  console.log('| Teacher (IT)           | sneha.joshi@college.edu   | Faculty@123  |');
  console.log('| Teacher (IT)           | vikram.patel@college.edu  | Faculty@123  |');
  console.log('| Teacher (AI-DS)        | neha.gupta@college.edu    | Faculty@123  |');
  console.log('| Student 1 (Aarav - OD) | student1@college.edu      | Student@123  |');
  console.log('| Student 2 (Ananya - OD)| student2@college.edu      | Student@123  |');
  console.log('| Student 5 (Aditya - OD)| student5@college.edu      | Student@123  |');
  console.log('| Student 7 (Defaulter)  | student7@college.edu      | Student@123  |');
  console.log('| Other Students (1..20) | studentX@college.edu      | Student@123  |');
  console.log('----------------------------------------------------------------\n');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

seed().catch((err) => {
  console.error('\n❌ Seeding failed:', err);
  process.exit(1);
});