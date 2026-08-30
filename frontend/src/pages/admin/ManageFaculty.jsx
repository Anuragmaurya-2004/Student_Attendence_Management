import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import toast from 'react-hot-toast';

export default function ManageFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', role: 'faculty' });

  const load = async () => {
    const [f, d] = await Promise.all([api.get('/faculty'), api.get('/academic/departments')]);
    setFaculty(f.data);
    setDepartments(d.data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/faculty', form);
      toast.success('Faculty added');
      setForm({ name: '', email: '', password: '', department: '', role: 'faculty' });
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
          <Input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required>
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </Select>
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
          </Select>
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
