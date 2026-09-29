import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, Table, Badge, Button, Input, Select } from '../../components/ui';
import toast from 'react-hot-toast';
import {
  GraduationCap,
  Users,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Award,
  ShieldCheck,
  FileSpreadsheet,
  X,
  ExternalLink,
} from 'lucide-react';

export default function MyClassAttendance() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [matrixData, setMatrixData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // all, eligible, defaulters
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [studentRecords, setStudentRecords] = useState([]);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);

  // Load class batches where this faculty is Class Teacher
  const loadBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/academic/class-batches');
      // If faculty, filter to batches where user is classTeacher or in user.classTeacherOf
      const myBatches = res.data.filter((b) => {
        const teacherId = b.classTeacher?._id || b.classTeacher;
        const inUserList = (user?.classTeacherOf || []).some(
          (tb) => (tb._id || tb).toString() === b._id.toString()
        );
        return teacherId?.toString() === user?.id?.toString() || inUserList || user?.role === 'admin';
      });

      setBatches(myBatches);
      if (myBatches.length > 0) {
        setSelectedBatchId((prev) => (prev && myBatches.some((b) => b._id === prev) ? prev : myBatches[0]._id));
      }
    } catch (err) {
      toast.error('Failed to load class batches');
    } finally {
      setLoading(false);
    }
  };

  const loadMatrix = async (batchId) => {
    if (!batchId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/attendance/class-matrix/${batchId}`);
      setMatrixData(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load class attendance matrix');
      setMatrixData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [user]);

  useEffect(() => {
    if (selectedBatchId) {
      loadMatrix(selectedBatchId);
    }
  }, [selectedBatchId]);

  const viewStudentDetails = async (student) => {
    setSelectedStudentDetail(student);
    setLoadingStudentDetail(true);
    try {
      const { data } = await api.get(`/attendance/student/${student._id}`);
      setStudentRecords(data);
    } catch (err) {
      toast.error('Failed to load student attendance history');
    } finally {
      setLoadingStudentDetail(false);
    }
  };

  // If user is not a class teacher and not an admin
  const isClassTeacher =
    batches.length > 0 || (user?.classTeacherOf && user.classTeacherOf.length > 0) || user?.role === 'admin';

  if (!loading && !isClassTeacher) {
    return (
      <div className="space-y-6">
        <div className="hero-banner">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
                <BookOpen className="h-3.5 w-3.5 text-amber-300" /> Subject Faculty Portal
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Class Teacher Attendance Matrix
              </h1>
              <p className="mt-1 text-sm text-indigo-100/90">
                Full-cohort all-subject attendance matrix is reserved for designated Class Teachers and Department HODs.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <div className="py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              Subject Faculty View Active
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              You are currently registered as a course instructor. You have full access to conduct QR sessions,
              track attendance, and view student progress for your specifically assigned subjects.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button href="/faculty" variant="primary" icon={BookOpen}>
                Go to My Sessions
              </Button>
              <Button href="/faculty/defaulters" variant="secondary" icon={AlertTriangle}>
                View Subject Defaulters
              </Button>
            </div>
            <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
              Need Class Teacher access? Contact your Department HOD or Administrator to allocate a class division to your profile.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Filter matrix students
  const filteredMatrix = (matrixData?.matrix || []).filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.student.name.toLowerCase().includes(q) ||
      item.student.rollNo.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (filterMode === 'defaulters') return item.overall.isDefaulter;
    if (filterMode === 'eligible') return !item.overall.isDefaulter;
    return true;
  });

  // Calculate high-level stats
  const totalStudents = matrixData?.matrix?.length || 0;
  const defaultersCount = matrixData?.matrix?.filter((m) => m.overall.isDefaulter).length || 0;
  const criticalCount = matrixData?.matrix?.filter((m) => m.overall.overallPercent < 50).length || 0;
  const avgClassAttendance = totalStudents
    ? Math.round(
        (matrixData.matrix.reduce((sum, m) => sum + m.overall.overallPercent, 0) / totalStudents) * 10
      ) / 10
    : 100;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Class Teacher Master Matrix
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {matrixData?.classBatch?.name || 'Class Batch'} Master Sheet
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Department: {matrixData?.classBatch?.department?.name || 'Assigned Department'} • Semester{' '}
              {matrixData?.classBatch?.semester || '—'} • All-Subject Cumulative Attendance
            </p>
          </div>

          {/* Batch Selector if multiple */}
          {batches.length > 1 && (
            <div className="w-full sm:w-64">
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-100 mb-1">
                Select Class Cohort
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full rounded-xl border border-white/30 bg-white/20 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-md focus:border-white focus:outline-hidden focus:ring-2 focus:ring-white/40"
              >
                {batches.map((b) => (
                  <option key={b._id} value={b._id} className="text-slate-900">
                    {b.name} (Sem {b.semester})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Enrolled Students</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{totalStudents}</p>
            <p className="text-xs text-indigo-200">Active in cohort</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Class Average</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{avgClassAttendance}%</p>
            <p className="text-xs text-indigo-200">Across all subjects</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Defaulters (&lt;75%)</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-300">{defaultersCount}</p>
            <p className="text-xs text-indigo-200">Below mandated threshold</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Critical (&lt;50%)</p>
            <p className="mt-1 text-2xl font-extrabold text-rose-300">{criticalCount}</p>
            <p className="text-xs text-indigo-200">Immediate action needed</p>
          </div>
        </div>
      </div>

      {/* Main Multi-Subject Matrix Card */}
      <Card
        title={`All-Subject Master Sheet (${filteredMatrix.length})`}
        subtitle="Live compilation of lecture and practical attendance across all subjects in this semester"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  filterMode === 'all'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                All ({totalStudents})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('eligible')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  filterMode === 'eligible'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Eligible ({totalStudents - defaultersCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('defaulters')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  filterMode === 'defaulters'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Defaulters ({defaultersCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-48 sm:w-56">
              <Input
                placeholder="Search roll, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!py-1.5 !text-xs !pl-8"
              />
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              loading={loading}
              onClick={() => loadMatrix(selectedBatchId)}
            >
              Refresh
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Compiling all-subject master attendance matrix...
          </div>
        ) : !matrixData || filteredMatrix.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No students found matching your search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100/75 text-xs uppercase tracking-wider text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-100/95 px-4 py-3 font-semibold dark:bg-slate-800/95">
                    Student Roll & Name
                  </th>
                  {matrixData.courses.map((course) => (
                    <th key={course._id} className="px-3 py-3 font-semibold text-center whitespace-nowrap">
                      <div>{course.code}</div>
                      <div className="text-[10px] font-normal lowercase tracking-normal text-slate-400">
                        {course.name.length > 18 ? course.name.slice(0, 16) + '...' : course.name}
                      </div>
                      <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                        course.type === 'practical' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      }`}>
                        {course.type}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold text-center bg-indigo-50/75 dark:bg-indigo-950/40">
                    Cumulative %
                  </th>
                  <th className="px-4 py-3 font-semibold text-center bg-indigo-50/75 dark:bg-indigo-950/40">
                    Status
                  </th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {filteredMatrix.map((item) => (
                  <tr
                    key={item.student._id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Student Identity */}
                    <td className="sticky left-0 z-10 bg-white/95 px-4 py-3.5 dark:bg-slate-900/95 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-11 items-center justify-center rounded-md bg-slate-100 text-xs font-mono font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {item.student.rollNo}
                        </span>
                        <div>
                          <div className="text-slate-900 font-semibold dark:text-white">
                            {item.student.name}
                          </div>
                          <div className="text-[11px] text-slate-400">{item.student.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Per Course Attendance Cells */}
                    {item.courses.map((c) => {
                      const pct = c.attendancePercent;
                      const isCrit = pct < 50;
                      const isDef = c.isDefaulter;

                      return (
                        <td key={c.courseId} className="px-3 py-3.5 text-center whitespace-nowrap">
                          <div
                            className={`inline-flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                              isCrit
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
                                : isDef
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                            }`}
                          >
                            <span>{pct}%</span>
                            <span className="text-[10px] font-normal opacity-80">
                              {c.attendedHours}/{c.totalHeldHours}h
                            </span>
                          </div>
                        </td>
                      );
                    })}

                    {/* Overall Percentage */}
                    <td className="px-4 py-3.5 text-center bg-indigo-50/40 dark:bg-indigo-950/20 whitespace-nowrap">
                      <div className="flex flex-col items-center">
                        <span
                          className={`text-sm font-extrabold ${
                            item.overall.overallPercent < 50
                              ? 'text-rose-600 dark:text-rose-400'
                              : item.overall.isDefaulter
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.overall.overallPercent}%
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.overall.totalAttendedHours}/{item.overall.totalHeldHours} hrs
                        </span>
                      </div>
                    </td>

                    {/* Defaulter Status */}
                    <td className="px-4 py-3.5 text-center bg-indigo-50/40 dark:bg-indigo-950/20 whitespace-nowrap">
                      <Badge
                        color={
                          item.overall.overallPercent < 50
                            ? 'red'
                            : item.overall.isDefaulter
                            ? 'yellow'
                            : 'green'
                        }
                        dot
                      >
                        {item.overall.isDefaulter ? 'Defaulter' : 'Eligible'}
                      </Badge>
                    </td>

                    {/* Action */}
                    <td className="px-3 py-3.5 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewStudentDetails(item.student)}
                        className="!text-xs"
                      >
                        View History
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Student Detail Modal */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  Student Attendance File
                </span>
                <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {selectedStudentDetail.name} ({selectedStudentDetail.rollNo})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedStudentDetail.email} • {matrixData?.classBatch?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Session Log History ({studentRecords.length} sessions attended)
              </h4>

              {loadingStudentDetail ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading session logs...</div>
              ) : studentRecords.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No session attendance marked for this student yet.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 rounded-2xl dark:border-slate-800">
                  {studentRecords.map((rec) => (
                    <div
                      key={rec._id}
                      className="flex items-center justify-between p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {rec.session?.course?.name || 'Session'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(rec.markedAt || rec.createdAt).toLocaleString()} • Method: {rec.method}
                        </p>
                      </div>
                      <Badge
                        color={
                          rec.status === 'present'
                            ? 'green'
                            : rec.status === 'on_duty'
                            ? 'blue'
                            : rec.status === 'late'
                            ? 'yellow'
                            : 'red'
                        }
                        dot
                      >
                        {rec.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedStudentDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
