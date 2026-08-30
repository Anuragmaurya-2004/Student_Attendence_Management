import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function FacultySessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [years, setYears] = useState([]);
  const [form, setForm] = useState({
    course: '',
    classBatch: '',
    academicYear: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    type: 'theory',
    durationHours: 1,
  });

  const load = async () => {
    const [s, c, b, y] = await Promise.all([
      api.get('/sessions', { params: { faculty: user.id } }),
      api.get('/academic/courses'),
      api.get('/academic/class-batches'),
      api.get('/academic/academic-years'),
    ]);
    setSessions(s.data);
    setCourses(c.data);
    setBatches(b.data);
    setYears(y.data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCourseChange = (courseId) => {
    const course = courses.find((c) => c._id === courseId);
    setForm({ ...form, course: courseId, type: course?.type || 'theory', durationHours: course ? 1 : form.durationHours });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/sessions', form);
      toast.success('Session created');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create session');
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">My Sessions</h1>
      <Card title="Schedule a New Session">
        <form onSubmit={handleSubmit} className="grid md:grid-cols-4 gap-3">
          <Select value={form.course} onChange={(e) => handleCourseChange(e.target.value)} required>
            <option value="">Select Course</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>{c.name} ({c.type})</option>
            ))}
          </Select>
          <Select value={form.classBatch} onChange={(e) => setForm({ ...form, classBatch: e.target.value })} required>
            <option value="">Select Class Batch</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </Select>
          <Select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} required>
            <option value="">Academic Year</option>
            {years.map((y) => (
              <option key={y._id} value={y._id}>{y.label}</option>
            ))}
          </Select>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
          <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
          <Input
            type="number"
            step="0.5"
            placeholder="Duration (hrs)"
            value={form.durationHours}
            onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
            required
          />
          <Button type="submit">+ Create Session</Button>
        </form>
      </Card>

      <Card title={`Sessions (${sessions.length})`}>
        <Table
          columns={[
            { key: 'date', header: 'Date', render: (r) => format(new Date(r.date), 'dd MMM yyyy') },
            { key: 'time', header: 'Time', render: (r) => `${r.startTime} - ${r.endTime}` },
            { key: 'course', header: 'Course', render: (r) => r.course?.name },
            { key: 'classBatch', header: 'Class', render: (r) => r.classBatch?.name },
            { key: 'type', header: 'Type', render: (r) => <Badge color={r.type === 'practical' ? 'blue' : 'gray'}>{r.type}</Badge> },
            { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'held' ? 'green' : 'yellow'}>{r.status}</Badge> },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <Link to={`/faculty/sessions/${r._id}`}>
                  <Button variant="outline" className="!py-1 !px-2 text-xs">Manage</Button>
                </Link>
              ),
            },
          ]}
          data={sessions}
        />
      </Card>
    </div>
  );
}
