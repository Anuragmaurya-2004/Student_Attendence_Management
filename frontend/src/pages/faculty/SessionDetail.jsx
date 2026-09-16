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
                {secondsLeft > 0 ? `Rotates in ${secondsLeft}s` : 'Expired — waiting for the next rotation'}
              </p>
              <p className="text-xs text-gray-400 mt-1">This QR rotates automatically. Students scan it with the "Scan QR" page.</p>
            </div>
          )}
          <div className="mt-5 border-t pt-4">
            <p className="text-sm font-medium text-gray-700">Classroom geofence</p>
            <p className="text-xs text-gray-500 mt-1">Set this while standing in the classroom. Student QR check-ins must be inside this radius.</p>
            <div className="flex items-end gap-2 mt-3">
              <label className="text-sm text-gray-600">
                Radius (m)
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  className="block w-24 mt-1 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                />
              </label>
              <Button variant="outline" onClick={setClassroomLocation}>Use My Current Location</Button>
            </div>
            {session.classBatch?.classroom?.latitude != null && (
              <p className="text-xs text-green-600 mt-2">Location configured ({session.classBatch.classroom.radiusMeters}m radius).</p>
            )}
            {locationStatus && <p className="text-xs text-gray-500 mt-2">{locationStatus}</p>}
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
                      {current === 'on_duty' && (
                        <Badge color="purple">OD</Badge>
                      )}
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
                      <Badge color={record.status === 'on_duty' ? 'purple' : 'gray'}>
                        {record.method}
                      </Badge>
                      {record.dutyReason && (
                        <span className="text-[10px] text-gray-500 italic max-w-[120px] truncate" title={record.dutyReason}>
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
