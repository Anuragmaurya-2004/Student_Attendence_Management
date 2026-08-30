import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Input, Select, Table } from '../../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [years, setYears] = useState([]);
  const [form, setForm] = useState({ date: '', name: '', academicYear: '' });

  const load = async () => {
    const [h, y] = await Promise.all([api.get('/holidays'), api.get('/academic/academic-years')]);
    setHolidays(h.data);
    setYears(y.data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/holidays', form);
      toast.success('Holiday added');
      setForm({ date: '', name: '', academicYear: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add holiday');
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/holidays/${id}`);
    toast.success('Deleted');
    load();
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Holiday Calendar</h1>
      <Card title="Add Holiday">
        <form onSubmit={handleSubmit} className="grid md:grid-cols-4 gap-3">
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <Input placeholder="Holiday Name (e.g. Diwali)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} required>
            <option value="">Select Academic Year</option>
            {years.map((y) => (
              <option key={y._id} value={y._id}>{y.label}</option>
            ))}
          </Select>
          <Button type="submit">+ Add Holiday</Button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          Sessions cannot be scheduled on holiday dates — they're automatically excluded from attendance % calculations.
        </p>
      </Card>

      <Card title={`Holidays (${holidays.length})`}>
        <Table
          columns={[
            { key: 'date', header: 'Date', render: (r) => format(new Date(r.date), 'dd MMM yyyy') },
            { key: 'name', header: 'Name' },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <Button variant="danger" className="!py-1 !px-2 text-xs" onClick={() => handleDelete(r._id)}>
                  Delete
                </Button>
              ),
            },
          ]}
          data={holidays}
        />
      </Card>
    </div>
  );
}
