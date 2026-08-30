const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { protect, authorize } = require('../middleware/auth');
const { computeAllDefaulters } = require('../services/defaulterService');

router.use(protect, authorize('admin', 'faculty'));

// @route GET /api/export/defaulters/excel
router.get('/defaulters/excel', async (req, res) => {
  const results = (await computeAllDefaulters({ academicYear: req.query.academicYear, logResults: false })).filter(
    (r) => r.isDefaulter
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Defaulters');
  sheet.columns = [
    { header: 'Roll No', key: 'rollNo', width: 15 },
    { header: 'Student Name', key: 'studentName', width: 25 },
    { header: 'Course', key: 'courseName', width: 25 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Attended Hours', key: 'attendedHours', width: 15 },
    { header: 'Total Held Hours', key: 'totalHeldHours', width: 15 },
    { header: 'Attendance %', key: 'attendancePercent', width: 15 },
    { header: 'Threshold %', key: 'threshold', width: 12 },
  ];
  results.forEach((r) => sheet.addRow(r));
  sheet.getRow(1).font = { bold: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=defaulters.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

// @route GET /api/export/defaulters/pdf
router.get('/defaulters/pdf', async (req, res) => {
  const results = (await computeAllDefaulters({ academicYear: req.query.academicYear, logResults: false })).filter(
    (r) => r.isDefaulter
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=defaulters.pdf');

  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(16).text('Attendance Defaulter Report', { align: 'center' });
  doc.moveDown();

  results.forEach((r, idx) => {
    doc
      .fontSize(10)
      .text(
        `${idx + 1}. ${r.rollNo} - ${r.studentName} | ${r.courseName} (${r.type}) | ${r.attendancePercent}% (min ${r.threshold}%)`
      );
  });

  if (results.length === 0) {
    doc.fontSize(12).text('No defaulters found. Great job!');
  }

  doc.end();
});

module.exports = router;
