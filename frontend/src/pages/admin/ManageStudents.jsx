import React, { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import toast from 'react-hot-toast';

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
    department: '',
    classBatch: '',
    academicYearJoined: '',
    currentAcademicYear: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/students', form);
      toast.success('Student added');
      setForm({
        name: '',
        rollNo: '',
        email: '',
        password: '',
        parentEmail: '',
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

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Manage Students</h1>
      <Card title="Add Student">
        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-3">
          <Input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input placeholder="Roll No" value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} required />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Input type="email" placeholder="Parent Email (optional)" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} />
          <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required>
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </Select>
          <Select value={form.classBatch} onChange={(e) => setForm({ ...form, classBatch: e.target.value })} required>
            <option value="">Select Class Batch</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </Select>
          <Select
            value={form.academicYearJoined}
            onChange={(e) => setForm({ ...form, academicYearJoined: e.target.value, currentAcademicYear: e.target.value })}
            required
          >
            <option value="">Select Academic Year (joined / current)</option>
            {years.map((y) => (
              <option key={y._id} value={y._id}>{y.label}</option>
            ))}
          </Select>
          <div className="md:col-span-3">
            <Button type="submit">+ Add Student</Button>
          </div>
        </form>
      </Card>

      <Card title="Bulk Import from Excel / CSV">
        <p className="text-sm text-gray-500 mb-3">
          Add an entire class in one go instead of one by one. Download the template, fill in your
          students, and upload it back here. Rows with missing passwords get a random one
          auto-generated - the results below will show it so you can share it with each student.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handleDownloadTemplate} type="button">
            ⬇ Download Template
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
        <Table
          columns={[
            { key: 'rollNo', header: 'Roll No' },
            { key: 'name', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'classBatch', header: 'Class', render: (r) => r.classBatch?.name },
            { key: 'status', header: 'Status' },
          ]}
          data={students}
        />
      </Card>
    </div>
  );
}
