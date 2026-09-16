const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createOnDuty,
  getAllOnDuty,
  getStudentOnDuty,
  deleteOnDuty,
} = require('../controllers/onDutyController');

router.use(protect);

router.get('/student/:studentId', getStudentOnDuty);

// Admin & Faculty actions
router.post('/', authorize('admin', 'faculty'), createOnDuty);
router.get('/', authorize('admin', 'faculty'), getAllOnDuty);
router.delete('/:id', authorize('admin', 'faculty'), deleteOnDuty);

module.exports = router;
