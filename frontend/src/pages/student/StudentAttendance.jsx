import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Table } from '../../components/ui';
import { format, differenceInCalendarDays } from 'date-fns';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

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

        // Group by course + type to get an accurate at-a-glance summary
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
        console.error('Failed to load student attendance', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  // Only calculate average over courses that have had at least one session held
  const activeCourses = courseSummary.filter((c) => c.total > 0);
  const averageAttendance = activeCourses.length
    ? Math.round(
        activeCourses.reduce(
          (sum, c) => sum + Math.round(((c.present + c.onDuty) / c.total) * 100),
          0
        ) / activeCourses.length
      )
    : courseSummary.length > 0
    ? 100
    : 0;

  const approvedOD = onDutyList.length;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <GraduationCap className="h-3.5 w-3.5" /> Student Attendance Portal
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              My Attendance Dashboard
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Track lecture presence, verify On-Duty credits, and monitor attendance thresholds.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span>Roll No: {user.rollNo || 'N/A'}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Cumulative Average</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{averageAttendance}%</p>
            <p className="text-xs text-indigo-200">Across enrolled subjects</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Active Subjects</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{courseSummary.length}</p>
            <p className="text-xs text-indigo-200">Lecture & lab courses</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Approved OD Credits</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{approvedOD}</p>
            <p className="text-xs text-indigo-200">Event exemptions verified</p>
          </div>
        </div>
      </div>

      {/* Course Cards Grid */}
      <Card title="Course-wise Attendance Overview" subtitle="Real-time compliance percentage per subject">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading attendance metrics...</p>
        ) : courseSummary.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No attendance records logged yet for this semester.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courseSummary.map((c, i) => {
              const credited = c.present + c.onDuty;
              const pct = c.total > 0 ? Math.round((credited / c.total) * 100) : 100;
              const isLow = pct < 75;

              return (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 ${
                    isLow
                      ? 'border-rose-200/90 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20'
                      : 'border-slate-200/90 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {c.courseName}
                    </span>
                    <Badge color={c.type === 'practical' ? 'blue' : c.type === 'project' ? 'purple' : 'gray'}>
                      {c.type}
                    </Badge>
                  </div>

                  <div className="mb-2 flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-brand-600 dark:text-brand-400'}`}>
                      {pct}%
                    </span>
                    {isLow ? (
                      <span className="text-xs font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Below 75%
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> On Track
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                    <div className="flex justify-between">
                      <span>Attended Lectures:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.present} / {c.total}</span>
                    </div>
                    {c.onDuty > 0 && (
                      <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 font-semibold">
                        <span className="flex items-center gap-1">
                          <Award className="h-3.5 w-3.5 text-purple-500" /> On-Duty Credits:
                        </span>
                        <span>+{c.onDuty} sessions</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Approved On-Duty List Card */}
      <Card title="Approved On-Duty (OD) Exemptions" subtitle="Official permissions credited towards your attendance count">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading OD records...</p>
        ) : onDutyList.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No On-Duty or official visit exemptions logged.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {onDutyList.map((od) => {
              const days = differenceInCalendarDays(new Date(od.toDate), new Date(od.fromDate)) + 1;
              return (
                <div
                  key={od._id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-purple-200/80 bg-purple-50/40 p-3.5 dark:border-purple-900/40 dark:bg-purple-950/20"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{od.eventTitle}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(od.fromDate), 'dd MMM yyyy')} – {format(new Date(od.toDate), 'dd MMM yyyy')} ({days} {days === 1 ? 'day' : 'days'})
                    </p>
                    {od.remarks && (
                      <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-300">
                        "{od.remarks}"
                      </p>
                    )}
                  </div>
                  <Badge color="purple" dot>{ACTIVITY_LABELS[od.activityType] || od.activityType}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Detailed Attendance History Table */}
      <Card title="Detailed Attendance History" subtitle="Chronological ledger of all class check-ins">
        <Table
          columns={[
            {
              key: 'date',
              header: 'Date',
              render: (r) =>
                r.session?.date ? (
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {format(new Date(r.session.date), 'dd MMM yyyy')}
                  </div>
                ) : (
                  '-'
                ),
            },
            {
              key: 'course',
              header: 'Subject',
              render: (r) => r.session?.course?.name || '-',
            },
            {
              key: 'type',
              header: 'Type',
              render: (r) => (
                <Badge color={r.session?.type === 'practical' ? 'blue' : r.session?.type === 'project' ? 'purple' : 'gray'}>
                  {r.session?.type}
                </Badge>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
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
                  dot
                >
                  {r.status === 'on_duty' ? 'On Duty' : r.status}
                </Badge>
              ),
            },
            {
              key: 'method',
              header: 'Verification',
              render: (r) => (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {r.status === 'on_duty' && r.dutyReason ? (
                    <span className="font-medium text-purple-600 dark:text-purple-400">OD: {r.dutyReason}</span>
                  ) : (
                    r.method || 'verified'
                  )}
                </div>
              ),
            },
          ]}
          data={records}
          emptyText="No class check-in entries found."
        />
      </Card>
    </div>
  );
}
