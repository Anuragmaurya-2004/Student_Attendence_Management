import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { Card, Button, Table, Badge, Select, TextInput } from '../../components/ui';
import toast from 'react-hot-toast';
import { format, differenceInCalendarDays } from 'date-fns';

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
    if (!formStudents.length) {
      return toast.error('Please select at least one student');
    }
    if (!fromDate || !toDate) {
      return toast.error('Please provide both From and To dates');
    }
    if (new Date(toDate) < new Date(fromDate)) {
      return toast.error('To Date cannot be earlier than From Date');
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
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">On-Duty & Multi-Day Visits</h1>
          <p className="text-gray-500 text-sm mt-1">
            Grant attendance credit for industrial visits, sports tournaments, hackathons, and cultural activities.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          ➕ Grant On-Duty / Visit
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter by Batch:</span>
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
          <div className="text-sm text-gray-500">
            Total Grants: <span className="font-semibold text-gray-800">{records.length}</span>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-6">Loading records...</p>
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
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Class Batch</label>
                <select
                  value={formBatch}
                  onChange={(e) => setFormBatch(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">-- Choose Class Batch --</option>
                  {classBatches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
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
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activity Category</label>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
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
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date (Multi-Day)</label>
                  <input
                    type="date"
                    required
                    min={fromDate}
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                  />
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
              <button onClick={() => setViewStudentsModal(null)} className="text-gray-400 hover:text-gray-600">
                ✕
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
