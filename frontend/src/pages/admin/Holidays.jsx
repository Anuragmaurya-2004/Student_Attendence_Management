import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
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

  const load = async () => {
    const params = {};
    if (form.academicYear) params.academicYear = form.academicYear;
    if (semesterFilter) params.semester = semesterFilter;

    const [h, y] = await Promise.all([
      api.get('/holidays', { params }),
      api.get('/academic/academic-years'),
    ]);
    setHolidays(h.data);
    setYears(y.data);
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
      toast.success('Holiday added');
      setForm({ date: '', name: '', academicYear: '', semester: '' });
      setErrors({ date: '', name: '', academicYear: '', semester: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add holiday');
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/holidays/${id}`);
    toast.success('Deleted');
    load();
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
      toast.error('Select an academic year before importing holiday rows.');
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
      toast.error('Select an academic year before marking Sundays as holidays.');
      return;
    }

    setMarkingSundays(true);
    try {
      const res = await api.post('/holidays/bulk-sundays', {
        academicYear: form.academicYear,
        semester: form.semester || null,
      });
      const label = res.data.semester && res.data.semester !== 'all' ? ` (Sem ${res.data.semester})` : '';
      toast.success(`Marked all Sundays as holidays${label} for ${res.data.created} dates`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark Sundays');
    } finally {
      setMarkingSundays(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-indigo-200/80 bg-gradient-to-r from-indigo-100 via-violet-100 to-white p-5 text-slate-900 shadow-[0_18px_36px_rgba(79,70,229,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600">Academic calendar</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Holiday Calendar</h1>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Scheduling rules active
          </div>
        </div>
      </div>

      <Card title="Add Holiday">
        <form onSubmit={handleSubmit} className="grid md:grid-cols-5 gap-3">
          <div>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.date} />
            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
          </div>
          <div>
            <Input placeholder="Holiday Name (e.g. Diwali)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          <div>
            <Select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} error={errors.academicYear}>
              <option value="">Select Academic Year</option>
              {years.map((y) => (
                <option key={y._id} value={y._id}>{y.label}</option>
              ))}
            </Select>
            {errors.academicYear && <p className="mt-1 text-xs text-red-500">{errors.academicYear}</p>}
          </div>
          <div>
            <Select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} error={errors.semester}>
              <option value="">Select semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </Select>
            {errors.semester && <p className="mt-1 text-xs text-red-500">{errors.semester}</p>}
          </div>
          <Button type="submit">+ Add Holiday</Button>
        </form>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Button variant="outline" type="button" onClick={handleSundayShortcut} disabled={markingSundays}>
            {markingSundays ? 'Marking Sundays...' : 'Mark all Sundays as holidays'}
          </Button>
          <Button variant="outline" type="button" onClick={handleDownloadTemplate} className="inline-flex items-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M12 3.5a1 1 0 0 1 1 1V12l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L11 12V4.5a1 1 0 0 1 1-1Zm-7 12a1 1 0 0 1 1 1v1.5h12V16.5a1 1 0 1 1 2 0v2.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.5a1 1 0 0 1 1-1Z" fill="currentColor"/></svg>
            Download template
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} disabled={importing} className="text-sm" />
          {importing && <span className="text-sm text-gray-500">Importing...</span>}
        </div>
        {importResult && (
          <div className="mt-4">
            <div className="flex gap-2 mb-2">
              <Badge color="green">{importResult.created} created</Badge>
              {importResult.failed > 0 && <Badge color="red">{importResult.failed} failed</Badge>}
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg">
              <Table
                columns={[
                  { key: 'row', header: 'Row' },
                  { key: 'date', header: 'Date' },
                  { key: 'name', header: 'Name' },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (r) => <Badge color={r.status === 'created' ? 'green' : 'red'}>{r.status}</Badge>,
                  },
                  { key: 'message', header: 'Details' },
                ]}
                data={importResult.rows}
              />
            </div>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Sessions cannot be scheduled on holiday dates — they're automatically excluded from attendance % calculations.
        </p>
      </Card>

      <Card title={`${format(monthCursor, 'MMMM yyyy')} Holiday Calendar (${holidays.length})`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={() => setMonthCursor((date) => subMonths(date, 1))}>← Prev</Button>
            <Button variant="outline" type="button" onClick={() => setMonthCursor((date) => addMonths(date, 1))}>Next →</Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="min-w-[150px]">
              <option value="">All Semesters</option>
              <option value="odd">Odd Sem (1,3,5,7)</option>
              <option value="even">Even Sem (2,4,6,8)</option>
            </Select>
          </div>
        </div>

        <div className="mb-3 text-sm text-gray-500">
          Filtered by {form.academicYear ? years.find((y) => y._id === form.academicYear)?.label || 'selected year' : 'all years'}
          {semesterFilter ? ` • ${semesterFilter === 'odd' ? 'Odd Sem' : 'Even Sem'}` : ''}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-2 py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" /> All-semester
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Semester-specific
          </span>
          <span className="text-gray-500">Click a holiday tag to remove it</span>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-gray-500 mb-2">
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

            return (
              <div
                key={key}
                className={`min-h-[120px] rounded-lg border p-2 ${isSameMonth(day, monthCursor) ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs ${activeDay ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {format(day, 'd')}
                  </span>
                </div>

                <div className="space-y-1">
                  {dayHolidays.slice(0, 2).map((holiday) => (
                    <button
                      key={holiday._id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete the holiday "${holiday.name}"?`)) {
                          handleDelete(holiday._id);
                        }
                      }}
                      title={`Delete ${holiday.name}`}
                      className={`w-full rounded border px-1.5 py-0.5 text-left text-[10px] font-medium transition hover:opacity-80 ${holiday.semester ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700'}`}
                    >
                      {holiday.name}
                      {holiday.semester ? ` • Sem ${holiday.semester}` : ''}
                    </button>
                  ))}
                  {dayHolidays.length > 2 && (
                    <div className="text-[10px] text-gray-500">+{dayHolidays.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
