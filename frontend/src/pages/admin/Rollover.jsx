import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Select } from '../../components/ui';
import toast from 'react-hot-toast';
import { validateRolloverForm } from '../../validators';
import {
  RefreshCw,
  Plus,
  Trash2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function Rollover() {
  const [years, setYears] = useState([]);
  const [batches, setBatches] = useState([]);
  const [toYear, setToYear] = useState('');
  const [mappings, setMappings] = useState([{ fromClassBatch: '', toClassBatch: '' }]);
  const [graduating, setGraduating] = useState([]);
  const [summary, setSummary] = useState(null);
  const [errors, setErrors] = useState({ toYear: '', mappings: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [y, b] = await Promise.all([
        api.get('/academic/academic-years'),
        api.get('/academic/class-batches'),
      ]);
      setYears(y.data);
      setBatches(b.data);
    } catch (e) {
      console.error('Failed to load rollover metadata', e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addMappingRow = () => setMappings([...mappings, { fromClassBatch: '', toClassBatch: '' }]);
  const updateMapping = (idx, field, value) => {
    const copy = [...mappings];
    copy[idx][field] = value;
    setMappings(copy);
  };
  const removeMapping = (idx) => setMappings(mappings.filter((_, i) => i !== idx));

  const toggleGraduating = (id) => {
    setGraduating((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e) => {
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

    const validMappings = mappings.filter((m) => m.fromClassBatch && m.toClassBatch);
    setSubmitting(true);
    try {
      const { data } = await api.post('/rollover/promote', {
        toAcademicYear: toYear,
        mappings: validMappings,
        graduatingClassBatches: graduating,
      });
      setSummary(data.summary);
      toast.success('Academic rollover executed successfully!');
      window.dispatchEvent(new Event('refresh-notifications'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rollover process failed');
    } finally {
      setSubmitting(false);
    }
  };

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
              Promote student cohorts into their next academic year batches while preserving full historical attendance logs.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span>Non-Destructive Rollover</span>
          </div>
        </div>
      </div>

      <Card
        title="Promote Cohorts to Target Academic Year"
        subtitle="Specify batch promotion mappings and mark senior graduating divisions"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Target (New) Academic Year
            </label>
            <Select
              value={toYear}
              onChange={(e) => {
                setToYear(e.target.value);
                if (errors.toYear) setErrors((prev) => ({ ...prev, toYear: '' }));
              }}
              error={errors.toYear}
              className="max-w-md"
            >
              <option value="">Select target academic year</option>
              {years.map((y) => (
                <option key={y._id} value={y._id}>{y.label}</option>
              ))}
            </Select>
            {errors.toYear && <p className="mt-1.5 text-xs text-rose-500">{errors.toYear}</p>}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Class Batch Mappings (Source → Destination)
              </label>
              <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addMappingRow}>
                Add Mapping Row
              </Button>
            </div>

            <div className="space-y-2.5">
              {mappings.map((m, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex-1">
                    <Select
                      value={m.fromClassBatch}
                      onChange={(e) => updateMapping(idx, 'fromClassBatch', e.target.value)}
                    >
                      <option value="">Current class batch</option>
                      {batches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name} ({b.academicYear?.label})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="hidden sm:flex items-center justify-center text-slate-400">
                    <ArrowRight className="h-4 w-4" />
                  </div>

                  <div className="flex-1">
                    <Select
                      value={m.toClassBatch}
                      onChange={(e) => updateMapping(idx, 'toClassBatch', e.target.value)}
                    >
                      <option value="">Promoted class batch</option>
                      {batches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name} ({b.academicYear?.label})
                        </option>
                      ))}
                    </Select>
                  </div>

                  {mappings.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => removeMapping(idx)}
                      className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-950/40"
                      aria-label="Remove mapping"
                    />
                  )}
                </div>
              ))}
            </div>
            {errors.mappings && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-500">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errors.mappings}</span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Graduating Cohorts (Students marked "Passed Out" instead of promoted)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {batches.map((b) => (
                <label
                  key={b._id}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-700 shadow-sm cursor-pointer hover:bg-brand-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={graduating.includes(b._id)}
                    onChange={() => toggleGraduating(b._id)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>{b.name} <span className="text-slate-400">({b.academicYear?.label})</span></span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button
              type="submit"
              icon={RefreshCw}
              loading={submitting}
              className="py-3 px-6 shadow-md"
            >
              Execute Year Rollover
            </Button>
          </div>
        </form>

        {summary && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/40 text-sm">
            <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Rollover Completed Successfully
            </p>
            <div className="flex gap-4 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
              <span>Promoted Students: {summary.promoted}</span>
              <span>•</span>
              <span>Graduated Seniors: {summary.graduated}</span>
            </div>
            <ul className="space-y-1 list-disc list-inside text-xs text-slate-600 dark:text-slate-400">
              {summary.details?.map((d, i) => (
                <li key={i}>
                  {d.count} students transitioned into new cohort
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
