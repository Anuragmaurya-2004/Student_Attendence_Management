import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge } from '../../components/ui';
import { format, differenceInCalendarDays } from 'date-fns';

const ACTIVITY_LABELS = {
  industrial_visit: 'Industrial Visit',
  sports: 'Sports Tournament',
  cultural: 'Cultural Fest',
  hackathon_tech: 'Hackathon / Tech',
  nss_ncc: 'NSS / NCC',
  college_event: 'College Event',
  other: 'Other Duty',
};

export default function StudentAttendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [onDutyList, setOnDutyList] = useState([]);
  const [courseSummary, setCourseSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [attRes, odRes] = await Promise.all([
          api.get(`/attendance/student/${user.id}`),
          api.get(`/onduty/student/${user.id}`),
        ]);

        setRecords(attRes.data);
        setOnDutyList(odRes.data);

        // Group by course + type to get an at-a-glance summary
        const map = {};
        attRes.data.forEach((r) => {
          const course = r.session?.course;
          if (!course) return;
          const key = `${course._id}-${r.session.type}`;
          if (!map[key]) {
            map[key] = {
              courseName: course.name,
              type: r.session.type,
              total: 0,
              present: 0,
              onDuty: 0,
            };
          }
          map[key].total += 1;
          if (r.status === 'present' || r.status === 'late') map[key].present += 1;
          if (r.status === 'on_duty') map[key].onDuty += 1;
        });

        setCourseSummary(Object.values(map));
      } catch (err) {
        console.error('Failed to load student data', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  const averageAttendance = courseSummary.length
    ? Math.round(courseSummary.reduce((total, item) => total + (item.total > 0 ? Math.round(((item.present + item.onDuty) / item.total) * 100) : 100), 0) / courseSummary.length)
    : 0;

  const approvedOD = onDutyList.length;

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-brand-100 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-5 text-white shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-100">Overview</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">My Attendance Dashboard</h1>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-brand-50 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Roll No: {user.rollNo || 'N/A'}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">Average</p>
            <p className="mt-2 text-2xl font-bold">{averageAttendance}%</p>
            <p className="text-sm text-brand-50/80">across courses</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">Courses</p>
            <p className="mt-2 text-2xl font-bold">{courseSummary.length}</p>
            <p className="text-sm text-brand-50/80">active subjects</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">OD approvals</p>
            <p className="mt-2 text-2xl font-bold">{approvedOD}</p>
            <p className="text-sm text-brand-50/80">approved records</p>
          </div>
        </div>
      </div>

      <Card title="Course-wise Attendance Overview">
        {loading ? (
          <p className="text-sm text-slate-500">Loading attendance metrics...</p>
        ) : courseSummary.length === 0 ? (
          <p className="text-sm text-slate-500">No attendance records yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courseSummary.map((c, i) => {
              const credited = c.present + c.onDuty;
              const pct = c.total > 0 ? Math.round((credited / c.total) * 100) : 100;
              const isLow = pct < 75;

              return (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    isLow ? 'border-red-200 bg-red-50/60' : 'border-slate-200 bg-slate-50/80'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold leading-tight text-slate-800">{c.courseName}</span>
                    <Badge color={c.type === 'practical' ? 'blue' : 'gray'}>{c.type}</Badge>
                  </div>
                  <div className="mb-2 flex items-baseline gap-2">
                    <span className={`text-3xl font-extrabold ${isLow ? 'text-red-600' : 'text-brand-700'}`}>
                      {pct}%
                    </span>
                    {isLow && <span className="text-[11px] font-semibold text-red-500">Below 75%</span>}
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    <div>Attended: <span className="font-medium text-slate-700">{c.present}</span> / {c.total}</div>
                    {c.onDuty > 0 && (
                      <div className="flex items-center gap-1.5 font-medium text-violet-700">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5"><path d="M12 2.75a1 1 0 0 1 .9.55l1.1 2.24 2.47.36a1 1 0 0 1 .55 1.7l-1.79 1.74.42 2.46a1 1 0 0 1-1.45 1.05L12 0 9.8 0 9.8 0 9.8 0 8.9 18.35 8.8 18.35 8.8 18.35 7.3 18.35 7.3 18.35 7.3 18.35 7.3 18.35A1 1 0 0 1 6.3 17.3l.42-2.46-1.79-1.74a1 1 0 0 1 .55-1.7l2.47-.36 1.1-2.24A1 1 0 0 1 12 2.75Z" fill="currentColor"/></svg>
                        On-Duty (OD): +{c.onDuty} sessions credited
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="My Approved On-Duty (OD) & Visits">
        {loading ? (
          <p className="text-sm text-slate-500">Loading OD records...</p>
        ) : onDutyList.length === 0 ? (
          <p className="text-sm text-slate-500">No On-Duty or official visit exemptions logged.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {onDutyList.map((od) => {
              const days = differenceInCalendarDays(new Date(od.toDate), new Date(od.fromDate)) + 1;
              return (
                <div key={od._id} className="flex items-start justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50/40 p-3.5">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{od.eventTitle}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {format(new Date(od.fromDate), 'dd MMM yyyy')} – {format(new Date(od.toDate), 'dd MMM yyyy')} ({days} {days === 1 ? 'day' : 'days'})
                    </div>
                    {od.remarks && <p className="mt-1 text-xs italic text-slate-600">"{od.remarks}"</p>}
                  </div>
                  <Badge color="purple">{ACTIVITY_LABELS[od.activityType] || od.activityType}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Detailed Attendance History">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2.5 pr-4 font-semibold">Date</th>
                <th className="py-2.5 pr-4 font-semibold">Course</th>
                <th className="py-2.5 pr-4 font-semibold">Type</th>
                <th className="py-2.5 pr-4 font-semibold">Status</th>
                <th className="py-2.5 pr-4 font-semibold">Method / Reason</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="py-2.5 pr-4 text-slate-700">
                      {r.session?.date ? format(new Date(r.session.date), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-slate-800">{r.session?.course?.name}</td>
                    <td className="py-2.5 pr-4">
                      <Badge color={r.session?.type === 'practical' ? 'blue' : 'gray'}>
                        {r.session?.type}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        color={
                          r.status === 'present'
                            ? 'green'
                            : r.status === 'on_duty'
                            ? 'purple'
                            : r.status === 'late'
                            ? 'yellow'
                            : 'red'
                        }
                      >
                        {r.status === 'on_duty' ? 'On Duty' : r.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-600">
                      {r.status === 'on_duty' && r.dutyReason ? (
                        <span className="font-medium text-violet-700">OD: {r.dutyReason}</span>
                      ) : (
                        r.method
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
