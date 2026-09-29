/**
 * Helpers to evaluate role and department boundaries
 */

function isPrincipal(user) {
  if (!user) return false;
  const doc = user.doc || user;
  const desig = (doc.designation || '').toLowerCase();
  const email = (doc.email || '').toLowerCase();
  return desig.includes('principal') || email === 'admin@college.edu';
}

function isHOD(user) {
  if (!user) return false;
  const doc = user.doc || user;
  if (isPrincipal(user)) return false; // Principal has global authority, not single department HOD
  const desig = (doc.designation || '').toLowerCase();
  return (
    user.role === 'admin' &&
    (desig.includes('head') || desig.includes('hod') || Boolean(doc.department))
  );
}

/**
 * Returns department ObjectId or null.
 * If null: Global / Principal access (all departments).
 * If ObjectId string: Restrict query to this department only.
 */
function getDepartmentScope(req) {
  if (!req.user || !req.user.doc) return null;
  if (isPrincipal(req.user)) return null;

  // HOD or departmental faculty
  if (req.user.doc.department) {
    return req.user.doc.department.toString();
  }
  return null;
}

module.exports = {
  isPrincipal,
  isHOD,
  getDepartmentScope,
};
