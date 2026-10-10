import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Select, Badge } from '../../components/ui';
import toast from 'react-hot-toast';
import { validateRolloverForm } from '../../validators';
import {
  RefreshCw,
  Plus,
  Trash2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  GraduationCap,
  ShieldCheck,
  X,
  UserCheck,
  UserX,
  AlertTriangle,
} from 'lucide-react';

export default function Rollover() {
  const [years, setYears] = useState([]);
  const [batches, setBatches] = useState([]);
  const [currentActiveYear, setCurrentActiveYear] = useState(null);
  const [toYear, setToYear] = useState('');
  const [mappings, setMappings] = useState([{ fromClassBatch: '', toClassBatch: '', excludedStudentIds: [] }]);
  const [graduating, setGraduating] = useState([]);
  const [summary, setSummary] = useState(null);
  const [errors, setErrors] = useState({ toYear: '', mappings: '' });
  const [submitting, setSubmitting] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(true);

  // Student exclusion drawer/modal state
  const [inspectingBatch, setInspectingBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const loadPreview = async (targetYearId = '') => {
    setLoadingPreview(true);
    try {
      const { data } = await api.get('/rollover/preview', {
        params: { targetYearId: targetYearId || undefined },
      });
      setYears(data.allYears || []);
      setCurrentActiveYear(data.currentYear);
      setBatches(data.batches || []);
    } catch (e) {
      console.error('Failed to load rollover preview', e);
      toast.error('Failed to load academic cohorts');
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, []);

  useEffect(() => {
    if (toYear) {
      loadPreview(toYear);
    }
  }, [toYear]);

  // One-click Auto-Suggestion
  const handleAutoSuggest = () => {
    if (!toYear) {
      setErrors((prev) => ({ ...prev, toYear: 'Select a target academic year first to auto-suggest mappings.' }));
      return toast.error('Please choose a target academic year first');
    }

    const suggestedMappings = [];
    const suggestedGraduating = [];

    batches.forEach((b) => {
      if (b.isGraduating || b.semester >= 8) {
        suggestedGraduating.push(b._id);
      } else if (b.suggestedTarget) {
        suggestedMappings.push({
          fromClassBatch: b._id,
          toClassBatch: b.suggestedTarget._id,
          excludedStudentIds: [],
        });
      }
    });

    if (suggestedMappings.length === 0 && suggestedGraduating.length === 0) {
      toast.error('No automatic pairings found for the target year. Please map manually.');
      return;
    }

    setMappings(suggestedMappings.length > 0 ? suggestedMappings : [{ fromClassBatch: '', toClassBatch: '', excludedStudentIds: [] }]);
    setGraduating(suggestedGraduating);
    setErrors({ toYear: '', mappings: '' });
    toast.success(`Auto-suggested ${suggestedMappings.length} promotion mapping(s) and ${suggestedGraduating.length} graduating cohort(s)!`);
  };

  const addMappingRow = () =>
    setMappings([...mappings, { fromClassBatch: '', toClassBatch: '', excludedStudentIds: [] }]);

  const updateMapping = (idx, field, value) => {
    const copy = [...mappings];
    copy[idx][field] = value;
    setMappings(copy);
  };

  const removeMapping = (idx) => setMappings(mappings.filter((_, i) => i !== idx));

  const toggleGraduating = (id) => {
    setGraduating((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Inspect students in a mapping to exclude/retain individuals
  const openStudentInspection = async (mappingIndex) => {
    const mapping = mappings[mappingIndex];
    if (!mapping.fromClassBatch) return;
    const fromBatchObj = batches.find((b) => b._id === mapping.fromClassBatch);
    setInspectingBatch({ index: mappingIndex, batch: fromBatchObj, mapping });
    setLoadingStudents(true);
    try {
      const { data } = await api.get(`/rollover/batch-students/${mapping.fromClassBatch}`);
      setBatchStudents(data || []);
    } catch (err) {
      toast.error('Failed to load students in cohort');
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStudentExclusion = (studentId) => {
    if (!inspectingBatch) return;
    const idx = inspectingBatch.index;
    const currentExcluded = inspectingBatch.mapping.excludedStudentIds || [];
    const nextExcluded = currentExcluded.includes(studentId)
      ? currentExcluded.filter((id) => id !== studentId)
      : [...currentExcluded, studentId];

    updateMapping(idx, 'excludedStudentIds', nextExcluded);
    setInspectingBatch((prev) => ({
      ...prev,
      mapping: { ...prev.mapping, excludedStudentIds: nextExcluded },
    }));
  };

  // Pre-calculate live totals
  const totalPromotingStudents = mappings.reduce((sum, m) => {
    if (!m.fromClassBatch || !m.toClassBatch) return sum;
    const b = batches.find((x) => x._id === m.fromClassBatch);
    const count = b?.activeStudentCount || 0;
    const excluded = (m.excludedStudentIds || []).length;
    return sum + Math.max(0, count - excluded);
  }, 0);

  const totalRetainedStudents = mappings.reduce((sum, m) => {
    return sum + (m.excludedStudentIds || []).length;
  }, 0);

  const totalGraduatingStudents = graduating.reduce((sum, id) => {
    const b = batches.find((x) => x._id === id);
    return sum + (b?.activeStudentCount || 0);
  }, 0);

  const handleExecutePrompt = (e) => {
    e.preventDefault();
    const nextErrors = validateRolloverForm({
      toYear,
      mappings,
      graduating,
    });
    setErrors({
      toYear: nextErrors.toYear || '',
      mappings: nextErrors.mappings || '',
    });

    if (Object.values(nextErrors).some(Boolean)) {
      return toast.error('Please fix the highlighted rollover fields.');
    }

    setConfirmModalOpen(true);
  };

  const executeRollover = async () => {
    const validMappings = mappings.filter((m) => m.fromClassBatch && m.toClassBatch);
    setSubmitting(true);
    try {
      const { data } = await api.post('/rollover/promote', {
        toAcademicYear: toYear,
        mappings: validMappings,
        graduatingClassBatches: graduating,
      });
      setSummary(data.summary);
      setConfirmModalOpen(false);
      toast.success('Academic rollover executed smoothly!');
      window.dispatchEvent(new Event('refresh-notifications'));
      loadPreview(toYear);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rollover process failed');
    } finally {
      setSubmitting(false);
    }
  };

  const targetYearLabel = years.find((y) => y._id === toYear)?.label || 'Target Year';

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <RefreshCw className="h-3.5 w-3.5" /> Lifecycle Automation
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Academic Year Rollover
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Seamlessly promote student cohorts into their next academic year batches while preserving full historical attendance logs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentActiveYear && (
              <div className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs backdrop-blur-md">
                Active Year: <span className="font-extrabold text-emerald-300">{currentActiveYear.label}</span>
              </div>
            )}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs backdrop-blur-md">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>Non-Destructive Rollover</span>
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Students to Promote</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{totalPromotingStudents}</p>
            <p className="text-xs text-indigo-200">Across mapped cohorts</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Graduating Seniors</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-300">{totalGraduatingStudents}</p>
            <p className="text-xs text-indigo-200">Transitioning to "Passed Out"</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Retained / Repeaters</p>
            <p className="mt-1 text-2xl font-extrabold text-rose-300">{totalRetainedStudents}</p>
            <p className="text-xs text-indigo-200">Staying in current batch</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Target Year</p>
            <p className="mt-1 text-xl font-bold text-white truncate">{toYear ? targetYearLabel : 'Not Selected'}</p>
            <p className="text-xs text-indigo-200 truncate">Will become active year</p>
          </div>
        </div>
      </div>

      <Card
        title="Promote Cohorts to Target Academic Year"
        subtitle="Configure transition mappings or auto-suggest with smart cohort detection"
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={Sparkles}
            onClick={handleAutoSuggest}
            className="!border-indigo-200 !text-indigo-600 hover:!bg-indigo-50 dark:!border-indigo-800 dark:!text-indigo-400"
          >
            Auto-Suggest Mappings
          </Button>
        }
      >
        <form onSubmit={handleExecutePrompt} className="space-y-6">
          {/* Target Academic Year */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Target (New) Academic Year <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Select
                value={toYear}
                onChange={(e) => {
                  setToYear(e.target.value);
                  if (errors.toYear) setErrors((prev) => ({ ...prev, toYear: '' }));
                }}
                error={errors.toYear}
                className="w-full sm:max-w-md"
              >
                <option value="">Select target academic year</option>
                {years.map((y) => (
                  <option key={y._id} value={y._id}>
                    {y.label} {y.isActive ? '(Currently Active)' : ''}
                  </option>
                ))}
              </Select>
              {toYear && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Target cohort: <strong className="text-indigo-600 dark:text-indigo-400">{targetYearLabel}</strong>
                </span>
              )}
            </div>
            {errors.toYear && <p className="mt-1.5 text-xs text-rose-500">{errors.toYear}</p>}
          </div>

          {/* Mappings section */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Class Batch Mappings (Source Cohort → Promoted Destination)
                </label>
                <p className="text-[11px] text-slate-500">
                  Students in the current cohort will be assigned to the promoted batch while preserving past attendance.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addMappingRow}>
                Add Mapping Row
              </Button>
            </div>

            <div className="space-y-2.5">
              {mappings.map((m, idx) => {
                const fromBatchObj = batches.find((b) => b._id === m.fromClassBatch);
                const toBatchObj = batches.find((b) => b._id === m.toClassBatch);
                const excludedCount = (m.excludedStudentIds || []).length;
                const activeCount = fromBatchObj?.activeStudentCount || 0;
                const willPromoteCount = Math.max(0, activeCount - excludedCount);

                return (
                  <div
                    key={idx}
                    className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40 transition hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    {/* Source Batch Select */}
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 lg:hidden">
                        Current Class Cohort
                      </label>
                      <Select
                        value={m.fromClassBatch}
                        onChange={(e) => updateMapping(idx, 'fromClassBatch', e.target.value)}
                      >
                        <option value="">Select current cohort</option>
                        {batches.map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.name} (Sem {b.semester}) — {b.activeStudentCount} student{b.activeStudentCount === 1 ? '' : 's'}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="hidden lg:flex items-center justify-center text-slate-400">
                      <ArrowRight className="h-4 w-4" />
                    </div>

                    {/* Target Batch Select */}
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 lg:hidden">
                        Destination Promoted Cohort
                      </label>
                      <Select
                        value={m.toClassBatch}
                        onChange={(e) => updateMapping(idx, 'toClassBatch', e.target.value)}
                      >
                        <option value="">Select promoted cohort</option>
                        {batches.map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.name} (Sem {b.semester}) ({b.academicYear?.label || 'Batch'})
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Batch Stat & Exclude Button */}
                    {m.fromClassBatch && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          <Users className="h-3 w-3" />
                          <span>{willPromoteCount} to promote</span>
                          {excludedCount > 0 && (
                            <span className="text-rose-600 font-bold">({excludedCount} retained)</span>
                          )}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openStudentInspection(idx)}
                          className="!text-xs text-slate-600 dark:text-slate-400"
                        >
                          Exclude Students
                        </Button>
                      </div>
                    )}

                    {mappings.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => removeMapping(idx)}
                        className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-950/40 shrink-0"
                        aria-label="Remove mapping"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {errors.mappings && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-500">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errors.mappings}</span>
              </p>
            )}
          </div>

          {/* Graduating Cohorts Checkboxes */}
          <div>
            <div className="mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Graduating Senior Cohorts
              </label>
              <p className="text-[11px] text-slate-500">
                Students in these cohorts will be marked as "Passed Out" instead of promoted. Their complete academic record is preserved.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {batches.map((b) => {
                const isSelected = graduating.includes(b._id);
                return (
                  <label
                    key={b._id}
                    className={`flex items-center justify-between gap-2.5 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50/70 text-indigo-950 dark:border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleGraduating(b._id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span>{b.name}</span>
                        <span className="block text-[10px] text-slate-400">
                          Sem {b.semester} • {b.department?.code || ''}
                        </span>
                      </div>
                    </div>
                    <Badge color={b.activeStudentCount > 0 ? (isSelected ? 'purple' : 'gray') : 'gray'}>
                      {b.activeStudentCount} student{b.activeStudentCount === 1 ? '' : 's'}
                    </Badge>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div className="border-t border-slate-100 pt-5 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Ready to promote <strong className="text-slate-700 dark:text-slate-200">{totalPromotingStudents}</strong> students to {toYear ? targetYearLabel : 'the new academic year'}.
            </p>
            <Button
              type="submit"
              icon={RefreshCw}
              loading={submitting}
              className="py-3 px-6 shadow-md"
            >
              Review & Execute Rollover
            </Button>
          </div>
        </form>

        {/* Success Summary Receipt */}
        {summary && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/40 text-sm animate-in fade-in duration-200">
            <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Academic Rollover Executed Successfully
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
              <span>Promoted Students: {summary.promoted}</span>
              <span>•</span>
              <span>Graduated Seniors: {summary.graduated}</span>
              {summary.retained > 0 && (
                <>
                  <span>•</span>
                  <span>Retained / Repeaters: {summary.retained}</span>
                </>
              )}
            </div>

            {summary.details && summary.details.length > 0 && (
              <div className="mt-3 divide-y divide-emerald-200/60 dark:divide-emerald-900/60 border border-emerald-200/60 rounded-xl bg-white/60 dark:bg-slate-900/60 overflow-hidden">
                {summary.details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between px-3.5 py-2 text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {d.fromClassName} <ArrowRight className="inline h-3 w-3 mx-1 text-slate-400" /> {d.toClassName}
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {d.promotedCount} promoted {d.retainedCount > 0 ? `(${d.retainedCount} retained)` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Confirm Academic Year Transition
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  You are about to execute the official institutional rollover to <strong>{targetYearLabel}</strong>.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              <div className="flex justify-between font-semibold">
                <span>Students Transitioning:</span>
                <span className="text-indigo-600 font-extrabold dark:text-indigo-400">{totalPromotingStudents}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Seniors Graduating:</span>
                <span className="text-amber-600 font-extrabold dark:text-amber-400">{totalGraduatingStudents}</span>
              </div>
              {totalRetainedStudents > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>Students Retained in Current Cohort:</span>
                  <span className="text-rose-600 font-extrabold">{totalRetainedStudents}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-slate-200/60 pt-2 dark:border-slate-700">
                <span>Active Year Change:</span>
                <span className="text-emerald-600 font-extrabold dark:text-emerald-400">{targetYearLabel} becomes Active</span>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-400">
              Note: All historical sessions, QR attendance records, and past defaulter logs are preserved and queryable at any time.
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="ghost"
                onClick={() => setConfirmModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={RefreshCw}
                loading={submitting}
                onClick={executeRollover}
              >
                Yes, Execute Rollover
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Student Exclusion / Retention Modal */}
      {inspectingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Cohort Roster Review
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {inspectingBatch.batch?.name} (Sem {inspectingBatch.batch?.semester})
                </h3>
                <p className="text-xs text-slate-500">
                  Uncheck students who should be retained in this cohort (e.g. academic backlogs, repeaters).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingBatch(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto">
              {loadingStudents ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading cohort roster...</div>
              ) : batchStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No active students in this cohort.</div>
              ) : (
                <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                  {batchStudents.map((st) => {
                    const isExcluded = (inspectingBatch.mapping.excludedStudentIds || []).includes(st._id);
                    return (
                      <div
                        key={st._id}
                        onClick={() => toggleStudentExclusion(st._id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                          isExcluded
                            ? 'bg-rose-50/70 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {st.name} <span className="font-mono text-slate-400">({st.rollNo})</span>
                            </p>
                            <p className="text-[10px] text-slate-400">{st.email}</p>
                          </div>
                        </div>
                        <Badge color={isExcluded ? 'red' : 'green'}>
                          {isExcluded ? 'Retained / Excluded' : 'Will Promote'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 flex justify-end">
              <Button size="sm" onClick={() => setInspectingBatch(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
