import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Table, Badge } from '../../components/ui';

export default function FacultyDefaulters() {
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await api.get('/reports/defaulters');
      setDefaulters(data);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-brand-100 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-5 text-white shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-100">Faculty view</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Defaulter Watch</h1>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-brand-50 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            Attendance threshold alerts
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">Total alerts</p>
            <p className="mt-2 text-2xl font-bold">{defaulters.length}</p>
            <p className="text-sm text-brand-50/80">current below-threshold cases</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">Risk level</p>
            <p className="mt-2 text-2xl font-bold">{defaulters.filter((d) => d.attendancePercent < 50).length}</p>
            <p className="text-sm text-brand-50/80">critical cases</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">Required</p>
            <p className="mt-2 text-2xl font-bold">75%</p>
            <p className="text-sm text-brand-50/80">minimum attendance</p>
          </div>
        </div>
      </div>

      <Card title={`Below Threshold: ${defaulters.length}`}>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <Table
            columns={[
              { key: 'rollNo', header: 'Roll No' },
              { key: 'studentName', header: 'Student' },
              { key: 'courseName', header: 'Course' },
              { key: 'type', header: 'Type', render: (r) => <Badge color={r.type === 'practical' ? 'blue' : 'gray'}>{r.type}</Badge> },
              { key: 'attendancePercent', header: 'Attendance %', render: (r) => <Badge color="red">{r.attendancePercent}%</Badge> },
              { key: 'threshold', header: 'Required %' },
            ]}
            data={defaulters}
            emptyText="No defaulters currently"
          />
        )}
      </Card>
    </div>
  );
}
