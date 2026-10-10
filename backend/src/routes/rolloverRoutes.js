const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Student = require('../models/Student');
const AcademicYear = require('../models/AcademicYear');
const ClassBatch = require('../models/ClassBatch');
const { getDepartmentScope } = require('../utils/userScope');

router.use(protect, authorize('admin'));

/**
 * @desc Get rollover pre-flight metadata & auto-suggested mappings.
 * @route GET /api/rollover/preview
 */
router.get('/preview', async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const { targetYearId } = req.query;

  const currentYear = await AcademicYear.findOne({ isActive: true });
  const allYears = await AcademicYear.find().sort('-startDate');

  const batchFilter = {};
  if (deptScope) {
    batchFilter.department = deptScope;
  }

  const allBatches = await ClassBatch.find(batchFilter)
    .populate('department', 'name code')
    .populate('academicYear', 'label isActive')
    .sort('department semester name');

  // Count active students in each batch
  const studentCounts = await Student.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$classBatch', count: { $sum: 1 } } },
  ]);
  const countMap = new Map();
  studentCounts.forEach((c) => countMap.set(c._id.toString(), c.count));

  // Find target batches in the target year (if specified) or all potential target batches
  const targetBatches = targetYearId
    ? allBatches.filter((b) => b.academicYear?._id?.toString() === targetYearId)
    : allBatches;

  // Build batch data with auto-suggestion
  const batchSummaries = allBatches.map((batch) => {
    const studentCount = countMap.get(batch._id.toString()) || 0;
    const isGraduating = batch.semester >= 8;

    // Auto-suggest next batch: same department, semester is batch.semester + 1 or + 2
    let suggestedTarget = null;
    if (!isGraduating && targetBatches.length > 0) {
      suggestedTarget = targetBatches.find(
        (tb) =>
          tb.department?._id?.toString() === batch.department?._id?.toString() &&
          tb._id.toString() !== batch._id.toString() &&
          (tb.semester === batch.semester + 2 || tb.semester === batch.semester + 1)
      );
    }

    return {
      _id: batch._id,
      name: batch.name,
      semester: batch.semester,
      department: batch.department,
      academicYear: batch.academicYear,
      activeStudentCount: studentCount,
      isGraduating,
      suggestedTarget: suggestedTarget
        ? {
            _id: suggestedTarget._id,
            name: suggestedTarget.name,
            semester: suggestedTarget.semester,
          }
        : null,
    };
  });

  res.json({
    currentYear,
    allYears,
    batches: batchSummaries,
  });
});

/**
 * @desc Get list of students in a specific batch for retention/exclusion inspection.
 * @route GET /api/rollover/batch-students/:classBatchId
 */
router.get('/batch-students/:classBatchId', async (req, res) => {
  const students = await Student.find({
    classBatch: req.params.classBatchId,
    status: 'active',
  })
    .select('_id name rollNo email')
    .sort('rollNo');

  res.json(students);
});

/**
 * @desc Promote students to a new academic year in high-performance atomic bulk operations.
 * @route POST /api/rollover/promote
 */
router.post('/promote', async (req, res) => {
  const {
    toAcademicYear,
    mappings = [],
    graduatingClassBatches = [],
    retainedStudentIds = [],
  } = req.body;

  const newYear = await AcademicYear.findById(toAcademicYear);
  if (!newYear) return res.status(404).json({ message: 'Target academic year not found' });

  const summary = {
    promoted: 0,
    graduated: 0,
    retained: 0,
    details: [],
    errors: [],
  };

  const retainedSet = new Set((retainedStudentIds || []).map((id) => id.toString()));

  for (const map of mappings) {
    const { fromClassBatch, toClassBatch, excludedStudentIds = [] } = map;
    if (!fromClassBatch || !toClassBatch) continue;

    const [fromBatch, targetBatch] = await Promise.all([
      ClassBatch.findById(fromClassBatch).populate('department'),
      ClassBatch.findById(toClassBatch).populate('department'),
    ]);

    if (!fromBatch || !targetBatch) continue;

    const specificExcluded = new Set((excludedStudentIds || []).map((id) => id.toString()));

    // Find all active students in this source batch
    const students = await Student.find({ classBatch: fromClassBatch, status: 'active' });

    const toPromote = [];
    let excludedCount = 0;

    for (const student of students) {
      const sId = student._id.toString();
      if (retainedSet.has(sId) || specificExcluded.has(sId)) {
        excludedCount++;
      } else {
        toPromote.push(student);
      }
    }

    if (toPromote.length > 0) {
      const bulkOps = toPromote.map((student) => ({
        updateOne: {
          filter: { _id: student._id },
          update: {
            $push: {
              history: {
                academicYear: student.currentAcademicYear,
                classBatch: student.classBatch,
                semester: fromBatch?.semester || 1,
              },
            },
            $set: {
              classBatch: toClassBatch,
              currentAcademicYear: toAcademicYear,
              status: 'active',
            },
          },
        },
      }));

      try {
        await Student.bulkWrite(bulkOps, { ordered: false });
        summary.promoted += toPromote.length;
      } catch (bulkErr) {
        console.error('Bulk promotion partial error:', bulkErr);
        summary.errors.push(`Some students in ${fromBatch.name} could not be updated: ${bulkErr.message}`);
        // Count successful modified
        summary.promoted += bulkErr.result?.nModified || toPromote.length;
      }
    }

    summary.retained += excludedCount;
    summary.details.push({
      fromClassBatchId: fromClassBatch,
      fromClassName: fromBatch.name,
      toClassBatchId: toClassBatch,
      toClassName: targetBatch.name,
      promotedCount: toPromote.length,
      retainedCount: excludedCount,
    });
  }

  // Handle graduating batches
  if (graduatingClassBatches.length > 0) {
    const graduatingStudents = await Student.find({
      classBatch: { $in: graduatingClassBatches },
      status: 'active',
    });

    const toGraduate = graduatingStudents.filter(
      (s) => !retainedSet.has(s._id.toString())
    );

    if (toGraduate.length > 0) {
      const gradOps = toGraduate.map((s) => ({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { status: 'passed_out' } },
        },
      }));
      await Student.bulkWrite(gradOps, { ordered: false });
      summary.graduated += toGraduate.length;
    }
  }

  // Activate new academic year
  await AcademicYear.updateMany({}, { isActive: false });
  newYear.isActive = true;
  await newYear.save();

  try {
    const { createNotification } = require('../utils/notificationService');
    await createNotification({
      title: 'Academic Year Rollover Completed',
      message: `Rollover complete to ${newYear.label}. ${summary.promoted} student(s) promoted, ${summary.graduated} graduated, ${summary.retained} retained.`,
      type: 'success',
      link: '/admin/rollover',
      recipientRole: 'admin',
    });

    if (summary.promoted > 0) {
      await createNotification({
        title: 'Academic Year Rollover',
        message: `Welcome to Academic Year ${newYear.label}! Your class batch and curriculum have been updated.`,
        type: 'info',
        link: '/student',
        recipientRole: 'student',
      });
    }
  } catch (notifErr) {
    console.error('Failed to dispatch rollover notifications:', notifErr);
  }

  res.json({ message: 'Rollover complete', summary });
});

module.exports = router;
