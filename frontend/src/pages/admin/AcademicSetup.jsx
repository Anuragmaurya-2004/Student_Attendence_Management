import React, { useEffect, useState } from 'react';
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
  const [courseErrors, setCourseErrors] = useState({ name: '', code: '', department: '', semester: '', weeklyHours: '', academicYear: '' });

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
      department: nextErrors.department || '',
      semester: nextErrors.semester || '',
      weeklyHours: nextErrors.weeklyHours || '',
      academicYear: nextErrors.academicYear || '',
    });
    return !Object.values(nextErrors).some(Boolean);
  };

  const submit = async (fn, resetFn, validator) => {
    if (validator && !validator()) return;

    try {
      await fn();
      toast.success('Saved');
      resetFn();
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Academic Setup</h1>

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
                  setCourseErrors({ name: '', code: '', department: '', semester: '', weeklyHours: '', academicYear: '' });
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
              <Select value={courseForm.type} onChange={(e) => setCourseForm({ ...courseForm, type: e.target.value })}>
                <option value="theory">Theory</option>
                <option value="practical">Practical</option>
              </Select>
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
