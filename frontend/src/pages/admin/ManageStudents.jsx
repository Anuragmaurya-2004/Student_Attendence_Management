import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import { validateStudentForm } from '../../validators';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  GraduationCap,
  Plus,
  Download,
  Upload,
  Search,
  Users,
  Building2,
} from 'lucide-react';

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
  const { user } = useAuth();
  const hodDeptId = user?.department?._id || user?.department;

  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [years, setYears] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [form, setForm] = useState({
    name: '',
    rollNo: '',
    email: '',
    password: '',
    parentEmail: '',
    gender: 'Male',
    department: hodDeptId || '',
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
    try {
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
    } catch (e) {
      console.error('Failed to load students data', e);
    }
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
      toast.success('Student enrolled successfully');
      window.dispatchEvent(new Event('refresh-notifications'));
      setForm({
        name: '',
        rollNo: '',
        email: '',
        password: '',
        parentEmail: '',
        gender: 'Male',
        department: hodDeptId || '',
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
        window.dispatchEvent(new Event('refresh-notifications'));
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

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const classLabel = getClassLabel(s);
      if (classFilter !== 'all' && classLabel !== classFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name?.toLowerCase().includes(q) ||
        s.rollNo?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.classBatch?.name?.toLowerCase().includes(q) ||
        s.department?.name?.toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery, classFilter]);

  const groupedStudents = useMemo(() => {
    const departmentMap = {};

    filteredStudents.forEach((student) => {
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
  }, [filteredStudents]);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <GraduationCap className="h-3.5 w-3.5" /> Student Directory
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Student Records & Enrollment
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Manage cohort admissions, departmental distributions, and spreadsheet roster imports.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <Users className="h-4 w-4 text-emerald-300" />
            <span>{students.length} Students Active</span>
          </div>
        </div>
      </div>

      {/* Add Student & Bulk Import Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card title="Enroll Individual Student" subtitle="Create new student record with credentials">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Input
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={errors.name}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
            </div>
            <div>
              <Input
                placeholder="Roll Number"
                value={form.rollNo}
                onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                error={errors.rollNo}
              />
              {errors.rollNo && <p className="mt-1 text-xs text-rose-500">{errors.rollNo}</p>}
            </div>
            <div>
              <Input
                type="email"
                placeholder="Student Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={errors.email}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
            </div>
            <div>
              <Input
                type="password"
                placeholder="Initial Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={errors.password}
              />
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
            </div>
            <div>
              <Input
                type="email"
                placeholder="Parent Email (optional)"
                value={form.parentEmail}
                onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
                error={errors.parentEmail}
              />
              {errors.parentEmail && <p className="mt-1 text-xs text-rose-500">{errors.parentEmail}</p>}
            </div>
            <div>
              <Select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                error={errors.gender}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </Select>
              {errors.gender && <p className="mt-1 text-xs text-rose-500">{errors.gender}</p>}
            </div>
            <div>
              <Select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                disabled={Boolean(user?.isHOD && hodDeptId)}
                error={errors.department}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </Select>
              {errors.department && <p className="mt-1 text-xs text-rose-500">{errors.department}</p>}
            </div>
            <div>
              <Select
                value={form.classBatch}
                onChange={(e) => setForm({ ...form, classBatch: e.target.value })}
                error={errors.classBatch}
              >
                <option value="">Select Class Batch</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </Select>
              {errors.classBatch && <p className="mt-1 text-xs text-rose-500">{errors.classBatch}</p>}
            </div>
            <div>
              <Select
                value={form.academicYearJoined}
                onChange={(e) =>
                  setForm({ ...form, academicYearJoined: e.target.value, currentAcademicYear: e.target.value })
                }
                error={errors.academicYearJoined || errors.currentAcademicYear}
              >
                <option value="">Academic Year</option>
                {years.map((y) => (
                  <option key={y._id} value={y._id}>{y.label}</option>
                ))}
              </Select>
              {(errors.academicYearJoined || errors.currentAcademicYear) && (
                <p className="mt-1 text-xs text-rose-500">{errors.academicYearJoined || errors.currentAcademicYear}</p>
              )}
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <Button type="submit" icon={Plus} className="w-full sm:w-auto">
                Add Student
              </Button>
            </div>
          </form>
        </Card>

        {/* Bulk Import Card */}
        <Card title="Spreadsheet Ingestion" subtitle="Bulk upload student cohorts via XLSX/CSV">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Download our standard Excel format, paste roll numbers and names, and upload here. Passwords are auto-generated if left blank.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownloadTemplate}
            >
              Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileImport}
              disabled={importing}
              className="hidden"
              id="student-file-input"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={Upload}
              loading={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {importing ? 'Uploading...' : 'Upload Excel'}
            </Button>
          </div>

          {importResult && (
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex gap-2 mb-2">
                <Badge color="green" dot>{importResult.created} created</Badge>
                {importResult.failed > 0 && <Badge color="red" dot>{importResult.failed} failed</Badge>}
              </div>
              <div className="max-h-48 overflow-y-auto">
                <Table
                  columns={[
                    { key: 'row', header: 'Row' },
                    { key: 'rollNo', header: 'Roll No' },
                    { key: 'name', header: 'Name' },
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
                  data={importResult.rows || []}
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Cohort Explorer Card with Search and Class Filter Pills */}
      <Card
        title={`All Enrolled Students (${filteredStudents.length})`}
        subtitle="Grouped by academic department and cohort year"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800/60">
              {['all', 'FE', 'SE', 'TE', 'BE'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setClassFilter(lvl)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    classFilter === lvl
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {lvl === 'all' ? 'All' : lvl}
                </button>
              ))}
            </div>

            <div className="relative w-52 sm:w-64">
              <Input
                placeholder="Search by name, roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!py-1.5 !text-xs !pl-8"
              />
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {groupedStudents.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No students found matching your criteria.
            </div>
          ) : (
            groupedStudents.map(({ departmentName, classGroups }) => (
              <div
                key={departmentName}
                className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800/30"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-700/80">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {departmentName}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Department Roster</p>
                    </div>
                  </div>
                  <Badge color="indigo">
                    {classGroups.reduce((total, group) => total + group.students.length, 0)} enrolled
                  </Badge>
                </div>

                <div className="space-y-5">
                  {classGroups.map(({ classLabel, students: list }) => (
                    <div
                      key={`${departmentName}-${classLabel}`}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge color="blue">{classLabel} Cohort</Badge>
                          <span className="text-xs text-slate-500">{list.length} students</span>
                        </div>
                      </div>

                      <Table
                        columns={[
                          { key: 'rollNo', header: 'Roll No' },
                          { key: 'name', header: 'Full Name' },
                          { key: 'email', header: 'Email' },
                          {
                            key: 'classBatch',
                            header: 'Batch',
                            render: (r) => r.classBatch?.name || 'Unassigned',
                          },
                          {
                            key: 'status',
                            header: 'Status',
                            render: (r) => (
                              <Badge color={r.status === 'active' ? 'green' : 'gray'} dot>
                                {r.status || 'active'}
                              </Badge>
                            ),
                          },
                        ]}
                        data={list}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
