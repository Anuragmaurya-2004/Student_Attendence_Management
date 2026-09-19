import React, { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import { validateAcademicYearForm, validateDepartmentForm, validateBatchForm, validateCourseForm } from '../../validators';
import toast from 'react-hot-toast';

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
  const [courseErrors, setCourseErrors] = useState({ name: '', code: '', type: '', department: '', semester: '', weeklyHours: '', academicYear: '' });
  const courseFileInputRef = useRef(null);
  const [courseImporting, setCourseImporting] = useState(false);
  const [courseImportResult, setCourseImportResult] = useState(null);

  const loadAll = async () => {
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
      toast.success('Saved');
      resetFn();
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
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
      <div className="rounded-[30px] border border-indigo-200/80 bg-gradient-to-r from-indigo-100 via-violet-100 to-white p-5 text-slate-900 shadow-[0_18px_36px_rgba(79,70,229,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600">Academic configuration</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Academic Setup</h1>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Enrollment data synced
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Academic Years */}
        <Card title="Academic Years">
          <form
            className="grid grid-cols-3 gap-2 mb-4"
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
            <div className="col-span-1">
              <Input
                placeholder="2026-2027"
                value={yearForm.label}
                onChange={(e) => setYearForm({ ...yearForm, label: e.target.value })}
                error={yearErrors.label}
              />
              {yearErrors.label && <p className="mt-1 text-xs text-red-500">{yearErrors.label}</p>}
            </div>
            <div className="col-span-1">
              <Input
                type="date"
                value={yearForm.startDate}
                onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                error={yearErrors.startDate}
              />
              {yearErrors.startDate && <p className="mt-1 text-xs text-red-500">{yearErrors.startDate}</p>}
            </div>
            <div className="col-span-1">
              <Input
                type="date"
                value={yearForm.endDate}
                onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                error={yearErrors.endDate}
              />
              {yearErrors.endDate && <p className="mt-1 text-xs text-red-500">{yearErrors.endDate}</p>}
            </div>
            <div className="col-span-3">
              <Button type="submit">+ Add Academic Year</Button>
            </div>
          </form>
          <Table
            columns={[
              { key: 'label', header: 'Label' },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (r.isActive ? <Badge color="green">Active</Badge> : <Badge>Inactive</Badge>),
              },
              {
                key: 'actions',
                header: '',
                render: (r) =>
                  !r.isActive && (
                    <Button
                      variant="outline"
                      className="!py-1 !px-2 text-xs"
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

        {/* Departments */}
        <Card title="Departments">
          <form
            className="grid grid-cols-2 gap-2 mb-4"
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
            {Object.values(courseErrors).some(Boolean) && (
              <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                <p className="font-medium">Complete these course fields:</p>
                <p className="mt-1">
                  {Object.entries(courseErrors)
                    .filter(([, message]) => message)
                    .map(([field]) => field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()))
                    .join(', ')}
                </p>
              </div>
            )}
            <div>
              <Input
                placeholder="Name (Computer Science)"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                error={deptErrors.name}
              />
              {deptErrors.name && <p className="mt-1 text-xs text-red-500">{deptErrors.name}</p>}
            </div>
            <div>
              <Input
                placeholder="Code (CS)"
                value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                error={deptErrors.code}
              />
              {deptErrors.code && <p className="mt-1 text-xs text-red-500">{deptErrors.code}</p>}
            </div>
            <div className="col-span-2">
              <Button type="submit">+ Add Department</Button>
            </div>
          </form>
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'code', header: 'Code' },
            ]}
            data={departments}
          />
        </Card>

        {/* Class Batches */}
        <Card title="Class Batches">
          <form
            className="grid grid-cols-2 gap-2 mb-4"
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
                placeholder="Name (CS-3A)"
                value={batchForm.name}
                onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                error={batchErrors.name}
              />
              {batchErrors.name && <p className="mt-1 text-xs text-red-500">{batchErrors.name}</p>}
            </div>
            <div>
              <Input
                placeholder="Semester"
                type="number"
                value={batchForm.semester}
                onChange={(e) => setBatchForm({ ...batchForm, semester: e.target.value })}
                error={batchErrors.semester}
              />
              {batchErrors.semester && <p className="mt-1 text-xs text-red-500">{batchErrors.semester}</p>}
            </div>
            <div>
              <Select
                value={batchForm.department}
                onChange={(e) => setBatchForm({ ...batchForm, department: e.target.value })}
                error={batchErrors.department}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              {batchErrors.department && <p className="mt-1 text-xs text-red-500">{batchErrors.department}</p>}
            </div>
            <div>
              <Select
                value={batchForm.academicYear}
                onChange={(e) => setBatchForm({ ...batchForm, academicYear: e.target.value })}
                error={batchErrors.academicYear}
              >
                <option value="">Select Academic Year</option>
                {years.map((y) => (
                  <option key={y._id} value={y._id}>
                    {y.label}
                  </option>
                ))}
              </Select>
              {batchErrors.academicYear && <p className="mt-1 text-xs text-red-500">{batchErrors.academicYear}</p>}
            </div>
            <div className="col-span-2">
              <Button type="submit">+ Add Class Batch</Button>
            </div>
          </form>
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'semester', header: 'Sem' },
              { key: 'department', header: 'Dept', render: (r) => r.department?.name },
              { key: 'academicYear', header: 'Year', render: (r) => r.academicYear?.label },
            ]}
            data={batches}
          />
        </Card>

        {/* Courses */}
        <Card title="Courses / Subjects">
          <form
            className="grid grid-cols-2 gap-2 mb-4"
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
                  setCourseErrors({ name: '', code: '', type: '', department: '', semester: '', weeklyHours: '', academicYear: '' });
                },
                validateCourse
              );
            }}
          >
            <div>
              <Input
                placeholder="Course Name"
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                error={courseErrors.name}
              />
              {courseErrors.name && <p className="mt-1 text-xs text-red-500">{courseErrors.name}</p>}
            </div>
            <div>
              <Input
                placeholder="Code (CS501)"
                value={courseForm.code}
                onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                error={courseErrors.code}
              />
              {courseErrors.code && <p className="mt-1 text-xs text-red-500">{courseErrors.code}</p>}
            </div>
            <div>
              <Input
                placeholder="Semester"
                type="number"
                value={courseForm.semester}
                onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                error={courseErrors.semester}
              />
              {courseErrors.semester && <p className="mt-1 text-xs text-red-500">{courseErrors.semester}</p>}
            </div>
            <div>
              <Select
                value={courseForm.type}
                onChange={(e) => setCourseForm({ ...courseForm, type: e.target.value })}
                error={courseErrors.type}
              >
                <option value="theory">Theory</option>
                <option value="practical">Practical</option>
              </Select>
              {courseErrors.type && <p className="mt-1 text-xs text-red-500">{courseErrors.type}</p>}
            </div>
            <div>
              <Input
                placeholder="Weekly Hours"
                type="number"
                value={courseForm.weeklyHours}
                onChange={(e) => setCourseForm({ ...courseForm, weeklyHours: e.target.value })}
                error={courseErrors.weeklyHours}
              />
              {courseErrors.weeklyHours && <p className="mt-1 text-xs text-red-500">{courseErrors.weeklyHours}</p>}
            </div>
            <div>
              <Select
                value={courseForm.department}
                onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })}
                error={courseErrors.department}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              {courseErrors.department && <p className="mt-1 text-xs text-red-500">{courseErrors.department}</p>}
            </div>
            <div className="col-span-2">
              <Select
                value={courseForm.academicYear}
                onChange={(e) => setCourseForm({ ...courseForm, academicYear: e.target.value })}
                error={courseErrors.academicYear}
              >
                <option value="">Select Academic Year</option>
                {years.map((y) => (
                  <option key={y._id} value={y._id}>
                    {y.label}
                  </option>
                ))}
              </Select>
              {courseErrors.academicYear && <p className="mt-1 text-xs text-red-500">{courseErrors.academicYear}</p>}
            </div>
            <div className="col-span-2">
              <Button type="submit">+ Add Course</Button>
            </div>
          </form>
          <div className="mt-4 mb-4 flex flex-wrap items-center gap-3">
            <Button variant="outline" type="button" onClick={handleCourseDownloadTemplate} className="inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M12 3.5a1 1 0 0 1 1 1V12l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L11 12V4.5a1 1 0 0 1 1-1Zm-7 12a1 1 0 0 1 1 1v1.5h12V16.5a1 1 0 1 1 2 0v2.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.5a1 1 0 0 1 1-1Z" fill="currentColor"/></svg>
              Download Template
            </Button>
            <input ref={courseFileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleCourseFileImport} disabled={courseImporting} className="text-sm" />
            {courseImporting && <span className="text-sm text-gray-500">Importing...</span>}
          </div>

          {courseImportResult && (
            <div className="mt-4">
              <div className="flex gap-2 mb-2">
                <Badge color="green">{courseImportResult.created} created</Badge>
                {courseImportResult.failed > 0 && <Badge color="red">{courseImportResult.failed} failed</Badge>}
              </div>
              <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg">
                <Table
                  columns={[
                    { key: 'row', header: 'Row' },
                    { key: 'code', header: 'Code' },
                    { key: 'name', header: 'Name' },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (r) => <Badge color={r.status === 'created' ? 'green' : 'red'}>{r.status}</Badge>,
                    },
                    { key: 'message', header: 'Details' },
                  ]}
                  data={courseImportResult.rows}
                />
              </div>
            </div>
          )}
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'code', header: 'Code' },
              { key: 'type', header: 'Type', render: (r) => <Badge color={r.type === 'practical' ? 'blue' : 'gray'}>{r.type}</Badge> },
              { key: 'weeklyHours', header: 'Hrs/wk' },
            ]}
            data={courses}
          />
        </Card>
      </div>
    </div>
  );
}
