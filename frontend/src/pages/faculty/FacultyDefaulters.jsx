import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, Table, Badge, Button, Input } from '../../components/ui';
import toast from 'react-hot-toast';
import { RefreshCw, ShieldAlert, Filter, BookOpen, Layers, Search, GraduationCap } from 'lucide-react';

export default function FacultyDefaulters() {
  const { user } = useAuth();
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [viewMode, setViewMode] = useState('subject'); // 'subject' | 'overall'
  const [searchQuery, setSearchQuery] = useState('');

  // Check if faculty is a designated class teacher
  const isClassTeacher =
    Boolean(user?.classTeacherOf && user.classTeacherOf.length > 0) || user?.role === 'admin';

  // Load available batches and courses for filtering
  const loadFilters = async () => {
    try {
      const [batchRes, courseRes] = await Promise.all([
        api.get('/academic/class-batches'),
        api.get('/academic/courses'),
      ]);

      const userId = user?.id || user?._id;
      const assignedBatchIds = new Set(
        [
          ...(user?.classBatchesAssigned || []).map((b) => (b._id || b).toString()),
          ...(user?.classTeacherOf || []).map((b) => (b._id || b).toString()),
        ]
      );

      const myBatches = batchRes.data.filter((b) => {
        if (user?.role === 'admin') return true;
        const bId = (b._id || b).toString();
        const tId = (b.classTeacher?._id || b.classTeacher)?.toString();
        return assignedBatchIds.has(bId) || tId === userId?.toString();
      });
      setBatches(myBatches);

      const assignedCourseIds = new Set(
        (user?.coursesAssigned || []).map((c) => (c._id || c).toString())
      );
      const myCourses = courseRes.data.filter((c) => {
        if (user?.role === 'admin') return true;
        return assignedCourseIds.has((c._id || c).toString());
      });
      setCourses(myCourses);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const loadDefaulters = async () => {
    setLoading(true);
    try {
      const params = {
        viewType: viewMode,
      };
      if (selectedClass !== 'all') {
        params.classBatch = selectedClass;
      }
      if (viewMode === 'subject' && selectedCourse !== 'all') {
        params.course = selectedCourse;
      }

      const { data } = await api.get('/reports/defaulters', { params });
      setDefaulters(data);
    } catch (e) {
      toast.error('Failed to load defaulter data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, [user]);

  useEffect(() => {
    loadDefaulters();
  }, [selectedClass, selectedCourse, viewMode]);

  const filteredDefaulters = defaulters.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.rollNo && d.rollNo.toLowerCase().includes(q)) ||
      (d.studentName && d.studentName.toLowerCase().includes(q)) ||
      (d.classBatchName && d.classBatchName.toLowerCase().includes(q)) ||
      (d.courseName && d.courseName.toLowerCase().includes(q)) ||
      (d.courseCode && d.courseCode.toLowerCase().includes(q))
    );
  });

  const criticalCount = filteredDefaulters.filter((d) => d.attendancePercent < 50).length;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-300" /> Threshold Watchlist
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {viewMode === 'overall' ? 'Class Overall Defaulters' : 'Subject Defaulter Watchlist'}
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              {viewMode === 'overall'
                ? 'Master cumulative attendance defaulters for your designated class batch.'
                : 'Students below mandated attendance quota in your assigned courses and classes.'}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
            <span>Quota Threshold: 75%</span>
          </div>
        </div>

        {/* View Mode Switcher (Class Teachers & Admins) */}
        {isClassTeacher && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-100 mr-2">
              Defaulter Scope:
            </span>
            <button
              type="button"
              onClick={() => {
                setViewMode('subject');
                setSelectedCourse('all');
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition backdrop-blur-md ${
                viewMode === 'subject'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> My Subject Defaulters
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('overall');
                setSelectedCourse('all');
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition backdrop-blur-md ${
                viewMode === 'overall'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" /> My Class Overall Defaulters
            </button>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Flagged Defaulters</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{filteredDefaulters.length}</p>
            <p className="text-xs text-indigo-200">Below 75% required target</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Critical (&lt;50%)</p>
            <p className="mt-1 text-2xl font-extrabold text-rose-300">{criticalCount}</p>
            <p className="text-xs text-indigo-200">High shortage cases</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Filter Scope</p>
            <p className="mt-1 text-base font-bold text-white truncate">
              {selectedClass === 'all'
                ? 'All Assigned Classes'
                : batches.find((b) => b._id === selectedClass)?.name || 'Class'}
            </p>
            <p className="text-xs text-indigo-200 truncate">
              {viewMode === 'overall'
                ? 'Cumulative across all subjects'
                : selectedCourse === 'all'
                ? 'All My Subjects'
                : courses.find((c) => c._id === selectedCourse)?.code || 'Subject'}
            </p>
          </div>
        </div>
      </div>

      <Card
        title={
          viewMode === 'overall'
            ? `Overall Class Defaulters (${filteredDefaulters.length})`
            : `Subject Defaulters (${filteredDefaulters.length})`
        }
        subtitle={
          viewMode === 'overall'
            ? 'Students failing institutional minimum attendance across all subjects in their cohort'
            : 'Enrolled students below minimum attendance quota in their respective class subject'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Class Batch Dropdown Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="faculty-class-filter" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Class:</label>
              <select
                id="faculty-class-filter"
                aria-label="Filter by class cohort"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">All Classes</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} (Sem {b.semester})
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Dropdown Filter (Visible in Subject View) */}
            {viewMode === 'subject' && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="faculty-subject-filter" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Subject:</label>
                <select
                  id="faculty-subject-filter"
                  aria-label="Filter by course subject"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Subjects</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.code} - {c.name.length > 20 ? c.name.slice(0, 18) + '...' : c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick search input */}
            <div className="relative w-44">
              <Input
                placeholder="Search roll, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!py-1.5 !text-xs !pl-7"
              />
              <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            <Button variant="ghost" size="sm" icon={RefreshCw} loading={loading} onClick={loadDefaulters}>
              Refresh
            </Button>
          </div>
        }
      >
        <Table
          columns={
            viewMode === 'overall'
              ? [
                  { key: 'rollNo', header: 'Roll No' },
                  { key: 'studentName', header: 'Student Name' },
                  {
                    key: 'classBatchName',
                    header: 'Class / Division',
                    render: (r) => (
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {r.classBatchName || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'attendedHours',
                    header: 'Total Attended',
                    render: (r) => `${r.attendedHours} hrs`,
                  },
                  {
                    key: 'totalHeldHours',
                    header: 'Total Held',
                    render: (r) => `${r.totalHeldHours} hrs`,
                  },
                  {
                    key: 'attendancePercent',
                    header: 'Cumulative %',
                    render: (r) => (
                      <Badge color={r.attendancePercent < 50 ? 'red' : 'yellow'} dot>
                        {r.attendancePercent}%
                      </Badge>
                    ),
                  },
                  {
                    key: 'failingCoursesList',
                    header: 'Subjects in Shortage',
                    render: (r) => (
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        {r.failingCoursesList || (r.attendancePercent < 75 ? 'Overall Cumulative < 75%' : 'None')}
                      </span>
                    ),
                  },
                  {
                    key: 'threshold',
                    header: 'Target %',
                    render: (r) => `${r.threshold || 75}%`,
                  },
                ]
              : [
                  { key: 'rollNo', header: 'Roll No' },
                  { key: 'studentName', header: 'Student Name' },
                  {
                    key: 'classBatchName',
                    header: 'Class / Division',
                    render: (r) => (
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {r.classBatchName || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'courseName',
                    header: 'Course Subject',
                    render: (r) => (
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {r.courseCode ? `${r.courseCode} - ` : ''}
                          {r.courseName}
                        </div>
                      </div>
                    ),
                  },
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
                    key: 'attendedHours',
                    header: 'Attended (Hrs)',
                    render: (r) => `${r.attendedHours}/${r.totalHeldHours}h`,
                  },
                  {
                    key: 'attendancePercent',
                    header: 'Recorded %',
                    render: (r) => (
                      <Badge color={r.attendancePercent < 50 ? 'red' : 'yellow'} dot>
                        {r.attendancePercent}%
                      </Badge>
                    ),
                  },
                  {
                    key: 'threshold',
                    header: 'Target %',
                    render: (r) => `${r.threshold || 75}%`,
                  },
                ]
          }
          data={filteredDefaulters}
          emptyText={
            viewMode === 'overall'
              ? 'No students in this class fall below the overall attendance threshold.'
              : 'No students currently below attendance quota for the selected class and subject.'
          }
        />
      </Card>
    </div>
  );
}
