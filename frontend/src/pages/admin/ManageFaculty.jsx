import React, { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import { validateFacultyForm } from '../../validators';
import toast from 'react-hot-toast';

export default function ManageFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', role: 'faculty' });
  const [errors, setErrors] = useState({ name: '', email: '', password: '', department: '' });
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const load = async () => {
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
    try {
      await api.put(`/faculty/${facultyId}`, assignments[facultyId]);
      toast.success('Faculty assignments saved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save faculty assignments');
    }
  };

  const validateForm = () => {
    const nextErrors = validateFacultyForm(form);
    setErrors({
      name: nextErrors.name || '',
      email: nextErrors.email || '',
      password: nextErrors.password || '',
      department: nextErrors.department || '',
    });
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const { data } = await api.post('/faculty', form);
      toast.success(data.message || 'Faculty added');
      setForm({ name: '', email: '', password: '', department: '', role: 'faculty' });
      setErrors({ name: '', email: '', password: '', department: '' });
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
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Manage Faculty</h1>
      <Card title="Add Faculty / Admin">
        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-3">
          <div>
            <Input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
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
            <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} error={errors.department}>
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </Select>
            {errors.department && <p className="mt-1 text-xs text-red-500">{errors.department}</p>}
          </div>
          <div>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div>
            <Button type="submit">+ Add</Button>
          </div>
        </form>
      </Card>

      <Card title="Bulk Import from Excel / CSV">
        <p className="text-sm text-gray-500 mb-3">
          Add multiple faculty members in one upload instead of creating them one by one. Download the template, fill in each faculty member, and upload the file back here.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handleDownloadTemplate} type="button">⬇ Download Template</Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} disabled={importing} className="text-sm" />
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
                  { key: 'email', header: 'Email' },
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

      <Card title={`All Faculty (${faculty.length})`}>
        <p className="mb-3 text-xs text-gray-500">Select multiple subjects or classes with Ctrl-click (or Cmd-click on macOS), then choose Save Assignments.</p>
        <Table
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'department', header: 'Dept', render: (r) => r.department?.name },
            { key: 'role', header: 'Role', render: (r) => <Badge color={r.role === 'admin' ? 'blue' : 'gray'}>{r.role}</Badge> },
              {
                key: 'coursesAssigned',
                header: 'Subjects',
                render: (r) => (
                  <Select
                    multiple
                    size="3"
                    value={assignments[r._id]?.coursesAssigned || []}
                    onChange={(e) => updateAssignment(r._id, 'coursesAssigned', e)}
                    className="min-w-44"
                  >
                    {courses.map((course) => <option key={course._id} value={course._id}>{course.code} - {course.name}</option>)}
                  </Select>
                ),
              },
              {
                key: 'classBatchesAssigned',
                header: 'Classes',
                render: (r) => (
                  <Select
                    multiple
                    size="3"
                    value={assignments[r._id]?.classBatchesAssigned || []}
                    onChange={(e) => updateAssignment(r._id, 'classBatchesAssigned', e)}
                    className="min-w-36"
                  >
                    {batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
                  </Select>
                ),
              },
              {
                key: 'saveAssignments',
                header: '',
                render: (r) => <Button className="whitespace-nowrap" onClick={() => saveAssignments(r._id)}>Save Assignments</Button>,
              },
          ]}
          data={faculty}
        />
      </Card>
    </div>
  );
}
