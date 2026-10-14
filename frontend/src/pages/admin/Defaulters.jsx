import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Table, Badge, Input } from '../../components/ui';
import Modal from '../../components/Modal';
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
  Mail,
  Send,
} from 'lucide-react';

export default function Defaulters() {
  const { user } = useAuth();
  const isHOD = Boolean(user?.isHOD || user?.designation?.toLowerCase().includes('hod') || user?.designation?.toLowerCase().includes('head'));
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [selectedStudentForNotify, setSelectedStudentForNotify] = useState(null);
  const [customNote, setCustomNote] = useState('');
  const [forceSend, setForceSend] = useState(true);
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

  const handleTriggerNotifications = async () => {
    setNotifying(true);
    try {
      const payload = {
        viewType: viewMode,
        force: forceSend,
        customNote: customNote.trim() || undefined,
      };

      if (selectedStudentForNotify) {
        payload.studentId = selectedStudentForNotify.student;
        if (selectedStudentForNotify.course) {
          payload.course = selectedStudentForNotify.course;
        }
      } else {
        if (selectedClass !== 'all') {
          payload.classBatch = selectedClass;
        }
        if (viewMode === 'subject' && selectedCourse !== 'all') {
          payload.course = selectedCourse;
        }
      }

      const { data } = await api.post('/reports/run-notifications', payload);
      toast.success(data.message || 'Defaulter notifications dispatched successfully');
      setNotifyModalOpen(false);
      setSelectedStudentForNotify(null);
      setCustomNote('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to trigger notification dispatch');
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
              onClick={() => {
                setSelectedStudentForNotify(null);
                setNotifyModalOpen(true);
              }}
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
                  {
                    key: 'actions',
                    header: 'Action',
                    render: (r) => (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Mail}
                        onClick={() => {
                          setSelectedStudentForNotify(r);
                          setNotifyModalOpen(true);
                        }}
                        className="!py-1 !px-2.5 !text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        title={`Send Email Notice to ${r.studentName}`}
                      >
                        Email
                      </Button>
                    ),
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
                  {
                    key: 'actions',
                    header: 'Action',
                    render: (r) => (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Mail}
                        onClick={() => {
                          setSelectedStudentForNotify(r);
                          setNotifyModalOpen(true);
                        }}
                        className="!py-1 !px-2.5 !text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        title={`Send Email Notice to ${r.studentName}`}
                      >
                        Email
                      </Button>
                    ),
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

      {/* Defaulter Email Notification Modal */}
      <Modal
        isOpen={notifyModalOpen}
        onClose={() => {
          if (!notifying) {
            setNotifyModalOpen(false);
            setSelectedStudentForNotify(null);
          }
        }}
        title={
          selectedStudentForNotify
            ? `Dispatch Email Notice: ${selectedStudentForNotify.studentName}`
            : 'Dispatch Defaulter Email Notifications'
        }
        subtitle="Trigger official attendance shortage alerts to student and registered parent email addresses"
      >
        <div className="space-y-4">
          {/* Authority & Scope Banner */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Triggering Authority
              </span>
              <Badge color="yellow">
                {isHOD
                  ? `HOD${user?.department?.code ? ` (${user.department.code})` : ''}`
                  : user?.role === 'admin'
                  ? 'Administrator'
                  : 'Authorized Faculty'}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
              {isHOD
                ? `You are triggering notices as Head of Department. Emails will carry official departmental warning banners and your sign-off.`
                : `Official notifications will be logged in institutional audit records.`}
            </p>
          </div>

          {/* Target Summary */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 text-xs space-y-1.5">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Notification Scope:</p>
            {selectedStudentForNotify ? (
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600 dark:text-slate-400">
                <div>Student: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStudentForNotify.studentName} ({selectedStudentForNotify.rollNo})</span></div>
                <div>Class: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedStudentForNotify.classBatchName || '—'}</span></div>
                <div>Attendance: <span className="font-bold text-rose-600 dark:text-rose-400">{selectedStudentForNotify.attendancePercent}%</span> (Required: {selectedStudentForNotify.threshold || 75}%)</div>
                <div>Subject: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedStudentForNotify.courseName || 'Cumulative Overall'}</span></div>
              </div>
            ) : (
              <div className="pt-1 text-slate-600 dark:text-slate-400 space-y-1">
                <div>Target Defaulters: <span className="font-bold text-rose-600 dark:text-rose-400">{filteredDefaulters.length} students</span></div>
                <div>Class Filter: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClass === 'all' ? 'All Classes in Department Scope' : batches.find(b => b._id === selectedClass)?.name || 'Class'}</span></div>
                <div>Scope: <span className="font-semibold text-slate-800 dark:text-slate-200">{viewMode === 'overall' ? 'Cumulative Overall Attendance' : (selectedCourse === 'all' ? 'All Subjects' : courses.find(c => c._id === selectedCourse)?.code)}</span></div>
              </div>
            )}
          </div>

          {/* Custom Message / Instructions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Custom Instructions / Remarks from HOD (Optional)
            </label>
            <textarea
              rows={3}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. You and your parent must attend an attendance review meeting in the HOD cabin on Friday at 11:00 AM."
              className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              This message will be highlighted inside the student and parent email notifications.
            </p>
          </div>

          {/* Force Send Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="forceSendCheckbox"
              checked={forceSend}
              onChange={(e) => setForceSend(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
            />
            <label htmlFor="forceSendCheckbox" className="text-xs text-slate-700 dark:text-slate-300 select-none">
              <span className="font-semibold">Force send notices</span> (Ignore 7-day cooldown; dispatch immediately even if notified recently)
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={() => {
                setNotifyModalOpen(false);
                setSelectedStudentForNotify(null);
              }}
              disabled={notifying}
            >
              Cancel
            </Button>
            <Button
              icon={Send}
              loading={notifying}
              onClick={handleTriggerNotifications}
              className="!bg-rose-600 hover:!bg-rose-700 text-white shadow-md"
            >
              {selectedStudentForNotify ? 'Send Email Notice' : `Dispatch Notices (${filteredDefaulters.length})`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
