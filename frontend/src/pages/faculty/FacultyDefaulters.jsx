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
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Defaulters</h1>
      <Card title={`Below Threshold: ${defaulters.length}`}>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
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
            emptyText="No defaulters currently 🎉"
          />
        )}
      </Card>
    </div>
  );
}
