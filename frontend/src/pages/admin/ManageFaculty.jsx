import React, { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import { validateFacultyForm } from '../../validators';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Download,
  Upload,
  Save,
  CheckCircle2,
} from 'lucide-react';

export default function ManageFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [savingFacultyId, setSavingFacultyId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    gender: 'Male',
    department: '',
    role: 'faculty',
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    gender: '',
    department: '',
  });
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const load = async () => {
    try {
      const [f, d, c, b] = await Promise.all([
        api.get('/faculty'),
        api.get('/academic/departments'),
        api.get('/academic/courses'),
        api.get('/academic/class-batches'),
      ]);
      setFaculty(f.data);
      setDepartments(d.data);
      setCourses(c.data);
      setBatches(b.data);
      setAssignments(
        Object.fromEntries(
          f.data.map((member) => [
            member._id,
            {
              coursesAssigned: (member.coursesAssigned || []).map((course) => course._id || course),
              classBatchesAssigned: (member.classBatchesAssigned || []).map((batch) => batch._id || batch),
            },
          ])
        )
      );
    } catch (err) {
      console.error('Failed to load faculty records', err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateAssignment = (facultyId, field, event) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value);
    setAssignments((current) => ({
      ...current,
      [facultyId]: { ...current[facultyId], [field]: values },
    }));
  };

  const saveAssignments = async (facultyId) => {
    setSavingFacultyId(facultyId);
    try {
      await api.put(`/faculty/${facultyId}`, assignments[facultyId]);
      toast.success('Faculty course and batch assignments saved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save faculty assignments');
    } finally {
      setSavingFacultyId(null);
    }
  };

  const validateForm = () => {
    const nextErrors = validateFacultyForm(form);
    setErrors({
      name: nextErrors.name || '',
      email: nextErrors.email || '',
      password: nextErrors.password || '',
      gender: nextErrors.gender || '',
      department: nextErrors.department || '',
    });
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const { data } = await api.post('/faculty', form);
      toast.success(data.message || 'Faculty member created');
      setForm({ name: '', email: '', password: '', gender: 'Male', department: '', role: 'faculty' });
      setErrors({ name: '', email: '', password: '', gender: '', department: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add faculty');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/faculty/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'faculty_import_template.xlsx');
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
      const res = await api.post('/faculty/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      if (res.data.created > 0) {
        toast.success(`Imported ${res.data.created} faculty record(s)${res.data.failed ? `, ${res.data.failed} failed` : ''}`);
      } else {
        toast.error('No faculty records were imported - check the results below');
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <Users className="h-3.5 w-3.5" /> Staff Directory
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Faculty & Administrator Management
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Manage instructors, course subject assignments, and class batch supervision.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span>{faculty.length} Members Registered</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Add Faculty Card */}
        <Card title="Register Faculty / Admin" subtitle="Create instructor profile with role privileges">
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
                type="email"
                placeholder="Faculty Email"
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
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="faculty">Faculty Instructor</option>
                <option value="admin">System Administrator</option>
              </Select>
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <Button type="submit" icon={Plus} className="w-full sm:w-auto">
                Add Faculty Member
              </Button>
            </div>
          </form>
        </Card>

        {/* Bulk Ingestion Card */}
        <Card title="Bulk Faculty Upload" subtitle="Add multiple teachers at once via spreadsheet">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Download our roster template, input email addresses, department codes, and initial passwords, then upload.
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
              id="faculty-file-input"
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
                <Badge color="green" dot>{importResult.created} imported</Badge>
                {importResult.failed > 0 && <Badge color="red" dot>{importResult.failed} failed</Badge>}
              </div>
              <div className="max-h-48 overflow-y-auto">
                <Table
                  columns={[
                    { key: 'row', header: 'Row' },
                    { key: 'email', header: 'Email' },
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

      {/* Faculty List & Subject Assignments */}
      <Card
        title={`Faculty Directory & Subject Allocation (${faculty.length})`}
        subtitle="Hold Ctrl/Cmd while clicking to select multiple courses or cohorts, then click Save Assignments."
      >
        <Table
          columns={[
            {
              key: 'name',
              header: 'Faculty Member',
              render: (r) => (
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{r.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.email}</p>
                </div>
              ),
            },
            {
              key: 'department',
              header: 'Department',
              render: (r) => r.department?.name || 'Unassigned',
            },
            {
              key: 'role',
              header: 'Access Role',
              render: (r) => (
                <Badge color={r.role === 'admin' ? 'blue' : 'gray'} dot>
                  {r.role === 'admin' ? 'Admin' : 'Faculty'}
                </Badge>
              ),
            },
            {
              key: 'coursesAssigned',
              header: 'Assigned Subjects',
              render: (r) => (
                <Select
                  multiple
                  size="3"
                  value={assignments[r._id]?.coursesAssigned || []}
                  onChange={(e) => updateAssignment(r._id, 'coursesAssigned', e)}
                  className="!py-1 !text-xs min-w-[200px] h-20"
                >
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </Select>
              ),
            },
            {
              key: 'classBatchesAssigned',
              header: 'Assigned Batches',
              render: (r) => (
                <Select
                  multiple
                  size="3"
                  value={assignments[r._id]?.classBatchesAssigned || []}
                  onChange={(e) => updateAssignment(r._id, 'classBatchesAssigned', e)}
                  className="!py-1 !text-xs min-w-[150px] h-20"
                >
                  {batches.map((batch) => (
                    <option key={batch._id} value={batch._id}>
                      {batch.name}
                    </option>
                  ))}
                </Select>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <Button
                  size="sm"
                  icon={Save}
                  loading={savingFacultyId === r._id}
                  onClick={() => saveAssignments(r._id)}
                  className="whitespace-nowrap"
                >
                  Save
                </Button>
              ),
            },
          ]}
          data={faculty}
        />
      </Card>
    </div>
  );
}
