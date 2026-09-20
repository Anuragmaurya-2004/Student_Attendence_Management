import Joi from 'joi';
import { REGEX } from './regex.js';

const createErrorMap = (error) => {
  const fieldErrors = {};
  if (!error) return fieldErrors;

  error.details.forEach((detail) => {
    const field = detail.path[0];
    fieldErrors[field] = detail.message;
  });

  return fieldErrors;
};

const emailMessages = {
  'string.empty': 'Email is required.',
  'string.pattern.base': 'Please enter a valid email address.',
};

const passwordMessages = {
  'string.empty': 'Password is required.',
  'string.min': 'Password must be at least 8 characters long.',
};

export const loginSchema = Joi.object({
  email: Joi.string().trim().required().pattern(REGEX.email).messages(emailMessages),
  password: Joi.string().required().min(8).messages(passwordMessages),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().min(8).messages({
    'string.empty': 'Current password is required.',
    'string.min': 'Current password must be at least 8 characters long.',
  }),
  newPassword: Joi.string().required().min(8).pattern(REGEX.password).messages({
    'string.empty': 'New password is required.',
    'string.min': 'New password must be at least 8 characters long.',
    'string.pattern.base': 'New password must include uppercase, lowercase, a number, and a special character.',
  }),
  confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')).messages({
    'string.empty': 'Please confirm your new password.',
    'any.only': 'New password and confirmation do not match.',
  }),
});

export const facultySchema = Joi.object({
  name: Joi.string().trim().required().min(2).messages({
    'string.empty': 'Full name is required.',
    'string.min': 'Name must be at least 2 characters.',
  }),
  email: Joi.string().trim().required().pattern(REGEX.email).messages(emailMessages),
  password: Joi.string().required().min(8).messages({
    'string.empty': 'Password is required.',
    'string.min': 'Password must be at least 8 characters.',
  }),
  gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say').required().messages({
    'any.only': 'Gender is required.',
    'any.required': 'Gender is required.',
    'string.empty': 'Gender is required.',
  }),
  department: Joi.string().required().messages({ 'string.empty': 'Department is required.' }),
  role: Joi.string().valid('faculty', 'admin').optional(),
});

export const holidaySchema = Joi.object({
  date: Joi.string().required().messages({ 'string.empty': 'Holiday date is required.' }),
  name: Joi.string().trim().required().min(2).messages({
    'string.empty': 'Holiday name is required.',
    'string.min': 'Holiday name must be at least 2 characters.',
  }),
  academicYear: Joi.string().required().messages({ 'string.empty': 'Academic year is required.' }),
  semester: Joi.number().min(1).allow('').optional().messages({
    'number.min': 'Semester must be at least 1.',
  }),
});

export const studentSchema = Joi.object({
  name: Joi.string().trim().required().min(2).messages({
    'string.empty': 'Full name is required.',
    'string.min': 'Name must be at least 2 characters.',
  }),
  rollNo: Joi.string().trim().required().min(2).messages({
    'string.empty': 'Roll number is required.',
    'string.min': 'Roll number must be at least 2 characters.',
  }),
  email: Joi.string().trim().required().pattern(REGEX.email).messages(emailMessages),
  password: Joi.string().allow('').min(8).messages({
    'string.min': 'Password must be at least 8 characters.',
  }),
  parentEmail: Joi.string().allow('').pattern(REGEX.email).messages({
    'string.pattern.base': 'Please enter a valid parent email.',
  }),
  gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say').required().messages({
    'any.only': 'Gender is required.',
    'any.required': 'Gender is required.',
    'string.empty': 'Gender is required.',
  }),
  department: Joi.string().required().messages({ 'string.empty': 'Department is required.' }),
  classBatch: Joi.string().required().messages({ 'string.empty': 'Class batch is required.' }),
  academicYearJoined: Joi.string().required().messages({ 'string.empty': 'Academic year is required.' }),
    currentAcademicYear: Joi.string().required().messages({ 'string.empty': 'Current academic year is required.' }),
});

export const sessionSchema = Joi.object({
  course: Joi.string().required().messages({ 'string.empty': 'Course is required.' }),
  classBatch: Joi.string().required().messages({ 'string.empty': 'Class batch is required.' }),
  academicYear: Joi.string().required().messages({ 'string.empty': 'Academic year is required.' }),
  date: Joi.string().required().messages({ 'string.empty': 'Session date is required.' }),
  startTime: Joi.string().required().messages({ 'string.empty': 'Start time is required.' }),
  endTime: Joi.string().required().messages({ 'string.empty': 'End time is required.' }),
  type: Joi.string().valid('theory', 'practical').required().messages({
    'any.only': 'Session type must be theory or practical.',
    'any.required': 'Session type is required.',
  }),
  durationHours: Joi.number().min(0.5).required().messages({
    'number.base': 'Duration must be greater than 0.',
    'number.min': 'Duration must be greater than 0.',
    'any.required': 'Duration must be greater than 0.',
  }),
});

export const departmentSchema = Joi.object({
  name: Joi.string().trim().required().min(2).messages({
    'string.empty': 'Department name is required.',
    'string.min': 'Department name must be at least 2 characters.',
  }),
  code: Joi.string().trim().required().min(2).messages({
    'string.empty': 'Department code is required.',
    'string.min': 'Code must be at least 2 characters.',
  }),
});

export const academicYearSchema = Joi.object({
  label: Joi.string().trim().required().messages({ 'string.empty': 'Academic year label is required.' }),
  startDate: Joi.string().required().messages({ 'string.empty': 'Start date is required.' }),
  endDate: Joi.string().required().messages({ 'string.empty': 'End date is required.' }),
});

export const batchSchema = Joi.object({
  name: Joi.string().trim().required().min(2).messages({
    'string.empty': 'Batch name is required.',
    'string.min': 'Batch name must be at least 2 characters.',
  }),
  department: Joi.string().required().messages({ 'string.empty': 'Department is required.' }),
  semester: Joi.number().min(1).required().messages({
    'number.empty': 'Semester is required.',
    'number.base': 'Semester is required.',
    'number.min': 'Semester must be greater than 0.',
  }),
  academicYear: Joi.string().required().messages({ 'string.empty': 'Academic year is required.' }),
});

export const courseSchema = Joi.object({
  name: Joi.string().trim().required().min(2).messages({
    'string.empty': 'Course name is required.',
    'string.min': 'Course name must be at least 2 characters.',
  }),
  code: Joi.string().trim().required().min(2).messages({
    'string.empty': 'Course code is required.',
    'string.min': 'Course code must be at least 2 characters.',
  }),
  type: Joi.string().valid('theory', 'practical').required().messages({
    'any.only': 'Course type must be theory or practical.',
    'any.required': 'Course type is required.',
  }),
  department: Joi.string().required().messages({ 'string.empty': 'Department is required.' }),
  semester: Joi.number().min(1).required().messages({
    'number.empty': 'Semester is required.',
    'number.base': 'Semester is required.',
    'number.min': 'Semester must be greater than 0.',
  }),
  weeklyHours: Joi.number().min(1).required().messages({
    'number.empty': 'Weekly hours is required.',
    'number.base': 'Weekly hours must be greater than 0.',
    'number.min': 'Weekly hours must be greater than 0.',
  }),
  academicYear: Joi.string().required().messages({ 'string.empty': 'Academic year is required.' }),
});

export const onDutySchema = Joi.object({
  formBatch: Joi.string().required().messages({ 'string.empty': 'Class batch is required.' }),
  formStudents: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'Select at least one student.',
    'any.required': 'Select at least one student.',
  }),
  activityType: Joi.string().trim().required().messages({ 'string.empty': 'Activity type is required.' }),
  eventTitle: Joi.string().trim().required().min(2).messages({
    'string.empty': 'Event title is required.',
    'string.min': 'Event title must be at least 2 characters.',
  }),
  fromDate: Joi.string().required().messages({ 'string.empty': 'From date is required.' }),
  toDate: Joi.string().required().messages({ 'string.empty': 'To date is required.' }),
  remarks: Joi.string().trim().allow('').optional(),
}).custom((value, helpers) => {
  if (value.fromDate && value.toDate && new Date(value.toDate) < new Date(value.fromDate)) {
    return helpers.message('To date cannot be earlier than from date.');
  }
  return value;
});

export const rolloverSchema = Joi.object({
  toYear: Joi.string().required().messages({ 'string.empty': 'Target academic year is required.' }),
  mappings: Joi.array().items(
    Joi.object({
      fromClassBatch: Joi.string().allow('').optional(),
      toClassBatch: Joi.string().allow('').optional(),
    })
  ).optional(),
  graduating: Joi.array().items(Joi.string()).optional(),
}).custom((value, helpers) => {
  const validMappings = (value.mappings || []).filter((m) => m.fromClassBatch && m.toClassBatch);
  const hasIncompleteMapping = (value.mappings || []).some(
    (m) => (m.fromClassBatch && !m.toClassBatch) || (!m.fromClassBatch && m.toClassBatch)
  );

  if (hasIncompleteMapping) {
    return helpers.message('Each mapping must include both the source and target class batch.');
  }

  if (validMappings.length === 0 && (!value.graduating || value.graduating.length === 0)) {
    return helpers.message('Add at least one class mapping or choose one graduating batch.');
  }

  return value;
});

export const validateLoginForm = (data) => {
  const { error } = loginSchema.validate(data, { abortEarly: false });
  const fieldErrors = createErrorMap(error);

  return {
    email: fieldErrors.email || '',
    password: fieldErrors.password || '',
  };
};

export const validateChangePasswordForm = (data) => {
  const nextErrors = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  const { error } = changePasswordSchema.validate(data, { abortEarly: false });
  const fieldErrors = createErrorMap(error);

  Object.assign(nextErrors, fieldErrors);

  if (data.newPassword && data.newPassword === data.currentPassword) {
    nextErrors.newPassword = 'New password must be different from the current password.';
  }

  return nextErrors;
};

export const validateFacultyForm = (data) => {
  const { error } = facultySchema.validate(data, { abortEarly: false });
  return createErrorMap(error);
};

export const validateHolidayForm = (data) => {
  const { error } = holidaySchema.validate(data, { abortEarly: false });
  return createErrorMap(error);
};

export const validateStudentForm = (data) => {
  const { error } = studentSchema.validate(data, { abortEarly: false });
  return createErrorMap(error);
};

export const validateSessionForm = (data) => {
  const { error } = sessionSchema.validate(data, { abortEarly: false });
  const fieldErrors = createErrorMap(error);

  if (!fieldErrors.endTime && data.startTime && data.endTime && data.endTime <= data.startTime) {
    fieldErrors.endTime = 'End time must be later than start time.';
  }

  if (!fieldErrors.durationHours && (!data.durationHours || Number(data.durationHours) <= 0)) {
    fieldErrors.durationHours = 'Duration must be greater than 0.';
  }

  return fieldErrors;
};

export const validateDepartmentForm = (data) => {
  const { error } = departmentSchema.validate(data, { abortEarly: false });
  return createErrorMap(error);
};

export const validateAcademicYearForm = (data) => {
  const { error } = academicYearSchema.validate(data, { abortEarly: false });
  const fieldErrors = createErrorMap(error);

  if (!fieldErrors.startDate && !fieldErrors.endDate && data.startDate && data.endDate && data.startDate >= data.endDate) {
    fieldErrors.endDate = 'End date must be later than the start date.';
  }

  return fieldErrors;
};

export const validateBatchForm = (data) => {
  const { error } = batchSchema.validate(data, { abortEarly: false });
  return createErrorMap(error);
};

export const validateCourseForm = (data) => {
  const { error } = courseSchema.validate(data, { abortEarly: false });
  return createErrorMap(error);
};

export const validateOnDutyForm = (data) => {
  const { error } = onDutySchema.validate(data, { abortEarly: false });
  return createErrorMap(error);
};

export const validateRolloverForm = (data) => {
  const { error } = rolloverSchema.validate(data, { abortEarly: false });
  return createErrorMap(error);
};
