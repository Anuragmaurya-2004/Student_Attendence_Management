import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Table, Badge, Input } from '../../components/ui';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Bell,
  RefreshCw,
  Search,
  BookOpen,
  GraduationCap,
} from 'lucide-react';

export default function Defaulters() {
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [viewMode, setViewMode] = useState('subject'); // 'subject' | 'overall'
  const [searchQuery, setSearchQuery] = useState('');

  const loadFilters = async () => {
    try {
      const [bRes, cRes] = await Promise.all([
        api.get('/academic/class-batches'),
        api.get('/academic/courses'),
      ]);
      setBatches(bRes.data || []);
      setCourses(cRes.data || []);
    } catch (e) {
      console.error('Failed to load filter options:', e);
    }
  };

  const load = async () => {
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
      toast.error('Failed to load defaulters list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    load();
  }, [selectedClass, selectedCourse, viewMode]);

  const runNotifications = async () => {
    setNotifying(true);
    try {
      await api.post('/reports/run-notifications');
      toast.success('Defaulter check triggered and parent notifications queued');
    } catch (e) {
      toast.error('Failed to trigger notification dispatch');
    } finally {
      setNotifying(false);
    }
  };

  const exportFile = async (type) => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('viewType', viewMode);
      if (selectedClass !== 'all') params.append('classBatch', selectedClass);
      if (viewMode === 'subject' && selectedCourse !== 'all') params.append('course', selectedCourse);

      const res = await api.get(`/export/defaulters/${type}?${params.toString()}`, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `defaulters_report_${viewMode}_${new Date().toISOString().slice(0, 10)}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Exported ${type.toUpperCase()} report successfully`);
    } catch (err) {
      toast.error(`Failed to export ${type.toUpperCase()} report`);
    } finally {
      setExporting(false);
    }
  };

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
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> Institutional Attendance Monitoring
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Defaulter Analytics & Action Center
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              {viewMode === 'overall'
                ? 'Review overall class cumulative attendance shortages across all subjects.'
                : 'Identify students below mandated course attendance thresholds and trigger immediate notices.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              icon={FileSpreadsheet}
              loading={exporting}
              onClick={() => exportFile('excel')}
              className="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20"
            >
              Excel Report
            </Button>
            <Button
              variant="outline"
              icon={FileText}
              loading={exporting}
              onClick={() => exportFile('pdf')}
              className="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20"
            >
              PDF Report
            </Button>
            <Button
              icon={Bell}
              loading={notifying}
              onClick={runNotifications}
              className="shadow-lg"
            >
              Trigger Notices Now
            </Button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-100 mr-2">
            View Scope:
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
            <BookOpen className="h-3.5 w-3.5" /> Subject-wise Defaulters
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
            <GraduationCap className="h-3.5 w-3.5" /> Overall Class Defaulters
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Total Defaulters</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{filteredDefaulters.length}</p>
            <p className="text-xs text-indigo-200">Below 75% required quota</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Critical (&lt;50%)</p>
            <p className="mt-1 text-2xl font-extrabold text-rose-300">{criticalCount}</p>
            <p className="text-xs text-indigo-200">Severe shortage cases</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Class Filter</p>
            <p className="mt-1 text-base font-bold text-white truncate">
              {selectedClass === 'all'
                ? 'All Classes'
                : batches.find((b) => b._id === selectedClass)?.name || 'Class'}
            </p>
            <p className="text-xs text-indigo-200 truncate">
              {viewMode === 'overall'
                ? 'All subjects combined'
                : selectedCourse === 'all'
                ? 'All Subjects'
                : courses.find((c) => c._id === selectedCourse)?.code || 'Subject'}
            </p>
          </div>
        </div>
      </div>

      <Card
        title={
          viewMode === 'overall'
            ? `Identified Overall Class Defaulters (${filteredDefaulters.length})`
            : `Identified Subject Defaulters (${filteredDefaulters.length})`
        }
        subtitle="Students failing to reach the mandatory minimum attendance percentage"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Class Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="admin-class-filter" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Class:</label>
              <select
                id="admin-class-filter"
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

            {/* Course Filter (Subject View) */}
            {viewMode === 'subject' && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="admin-subject-filter" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Subject:</label>
                <select
                  id="admin-subject-filter"
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

            {/* Search Input */}
            <div className="relative w-44">
              <Input
                placeholder="Search roll, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!py-1.5 !text-xs !pl-7"
              />
              <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              loading={loading}
              onClick={load}
            >
              Refresh Data
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
                  { key: 'attendedHours', header: 'Attended (Hrs)', render: (r) => `${r.attendedHours}h` },
                  { key: 'totalHeldHours', header: 'Held (Hrs)', render: (r) => `${r.totalHeldHours}h` },
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
                    header: 'Defaulter Subjects',
                    render: (r) => (
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        {r.failingCoursesList || (r.attendancePercent < 75 ? 'Overall Cumulative < 75%' : 'None')}
                      </span>
                    ),
                  },
                  {
                    key: 'threshold',
                    header: 'Mandated %',
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
                    header: 'Course / Subject',
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
                  { key: 'attendedHours', header: 'Attended (Hrs)', render: (r) => `${r.attendedHours}h` },
                  { key: 'totalHeldHours', header: 'Held (Hrs)', render: (r) => `${r.totalHeldHours}h` },
                  {
                    key: 'attendancePercent',
                    header: 'Current %',
                    render: (r) => (
                      <Badge color={r.attendancePercent < 50 ? 'red' : 'yellow'} dot>
                        {r.attendancePercent}%
                      </Badge>
                    ),
                  },
                  {
                    key: 'threshold',
                    header: 'Mandated %',
                    render: (r) => `${r.threshold || 75}%`,
                  },
                ]
          }
          data={filteredDefaulters}
          emptyText={
            viewMode === 'overall'
              ? 'Great news! No students currently fall below the overall attendance threshold.'
              : 'Great news! No students currently fall below attendance thresholds for the selected filters.'
          }
        />
      </Card>
    </div>
  );
}
