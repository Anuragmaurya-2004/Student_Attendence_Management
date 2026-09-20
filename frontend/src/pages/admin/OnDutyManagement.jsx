import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { Card, Button, Table, Badge, Select, TextInput } from '../../components/ui';
import toast from 'react-hot-toast';
import { format, differenceInCalendarDays } from 'date-fns';
import { validateOnDutyForm } from '../../validators';

const ACTIVITY_LABELS = {
  industrial_visit: 'Industrial Visit',
  sports: 'Sports Tournament',
  cultural: 'Cultural Fest',
  hackathon_tech: 'Hackathon / Tech Event',
  nss_ncc: 'NSS / NCC Camp',
  college_event: 'College Official Event',
  other: 'Other Duty',
};

const ACTIVITY_COLORS = {
  industrial_visit: 'indigo',
  sports: 'green',
  cultural: 'yellow',
  hackathon_tech: 'blue',
  nss_ncc: 'purple',
  college_event: 'gray',
  other: 'gray',
};

export default function OnDutyManagement() {
  const [records, setRecords] = useState([]);
  const [classBatches, setClassBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [batchStudents, setBatchStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewStudentsModal, setViewStudentsModal] = useState(null);

  // Form State
  const [formBatch, setFormBatch] = useState('');
  const [formStudents, setFormStudents] = useState([]);
  const [isWholeBatch, setIsWholeBatch] = useState(false);
  const [activityType, setActivityType] = useState('industrial_visit');
  const [eventTitle, setEventTitle] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({
    formBatch: '',
    formStudents: '',
    activityType: '',
    eventTitle: '',
    fromDate: '',
    toDate: '',
  });

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedBatch ? { classBatch: selectedBatch } : {};
      const { data } = await api.get('/onduty', { params });
      setRecords(data);
    } catch {
      toast.error('Failed to load On-Duty records');
    } finally {
      setLoading(false);
    }
  }, [selectedBatch]);

  const loadClassBatches = async () => {
    try {
      const { data } = await api.get('/academic/class-batches');
      setClassBatches(data);
    } catch {
      toast.error('Failed to load class batches');
    }
  };

  useEffect(() => {
    loadClassBatches();
    loadRecords();
  }, [loadRecords]);

  // Load students when batch is selected inside modal
  useEffect(() => {
    if (!formBatch) {
      setBatchStudents([]);
      setFormStudents([]);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get('/students', { params: { classBatch: formBatch } });
        setBatchStudents(data);
        if (isWholeBatch) {
          setFormStudents(data.map((s) => s._id));
        }
      } catch {
        toast.error('Failed to load students for batch');
      }
    })();
  }, [formBatch, isWholeBatch]);

  const handleToggleWholeBatch = (checked) => {
    setIsWholeBatch(checked);
    if (checked) {
      setFormStudents(batchStudents.map((s) => s._id));
    } else {
      setFormStudents([]);
    }
  };

  const handleToggleStudent = (studentId) => {
    setFormStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      formBatch,
      formStudents,
      activityType,
      eventTitle,
      fromDate,
      toDate,
      remarks,
    };
    const nextErrors = validateOnDutyForm(payload);
    setFormErrors({
      formBatch: nextErrors.formBatch || '',
      formStudents: nextErrors.formStudents || '',
      activityType: nextErrors.activityType || '',
      eventTitle: nextErrors.eventTitle || '',
      fromDate: nextErrors.fromDate || '',
      toDate: nextErrors.toDate || '',
    });

    if (Object.values(nextErrors).some(Boolean)) {
      return toast.error('Please complete the highlighted On-Duty fields.');
    }

    setSubmitting(true);
    try {
      const payload = {
        classBatch: formBatch || undefined,
        students: formStudents,
        activityType,
        eventTitle,
        fromDate,
        toDate,
        remarks,
      };

      const { data } = await api.post('/onduty', payload);
      toast.success(data.message || 'On-Duty granted successfully');
      setShowModal(false);
      resetForm();
      loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grant On-Duty');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormBatch('');
    setFormStudents([]);
    setIsWholeBatch(false);
    setActivityType('industrial_visit');
    setEventTitle('');
    setFromDate('');
    setToDate('');
    setRemarks('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this On-Duty grant? Linked attendance will be reverted.')) {
      return;
    }
    try {
      await api.delete(`/onduty/${id}`);
      toast.success('On-Duty grant revoked');
      loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete record');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-indigo-200/80 bg-gradient-to-r from-indigo-100 via-violet-100 to-white p-5 text-slate-900 shadow-[0_18px_36px_rgba(79,70,229,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600">Student exemptions</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">On-Duty & Multi-Day Visits</h1>
            <p className="mt-2 text-sm text-slate-600">
              Grant attendance credit for industrial visits, sports tournaments, hackathons, and cultural activities.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 self-start">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M11 5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5Z" fill="currentColor"/></svg>
            Grant On-Duty / Visit
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Filter by Batch:</span>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">All Class Batches</option>
              {classBatches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-slate-500">
            Total Grants: <span className="font-semibold text-slate-800">{records.length}</span>
          </div>
        </div>

        {loading ? (
          <p className="py-6 text-center text-slate-500">Loading records...</p>
        ) : (
          <Table
            columns={[
              {
                key: 'eventTitle',
                header: 'Event & Activity',
                render: (r) => (
                  <div>
                    <div className="font-semibold text-gray-800">{r.eventTitle}</div>
                    <Badge color={ACTIVITY_COLORS[r.activityType] || 'gray'}>
                      {ACTIVITY_LABELS[r.activityType] || r.activityType}
                    </Badge>
                  </div>
                ),
              },
              {
                key: 'dateSpan',
                header: 'Date Span',
                render: (r) => {
                  const days = differenceInCalendarDays(new Date(r.toDate), new Date(r.fromDate)) + 1;
                  return (
                    <div>
                      <div className="font-medium text-gray-800">
                        {format(new Date(r.fromDate), 'dd MMM yyyy')} – {format(new Date(r.toDate), 'dd MMM yyyy')}
                      </div>
                      <span className="text-xs text-brand-600 font-semibold bg-brand-50 px-2 py-0.5 rounded">
                        {days} {days === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  );
                },
              },
              {
                key: 'classBatch',
                header: 'Batch',
                render: (r) => r.classBatch?.name || 'Multiple Batches',
              },
              {
                key: 'students',
                header: 'Students',
                render: (r) => (
                  <button
                    onClick={() => setViewStudentsModal(r)}
                    className="text-brand-600 hover:text-brand-800 font-medium underline text-sm"
                  >
                    {r.students?.length || 0} student(s)
                  </button>
                ),
              },
              {
                key: 'approvedBy',
                header: 'Approved By',
                render: (r) => r.approvedBy?.name || 'Faculty / Admin',
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (r) => (
                  <button
                    onClick={() => handleDelete(r._id)}
                    className="text-red-600 hover:text-red-800 font-medium text-xs bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded transition"
                  >
                    Revoke
                  </button>
                ),
              },
            ]}
            data={records}
            emptyText="No On-Duty or Visit grants recorded yet."
          />
        )}
      </Card>

      {/* Grant On-Duty Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl my-8">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-gray-800">Grant Multi-Day On-Duty / Visit</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close modal"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="m7.05 7.05 9.9 9.9a1 1 0 0 1-1.41 1.41L5.64 8.46A1 1 0 0 1 7.05 7.05Zm9.9 0L7.05 16.95a1 1 0 0 0 1.41 1.41l9.9-9.9A1 1 0 0 0 16.95 7.05Z" fill="currentColor"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Class Batch</label>
                <select
                  value={formBatch}
                  onChange={(e) => {
                    setFormBatch(e.target.value);
                    if (formErrors.formBatch) setFormErrors((prev) => ({ ...prev, formBatch: '' }));
                  }}
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 ${formErrors.formBatch ? 'border-red-300' : 'border-gray-300'}`}
                >
                  <option value="">-- Choose Class Batch --</option>
                  {classBatches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {formErrors.formBatch && <p className="mt-1 text-xs text-red-500">{formErrors.formBatch}</p>}
              </div>

              {formBatch && batchStudents.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-800">Students to Include</label>
                    <label className="flex items-center gap-1.5 text-xs text-brand-700 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isWholeBatch}
                        onChange={(e) => handleToggleWholeBatch(e.target.checked)}
                        className="rounded text-brand-600"
                      />
                      Select Entire Batch ({batchStudents.length} students)
                    </label>
                  </div>

                  {!isWholeBatch && (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 border-t pt-2">
                      {batchStudents.map((s) => (
                        <label
                          key={s._id}
                          className="flex items-center gap-2 text-sm text-gray-700 bg-white p-1.5 rounded border border-gray-200 hover:bg-brand-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formStudents.includes(s._id)}
                            onChange={() => handleToggleStudent(s._id)}
                            className="rounded text-brand-600"
                          />
                          <span className="font-mono text-xs text-gray-500">{s.rollNo}</span>
                          <span>{s.name}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Selected: <span className="font-bold text-brand-700">{formStudents.length}</span> students
                  </p>
                  {formErrors.formStudents && <p className="mt-1 text-xs text-red-500">{formErrors.formStudents}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activity Category</label>
                  <select
                    value={activityType}
                    onChange={(e) => {
                      setActivityType(e.target.value);
                      if (formErrors.activityType) setFormErrors((prev) => ({ ...prev, activityType: '' }));
                    }}
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 ${formErrors.activityType ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event / Visit Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. National Hackathon / ISRO Visit"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      if (formErrors.fromDate) setFormErrors((prev) => ({ ...prev, fromDate: '' }));
                    }}
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 ${formErrors.fromDate ? 'border-red-300' : 'border-gray-300'}`}
                  />
                  {formErrors.fromDate && <p className="mt-1 text-xs text-red-500">{formErrors.fromDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date (Multi-Day)</label>
                  <input
                    type="date"
                    min={fromDate}
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      if (formErrors.toDate) setFormErrors((prev) => ({ ...prev, toDate: '' }));
                    }}
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 ${formErrors.toDate ? 'border-red-300' : 'border-gray-300'}`}
                  />
                  {formErrors.toDate && <p className="mt-1 text-xs text-red-500">{formErrors.toDate}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Reference (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved per Sports Dept Order #2026/04"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Applying OD...' : 'Confirm & Apply Attendance'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Students Modal */}
      {viewStudentsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <div>
                <h3 className="font-bold text-gray-800">{viewStudentsModal.eventTitle}</h3>
                <p className="text-xs text-gray-500">{viewStudentsModal.students?.length} enrolled students</p>
              </div>
              <button onClick={() => setViewStudentsModal(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close student list">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="m7.05 7.05 9.9 9.9a1 1 0 0 1-1.41 1.41L5.64 8.46A1 1 0 0 1 7.05 7.05Zm9.9 0L7.05 16.95a1 1 0 0 0 1.41 1.41l9.9-9.9A1 1 0 0 0 16.95 7.05Z" fill="currentColor"/></svg>
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-gray-100">
              {viewStudentsModal.students?.map((st) => (
                <div key={st._id} className="pt-2 flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-800">{st.name}</span>
                  <span className="text-xs text-gray-500 font-mono">{st.rollNo}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t text-right">
              <button
                onClick={() => setViewStudentsModal(null)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
