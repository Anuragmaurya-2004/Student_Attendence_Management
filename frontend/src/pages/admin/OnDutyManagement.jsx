import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { Card, Button, Table, Badge, Select, TextInput, Input } from '../../components/ui';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { format, differenceInCalendarDays } from 'date-fns';
import { validateOnDutyForm } from '../../validators';
import {
  Award,
  Plus,
  Trash2,
  Users,
  Filter,
} from 'lucide-react';

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
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
      const requestData = {
        classBatch: formBatch || undefined,
        students: formStudents,
        activityType,
        eventTitle,
        fromDate,
        toDate,
        remarks,
      };

      const { data } = await api.post('/onduty', requestData);
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
    setFormErrors({
      formBatch: '',
      formStudents: '',
      activityType: '',
      eventTitle: '',
      fromDate: '',
      toDate: '',
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await api.delete(`/onduty/${deleteConfirmId}`);
      toast.success('On-Duty exemption revoked');
      setDeleteConfirmId(null);
      loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke record');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <Award className="h-3.5 w-3.5" /> Attendance Exemptions
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              On-Duty & Multi-Day Visits
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Grant approved attendance exemptions for industrial visits, hackathons, and sports events.
            </p>
          </div>
          <Button
            onClick={() => setShowModal(true)}
            icon={Plus}
            className="self-start shadow-md"
          >
            Grant On-Duty / Visit
          </Button>
        </div>
      </div>

      {/* Main Records Card */}
      <Card
        title="Recorded Exemptions"
        subtitle="Active and completed On-Duty grants"
        actions={
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="!py-1.5 !text-xs min-w-[180px]"
            >
              <option value="">All Class Cohorts</option>
              {classBatches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </Select>
          </div>
        }
      >
        <Table
          columns={[
            {
              key: 'eventTitle',
              header: 'Event & Activity',
              render: (r) => (
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{r.eventTitle}</p>
                  <div className="mt-1">
                    <Badge color={ACTIVITY_COLORS[r.activityType] || 'gray'} dot>
                      {ACTIVITY_LABELS[r.activityType] || r.activityType}
                    </Badge>
                  </div>
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
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {format(new Date(r.fromDate), 'dd MMM yyyy')} – {format(new Date(r.toDate), 'dd MMM yyyy')}
                    </p>
                    <span className="inline-block mt-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
                      {days} {days === 1 ? 'day' : 'days'} duration
                    </span>
                  </div>
                );
              },
            },
            {
              key: 'classBatch',
              header: 'Cohort',
              render: (r) => r.classBatch?.name || 'Multi-Cohort',
            },
            {
              key: 'students',
              header: 'Beneficiaries',
              render: (r) => (
                <button
                  type="button"
                  onClick={() => setViewStudentsModal(r)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>{r.students?.length || 0} student(s)</span>
                </button>
              ),
            },
            {
              key: 'approvedBy',
              header: 'Granted By',
              render: (r) => r.approvedBy?.name || 'Faculty / Admin',
            },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  onClick={() => setDeleteConfirmId(r._id)}
                  className="!text-rose-600 hover:!bg-rose-50 dark:hover:!bg-rose-950/40"
                  aria-label="Revoke On-Duty"
                >
                  Revoke
                </Button>
              ),
            },
          ]}
          data={records}
          emptyText={loading ? 'Loading On-Duty records...' : 'No On-Duty or official visit grants recorded yet.'}
        />
      </Card>

      {/* Grant On-Duty Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Grant Multi-Day On-Duty / Visit"
        subtitle="Exempt students from class attendance during official events"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Select Class Batch
            </label>
            <Select
              value={formBatch}
              onChange={(e) => {
                setFormBatch(e.target.value);
                if (formErrors.formBatch) setFormErrors((prev) => ({ ...prev, formBatch: '' }));
              }}
              error={formErrors.formBatch}
            >
              <option value="">-- Choose Class Batch --</option>
              {classBatches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </Select>
            {formErrors.formBatch && <p className="mt-1 text-xs text-rose-500">{formErrors.formBatch}</p>}
          </div>

          {formBatch && batchStudents.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Participating Students
                </span>
                <label className="flex items-center gap-1.5 text-xs text-brand-600 font-semibold cursor-pointer select-none dark:text-brand-400">
                  <input
                    type="checkbox"
                    checked={isWholeBatch}
                    onChange={(e) => handleToggleWholeBatch(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Select Entire Cohort ({batchStudents.length})
                </label>
              </div>

              {!isWholeBatch && (
                <div className="max-h-40 overflow-y-auto space-y-1.5 border-t border-slate-200 pt-2 dark:border-slate-700">
                  {batchStudents.map((s) => (
                    <label
                      key={s._id}
                      className="flex items-center gap-2.5 text-sm p-2 rounded-xl bg-white border border-slate-200 hover:bg-brand-50/50 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700/60"
                    >
                      <input
                        type="checkbox"
                        checked={formStudents.includes(s._id)}
                        onChange={() => handleToggleStudent(s._id)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">{s.rollNo}</span>
                      <span className="text-slate-800 dark:text-slate-200">{s.name}</span>
                    </label>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Selected: <span className="font-bold text-brand-600 dark:text-brand-400">{formStudents.length}</span> students
              </p>
              {formErrors.formStudents && <p className="mt-1 text-xs text-rose-500">{formErrors.formStudents}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Activity Category
              </label>
              <Select
                value={activityType}
                onChange={(e) => {
                  setActivityType(e.target.value);
                  if (formErrors.activityType) setFormErrors((prev) => ({ ...prev, activityType: '' }));
                }}
                error={formErrors.activityType}
              >
                {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </div>

            <TextInput
              label="Event / Visit Title"
              required
              placeholder="e.g. National Hackathon / ISRO Visit"
              value={eventTitle}
              error={formErrors.eventTitle}
              onChange={(e) => {
                setEventTitle(e.target.value);
                if (formErrors.eventTitle) setFormErrors((prev) => ({ ...prev, eventTitle: '' }));
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                From Date
              </label>
              <Input
                type="date"
                value={fromDate}
                error={formErrors.fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (formErrors.fromDate) setFormErrors((prev) => ({ ...prev, fromDate: '' }));
                }}
              />
              {formErrors.fromDate && <p className="mt-1 text-xs text-rose-500">{formErrors.fromDate}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                To Date (Multi-Day)
              </label>
              <Input
                type="date"
                min={fromDate}
                value={toDate}
                error={formErrors.toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  if (formErrors.toDate) setFormErrors((prev) => ({ ...prev, toDate: '' }));
                }}
              />
              {formErrors.toDate && <p className="mt-1 text-xs text-rose-500">{formErrors.toDate}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Remarks / Approval Reference (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Approved per Sports Dept Order #2026/04"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Confirm & Grant Exemption
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Enrolled Students Modal */}
      <Modal
        isOpen={Boolean(viewStudentsModal)}
        onClose={() => setViewStudentsModal(null)}
        title={viewStudentsModal?.eventTitle || 'Exempted Students'}
        subtitle={`${viewStudentsModal?.students?.length || 0} students granted attendance exemption`}
        maxWidth="max-w-md"
      >
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {viewStudentsModal?.students?.map((st) => (
            <div key={st._id} className="py-2.5 flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{st.name}</span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{st.rollNo}</span>
            </div>
          ))}
        </div>
      </Modal>

      {/* Revoke Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        title="Revoke On-Duty Grant?"
        subtitle="This action cannot be undone"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to revoke this On-Duty grant? Any attendance records credited for this event will be reverted to unmarked/absent.
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Yes, Revoke Exemption
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
