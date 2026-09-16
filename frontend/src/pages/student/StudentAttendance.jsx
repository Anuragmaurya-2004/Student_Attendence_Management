import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge } from '../../components/ui';
import { format, differenceInCalendarDays } from 'date-fns';

const ACTIVITY_LABELS = {
  industrial_visit: 'Industrial Visit',
  sports: 'Sports Tournament',
  cultural: 'Cultural Fest',
  hackathon_tech: 'Hackathon / Tech',
  nss_ncc: 'NSS / NCC',
  college_event: 'College Event',
  other: 'Other Duty',
};

export default function StudentAttendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [onDutyList, setOnDutyList] = useState([]);
  const [courseSummary, setCourseSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [attRes, odRes] = await Promise.all([
          api.get(`/attendance/student/${user.id}`),
          api.get(`/onduty/student/${user.id}`),
        ]);

        setRecords(attRes.data);
        setOnDutyList(odRes.data);

        // Group by course + type to get an at-a-glance summary
        const map = {};
        attRes.data.forEach((r) => {
          const course = r.session?.course;
          if (!course) return;
          const key = `${course._id}-${r.session.type}`;
          if (!map[key]) {
            map[key] = {
              courseName: course.name,
              type: r.session.type,
              total: 0,
              present: 0,
              onDuty: 0,
            };
          }
          map[key].total += 1;
          if (r.status === 'present' || r.status === 'late') map[key].present += 1;
          if (r.status === 'on_duty') map[key].onDuty += 1;
        });

        setCourseSummary(Object.values(map));
      } catch (err) {
        console.error('Failed to load student data', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">My Attendance Dashboard</h1>
        <Badge color="blue">Roll No: {user.rollNo || 'N/A'}</Badge>
      </div>

      <Card title="Course-wise Attendance Overview">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading attendance metrics...</p>
        ) : courseSummary.length === 0 ? (
          <p className="text-gray-500 text-sm">No attendance records yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {courseSummary.map((c, i) => {
              const credited = c.present + c.onDuty;
              const pct = c.total > 0 ? Math.round((credited / c.total) * 100) : 100;
              const isLow = pct < 75;

              return (
                <div
                  key={i}
                  className={`border rounded-xl p-4 bg-white shadow-xs transition hover:shadow-md ${
                    isLow ? 'border-red-200 bg-red-50/20' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-gray-800 text-sm leading-tight">{c.courseName}</span>
                    <Badge color={c.type === 'practical' ? 'blue' : 'gray'}>{c.type}</Badge>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-3xl font-extrabold ${isLow ? 'text-red-600' : 'text-brand-700'}`}>
                      {pct}%
                    </span>
                    {isLow && <span className="text-xs text-red-500 font-semibold">Below 75%</span>}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>Attended: <span className="font-medium text-gray-700">{c.present}</span> / {c.total}</div>
                    {c.onDuty > 0 && (
                      <div className="text-purple-700 font-medium">
                        ✨ On-Duty (OD): +{c.onDuty} sessions credited
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Approved On-Duty & Visits Section */}
      <Card title="My Approved On-Duty (OD) & Visits">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading OD records...</p>
        ) : onDutyList.length === 0 ? (
          <p className="text-gray-500 text-sm">No On-Duty or official visit exemptions logged.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {onDutyList.map((od) => {
              const days = differenceInCalendarDays(new Date(od.toDate), new Date(od.fromDate)) + 1;
              return (
                <div key={od._id} className="border border-purple-100 bg-purple-50/30 rounded-lg p-3.5 flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{od.eventTitle}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(od.fromDate), 'dd MMM yyyy')} – {format(new Date(od.toDate), 'dd MMM yyyy')} ({days} {days === 1 ? 'day' : 'days'})
                    </div>
                    {od.remarks && <p className="text-xs text-gray-600 mt-1 italic">"{od.remarks}"</p>}
                  </div>
                  <Badge color="purple">{ACTIVITY_LABELS[od.activityType] || od.activityType}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Detailed Attendance History">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2.5 pr-4 font-medium">Date</th>
                <th className="py-2.5 pr-4 font-medium">Course</th>
                <th className="py-2.5 pr-4 font-medium">Type</th>
                <th className="py-2.5 pr-4 font-medium">Status</th>
                <th className="py-2.5 pr-4 font-medium">Method / Reason</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id} className="border-b border-gray-100 hover:bg-gray-50/70">
                    <td className="py-2.5 pr-4 text-gray-700">
                      {r.session?.date ? format(new Date(r.session.date), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-gray-800">{r.session?.course?.name}</td>
                    <td className="py-2.5 pr-4">
                      <Badge color={r.session?.type === 'practical' ? 'blue' : 'gray'}>
                        {r.session?.type}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        color={
                          r.status === 'present'
                            ? 'green'
                            : r.status === 'on_duty'
                            ? 'purple'
                            : r.status === 'late'
                            ? 'yellow'
                            : 'red'
                        }
                      >
                        {r.status === 'on_duty' ? 'On Duty' : r.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600 text-xs">
                      {r.status === 'on_duty' && r.dutyReason ? (
                        <span className="text-purple-700 font-medium">OD: {r.dutyReason}</span>
                      ) : (
                        r.method
                      )}
                    </td>
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
