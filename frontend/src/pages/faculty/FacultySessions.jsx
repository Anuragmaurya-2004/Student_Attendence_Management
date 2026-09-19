import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import { validateSessionForm } from '../../validators';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function FacultySessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [years, setYears] = useState([]);
  const [facultyProfile, setFacultyProfile] = useState(null);
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
  const [errors, setErrors] = useState({
    course: '',
    classBatch: '',
    academicYear: '',
    date: '',
    startTime: '',
    endTime: '',
    type: '',
    durationHours: '',
  });

  const load = async () => {
    const [s, c, b, y, profile] = await Promise.all([
      api.get('/sessions', { params: { faculty: user.id } }),
      api.get('/academic/courses'),
      api.get('/academic/class-batches'),
      api.get('/academic/academic-years'),
      user.role === 'faculty' ? api.get(`/faculty/${user.id}`) : Promise.resolve({ data: null }),
    ]);
    setSessions(s.data);
    setFacultyProfile(profile.data);
    const assignedCourseIds = new Set((profile.data?.coursesAssigned || []).map((course) => course._id || course));
    const assignedBatchIds = new Set((profile.data?.classBatchesAssigned || []).map((batch) => batch._id || batch));
    setCourses(user.role === 'faculty' ? c.data.filter((course) => assignedCourseIds.has(course._id)) : c.data);
    setBatches(user.role === 'faculty' ? b.data.filter((batch) => assignedBatchIds.has(batch._id)) : b.data);
    setYears(y.data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCourseChange = (courseId) => {
    const course = courses.find((c) => c._id === courseId);
    setForm({ ...form, course: courseId, type: course?.type || 'theory', durationHours: course ? 1 : form.durationHours });
  };

  const validateForm = () => {
    const nextErrors = validateSessionForm(form);
    setErrors({
      course: nextErrors.course || '',
      classBatch: nextErrors.classBatch || '',
      academicYear: nextErrors.academicYear || '',
      date: nextErrors.date || '',
      startTime: nextErrors.startTime || '',
      endTime: nextErrors.endTime || '',
      type: nextErrors.type || '',
      durationHours: nextErrors.durationHours || '',
    });
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await api.post('/sessions', form);
      toast.success('Session created');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create session');
    }
  };

  const stats = {
    total: sessions.length,
    held: sessions.filter((session) => session.status === 'held').length,
    scheduled: sessions.filter((session) => session.status === 'scheduled').length,
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-brand-100 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-5 text-white shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-100">Faculty</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">My Sessions</h1>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-brand-50 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Session planner active
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">Total sessions</p>
            <p className="mt-2 text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-brand-50/80">all planned sessions</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">Held</p>
            <p className="mt-2 text-2xl font-bold">{stats.held}</p>
            <p className="text-sm text-brand-50/80">sessions completed</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">Scheduled</p>
            <p className="mt-2 text-2xl font-bold">{stats.scheduled}</p>
            <p className="text-sm text-brand-50/80">upcoming sessions</p>
          </div>
        </div>
      </div>

      <Card title="Schedule a New Session">
        {user.role === 'faculty' && (!facultyProfile?.coursesAssigned?.length || !facultyProfile?.classBatchesAssigned?.length) && (
          <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 shadow-sm">
            An administrator must assign you at least one subject and class before you can schedule sessions.
          </p>
        )}
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Select value={form.course} onChange={(e) => handleCourseChange(e.target.value)} error={errors.course}>
              <option value="">Select Course</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.name} ({c.type})</option>
              ))}
            </Select>
            {errors.course && <p className="mt-1 text-xs text-red-500">{errors.course}</p>}
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
            <Select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} error={errors.academicYear}>
              <option value="">Academic Year</option>
              {years.map((y) => (
                <option key={y._id} value={y._id}>{y.label}</option>
              ))}
            </Select>
            {errors.academicYear && <p className="mt-1 text-xs text-red-500">{errors.academicYear}</p>}
          </div>
          <div>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.date} />
            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
          </div>
          <div>
            <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} error={errors.startTime} />
            {errors.startTime && <p className="mt-1 text-xs text-red-500">{errors.startTime}</p>}
          </div>
          <div>
            <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} error={errors.endTime} />
            {errors.endTime && <p className="mt-1 text-xs text-red-500">{errors.endTime}</p>}
          </div>
          <div>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} error={errors.type}>
              <option value="theory">Theory</option>
              <option value="practical">Practical</option>
            </Select>
            {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
          </div>
          <div>
            <Input
              type="number"
              step="0.5"
              placeholder="Duration (hrs)"
              value={form.durationHours}
              onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
              error={errors.durationHours}
            />
            {errors.durationHours && <p className="mt-1 text-xs text-red-500">{errors.durationHours}</p>}
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <Button type="submit" className="w-full sm:w-auto">+ Create Session</Button>
          </div>
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
                  <Button variant="outline" className="!py-1.5 !px-2.5 text-xs">Manage</Button>
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
