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
  const [radiusMeters, setRadiusMeters] = useState(75);
  const [locationStatus, setLocationStatus] = useState('');

  const loadSession = useCallback(async () => {
    const { data } = await api.get(`/sessions/${id}`);
    setSession(data);
    if (data.classBatch?.classroom?.radiusMeters) setRadiusMeters(data.classBatch.classroom.radiusMeters);
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

  const generateQR = async (showToast = true) => {
    try {
      const { data } = await api.post(`/sessions/${id}/qr`);
      setQr(data);
      if (showToast) toast.success('QR code generated — it will rotate automatically');
      if (showToast) loadSession();
    } catch (err) {
      if (showToast) toast.error(err.response?.data?.message || 'Failed to generate QR');
    }
  };

  useEffect(() => {
    if (!qr?.rotationIntervalSeconds) return undefined;
    const interval = setInterval(() => generateQR(false), qr.rotationIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [qr?.rotationIntervalSeconds, id]);

  const setClassroomLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('This browser does not support location. Use a recent browser on a GPS-enabled device.');
      return;
    }
    setLocationStatus('Reading your current location...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.put(`/sessions/${id}/location`, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radiusMeters: Number(radiusMeters),
          });
          setLocationStatus('Classroom location saved.');
          loadSession();
          toast.success('Classroom location saved');
        } catch (err) {
          setLocationStatus(err.response?.data?.message || 'Could not save classroom location.');
        }
      },
      (error) => {
        const messages = {
          1: 'Location permission was denied. Allow location access in the browser and try again.',
          2: 'Your location is unavailable. Turn on device location and try again.',
          3: 'Location lookup timed out. Move near a window and try again.',
        };
        setLocationStatus(messages[error.code] || 'Could not read your current location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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

  if (!session) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-soft">Loading...</div>;

  const attendanceMarked = attendance.filter((item) => item.status !== 'unmarked').length;
  const presentCount = attendance.filter((item) => ['present', 'late', 'on_duty'].includes(item.status)).length;

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-brand-100 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-5 text-white shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-100">Session</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{session.course?.name}</h1>
            <p className="mt-2 text-sm text-brand-50/90">
              {session.classBatch?.name} • {new Date(session.date).toLocaleDateString()} • {session.startTime}-{session.endTime}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-brand-50 backdrop-blur-sm">
            <Badge color={session.type === 'practical' ? 'blue' : 'gray'} className="!bg-white/10 !text-white !border-white/20">
              {session.type}
            </Badge>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">Students</p>
            <p className="mt-2 text-2xl font-bold">{students.length}</p>
            <p className="text-sm text-brand-50/80">in this batch</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">Marked</p>
            <p className="mt-2 text-2xl font-bold">{attendanceMarked}</p>
            <p className="text-sm text-brand-50/80">attendance updates</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">Present</p>
            <p className="mt-2 text-2xl font-bold">{presentCount}</p>
            <p className="text-sm text-brand-50/80">verified entries</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="QR Check-in">
          <Button onClick={generateQR} className="mb-4 inline-flex items-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M12 4a8 8 0 0 1 7.75 6h-2.13a6 6 0 1 0 0 4h2.13A8 8 0 1 1 12 4Zm0 3.5a1 1 0 0 1 1 1v3.38l2.42 1.4a1 1 0 1 1-1 1.72l-2.92-1.69A1 1 0 0 1 11 13V8.5a1 1 0 0 1 1-1Z" fill="currentColor"/></svg>
            {qr ? 'Regenerate' : 'Generate'} QR Code
          </Button>
          {qr && (
            <div className="text-center">
              <img src={qr.qrDataUrl} alt="Session QR" className="mx-auto h-48 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" />
              <p className="mt-3 text-sm text-slate-500">
                {secondsLeft > 0 ? `Rotates in ${secondsLeft}s` : 'Expired — waiting for the next rotation'}
              </p>
              <p className="mt-1 text-xs text-slate-400">This QR rotates automatically. Students scan it with the "Scan QR" page.</p>
            </div>
          )}
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="text-sm font-semibold text-slate-700">Classroom geofence</p>
            <p className="mt-1 text-xs text-slate-500">Set this while standing in the classroom. Student QR check-ins must be inside this radius.</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="text-sm text-slate-600">
                Radius (m)
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  className="mt-1 block w-24 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </label>
              <Button variant="outline" onClick={setClassroomLocation}>Use My Current Location</Button>
            </div>
            {session.classBatch?.classroom?.latitude != null && (
              <p className="mt-2 text-xs text-emerald-600">Location configured ({session.classBatch.classroom.radiusMeters}m radius).</p>
            )}
            {locationStatus && <p className="mt-2 text-xs text-slate-500">{locationStatus}</p>}
          </div>
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
                    <div className="flex items-center gap-2">
                      <Select value={current} onChange={(e) => markStatus(r._id, e.target.value)}>
                        <option value="unmarked" disabled>Unmarked</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="on_duty">On Duty (OD / Visit)</option>
                      </Select>
                      {current === 'on_duty' && <Badge color="purple">OD</Badge>}
                    </div>
                  );
                },
              },
              {
                key: 'method',
                header: 'Method / Info',
                render: (r) => {
                  const record = attendanceMap[r._id];
                  if (!record) return null;
                  return (
                    <div className="flex flex-col gap-0.5">
                      <Badge color={record.status === 'on_duty' ? 'purple' : 'gray'}>{record.method}</Badge>
                      {record.dutyReason && (
                        <span className="max-w-[120px] truncate text-[10px] italic text-slate-500" title={record.dutyReason}>
                          {record.dutyReason}
                        </span>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={students}
          />
        </Card>
      </div>
    </div>
  );
}
