import React, { useEffect, useState, useMemo, useRef } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Table, Button } from '../../components/ui';
import { SkeletonCard, SkeletonTable } from '../../components/Skeleton';
import { format, differenceInCalendarDays } from 'date-fns';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Sparkles,
  Sliders,
  ShieldCheck,
  ShieldAlert,
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

  // Interactive Calculator State
  const [simulatedClasses, setSimulatedClasses] = useState(5);
  const [simulateMode, setSimulateMode] = useState('attend'); // 'attend' or 'miss'

  // Filter for detailed records table
  const [tableFilter, setTableFilter] = useState('all');

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
              courseCode: course.code || 'SUB',
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

  // Total attended & held across all courses
  const totalHeld = useMemo(() => {
    return courseSummary.reduce((acc, c) => acc + c.total, 0);
  }, [courseSummary]);

  const totalAttended = useMemo(() => {
    return courseSummary.reduce((acc, c) => acc + (c.present + c.onDuty), 0);
  }, [courseSummary]);

  // Cumulative Average Percentage
  const overallPct = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 100) : 100;
  const isDefaulter = overallPct < 75;

  // Safe-Skip & Recovery calculations
  const safeSkipsRemaining = useMemo(() => {
    if (totalHeld === 0 || overallPct < 75) return 0;
    // Formula: (attended) / (total + skips) >= 0.75  =>  skips <= (attended - 0.75*total) / 0.75
    return Math.max(0, Math.floor((totalAttended - 0.75 * totalHeld) / 0.75));
  }, [totalHeld, totalAttended, overallPct]);

  const classesNeededToRecover = useMemo(() => {
    if (overallPct >= 75 || totalHeld === 0) return 0;
    // Formula: (attended + needed) / (total + needed) >= 0.75 => needed >= (0.75*total - attended) / 0.25
    return Math.max(0, Math.ceil((0.75 * totalHeld - totalAttended) / 0.25));
  }, [totalHeld, totalAttended, overallPct]);

  // Projected attendance simulation
  const projectedPct = useMemo(() => {
    if (totalHeld === 0) return 100;
    const addedClasses = Number(simulatedClasses) || 0;
    if (simulateMode === 'attend') {
      return Math.round(((totalAttended + addedClasses) / (totalHeld + addedClasses)) * 100);
    } else {
      return Math.round((totalAttended / (totalHeld + addedClasses)) * 100);
    }
  }, [totalHeld, totalAttended, simulatedClasses, simulateMode]);

  // Chart data formatted for Recharts
  const chartData = useMemo(() => {
    return courseSummary.map((c) => {
      const credited = c.present + c.onDuty;
      const pct = c.total > 0 ? Math.round((credited / c.total) * 100) : 100;
      return {
        name: c.courseName.length > 14 ? c.courseName.slice(0, 12) + '…' : c.courseName,
        fullName: c.courseName,
        type: c.type,
        percentage: pct,
        attended: credited,
        total: c.total,
      };
    });
  }, [courseSummary]);

  // Filtered detailed history table
  const filteredRecords = useMemo(() => {
    if (tableFilter === 'present') return records.filter((r) => r.status === 'present' || r.status === 'late');
    if (tableFilter === 'on_duty') return records.filter((r) => r.status === 'on_duty');
    if (tableFilter === 'absent') return records.filter((r) => r.status === 'absent');
    return records;
  }, [records, tableFilter]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print Stylesheet Hook */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #official-print-slip, #official-print-slip * {
            visibility: visible;
          }
          #official-print-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Hero Banner with Print Slip Action */}
      <div className="hero-banner no-print">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <GraduationCap className="h-3.5 w-3.5" /> Student Attendance Portal
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              My Attendance Dashboard
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Track lecture presence, verify On-Duty credits, and simulate attendance thresholds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>Roll No: {user.rollNo || 'N/A'}</span>
            </div>

            <Button
              variant="secondary"
              icon={Printer}
              size="sm"
              onClick={handlePrint}
              className="!border-white/30 !bg-white/15 !text-white hover:!bg-white/25 backdrop-blur-md"
            >
              Print Official Slip
            </Button>
          </div>
        </div>

        {/* Top Summary Metrics */}
        {loading ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Cumulative Average</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-2xl font-extrabold text-white">{overallPct}%</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  overallPct >= 75 ? 'bg-emerald-400/20 text-emerald-200' : 'bg-rose-400/20 text-rose-200'
                }`}>
                  {overallPct >= 75 ? 'Eligible' : 'Defaulter Alert'}
                </span>
              </div>
              <p className="text-xs text-indigo-200">{totalAttended} of {totalHeld} sessions credited</p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Active Subjects</p>
              <p className="mt-1 text-2xl font-extrabold text-white">{courseSummary.length}</p>
              <p className="text-xs text-indigo-200">Lectures, Labs & Practicals</p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Approved OD Credits</p>
              <p className="mt-1 text-2xl font-extrabold text-white">{onDutyList.length}</p>
              <p className="text-xs text-indigo-200">Event exemptions verified</p>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Safe-Skip & Target Attendance Simulator */}
      <div className="no-print">
        <Card
          title="Interactive Attendance & Safe-Skip Simulator"
          subtitle="Forecast your percentage and find out how many lectures you can safely skip or must attend"
        >
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Status & Recommendation Card */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${
                  isDefaulter
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                }`}>
                  {isDefaulter ? <ShieldAlert className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isDefaulter ? 'Attendance Deficit Notice' : 'Good Standing (Eligible)'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mandatory 75% institutional compliance requirement
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white bg-white/90 p-3.5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80">
                {isDefaulter ? (
                  <div>
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider">Defaulter Recovery Plan</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      You must attend the next <span className="text-rose-600 dark:text-rose-400 text-base font-extrabold">{classesNeededToRecover}</span> consecutive classes without missing any to restore eligibility.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider">Safe Bunk / Skip Buffer</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      You can safely miss <span className="text-emerald-600 dark:text-emerald-400 text-base font-extrabold">{safeSkipsRemaining}</span> more sessions and remain safely at or above 75%.
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Bar with 75% Target Marker */}
              <div className="mt-4">
                <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>Current: {overallPct}%</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">Threshold: 75%</span>
                </div>
                <div className="relative mt-1.5 h-3.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      overallPct >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, overallPct)}%` }}
                  />
                  {/* 75% target mark */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white shadow"
                    style={{ left: '75%' }}
                    title="75% Mandatory Minimum"
                  />
                </div>
              </div>
            </div>

            {/* Interactive What-If Simulator */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    What-If Projection
                  </span>
                </div>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setSimulateMode('attend')}
                    className={`rounded-md px-2.5 py-1 font-semibold transition ${
                      simulateMode === 'attend'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    If I Attend
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulateMode('miss')}
                    className={`rounded-md px-2.5 py-1 font-semibold transition ${
                      simulateMode === 'miss'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    If I Miss
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Number of upcoming lectures:</span>
                  <span className="rounded-md bg-white px-2 py-0.5 font-bold shadow-xs dark:bg-slate-900">
                    {simulatedClasses} classes
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={simulatedClasses}
                  onChange={(e) => setSimulatedClasses(Number(e.target.value))}
                  className="mt-2.5 w-full accent-brand-600 cursor-pointer"
                />
              </div>

              {/* Simulation Result Tile */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/60 p-3.5 dark:border-brand-900/60 dark:bg-brand-950/40">
                <div>
                  <span className="text-xs font-semibold text-brand-900 dark:text-brand-300">
                    Projected Overall Attendance:
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-brand-700 dark:text-brand-200">
                      {projectedPct}%
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({projectedPct > overallPct ? `+${projectedPct - overallPct}%` : `${projectedPct - overallPct}%`})
                    </span>
                  </div>
                </div>

                <Badge color={projectedPct >= 75 ? 'green' : 'red'} dot>
                  {projectedPct >= 75 ? 'Eligible Standing' : 'Defaulter'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Visual Analytics Bar Chart */}
      <div className="no-print">
        <Card
          title="Subject-wise Attendance Analytics"
          subtitle="Visual comparison against the 75% eligibility threshold"
        >
          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ) : chartData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No session data available to plot charts.
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    unit="%"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900 text-xs">
                          <p className="font-bold text-slate-900 dark:text-white">{d.fullName}</p>
                          <p className="text-slate-500 dark:text-slate-400 capitalize">Type: {d.type}</p>
                          <p className="mt-1 font-semibold text-brand-600 dark:text-brand-400">
                            Attendance: {d.percentage}%
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            Credited: {d.attended} / {d.total} sessions
                          </p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={75}
                    stroke="#e11d48"
                    strokeDasharray="4 4"
                    label={{ value: '75% Required', fill: '#e11d48', fontSize: 10, position: 'top' }}
                  />
                  <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.percentage >= 75 ? '#6366f1' : '#f43f5e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Course Cards Grid */}
      <div className="no-print">
        <Card title="Enrolled Course Ledger" subtitle="Real-time compliance percentage per subject">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
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
      </div>

      {/* Approved On-Duty List Card */}
      <div className="no-print">
        <Card title="Approved On-Duty (OD) Exemptions" subtitle="Official permissions credited towards your attendance count">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
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
      </div>

      {/* Detailed Attendance History Table with Quick-Filter Pills */}
      <div className="no-print">
        <Card
          title="Detailed Attendance History"
          subtitle="Chronological ledger of all class check-ins"
          action={
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'all', label: 'All Entries' },
                { key: 'present', label: 'Present / Late' },
                { key: 'on_duty', label: 'On-Duty' },
                { key: 'absent', label: 'Absences' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setTableFilter(pill.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    tableFilter === pill.key
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          }
        >
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : (
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
              data={filteredRecords}
              emptyText="No class check-in entries found for the selected filter."
            />
          )}
        </Card>
      </div>

      {/* Official Printable Slip / Certificate (Hidden on screen, visible during window.print) */}
      <div id="official-print-slip" className="hidden print:block text-slate-900 font-sans">
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <h2 className="text-xl font-bold uppercase tracking-wider">Smart Campus Management System</h2>
          <h3 className="text-base font-semibold">Official Semester Attendance Eligibility Statement</h3>
          <p className="text-xs text-slate-600 mt-1">Generated: {format(new Date(), 'dd MMMM yyyy, hh:mm a')}</p>
        </div>

        {/* Student Credential Header */}
        <div className="my-6 grid grid-cols-2 gap-4 rounded-lg border border-slate-300 p-4 text-xs">
          <div>
            <p><span className="font-bold">Student Name:</span> {user.name}</p>
            <p className="mt-1"><span className="font-bold">Roll / Register No:</span> {user.rollNo || 'N/A'}</p>
            <p className="mt-1"><span className="font-bold">Official Email:</span> {user.email}</p>
          </div>
          <div>
            <p><span className="font-bold">Cumulative Attendance:</span> {overallPct}%</p>
            <p className="mt-1"><span className="font-bold">Approved On-Duty Credits:</span> {onDutyList.length} events</p>
            <p className="mt-1 font-bold">
              Eligibility Status:{' '}
              <span className={overallPct >= 75 ? 'text-emerald-700' : 'text-rose-700'}>
                {overallPct >= 75 ? 'ELIGIBLE FOR SEMESTER EXAMS' : 'DEFAULTER - APPROVAL REQUIRED'}
              </span>
            </p>
          </div>
        </div>

        {/* Breakdown Table */}
        <table className="w-full border-collapse border border-slate-300 text-left text-xs mb-8">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-2 font-bold">Course / Subject</th>
              <th className="border border-slate-300 p-2 font-bold">Type</th>
              <th className="border border-slate-300 p-2 font-bold text-center">Sessions Held</th>
              <th className="border border-slate-300 p-2 font-bold text-center">Attended</th>
              <th className="border border-slate-300 p-2 font-bold text-center">OD Credits</th>
              <th className="border border-slate-300 p-2 font-bold text-center">Percentage</th>
              <th className="border border-slate-300 p-2 font-bold text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {courseSummary.map((c, i) => {
              const credited = c.present + c.onDuty;
              const pct = c.total > 0 ? Math.round((credited / c.total) * 100) : 100;
              return (
                <tr key={i}>
                  <td className="border border-slate-300 p-2 font-medium">{c.courseName}</td>
                  <td className="border border-slate-300 p-2 capitalize">{c.type}</td>
                  <td className="border border-slate-300 p-2 text-center">{c.total}</td>
                  <td className="border border-slate-300 p-2 text-center">{c.present}</td>
                  <td className="border border-slate-300 p-2 text-center">{c.onDuty}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold">{pct}%</td>
                  <td className="border border-slate-300 p-2 text-center">
                    {pct >= 75 ? 'ELIGIBLE' : 'DEFAULTER'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="mt-16 grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <div className="border-t border-slate-800 pt-2 font-semibold">Student Signature</div>
          </div>
          <div>
            <div className="border-t border-slate-800 pt-2 font-semibold">Class Coordinator / Faculty</div>
          </div>
          <div>
            <div className="border-t border-slate-800 pt-2 font-semibold">Dean / Head of Department</div>
          </div>
        </div>
      </div>
    </div>
  );
}
