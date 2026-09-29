import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Table, Badge, Button } from '../../components/ui';
import toast from 'react-hot-toast';
import { RefreshCw, ShieldAlert } from 'lucide-react';

export default function FacultyDefaulters() {
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports/defaulters');
      setDefaulters(data);
    } catch (e) {
      toast.error('Failed to load defaulter data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const criticalCount = defaulters.filter((d) => d.attendancePercent < 50).length;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-300" /> Threshold Monitoring
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Defaulter Watchlist
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Review enrolled students falling short of their mandated class attendance percentage.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
            <span>Attendance Threshold Watch</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Total Below Quota</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{defaulters.length}</p>
            <p className="text-xs text-indigo-200">Needs improvement</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Critical (&lt;50%)</p>
            <p className="mt-1 text-2xl font-extrabold text-rose-300">{criticalCount}</p>
            <p className="text-xs text-indigo-200">High risk cases</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Threshold Base</p>
            <p className="mt-1 text-2xl font-extrabold text-white">75%</p>
            <p className="text-xs text-indigo-200">Standard institutional quota</p>
          </div>
        </div>
      </div>

      <Card
        title={`Course Attendance Defaulters (${defaulters.length})`}
        subtitle="Students requiring academic counseling or attendance intervention"
        actions={
          <Button variant="ghost" size="sm" icon={RefreshCw} loading={loading} onClick={load}>
            Refresh
          </Button>
        }
      >
        <Table
          columns={[
            { key: 'rollNo', header: 'Roll No' },
            { key: 'studentName', header: 'Student Name' },
            { key: 'courseName', header: 'Course Subject' },
            {
              key: 'type',
              header: 'Course Type',
              render: (r) => (
                <Badge color={r.type === 'practical' ? 'blue' : r.type === 'project' ? 'purple' : 'gray'} dot>
                  {r.type}
                </Badge>
              ),
            },
            {
              key: 'attendancePercent',
              header: 'Recorded Attendance',
              render: (r) => (
                <Badge color={r.attendancePercent < 50 ? 'red' : 'yellow'} dot>
                  {r.attendancePercent}%
                </Badge>
              ),
            },
            {
              key: 'threshold',
              header: 'Required Target',
              render: (r) => `${r.threshold || 75}%`,
            },
          ]}
          data={defaulters}
          emptyText="No students currently on the defaulter watchlist."
        />
      </Card>
    </div>
  );
}
