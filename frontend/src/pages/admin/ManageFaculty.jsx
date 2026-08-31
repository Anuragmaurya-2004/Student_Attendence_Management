import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import { validateFacultyForm } from '../../validators';
import toast from 'react-hot-toast';

export default function ManageFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', role: 'faculty' });
  const [errors, setErrors] = useState({ name: '', email: '', password: '', department: '' });

  const load = async () => {
    const [f, d] = await Promise.all([api.get('/faculty'), api.get('/academic/departments')]);
    setFaculty(f.data);
    setDepartments(d.data);
  };

  useEffect(() => {
    load();
  }, []);

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
      await api.post('/faculty', form);
      toast.success('Faculty added');
      setForm({ name: '', email: '', password: '', department: '', role: 'faculty' });
      setErrors({ name: '', email: '', password: '', department: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add faculty');
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

      <Card title={`All Faculty (${faculty.length})`}>
        <Table
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'department', header: 'Dept', render: (r) => r.department?.name },
            { key: 'role', header: 'Role', render: (r) => <Badge color={r.role === 'admin' ? 'blue' : 'gray'}>{r.role}</Badge> },
          ]}
          data={faculty}
        />
      </Card>
    </div>
  );
}
