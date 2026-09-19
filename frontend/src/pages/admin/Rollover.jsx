import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Select } from '../../components/ui';
import toast from 'react-hot-toast';
import { validateRolloverForm } from '../../validators';

export default function Rollover() {
  const [years, setYears] = useState([]);
  const [batches, setBatches] = useState([]);
  const [toYear, setToYear] = useState('');
  const [mappings, setMappings] = useState([{ fromClassBatch: '', toClassBatch: '' }]);
  const [graduating, setGraduating] = useState([]);
  const [summary, setSummary] = useState(null);
  const [errors, setErrors] = useState({ toYear: '', mappings: '' });

  const load = async () => {
    const [y, b] = await Promise.all([api.get('/academic/academic-years'), api.get('/academic/class-batches')]);
    setYears(y.data);
    setBatches(b.data);
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
    try {
      const { data } = await api.post('/rollover/promote', {
        toAcademicYear: toYear,
        mappings: validMappings,
        graduatingClassBatches: graduating,
      });
      setSummary(data.summary);
      toast.success('Rollover completed!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rollover failed');
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Academic Year Rollover</h1>
      <Card title="Promote Students to New Academic Year">
        <p className="text-sm text-gray-500 mb-4">
          Moves active students from their current class batch into a new class batch under the target academic year.
          Their attendance history and past records are preserved (never deleted) and remain viewable under the old year.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target (New) Academic Year</label>
            <Select
              value={toYear}
              onChange={(e) => {
                setToYear(e.target.value);
                if (errors.toYear) setErrors((prev) => ({ ...prev, toYear: '' }));
              }}
              error={errors.toYear}
            >
              <option value="">Select academic year</option>
              {years.map((y) => (
                <option key={y._id} value={y._id}>{y.label}</option>
              ))}
            </Select>
            {errors.toYear && <p className="mt-1 text-xs text-red-500">{errors.toYear}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class Batch Mappings (From → To)</label>
            {mappings.map((m, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-2 mb-2 items-center">
                <div className="col-span-2">
                  <Select value={m.fromClassBatch} onChange={(e) => updateMapping(idx, 'fromClassBatch', e.target.value)}>
                    <option value="">From class batch</option>
                    {batches.map((b) => (
                      <option key={b._id} value={b._id}>{b.name} ({b.academicYear?.label})</option>
                    ))}
                  </Select>
                </div>
                <div className="text-center text-gray-400">→</div>
                <div className="col-span-2 flex gap-2">
                  <Select value={m.toClassBatch} onChange={(e) => updateMapping(idx, 'toClassBatch', e.target.value)}>
                    <option value="">To class batch</option>
                    {batches.map((b) => (
                      <option key={b._id} value={b._id}>{b.name} ({b.academicYear?.label})</option>
                    ))}
                  </Select>
                  <Button type="button" variant="danger" className="!py-1 !px-2 text-xs" onClick={() => removeMapping(idx)} aria-label="Remove mapping">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5"><path d="m7.05 7.05 9.9 9.9a1 1 0 0 1-1.41 1.41L5.64 8.46A1 1 0 0 1 7.05 7.05Zm9.9 0L7.05 16.95a1 1 0 0 0 1.41 1.41l9.9-9.9A1 1 0 0 0 16.95 7.05Z" fill="currentColor"/></svg>
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addMappingRow}>+ Add Mapping</Button>
            {errors.mappings && <p className="mt-1 text-xs text-red-500">{errors.mappings}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Graduating Batches (students become "passed out", not promoted)
            </label>
            <div className="flex flex-wrap gap-3">
              {batches.map((b) => (
                <label key={b._id} className="flex items-center gap-1.5 text-sm bg-gray-50 px-2 py-1 rounded border">
                  <input type="checkbox" checked={graduating.includes(b._id)} onChange={() => toggleGraduating(b._id)} />
                  {b.name} ({b.academicYear?.label})
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="inline-flex items-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M12 3.5a7.5 7.5 0 0 1 7.08 11.18l1.66 1.66a1 1 0 0 1-1.42 1.41l-1.66-1.66A7.5 7.5 0 1 1 12 3.5Zm0 2a5.5 5.5 0 1 0 4.97 8.38 1 1 0 0 1 .12-1.3 5.5 5.5 0 0 0-5.09-7.08Zm.5 2.25v3.28l2.61 1.6a1 1 0 1 1-1.1 1.7l-3.16-1.95a1 1 0 0 1-.46-.8V7.75a1 1 0 1 1 2 0Z" fill="currentColor"/></svg>
            Run Rollover
          </Button>
        </form>

        {summary && (
          <div className="mt-5 bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-green-800 mb-2">Rollover Summary</p>
            <p>Promoted: {summary.promoted} students</p>
            <p>Graduated: {summary.graduated} students</p>
            <ul className="mt-2 list-disc list-inside text-gray-600">
              {summary.details.map((d, i) => (
                <li key={i}>{d.count} students moved from batch {d.fromClassBatch} → {d.toClassBatch}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
