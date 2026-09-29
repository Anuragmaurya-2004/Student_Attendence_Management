import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Badge, Table } from '../../components/ui';
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Activity,
  CheckCircle2,
} from 'lucide-react';

const statMeta = {
  departments: {
    label: 'Departments',
    icon: Building2,
    tone: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60',
  },
  students: {
    label: 'Enrolled Students',
    icon: GraduationCap,
    tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
  },
  faculty: {
    label: 'Active Faculty',
    icon: Users,
    tone: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60',
  },
  courses: {
    label: 'Total Courses',
    icon: BookOpen,
    tone: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60',
  },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [depts, students, faculty, courses, defaultersRes] = await Promise.all([
          api.get('/academic/departments'),
          api.get('/students'),
          api.get('/faculty'),
          api.get('/academic/courses'),
          api.get('/reports/defaulters'),
        ]);
        setStats({
          departments: depts.data.length,
          students: students.data.length,
          faculty: faculty.data.length,
          courses: courses.data.length,
        });
        setDefaulters(defaultersRes.data);
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-slate-200/80 bg-white/80 p-8 text-sm font-medium text-slate-500 shadow-soft dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 animate-pulse text-brand-600 dark:text-brand-400" />
          <span>Synchronizing campus metrics...</span>
        </div>
      </div>
    );
  }

  const cards = Object.entries(statMeta).map(([key, meta]) => ({
    key,
    ...meta,
    value: stats?.[key] ?? 0,
  }));

  // Calculate distinct defaulter students for accurate health percentage
  const uniqueDefaulterStudents = new Set(defaulters.map((d) => d.rollNo || d.studentName)).size;
  const healthScore = stats?.students
    ? Math.max(0, Math.min(100, Math.round(100 - (uniqueDefaulterStudents / stats.students) * 100)))
    : 100;

  const priorityAlerts = [...defaulters]
    .sort((a, b) => a.attendancePercent - b.attendancePercent)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <Activity className="h-3.5 w-3.5" /> Campus Executive Center
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Administrator Dashboard
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Live attendance health, departmental metrics, and early defaulter intervention.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Telemetry Synced</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Enrolled Students</p>
            <p className="mt-1.5 text-2xl font-extrabold text-white">{stats?.students ?? 0}</p>
            <p className="text-xs text-indigo-200">Across all departments</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Faculty Roster</p>
            <p className="mt-1.5 text-2xl font-extrabold text-white">{stats?.faculty ?? 0}</p>
            <p className="text-xs text-indigo-200">Educators & instructors</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Course Defaulters</p>
            <p className="mt-1.5 text-2xl font-extrabold text-white">{defaulters.length}</p>
            <p className="text-xs text-indigo-200">Total course alerts</p>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900/90"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {card.value}
                  </p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Health Metric & Priority Alerts Grid */}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card title="Campus Attendance Health" subtitle="Overall student presence across ongoing academic batches">
          <div className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cumulative Compliance</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                    {healthScore}%
                  </span>
                  <span className="text-xs text-slate-500">attendance compliance</span>
                </div>
              </div>
              <Badge
                color={healthScore >= 80 ? 'green' : healthScore >= 65 ? 'yellow' : 'red'}
                dot
              >
                {healthScore >= 80 ? 'Optimal Status' : healthScore >= 65 ? 'Watchlist' : 'Critical Action'}
              </Badge>
            </div>

            {/* Health Progress Track */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Students</span>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats?.students ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3.5 dark:border-sky-900/40 dark:bg-sky-950/30">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">Faculty</span>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats?.faculty ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-3.5 dark:border-purple-900/40 dark:bg-purple-950/30">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">Courses</span>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats?.courses ?? 0}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Priority Alerts Card */}
        <Card title="Immediate Priority Alerts" subtitle="Lowest attendance requiring intervention">
          {priorityAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No urgent alerts</p>
              <p className="text-xs">All enrolled students currently meet the required attendance quota.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {priorityAlerts.map((student, index) => (
                <div
                  key={`${student.rollNo || student.studentName}-${index}`}
                  className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3.5 dark:border-rose-900/40 dark:bg-rose-950/20"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {student.studentName}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {student.courseName} • Roll {student.rollNo}
                      </p>
                    </div>
                    <Badge color="red" dot>
                      {student.attendancePercent}%
                    </Badge>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-rose-200/60 dark:bg-rose-950/80">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{ width: `${Math.max(10, student.attendancePercent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Defaulters Full List Table */}
      <Card
        title={`All Current Course Defaulters (${defaulters.length})`}
        subtitle="Students falling below their mandatory course threshold"
      >
        <Table
          columns={[
            { key: 'rollNo', header: 'Roll No' },
            { key: 'studentName', header: 'Student Name' },
            { key: 'courseName', header: 'Course / Subject' },
            {
              key: 'type',
              header: 'Type',
              render: (r) => (
                <Badge color={r.type === 'practical' ? 'blue' : r.type === 'project' ? 'purple' : 'gray'}>
                  {r.type}
                </Badge>
              ),
            },
            {
              key: 'attendancePercent',
              header: 'Attendance %',
              render: (r) => (
                <div className="flex items-center gap-2">
                  <Badge color="red" dot>{r.attendancePercent}%</Badge>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    (min {r.threshold || 75}%)
                  </span>
                </div>
              ),
            },
          ]}
          data={defaulters}
          emptyText="No defaulters currently. All students are meeting attendance thresholds."
        />
      </Card>
    </div>
  );
}
