import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Badge } from '../../components/ui';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [depts, students, faculty, courses, defaultersRes] = await Promise.all([
          api.get('/academic/departments'),
          api.get('/students'),
          api.get('/faculty'),
          api.get('/academic/courses'),
          api.get('/reports/defaulters'),
        ]);
        setStats({
          departments: depts.data.length,
          students: students.data.length,
          faculty: faculty.data.length,
          courses: courses.data.length,
        });
        setDefaulters(defaultersRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-gray-500">Loading dashboard...</div>;

  const cards = [
    { label: 'Departments', value: stats?.departments ?? 0, color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Students', value: stats?.students ?? 0, color: 'bg-green-50 text-green-700' },
    { label: 'Faculty', value: stats?.faculty ?? 0, color: 'bg-blue-50 text-blue-700' },
    { label: 'Courses', value: stats?.courses ?? 0, color: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl p-5 ${c.color}`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-sm">{c.label}</div>
          </div>
        ))}
      </div>

      <Card title={`Current Defaulters (${defaulters.length})`}>
        {defaulters.length === 0 ? (
          <p className="text-gray-500 text-sm">🎉 No defaulters currently. Everyone is meeting attendance requirements.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Roll No</th>
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Course</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {defaulters.map((d, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{d.rollNo}</td>
                    <td className="py-2 pr-4">{d.studentName}</td>
                    <td className="py-2 pr-4">{d.courseName}</td>
                    <td className="py-2 pr-4">
                      <Badge color={d.type === 'practical' ? 'blue' : 'gray'}>{d.type}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge color="red">{d.attendancePercent}%</Badge>{' '}
                      <span className="text-gray-400">/ min {d.threshold}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
