import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import { Card, Button, Table, Select, Badge } from '../../components/ui';
import toast from 'react-hot-toast';

export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [qr, setQr] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const loadSession = useCallback(async () => {
    const { data } = await api.get(`/sessions/${id}`);
    setSession(data);
    return data;
  }, [id]);

  const loadAttendance = useCallback(async () => {
    const { data } = await api.get(`/attendance/session/${id}`);
    setAttendance(data);
  }, [id]);

  const loadStudents = useCallback(async (classBatchId) => {
    const { data } = await api.get('/students', { params: { classBatch: classBatchId } });
    setStudents(data);
  }, []);

  useEffect(() => {
    (async () => {
      const s = await loadSession();
      if (s?.classBatch?._id) loadStudents(s.classBatch._id);
      loadAttendance();
    })();
  }, [loadSession, loadAttendance, loadStudents]);

  useEffect(() => {
    if (!qr?.expiresAt) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(qr.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [qr]);

  const generateQR = async () => {
    try {
      const { data } = await api.post(`/sessions/${id}/qr`);
      setQr(data);
      toast.success('QR code generated — valid for a limited time');
      loadSession();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate QR');
    }
  };

  const markStatus = async (studentId, status) => {
    try {
      await api.post('/attendance/manual', { sessionId: id, studentId, status });
      loadAttendance();
    } catch (err) {
      toast.error('Failed to update attendance');
    }
  };

  const attendanceMap = Object.fromEntries(attendance.map((a) => [a.student._id, a]));

  if (!session) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-1">{session.course?.name}</h1>
      <p className="text-gray-500 text-sm mb-4">
        {session.classBatch?.name} • {new Date(session.date).toLocaleDateString()} • {session.startTime}-{session.endTime}{' '}
        <Badge color={session.type === 'practical' ? 'blue' : 'gray'}>{session.type}</Badge>
      </p>

      <div className="grid md:grid-cols-2 gap-5">
        <Card title="QR Check-in">
          <Button onClick={generateQR}>🔄 {qr ? 'Regenerate' : 'Generate'} QR Code</Button>
          {qr && (
            <div className="mt-4 text-center">
              <img src={qr.qrDataUrl} alt="Session QR" className="mx-auto w-48 h-48 border rounded-lg" />
              <p className="text-sm text-gray-500 mt-2">
                {secondsLeft > 0 ? `Expires in ${secondsLeft}s` : 'Expired — regenerate to allow more check-ins'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Students scan this with the "Scan QR" page in their app.</p>
            </div>
          )}
        </Card>

        <Card title={`Mark Attendance Manually (${students.length} students)`}>
          <Table
            columns={[
              { key: 'rollNo', header: 'Roll No' },
              { key: 'name', header: 'Name' },
              {
                key: 'status',
                header: 'Status',
                render: (r) => {
                  const current = attendanceMap[r._id]?.status || 'unmarked';
                  return (
                    <Select value={current} onChange={(e) => markStatus(r._id, e.target.value)}>
                      <option value="unmarked" disabled>Unmarked</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                    </Select>
                  );
                },
              },
              {
                key: 'method',
                header: 'Method',
                render: (r) => attendanceMap[r._id]?.method && <Badge>{attendanceMap[r._id].method}</Badge>,
              },
            ]}
            data={students}
          />
        </Card>
      </div>
    </div>
  );
}
