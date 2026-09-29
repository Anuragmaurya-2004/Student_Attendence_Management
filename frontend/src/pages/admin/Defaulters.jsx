import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Table, Badge } from '../../components/ui';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Bell,
  RefreshCw,
} from 'lucide-react';

export default function Defaulters() {
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports/defaulters');
      setDefaulters(data);
    } catch (e) {
      toast.error('Failed to load defaulters list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runNotifications = async () => {
    setNotifying(true);
    try {
      await api.post('/reports/run-notifications');
      toast.success('Defaulter check triggered and parent notifications queued');
    } catch (e) {
      toast.error('Failed to trigger notification dispatch');
    } finally {
      setNotifying(false);
    }
  };

  const exportFile = async (type) => {
    setExporting(true);
    try {
      const res = await api.get(`/export/defaulters/${type}`, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `defaulters_report_${new Date().toISOString().slice(0, 10)}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Exported ${type.toUpperCase()} report successfully`);
    } catch (err) {
      toast.error(`Failed to export ${type.toUpperCase()} report`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> Attendance Monitoring
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Defaulter Analytics & Action Center
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Identify students below mandated course attendance thresholds and trigger immediate notices.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              icon={FileSpreadsheet}
              loading={exporting}
              onClick={() => exportFile('excel')}
              className="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20"
            >
              Excel Report
            </Button>
            <Button
              variant="outline"
              icon={FileText}
              loading={exporting}
              onClick={() => exportFile('pdf')}
              className="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20"
            >
              PDF Report
            </Button>
            <Button
              icon={Bell}
              loading={notifying}
              onClick={runNotifications}
              className="shadow-lg"
            >
              Trigger Notices Now
            </Button>
          </div>
        </div>
      </div>

      <Card
        title={`Identified Defaulters (${defaulters.length} course breaches)`}
        subtitle="Students failing to reach the mandatory minimum attendance percentage"
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            onClick={load}
          >
            Refresh Data
          </Button>
        }
      >
        <Table
          columns={[
            { key: 'rollNo', header: 'Roll No' },
            { key: 'studentName', header: 'Student Name' },
            { key: 'courseName', header: 'Course / Subject' },
            {
              key: 'type',
              header: 'Course Type',
              render: (r) => (
                <Badge color={r.type === 'practical' ? 'blue' : r.type === 'project' ? 'purple' : 'gray'} dot>
                  {r.type}
                </Badge>
              ),
            },
            { key: 'attendedHours', header: 'Attended (Hrs)', render: (r) => `${r.attendedHours}h` },
            { key: 'totalHeldHours', header: 'Held (Hrs)', render: (r) => `${r.totalHeldHours}h` },
            {
              key: 'attendancePercent',
              header: 'Current %',
              render: (r) => (
                <Badge color={r.attendancePercent < 50 ? 'red' : 'yellow'} dot>
                  {r.attendancePercent}%
                </Badge>
              ),
            },
            {
              key: 'threshold',
              header: 'Mandated %',
              render: (r) => `${r.threshold || 75}%`,
            },
          ]}
          data={defaulters}
          emptyText="Great news! No students currently fall below attendance thresholds."
        />
      </Card>
    </div>
  );
}
