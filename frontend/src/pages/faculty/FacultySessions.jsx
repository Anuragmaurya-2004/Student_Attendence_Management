import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import { validateSessionForm } from '../../validators';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Plus,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function FacultySessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [years, setYears] = useState([]);
  const [facultyProfile, setFacultyProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
    try {
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
    } catch (err) {
      console.error('Failed to load faculty session dependencies', err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCourseChange = (courseId) => {
    const course = courses.find((c) => c._id === courseId);
    setForm({
      ...form,
      course: courseId,
      type: course?.type || 'theory',
      durationHours: course ? 1 : form.durationHours,
    });
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

    setSubmitting(true);
    try {
      await api.post('/sessions', form);
      toast.success('Lecture session created successfully');
      window.dispatchEvent(new Event('refresh-notifications'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: sessions.length,
    held: sessions.filter((session) => session.status === 'held').length,
    scheduled: sessions.filter((session) => session.status === 'scheduled').length,
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <BookOpen className="h-3.5 w-3.5" /> Instructor Console
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Lecture & Lab Sessions
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Schedule teaching hours, generate rotating check-in QR codes, and record attendance.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span>Ready to Schedule</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">All Sessions</p>
            <p className="mt-1.5 text-2xl font-extrabold text-white">{stats.total}</p>
            <p className="text-xs text-indigo-200">Across your classes</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Completed (Held)</p>
            <p className="mt-1.5 text-2xl font-extrabold text-white">{stats.held}</p>
            <p className="text-xs text-indigo-200">Attendance completed</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Upcoming Scheduled</p>
            <p className="mt-1.5 text-2xl font-extrabold text-white">{stats.scheduled}</p>
            <p className="text-xs text-indigo-200">Awaiting QR scan</p>
          </div>
        </div>
      </div>

      {/* Schedule Form Card */}
      <Card title="Schedule a New Session" subtitle="Plan an upcoming lecture, lab practical, or project review">
        {user.role === 'faculty' && (!facultyProfile?.coursesAssigned?.length || !facultyProfile?.classBatchesAssigned?.length) && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>An administrator must assign you at least one subject and class cohort before you can schedule sessions.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Subject / Course
            </label>
            <Select value={form.course} onChange={(e) => handleCourseChange(e.target.value)} error={errors.course}>
              <option value="">Select Course</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.name} ({c.type})</option>
              ))}
            </Select>
            {errors.course && <p className="mt-1 text-xs text-rose-500">{errors.course}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Class Batch
            </label>
            <Select value={form.classBatch} onChange={(e) => setForm({ ...form, classBatch: e.target.value })} error={errors.classBatch}>
              <option value="">Select Class Cohort</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </Select>
            {errors.classBatch && <p className="mt-1 text-xs text-rose-500">{errors.classBatch}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Academic Year
            </label>
            <Select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} error={errors.academicYear}>
              <option value="">Select Year</option>
              {years.map((y) => (
                <option key={y._id} value={y._id}>{y.label}</option>
              ))}
            </Select>
            {errors.academicYear && <p className="mt-1 text-xs text-rose-500">{errors.academicYear}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Session Date
            </label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.date} />
            {errors.date && <p className="mt-1 text-xs text-rose-500">{errors.date}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Start Time
            </label>
            <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} error={errors.startTime} />
            {errors.startTime && <p className="mt-1 text-xs text-rose-500">{errors.startTime}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              End Time
            </label>
            <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} error={errors.endTime} />
            {errors.endTime && <p className="mt-1 text-xs text-rose-500">{errors.endTime}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Session Type
            </label>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} error={errors.type}>
              <option value="theory">Theory Lecture</option>
              <option value="practical">Lab Practical</option>
              <option value="project">Project Review</option>
            </Select>
            {errors.type && <p className="mt-1 text-xs text-rose-500">{errors.type}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Duration (Hours)
            </label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              value={form.durationHours}
              onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
              error={errors.durationHours}
            />
            {errors.durationHours && <p className="mt-1 text-xs text-rose-500">{errors.durationHours}</p>}
          </div>

          <div className="sm:col-span-2 lg:col-span-4 pt-2">
            <Button type="submit" icon={Plus} loading={submitting} className="w-full sm:w-auto">
              Schedule Session
            </Button>
          </div>
        </form>
      </Card>

      {/* Sessions List Card */}
      <Card title={`My Teaching Sessions (${sessions.length})`} subtitle="Click Manage to project the rotating QR code or mark manual attendance">
        <Table
          columns={[
            {
              key: 'date',
              header: 'Date',
              render: (r) => (
                <div className="font-semibold text-slate-900 dark:text-white">
                  {format(new Date(r.date), 'dd MMM yyyy')}
                </div>
              ),
            },
            {
              key: 'time',
              header: 'Schedule',
              render: (r) => (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{r.startTime} – {r.endTime}</span>
                </div>
              ),
            },
            { key: 'course', header: 'Course', render: (r) => r.course?.name || '-' },
            { key: 'classBatch', header: 'Cohort', render: (r) => r.classBatch?.name || '-' },
            {
              key: 'type',
              header: 'Type',
              render: (r) => (
                <Badge color={r.type === 'practical' ? 'blue' : r.type === 'project' ? 'purple' : 'gray'} dot>
                  {r.type}
                </Badge>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <Badge color={r.status === 'held' ? 'green' : 'yellow'} dot>
                  {r.status === 'held' ? 'Completed' : 'Scheduled'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <Link to={`/faculty/sessions/${r._id}`}>
                  <Button variant="outline" size="sm" icon={ArrowRight}>
                    Manage
                  </Button>
                </Link>
              ),
            },
          ]}
          data={sessions}
          emptyText="No sessions planned yet. Use the form above to schedule your first class."
        />
      </Card>
    </div>
  );
}
