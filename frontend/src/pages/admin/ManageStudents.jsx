import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import { validateStudentForm } from '../../validators';
import toast from 'react-hot-toast';

const classOrder = { FE: 1, SE: 2, TE: 3, BE: 4 };

const getClassLabel = (student) => {
  const semester = Number(student?.classBatch?.semester ?? 0);

  if (!semester) return 'Unassigned';
  if (semester <= 2) return 'FE';
  if (semester <= 4) return 'SE';
  if (semester <= 6) return 'TE';
  return 'BE';
};

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [years, setYears] = useState([]);
  const [form, setForm] = useState({
    name: '',
    rollNo: '',
    email: '',
    password: '',
    parentEmail: '',
    gender: 'Male',
    department: '',
    classBatch: '',
    academicYearJoined: '',
    currentAcademicYear: '',
  });
  const [errors, setErrors] = useState({
    name: '',
    rollNo: '',
    email: '',
    password: '',
    parentEmail: '',
    gender: '',
    department: '',
    classBatch: '',
    academicYearJoined: '',
  });
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const load = async () => {
    const [s, b, d, y] = await Promise.all([
      api.get('/students'),
      api.get('/academic/class-batches'),
      api.get('/academic/departments'),
      api.get('/academic/academic-years'),
    ]);
    setStudents(s.data);
    setBatches(b.data);
    setDepartments(d.data);
    setYears(y.data);
  };

  useEffect(() => {
    load();
  }, []);

  const validateForm = () => {
    const nextErrors = validateStudentForm(form);
    setErrors({
      name: nextErrors.name || '',
      rollNo: nextErrors.rollNo || '',
      email: nextErrors.email || '',
      password: nextErrors.password || '',
      parentEmail: nextErrors.parentEmail || '',
      gender: nextErrors.gender || '',
      department: nextErrors.department || '',
      classBatch: nextErrors.classBatch || '',
      academicYearJoined: nextErrors.academicYearJoined || '',
      currentAcademicYear: nextErrors.currentAcademicYear || '',
    });
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await api.post('/students', form);
      toast.success('Student added');
      setForm({
        name: '',
        rollNo: '',
        email: '',
        password: '',
        parentEmail: '',
        gender: 'Male',
        department: '',
        classBatch: '',
        academicYearJoined: '',
        currentAcademicYear: '',
      });
      setErrors({
        name: '',
        rollNo: '',
        email: '',
        password: '',
        parentEmail: '',
        gender: '',
        department: '',
        classBatch: '',
        academicYearJoined: '',
        currentAcademicYear: '',
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/students/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Could not download template');
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      if (res.data.created > 0) {
        toast.success(`Imported ${res.data.created} student(s)${res.data.failed ? `, ${res.data.failed} failed` : ''}`);
      } else {
        toast.error('No students were imported - check the results below');
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const groupedStudents = useMemo(() => {
    const departmentMap = {};

    students.forEach((student) => {
      const departmentName = student.department?.name || 'Unassigned';
      const classLabel = getClassLabel(student);

      if (!departmentMap[departmentName]) {
        departmentMap[departmentName] = {};
      }

      if (!departmentMap[departmentName][classLabel]) {
        departmentMap[departmentName][classLabel] = [];
      }

      departmentMap[departmentName][classLabel].push(student);
    });

    return Object.entries(departmentMap)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([departmentName, classGroups]) => ({
        departmentName,
        classGroups: Object.entries(classGroups)
          .sort(([left], [right]) => (classOrder[left] || 99) - (classOrder[right] || 99))
          .map(([classLabel, list]) => ({
            classLabel,
            students: list.sort((a, b) => a.name.localeCompare(b.name)),
          })),
      }));
  }, [students]);

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-indigo-200/80 bg-gradient-to-r from-indigo-100 via-violet-100 to-white p-5 text-slate-900 shadow-[0_18px_36px_rgba(79,70,229,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600">Student operations</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Manage Students</h1>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Student intake active
          </div>
        </div>
      </div>

      <Card title="Add Student">
        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-3">
          <div>
            <Input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          <div>
            <Input placeholder="Roll No" value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} error={errors.rollNo} />
            {errors.rollNo && <p className="mt-1 text-xs text-red-500">{errors.rollNo}</p>}
          </div>
          <div>
            <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>
          <div>
            <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          </div>
          <div>
            <Input type="email" placeholder="Parent Email (optional)" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} error={errors.parentEmail} />
            {errors.parentEmail && <p className="mt-1 text-xs text-red-500">{errors.parentEmail}</p>}
          </div>
          <div>
            <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} error={errors.gender}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </Select>
            {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender}</p>}
          </div>
          <div>
            <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} error={errors.department}>
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </Select>
            {errors.department && <p className="mt-1 text-xs text-red-500">{errors.department}</p>}
          </div>
          <div>
            <Select value={form.classBatch} onChange={(e) => setForm({ ...form, classBatch: e.target.value })} error={errors.classBatch}>
              <option value="">Select Class Batch</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </Select>
            {errors.classBatch && <p className="mt-1 text-xs text-red-500">{errors.classBatch}</p>}
          </div>
          <div>
            <Select
              value={form.academicYearJoined}
              onChange={(e) => setForm({ ...form, academicYearJoined: e.target.value, currentAcademicYear: e.target.value })}
              error={errors.academicYearJoined || errors.currentAcademicYear}
            >
              <option value="">Select Academic Year (joined / current)</option>
              {years.map((y) => (
                <option key={y._id} value={y._id}>{y.label}</option>
              ))}
            </Select>
            {(errors.academicYearJoined || errors.currentAcademicYear) && (
              <p className="mt-1 text-xs text-red-500">{errors.academicYearJoined || errors.currentAcademicYear}</p>
            )}
          </div>
          <div className="md:col-span-3">
            <Button type="submit">+ Add Student</Button>
          </div>
        </form>
      </Card>

      <Card title="Bulk Import from Excel / CSV">
        <p className="mb-3 text-sm text-slate-600">
          Add an entire class in one go instead of one by one. Download the template, fill in your
          students, and upload it back here. Rows with missing passwords get a random one
          auto-generated - the results below will show it so you can share it with each student.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handleDownloadTemplate} type="button" className="inline-flex items-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M12 3.5a1 1 0 0 1 1 1V12l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L11 12V4.5a1 1 0 0 1 1-1Zm-7 12a1 1 0 0 1 1 1v1.5h12V16.5a1 1 0 1 1 2 0v2.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.5a1 1 0 0 1 1-1Z" fill="currentColor"/></svg>
            Download Template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileImport}
            disabled={importing}
            className="text-sm"
          />
          {importing && <span className="text-sm text-gray-500">Importing...</span>}
        </div>

        {importResult && (
          <div className="mt-4">
            <div className="flex gap-2 mb-2">
              <Badge color="green">{importResult.created} created</Badge>
              {importResult.failed > 0 && <Badge color="red">{importResult.failed} failed</Badge>}
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg">
              <Table
                columns={[
                  { key: 'row', header: 'Row' },
                  { key: 'rollNo', header: 'Roll No' },
                  { key: 'name', header: 'Name' },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (r) => <Badge color={r.status === 'created' ? 'green' : 'red'}>{r.status}</Badge>,
                  },
                  { key: 'message', header: 'Details' },
                ]}
                data={importResult.rows}
              />
            </div>
          </div>
        )}
      </Card>

      <Card title={`All Students (${students.length})`}>
        <div className="space-y-5">
          {groupedStudents.map(({ departmentName, classGroups }) => (
            <div key={departmentName} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Department</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{departmentName}</h3>
                </div>
                <Badge color="indigo">
                  {classGroups.reduce((total, group) => total + group.students.length, 0)} students
                </Badge>
              </div>

              <div className="space-y-4">
                {classGroups.map(({ classLabel, students: groupedStudentsList }) => (
                  <div key={`${departmentName}-${classLabel}`} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                          {classLabel}
                        </span>
                        <span className="text-sm text-slate-500">{groupedStudentsList.length} students</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-white/70 text-left text-slate-600">
                            <th className="py-3 pr-4 font-semibold">Roll No</th>
                            <th className="py-3 pr-4 font-semibold">Name</th>
                            <th className="py-3 pr-4 font-semibold">Email</th>
                            <th className="py-3 pr-4 font-semibold">Class</th>
                            <th className="py-3 pr-4 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedStudentsList.map((student) => (
                            <tr key={student._id} className="border-b border-slate-100 bg-white/60 last:border-0 hover:bg-slate-50/80">
                              <td className="py-2.5 pr-4 font-medium text-slate-700">{student.rollNo}</td>
                              <td className="py-2.5 pr-4 text-slate-700">{student.name}</td>
                              <td className="py-2.5 pr-4 text-slate-600">{student.email}</td>
                              <td className="py-2.5 pr-4 text-slate-700">{student.classBatch?.name || 'N/A'}</td>
                              <td className="py-2.5 pr-4">
                                <Badge color={student.status === 'active' ? 'green' : 'gray'}>{student.status || 'active'}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
