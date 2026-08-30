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
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => exportFile('excel')}>⬇ Excel</Button>
          <Button variant="secondary" onClick={() => exportFile('pdf')}>⬇ PDF</Button>
          <Button onClick={runNotifications}>📧 Run Notification Check Now</Button>
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
            emptyText="No defaulters currently 🎉"
          />
        )}
      </Card>
    </div>
  );
}
