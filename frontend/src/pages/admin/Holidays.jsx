import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import Modal from '../../components/Modal';
import { validateHolidayForm } from '../../validators';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import toast from 'react-hot-toast';
import {
  Calendar,
  Plus,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Sun,
  CheckCircle2,
} from 'lucide-react';

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [years, setYears] = useState([]);
  const [form, setForm] = useState({ date: '', name: '', academicYear: '', semester: '' });
  const [errors, setErrors] = useState({ date: '', name: '', academicYear: '', semester: '' });
  const [semesterFilter, setSemesterFilter] = useState('');
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [markingSundays, setMarkingSundays] = useState(false);
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [deleteHoliday, setDeleteHoliday] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const params = {};
      if (form.academicYear) params.academicYear = form.academicYear;
      if (semesterFilter) params.semester = semesterFilter;

      const [h, y] = await Promise.all([
        api.get('/holidays', { params }),
        api.get('/academic/academic-years'),
      ]);
      setHolidays(h.data);
      setYears(y.data);
    } catch (e) {
      console.error('Failed to load holiday data', e);
    }
  };

  useEffect(() => {
    load();
  }, [form.academicYear, semesterFilter]);

  const holidayMap = useMemo(() => {
    const map = new Map();
    holidays.forEach((holiday) => {
      const key = format(new Date(holiday.date), 'yyyy-MM-dd');
      const list = map.get(key) || [];
      list.push(holiday);
      map.set(key, list);
    });
    return map;
  }, [holidays]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(monthCursor);
    const monthEnd = endOfMonth(monthCursor);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [monthCursor]);

  const validateForm = () => {
    const nextErrors = validateHolidayForm(form);
    setErrors({
      date: nextErrors.date || '',
      name: nextErrors.name || '',
      academicYear: nextErrors.academicYear || '',
      semester: nextErrors.semester || '',
    });
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await api.post('/holidays', form);
      toast.success('Holiday scheduled successfully');
      setForm({ date: '', name: '', academicYear: '', semester: '' });
      setErrors({ date: '', name: '', academicYear: '', semester: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add holiday');
    }
  };

  const confirmDelete = async () => {
    if (!deleteHoliday) return;
    setDeleting(true);
    try {
      await api.delete(`/holidays/${deleteHoliday._id}`);
      toast.success('Holiday removed');
      setDeleteHoliday(null);
      load();
    } catch (err) {
      toast.error('Failed to remove holiday');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/holidays/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'holiday_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Could not download holiday template');
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!form.academicYear) {
      toast.error('Select an academic year above before importing holiday rows.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('academicYear', form.academicYear);
      if (form.semester) formData.append('semester', form.semester);
      const res = await api.post('/holidays/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      if (res.data.created > 0) {
        toast.success(`Imported ${res.data.created} holiday(s)${res.data.failed ? `, ${res.data.failed} failed` : ''}`);
      } else {
        toast.error('No holidays were imported - check the results below');
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSundayShortcut = async () => {
    if (!form.academicYear) {
      toast.error('Select an academic year in the form before batch-marking Sundays.');
      return;
    }

    setMarkingSundays(true);
    try {
      const res = await api.post('/holidays/bulk-sundays', {
        academicYear: form.academicYear,
        semester: form.semester || null,
      });
      const label = res.data.semester && res.data.semester !== 'all' ? ` (Sem ${res.data.semester})` : '';
      toast.success(`Marked all Sundays as holidays${label} (${res.data.created} dates added)`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark Sundays');
    } finally {
      setMarkingSundays(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <Calendar className="h-3.5 w-3.5" /> Academic Schedule
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Holiday Calendar & Exceptions
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Days marked as holidays are automatically excluded from session attendance calculations.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span>{holidays.length} Dates Configured</span>
          </div>
        </div>
      </div>

      {/* Add Holiday Form Card */}
      <Card title="Add Academic Holiday" subtitle="Define individual holiday or batch-mark institutional days off">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              error={errors.date}
            />
            {errors.date && <p className="mt-1 text-xs text-rose-500">{errors.date}</p>}
          </div>
          <div>
            <Input
              placeholder="Holiday Name (e.g. Diwali)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
          </div>
          <div>
            <Select
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              error={errors.academicYear}
            >
              <option value="">Academic Year</option>
              {years.map((y) => (
                <option key={y._id} value={y._id}>{y.label}</option>
              ))}
            </Select>
            {errors.academicYear && <p className="mt-1 text-xs text-rose-500">{errors.academicYear}</p>}
          </div>
          <div>
            <Select
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
              error={errors.semester}
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </Select>
            {errors.semester && <p className="mt-1 text-xs text-rose-500">{errors.semester}</p>}
          </div>
          <div>
            <Button type="submit" icon={Plus} className="w-full">
              Add Holiday
            </Button>
          </div>
        </form>

        {/* Quick Actions Strip */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button
            variant="secondary"
            size="sm"
            icon={Sun}
            loading={markingSundays}
            onClick={handleSundayShortcut}
          >
            {markingSundays ? 'Marking Sundays...' : 'Auto-Mark All Sundays'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleDownloadTemplate}
          >
            Download Template
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileImport}
            disabled={importing}
            className="hidden"
            id="holiday-file-input"
          />
          <Button
            variant="outline"
            size="sm"
            icon={Upload}
            loading={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? 'Uploading...' : 'Bulk Excel Import'}
          </Button>
        </div>

        {importResult && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex gap-2 mb-2">
              <Badge color="green" dot>{importResult.created} created</Badge>
              {importResult.failed > 0 && <Badge color="red" dot>{importResult.failed} failed</Badge>}
            </div>
            <div className="max-h-48 overflow-y-auto">
              <Table
                columns={[
                  { key: 'row', header: 'Row' },
                  { key: 'date', header: 'Date' },
                  { key: 'name', header: 'Holiday' },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (r) => (
                      <Badge color={r.status === 'created' ? 'green' : 'red'}>
                        {r.status}
                      </Badge>
                    ),
                  },
                  { key: 'message', header: 'Details' },
                ]}
                data={importResult.rows || []}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Calendar View Card */}
      <Card
        title={`${format(monthCursor, 'MMMM yyyy')} Calendar View`}
        subtitle="Visual month layout of all institutional holidays"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={ChevronLeft}
              onClick={() => setMonthCursor((d) => subMonths(d, 1))}
            />
            <Button
              variant="outline"
              size="sm"
              icon={ChevronRight}
              onClick={() => setMonthCursor((d) => addMonths(d, 1))}
            />
            <Select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="!py-1.5 !text-xs min-w-[140px]"
            >
              <option value="">All Semesters</option>
              <option value="odd">Odd Semesters (1,3,5,7)</option>
              <option value="even">Even Semesters (2,4,6,8)</option>
            </Select>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> All-cohort holiday
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Semester-specific
          </span>
          <span className="text-slate-400">• Click any holiday to remove it</span>
        </div>

        {/* Calendar Grid Container with horizontal scroll safety on small mobile */}
        <div className="overflow-x-auto">
          <div className="min-w-[650px]">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayHolidays = holidayMap.get(key) || [];
                const activeDay = isSameDay(day, new Date());
                const inCurrentMonth = isSameMonth(day, monthCursor);

                return (
                  <div
                    key={key}
                    className={`min-h-[110px] rounded-2xl border p-2.5 transition-all ${
                      inCurrentMonth
                        ? 'border-slate-200/90 bg-white/95 dark:border-slate-800 dark:bg-slate-900/80 shadow-sm'
                        : 'border-slate-100 bg-slate-50/50 text-slate-400 dark:border-slate-900 dark:bg-slate-950/40 dark:text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-semibold ${
                          activeDay
                            ? 'bg-brand-600 text-white font-bold shadow-sm'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {dayHolidays.slice(0, 2).map((holiday) => (
                        <button
                          key={holiday._id}
                          type="button"
                          onClick={() => setDeleteHoliday(holiday)}
                          title={`Click to remove ${holiday.name}`}
                          className={`w-full truncate rounded-lg border px-1.5 py-1 text-left text-[11px] font-semibold transition hover:scale-[1.02] ${
                            holiday.semester
                              ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300'
                              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300'
                          }`}
                        >
                          {holiday.name}
                          {holiday.semester ? ` (S${holiday.semester})` : ''}
                        </button>
                      ))}
                      {dayHolidays.length > 2 && (
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          +{dayHolidays.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteHoliday)}
        onClose={() => setDeleteHoliday(null)}
        title="Remove Holiday Date?"
        subtitle="This date will become available for sessions again"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to remove <strong className="text-slate-900 dark:text-white">"{deleteHoliday?.name}"</strong> on {deleteHoliday?.date ? format(new Date(deleteHoliday.date), 'dd MMM yyyy') : ''}?
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="outline" onClick={() => setDeleteHoliday(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Remove Holiday
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
