import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Badge } from '../../components/ui';

const statMeta = {
  departments: { label: 'Departments', tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
  students: { label: 'Students', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  faculty: { label: 'Faculty', tone: 'bg-sky-50 text-sky-700 ring-sky-100' },
  courses: { label: 'Courses', tone: 'bg-violet-50 text-violet-700 ring-violet-100' },
};

const statIcons = {
  departments: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M4 9.5 12 4l8 5.5v8A1.5 1.5 0 0 1 18.5 19H5.5A1.5 1.5 0 0 1 4 17.5v-8Zm8 2.8 6.5-4.5v5.2L12 16.5 5.5 13.1v-5.2L12 12.3Z" fill="currentColor"/>
    </svg>
  ),
  students: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M12 12a3.25 3.25 0 1 0-3.25-3.25A3.25 3.25 0 0 0 12 12Zm-6.5 7a5.5 5.5 0 0 1 11 0v.5H5.5v-.5Zm14.5-6.5a2.75 2.75 0 1 0-2.75-2.75A2.75 2.75 0 0 0 20 12.5Zm-1.2 7.5h1.7v-.45a4 4 0 0 0-3.15-3.86l-.94.84a5.42 5.42 0 0 1 2.39 3.47Z" fill="currentColor"/>
    </svg>
  ),
  faculty: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M12 4.5a3.25 3.25 0 1 1-3.25 3.25A3.25 3.25 0 0 1 12 4.5Zm-5.5 11a4.5 4.5 0 0 1 9 0v1.25H6.5V15.5Zm13.25-3.5a2.75 2.75 0 1 0-2.75-2.75A2.75 2.75 0 0 0 19.75 12Zm-1.2 8.5h2.95v-1.1a4 4 0 0 0-3.15-3.86l-.8.84a5.06 5.06 0 0 1 1.2 4.12Z" fill="currentColor"/>
    </svg>
  ),
  courses: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M6 4.5A2.5 2.5 0 0 0 3.5 7v10A2.5 2.5 0 0 0 6 19.5h10.5A2.5 2.5 0 0 0 19 17V7a2.5 2.5 0 0 0-2.5-2.5H6Zm1.5 3h7v1.5h-7V7.5Zm0 3h9v1.5h-9V10.5Zm0 3h7v1.5h-7v-1.5Z" fill="currentColor"/>
    </svg>
  ),
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
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-slate-200 bg-white/80 text-sm font-medium text-slate-500 shadow-soft">
        Loading dashboard...
      </div>
    );
  }

  const cards = Object.entries(statMeta).map(([key, meta]) => ({
    key,
    ...meta,
    value: stats?.[key] ?? 0,
  }));

  const healthScore = stats?.students
    ? Math.max(0, Math.min(100, 100 - (defaulters.length / stats.students) * 100))
    : 100;

  const priorityAlerts = [...defaulters].sort((a, b) => a.attendancePercent - b.attendancePercent).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-indigo-200/80 bg-gradient-to-r from-indigo-100 via-violet-100 to-white p-5 text-slate-900 shadow-[0_18px_36px_rgba(79,70,229,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600">Campus overview</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-slate-900">Admin Dashboard</h1>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live updates active
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/75 p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Active records</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats?.students ?? 0}</p>
            <p className="text-sm text-slate-500">students registered</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/75 p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Faculty coverage</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats?.faculty ?? 0}</p>
            <p className="text-sm text-slate-500">faculty members</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/75 p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Defaulter alerts</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{defaulters.length}</p>
            <p className="text-sm text-slate-500">students below threshold</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.key} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
                <p className="mt-3 text-3xl font-bold leading-none text-slate-900">{card.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 ${card.tone}`}>
                {statIcons[card.key]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card title="Campus health">
          <div className="space-y-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Overall attendance health</p>
                <p className="mt-1 text-4xl font-bold text-slate-900">{Math.round(healthScore)}%</p>
              </div>
              <Badge color={healthScore >= 80 ? 'green' : healthScore >= 65 ? 'yellow' : 'red'}>
                {healthScore >= 80 ? 'Healthy' : healthScore >= 65 ? 'Watchlist' : 'Critical'}
              </Badge>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 65 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${healthScore}%` }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-600">Students</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{stats?.students ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Faculty</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{stats?.faculty ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-violet-700">Courses</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{stats?.courses ?? 0}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Priority alerts">
          {priorityAlerts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-emerald-600">
                <path d="M9.55 16.2 5.3 12l1.4-1.4 2.85 2.85 7.75-7.75 1.4 1.4-9.15 9.15Z" fill="currentColor"/>
              </svg>
              <span>No urgent alerts right now.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {priorityAlerts.map((student, index) => (
                <div key={`${student.studentName}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{student.studentName}</p>
                      <p className="text-xs text-slate-500">{student.courseName}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                      {student.attendancePercent}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.max(12, student.attendancePercent)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title={`Current Defaulters (${defaulters.length})`}>
        {defaulters.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-emerald-600">
              <path d="M9.55 16.2 5.3 12l1.4-1.4 2.85 2.85 7.75-7.75 1.4 1.4-9.15 9.15Z" fill="currentColor"/>
            </svg>
            <span>No defaulters currently. Everyone is meeting attendance requirements.</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/60">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                  <th className="py-3 pr-4 font-semibold">Roll No</th>
                  <th className="py-3 pr-4 font-semibold">Student</th>
                  <th className="py-3 pr-4 font-semibold">Course</th>
                  <th className="py-3 pr-4 font-semibold">Type</th>
                  <th className="py-3 pr-4 font-semibold">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {defaulters.map((d, i) => (
                  <tr key={i} className="border-b border-slate-100 bg-white/60 last:border-0">
                    <td className="py-3 pr-4 font-medium text-slate-700">{d.rollNo}</td>
                    <td className="py-3 pr-4 text-slate-700">{d.studentName}</td>
                    <td className="py-3 pr-4 text-slate-700">{d.courseName}</td>
                    <td className="py-3 pr-4">
                      <Badge color={d.type === 'practical' ? 'blue' : 'gray'}>{d.type}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="mr-2 inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                        {d.attendancePercent}%
                      </span>
                      <span className="text-slate-400">/ min {d.threshold}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
