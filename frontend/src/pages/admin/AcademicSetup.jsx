import React, { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import { validateAcademicYearForm, validateDepartmentForm, validateBatchForm, validateCourseForm } from '../../validators';
import toast from 'react-hot-toast';
import {
  Settings,
  Plus,
  Download,
  Upload,
  CheckCircle2,
} from 'lucide-react';

export default function AcademicSetup() {
  const [departments, setDepartments] = useState([]);
  const [years, setYears] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);

  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [yearForm, setYearForm] = useState({ label: '', startDate: '', endDate: '' });
  const [batchForm, setBatchForm] = useState({ name: '', department: '', semester: '', academicYear: '' });
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    department: '',
    semester: '',
    type: 'theory',
    weeklyHours: 1,
    academicYear: '',
  });

  const [deptErrors, setDeptErrors] = useState({ name: '', code: '' });
  const [yearErrors, setYearErrors] = useState({ label: '', startDate: '', endDate: '' });
  const [batchErrors, setBatchErrors] = useState({ name: '', department: '', semester: '', academicYear: '' });
  const [courseErrors, setCourseErrors] = useState({
    name: '',
    code: '',
    type: '',
    department: '',
    semester: '',
    weeklyHours: '',
    academicYear: '',
  });

  const courseFileInputRef = useRef(null);
  const [courseImporting, setCourseImporting] = useState(false);
  const [courseImportResult, setCourseImportResult] = useState(null);

  const loadAll = async () => {
    try {
      const [d, y, b, c] = await Promise.all([
        api.get('/academic/departments'),
        api.get('/academic/academic-years'),
        api.get('/academic/class-batches'),
        api.get('/academic/courses'),
      ]);
      setDepartments(d.data);
      setYears(y.data);
      setBatches(b.data);
      setCourses(c.data);
    } catch (e) {
      console.error('Failed to load academic setup records', e);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const validateDepartment = () => {
    const nextErrors = validateDepartmentForm(deptForm);
    setDeptErrors({ name: nextErrors.name || '', code: nextErrors.code || '' });
    return !Object.values(nextErrors).some(Boolean);
  };

  const validateAcademicYear = () => {
    const nextErrors = validateAcademicYearForm(yearForm);
    setYearErrors({ label: nextErrors.label || '', startDate: nextErrors.startDate || '', endDate: nextErrors.endDate || '' });
    return !Object.values(nextErrors).some(Boolean);
  };

  const validateBatch = () => {
    const nextErrors = validateBatchForm(batchForm);
    setBatchErrors({
      name: nextErrors.name || '',
      department: nextErrors.department || '',
      semester: nextErrors.semester || '',
      academicYear: nextErrors.academicYear || '',
    });
    return !Object.values(nextErrors).some(Boolean);
  };

  const validateCourse = () => {
    const nextErrors = validateCourseForm(courseForm);
    setCourseErrors({
      name: nextErrors.name || '',
      code: nextErrors.code || '',
      type: nextErrors.type || '',
      department: nextErrors.department || '',
      semester: nextErrors.semester || '',
      weeklyHours: nextErrors.weeklyHours || '',
      academicYear: nextErrors.academicYear || '',
    });
    return !Object.values(nextErrors).some(Boolean);
  };

  const submit = async (fn, resetFn, validator) => {
    if (validator && !validator()) {
      toast.error('Please complete the highlighted fields.');
      return;
    }

    try {
      await fn();
      toast.success('Record saved successfully');
      resetFn();
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save record');
    }
  };

  const handleCourseDownloadTemplate = async () => {
    try {
      const res = await api.get('/academic/courses/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'course_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Could not download course template');
    }
  };

  const handleCourseFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCourseImporting(true);
    setCourseImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/academic/courses/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCourseImportResult(res.data);
      if (res.data.created > 0) {
        toast.success(`Imported ${res.data.created} course(s)${res.data.failed ? `, ${res.data.failed} failed` : ''}`);
      } else {
        toast.error('No courses were imported - check the results below');
      }
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Course import failed');
    } finally {
      setCourseImporting(false);
      if (courseFileInputRef.current) courseFileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <Settings className="h-3.5 w-3.5" /> Institution Architecture
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Academic Setup
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Configure academic years, departments, class cohorts, and course subjects.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span>Setup Active</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Academic Years Card */}
        <Card title="Academic Years" subtitle="Define active session periods">
          <form
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit(
                () => api.post('/academic/academic-years', yearForm),
                () => {
                  setYearForm({ label: '', startDate: '', endDate: '' });
                  setYearErrors({ label: '', startDate: '', endDate: '' });
                },
                validateAcademicYear
              );
            }}
          >
            <div>
              <Input
                placeholder="e.g. 2026-2027"
                value={yearForm.label}
                onChange={(e) => setYearForm({ ...yearForm, label: e.target.value })}
                error={yearErrors.label}
              />
              {yearErrors.label && <p className="mt-1 text-xs text-rose-500">{yearErrors.label}</p>}
            </div>
            <div>
              <Input
                type="date"
                value={yearForm.startDate}
                onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                error={yearErrors.startDate}
              />
              {yearErrors.startDate && <p className="mt-1 text-xs text-rose-500">{yearErrors.startDate}</p>}
            </div>
            <div>
              <Input
                type="date"
                value={yearForm.endDate}
                onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                error={yearErrors.endDate}
              />
              {yearErrors.endDate && <p className="mt-1 text-xs text-rose-500">{yearErrors.endDate}</p>}
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" icon={Plus} size="sm" className="w-full sm:w-auto">
                Add Academic Year
              </Button>
            </div>
          </form>

          <Table
            columns={[
              { key: 'label', header: 'Year Label' },
              {
                key: 'status',
                header: 'Status',
                render: (r) =>
                  r.isActive ? (
                    <Badge color="green" dot>Active</Badge>
                  ) : (
                    <Badge color="gray">Inactive</Badge>
                  ),
              },
              {
                key: 'actions',
                header: '',
                render: (r) =>
                  !r.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="!py-1 !px-2.5 text-xs"
                      onClick={() =>
                        submit(
                          () => api.put(`/academic/academic-years/${r._id}/activate`),
                          () => {}
                        )
                      }
                    >
                      Set Active
                    </Button>
                  ),
              },
            ]}
            data={years}
          />
        </Card>

        {/* Departments Card */}
        <Card title="Departments" subtitle="Academic branches and divisions">
          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit(
                () => api.post('/academic/departments', deptForm),
                () => {
                  setDeptForm({ name: '', code: '' });
                  setDeptErrors({ name: '', code: '' });
                },
                validateDepartment
              );
            }}
          >
            <div>
              <Input
                placeholder="Department Name (Computer Science)"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                error={deptErrors.name}
              />
              {deptErrors.name && <p className="mt-1 text-xs text-rose-500">{deptErrors.name}</p>}
            </div>
            <div>
              <Input
                placeholder="Code (e.g. CS)"
                value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                error={deptErrors.code}
              />
              {deptErrors.code && <p className="mt-1 text-xs text-rose-500">{deptErrors.code}</p>}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" icon={Plus} size="sm" className="w-full sm:w-auto">
                Add Department
              </Button>
            </div>
          </form>

          <Table
            columns={[
              { key: 'name', header: 'Department Name' },
              {
                key: 'code',
                header: 'Code',
                render: (r) => <Badge color="indigo">{r.code}</Badge>,
              },
            ]}
            data={departments}
          />
        </Card>

        {/* Class Batches Card */}
        <Card title="Class Batches / Divisions" subtitle="Cohort groups enrolled in semesters">
          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit(
                () => api.post('/academic/class-batches', batchForm),
                () => {
                  setBatchForm({ name: '', department: '', semester: '', academicYear: '' });
                  setBatchErrors({ name: '', department: '', semester: '', academicYear: '' });
                },
                validateBatch
              );
            }}
          >
            <div>
              <Input
                placeholder="Batch Name (e.g. CS-3A)"
                value={batchForm.name}
                onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                error={batchErrors.name}
              />
              {batchErrors.name && <p className="mt-1 text-xs text-rose-500">{batchErrors.name}</p>}
            </div>
            <div>
              <Input
                placeholder="Semester (1-8)"
                type="number"
                min="1"
                max="8"
                value={batchForm.semester}
                onChange={(e) => setBatchForm({ ...batchForm, semester: e.target.value })}
                error={batchErrors.semester}
              />
              {batchErrors.semester && <p className="mt-1 text-xs text-rose-500">{batchErrors.semester}</p>}
            </div>
            <div>
              <Select
                value={batchForm.department}
                onChange={(e) => setBatchForm({ ...batchForm, department: e.target.value })}
                error={batchErrors.department}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </Select>
              {batchErrors.department && <p className="mt-1 text-xs text-rose-500">{batchErrors.department}</p>}
            </div>
            <div>
              <Select
                value={batchForm.academicYear}
                onChange={(e) => setBatchForm({ ...batchForm, academicYear: e.target.value })}
                error={batchErrors.academicYear}
              >
                <option value="">Select Academic Year</option>
                {years.map((y) => (
                  <option key={y._id} value={y._id}>{y.label}</option>
                ))}
              </Select>
              {batchErrors.academicYear && <p className="mt-1 text-xs text-rose-500">{batchErrors.academicYear}</p>}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" icon={Plus} size="sm" className="w-full sm:w-auto">
                Add Class Batch
              </Button>
            </div>
          </form>

          <Table
            columns={[
              { key: 'name', header: 'Batch' },
              {
                key: 'semester',
                header: 'Sem',
                render: (r) => <Badge color="gray">Sem {r.semester}</Badge>,
              },
              { key: 'department', header: 'Department', render: (r) => r.department?.name },
              { key: 'academicYear', header: 'Academic Year', render: (r) => r.academicYear?.label },
            ]}
            data={batches}
          />
        </Card>

        {/* Courses / Subjects Card */}
        <Card title="Courses / Subjects" subtitle="Lecture, practical, and project units">
          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit(
                () => api.post('/academic/courses', courseForm),
                () => {
                  setCourseForm({
                    name: '',
                    code: '',
                    department: '',
                    semester: '',
                    type: 'theory',
                    weeklyHours: 1,
                    academicYear: '',
                  });
                  setCourseErrors({
                    name: '',
                    code: '',
                    type: '',
                    department: '',
                    semester: '',
                    weeklyHours: '',
                    academicYear: '',
                  });
                },
                validateCourse
              );
            }}
          >
            <div>
              <Input
                placeholder="Course Title"
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                error={courseErrors.name}
              />
              {courseErrors.name && <p className="mt-1 text-xs text-rose-500">{courseErrors.name}</p>}
            </div>
            <div>
              <Input
                placeholder="Code (e.g. CS501)"
                value={courseForm.code}
                onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                error={courseErrors.code}
              />
              {courseErrors.code && <p className="mt-1 text-xs text-rose-500">{courseErrors.code}</p>}
            </div>
            <div>
              <Input
                placeholder="Semester"
                type="number"
                min="1"
                max="8"
                value={courseForm.semester}
                onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                error={courseErrors.semester}
              />
              {courseErrors.semester && <p className="mt-1 text-xs text-rose-500">{courseErrors.semester}</p>}
            </div>
            <div>
              <Select
                value={courseForm.type}
                onChange={(e) => setCourseForm({ ...courseForm, type: e.target.value })}
                error={courseErrors.type}
              >
                <option value="theory">Theory</option>
                <option value="practical">Practical</option>
                <option value="project">Project (Guide Review)</option>
              </Select>
              {courseErrors.type && <p className="mt-1 text-xs text-rose-500">{courseErrors.type}</p>}
            </div>
            <div>
              <Input
                placeholder="Weekly Hours"
                type="number"
                min="1"
                value={courseForm.weeklyHours}
                onChange={(e) => setCourseForm({ ...courseForm, weeklyHours: e.target.value })}
                error={courseErrors.weeklyHours}
              />
              {courseErrors.weeklyHours && <p className="mt-1 text-xs text-rose-500">{courseErrors.weeklyHours}</p>}
            </div>
            <div>
              <Select
                value={courseForm.department}
                onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })}
                error={courseErrors.department}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </Select>
              {courseErrors.department && <p className="mt-1 text-xs text-rose-500">{courseErrors.department}</p>}
            </div>
            <div className="sm:col-span-2">
              <Select
                value={courseForm.academicYear}
                onChange={(e) => setCourseForm({ ...courseForm, academicYear: e.target.value })}
                error={courseErrors.academicYear}
              >
                <option value="">Select Academic Year</option>
                {years.map((y) => (
                  <option key={y._id} value={y._id}>{y.label}</option>
                ))}
              </Select>
              {courseErrors.academicYear && <p className="mt-1 text-xs text-rose-500">{courseErrors.academicYear}</p>}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" icon={Plus} size="sm" className="w-full sm:w-auto">
                Add Course
              </Button>
            </div>
          </form>

          {/* Bulk Import Strip */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 mb-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Bulk Import Courses
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCourseDownloadTemplate}
                  icon={Download}
                >
                  Template
                </Button>
                <input
                  ref={courseFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleCourseFileImport}
                  disabled={courseImporting}
                  className="hidden"
                  id="course-file-input"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Upload}
                  loading={courseImporting}
                  onClick={() => courseFileInputRef.current?.click()}
                >
                  {courseImporting ? 'Uploading...' : 'Upload Excel'}
                </Button>
              </div>
            </div>

            {courseImportResult && (
              <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-slate-700">
                <div className="flex gap-2 mb-2">
                  <Badge color="green" dot>{courseImportResult.created} imported</Badge>
                  {courseImportResult.failed > 0 && <Badge color="red" dot>{courseImportResult.failed} failed</Badge>}
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <Table
                    columns={[
                      { key: 'row', header: 'Row' },
                      { key: 'code', header: 'Code' },
                      { key: 'name', header: 'Course' },
                      {
                        key: 'status',
                        header: 'Status',
                        render: (r) => (
                          <Badge color={r.status === 'created' ? 'green' : 'red'}>
                            {r.status}
                          </Badge>
                        ),
                      },
                      { key: 'message', header: 'Details' },
                    ]}
                    data={courseImportResult.rows || []}
                  />
                </div>
              </div>
            )}
          </div>

          <Table
            columns={[
              { key: 'name', header: 'Course Title' },
              {
                key: 'code',
                header: 'Code',
                render: (r) => <Badge color="indigo">{r.code}</Badge>,
              },
              {
                key: 'type',
                header: 'Type',
                render: (r) => (
                  <Badge color={r.type === 'practical' ? 'blue' : r.type === 'project' ? 'purple' : 'gray'}>
                    {r.type}
                  </Badge>
                ),
              },
              { key: 'weeklyHours', header: 'Hrs/wk', render: (r) => `${r.weeklyHours}h` },
            ]}
            data={courses}
          />
        </Card>
      </div>
    </div>
  );
}
