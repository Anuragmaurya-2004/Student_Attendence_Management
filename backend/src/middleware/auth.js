const jwt = require('jsonwebtoken');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');

// Verifies JWT and attaches { id, role } to req.user
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (decoded.role === 'student') {
      user = await Student.findById(decoded.id);
    } else {
      user = await Faculty.findById(decoded.id); // covers 'faculty' and 'admin'
    }
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = { id: user._id.toString(), role: decoded.role, doc: user };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
};

// Restrict route to specific roles, e.g. authorize('admin'), authorize('admin', 'faculty')
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }
  next();
};

module.exports = { protect, authorize };
