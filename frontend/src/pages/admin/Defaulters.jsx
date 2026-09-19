import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Button, Table, Badge } from '../../components/ui';
import toast from 'react-hot-toast';

export default function Defaulters() {
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/reports/defaulters');
    setDefaulters(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const runNotifications = async () => {
    try {
      await api.post('/reports/run-notifications');
      toast.success('Defaulter check + notifications triggered');
    } catch (e) {
      toast.error('Failed to trigger notifications');
    }
  };

  const exportFile = (type) => {
    const token = localStorage.getItem('token');
    const url = `${import.meta.env.VITE_API_URL}/export/defaulters/${type}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `defaulters.${type === 'excel' ? 'xlsx' : 'pdf'}`;
        link.click();
      });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Defaulter Management</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportFile('excel')} className="inline-flex items-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M12 3.5a1 1 0 0 1 1 1V12l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L11 12V4.5a1 1 0 0 1 1-1Zm-7 12a1 1 0 0 1 1 1v1.5h12V16.5a1 1 0 1 1 2 0v2.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.5a1 1 0 0 1 1-1Z" fill="currentColor"/></svg>
            Excel
          </Button>
          <Button variant="secondary" onClick={() => exportFile('pdf')} className="inline-flex items-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M12 3.5a1 1 0 0 1 1 1V12l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L11 12V4.5a1 1 0 0 1 1-1Zm-7 12a1 1 0 0 1 1 1v1.5h12V16.5a1 1 0 1 1 2 0v2.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.5a1 1 0 0 1 1-1Z" fill="currentColor"/></svg>
            PDF
          </Button>
          <Button onClick={runNotifications} className="inline-flex items-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M4 13.5A3.5 3.5 0 0 1 7.5 10H9V8.5A3 3 0 0 1 12 5.5a3 3 0 0 1 3 3V10h1.5A3.5 3.5 0 0 1 20 13.5v2.25a1.25 1.25 0 0 1-1.25 1.25H5.25A1.25 1.25 0 0 1 4 15.75v-2.25Zm8 5.5a2.5 2.5 0 0 1-2.45-2h4.9A2.5 2.5 0 0 1 12 19Z" fill="currentColor"/></svg>
            Run Notification Check Now
          </Button>
        </div>
      </div>

      <Card title={`Defaulters (below threshold): ${defaulters.length}`}>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : (
          <Table
            columns={[
              { key: 'rollNo', header: 'Roll No' },
              { key: 'studentName', header: 'Student' },
              { key: 'courseName', header: 'Course' },
              { key: 'type', header: 'Type', render: (r) => <Badge color={r.type === 'practical' ? 'blue' : 'gray'}>{r.type}</Badge> },
              { key: 'attendedHours', header: 'Attended Hrs' },
              { key: 'totalHeldHours', header: 'Total Held Hrs' },
              {
                key: 'attendancePercent',
                header: 'Attendance %',
                render: (r) => <Badge color="red">{r.attendancePercent}%</Badge>,
              },
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
