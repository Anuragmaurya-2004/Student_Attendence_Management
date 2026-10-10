const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createSession,
  generateSessionQR,
  finalizeSessionAbsent,
  updateSessionLocation,
  listSessions,
  getSession,
} = require('../controllers/sessionController');

router.use(protect);

router.get('/', listSessions);
router.get('/:id', getSession);
router.post('/', authorize('admin', 'faculty'), createSession);
router.post('/:id/qr', authorize('admin', 'faculty'), generateSessionQR);
router.post('/:id/finalize-absent', authorize('admin', 'faculty'), finalizeSessionAbsent);
router.put('/:id/location', authorize('admin', 'faculty'), updateSessionLocation);

module.exports = router;
