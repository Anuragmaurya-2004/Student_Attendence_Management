const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Student = require('../models/Student');
const AcademicYear = require('../models/AcademicYear');
const ClassBatch = require('../models/ClassBatch');

router.use(protect, authorize('admin'));

/**
 * @desc Promote students to a new academic year.
 * @route POST /api/rollover/promote
 * body: {
 *   fromAcademicYear, toAcademicYear,
 *   mappings: [ { fromClassBatch, toClassBatch, promote: true } ],
 *   graduatingClassBatches: [classBatchId, ...]  // students in these become 'passed_out'
 * }
 *
 * For each student in a "fromClassBatch" that's being promoted:
 *  - push {academicYear, classBatch, semester} into student.history[]
 *  - set student.classBatch = toClassBatch, currentAcademicYear = toAcademicYear
 * For students in graduatingClassBatches: set status = 'passed_out' (kept, not deleted)
 * All existing Sessions/Attendance/DefaulterLog remain tagged with the OLD academicYear,
 * fully queryable later for historical reports.
 */
router.post('/promote', async (req, res) => {
  const { toAcademicYear, mappings = [], graduatingClassBatches = [] } = req.body;

  const newYear = await AcademicYear.findById(toAcademicYear);
  if (!newYear) return res.status(404).json({ message: 'Target academic year not found' });

  const summary = { promoted: 0, graduated: 0, details: [] };

  for (const map of mappings) {
    const { fromClassBatch, toClassBatch } = map;
    const students = await Student.find({ classBatch: fromClassBatch, status: 'active' });
    const targetBatch = await ClassBatch.findById(toClassBatch);

    for (const student of students) {
      student.history.push({
        academicYear: student.currentAcademicYear,
        classBatch: student.classBatch,
        semester: targetBatch ? targetBatch.semester - 1 : undefined,
      });
      student.classBatch = toClassBatch;
      student.currentAcademicYear = toAcademicYear;
      student.status = 'active'; // stays active in the new year immediately - no intermediate state
      await student.save();
      summary.promoted += 1;
    }
    summary.details.push({ fromClassBatch, toClassBatch, count: students.length });
  }

  for (const classBatchId of graduatingClassBatches) {
    const result = await Student.updateMany(
      { classBatch: classBatchId, status: 'active' },
      { $set: { status: 'passed_out' } }
    );
    summary.graduated += result.modifiedCount || 0;
  }

  // Mark new academic year active, deactivate others
  await AcademicYear.updateMany({}, { isActive: false });
  newYear.isActive = true;
  await newYear.save();

  res.json({ message: 'Rollover complete', summary });
});

module.exports = router;
