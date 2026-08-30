import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge } from '../../components/ui';
import { format } from 'date-fns';

export default function StudentAttendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [courseSummary, setCourseSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await api.get(`/attendance/student/${user.id}`);
      setRecords(data);

      // Group by course + type to get an at-a-glance summary
      const map = {};
      data.forEach((r) => {
        const course = r.session?.course;
        if (!course) return;
        const key = `${course._id}-${r.session.type}`;
        if (!map[key]) map[key] = { courseName: course.name, type: r.session.type, total: 0, present: 0 };
        map[key].total += 1;
        if (r.status === 'present' || r.status === 'late') map[key].present += 1;
      });
      setCourseSummary(Object.values(map));
      setLoading(false);
    })();
  }, [user.id]);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">My Attendance</h1>

      <Card title="Summary by Course">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : courseSummary.length === 0 ? (
          <p className="text-gray-500 text-sm">No attendance records yet.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {courseSummary.map((c, i) => {
              const pct = c.total > 0 ? Math.round((c.present / c.total) * 100) : 0;
              return (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-800">{c.courseName}</span>
                    <Badge color={c.type === 'practical' ? 'blue' : 'gray'}>{c.type}</Badge>
                  </div>
                  <div className="text-2xl font-bold text-brand-700">{pct}%</div>
                  <div className="text-xs text-gray-400">{c.present} / {c.total} sessions attended</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Recent Attendance History">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Course</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Method</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-gray-400">No records found</td></tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{r.session?.date ? format(new Date(r.session.date), 'dd MMM yyyy') : '-'}</td>
                    <td className="py-2 pr-4">{r.session?.course?.name}</td>
                    <td className="py-2 pr-4"><Badge color={r.session?.type === 'practical' ? 'blue' : 'gray'}>{r.session?.type}</Badge></td>
                    <td className="py-2 pr-4">
                      <Badge color={r.status === 'present' ? 'green' : r.status === 'late' ? 'yellow' : 'red'}>{r.status}</Badge>
                    </td>
                    <td className="py-2 pr-4">{r.method}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
