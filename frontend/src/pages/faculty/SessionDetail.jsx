import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { Card, Button, Table, Select, Badge, Input } from '../../components/ui';
import toast from 'react-hot-toast';
import {
  QrCode,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Clock,
  Navigation,
  ArrowLeft,
  Sparkles,
  Timer,
  Lock,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [qr, setQr] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [windowSecondsLeft, setWindowSecondsLeft] = useState(0);
  const [isWindowExpired, setIsWindowExpired] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(75);
  const [locationStatus, setLocationStatus] = useState('');
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  const formatTime = (totalSeconds) => {
    if (!totalSeconds || totalSeconds <= 0) return '00:00';
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const loadSession = useCallback(async () => {
    try {
      const { data } = await api.get(`/sessions/${id}`);
      setSession(data);
      if (data.classBatch?.classroom?.radiusMeters) {
        setRadiusMeters(data.classBatch.classroom.radiusMeters);
      }
      return data;
    } catch (err) {
      toast.error('Failed to load session details');
    }
  }, [id]);

  const loadAttendance = useCallback(async () => {
    try {
      const { data } = await api.get(`/attendance/session/${id}`);
      setAttendance(data);
    } catch (err) {
      console.error('Failed to load attendance', err);
    }
  }, [id]);

  const loadStudents = useCallback(async (classBatchId) => {
    try {
      const { data } = await api.get('/students', { params: { classBatch: classBatchId } });
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students', err);
    }
  }, []);

  const generateQR = useCallback(async ({ showToast = true, resetWindow = false, isRotation = false, closeWindow = false } = {}) => {
    if (showToast) setQrLoading(true);
    try {
      const { data } = await api.post(`/sessions/${id}/qr`, {
        resetWindow,
        isRotation,
        closeWindow,
      });

      if (data.closed) {
        setIsWindowExpired(true);
        setWindowSecondsLeft(0);
        if (showToast) toast.success(data.message || 'QR Check-In closed. Unscanned students marked absent.');
        loadAttendance();
        return;
      }

      setQr(data);
      setIsWindowExpired(false);

      if (data.windowExpiresAt) {
        const remaining = Math.max(0, Math.floor((new Date(data.windowExpiresAt).getTime() - Date.now()) / 1000));
        setWindowSecondsLeft(remaining);
        if (remaining <= 0) {
          setIsWindowExpired(true);
          loadAttendance();
        }
      }

      if (showToast) {
        toast.success(resetWindow ? 'New 10-minute QR check-in window activated' : 'Dynamic rotating QR code activated');
        window.dispatchEvent(new Event('refresh-notifications'));
      }
      if (showToast) loadSession();
    } catch (err) {
      if (err.response?.data?.expired) {
        setIsWindowExpired(true);
        setWindowSecondsLeft(0);
        loadAttendance();
        if (showToast) toast.error(err.response?.data?.message || 'QR attendance window has expired (10 minutes completed). Unscanned students marked absent.');
      } else if (showToast) {
        toast.error(err.response?.data?.message || 'Failed to generate QR');
      }
    } finally {
      if (showToast) setQrLoading(false);
    }
  }, [id, loadSession, loadAttendance]);

  useEffect(() => {
    (async () => {
      const s = await loadSession();
      if (s?.classBatch?._id) loadStudents(s.classBatch._id);
      loadAttendance();
      // If session has an active 10m window running, resume display seamlessly
      if (s?.qrWindowExpiresAt && new Date(s.qrWindowExpiresAt).getTime() > Date.now()) {
        generateQR({ showToast: false, isRotation: false });
      } else if (s?.qrWindowExpiresAt && new Date(s.qrWindowExpiresAt).getTime() <= Date.now()) {
        setIsWindowExpired(true);
      }
    })();
  }, [loadSession, loadAttendance, loadStudents, generateQR]);

  // 10-minute validity window countdown timer
  useEffect(() => {
    if (!qr?.windowExpiresAt) return;
    let finalized = false;
    const tick = async () => {
      const diff = Math.max(0, Math.floor((new Date(qr.windowExpiresAt).getTime() - Date.now()) / 1000));
      setWindowSecondsLeft(diff);
      if (diff === 0) {
        setIsWindowExpired(true);
        if (!finalized) {
          finalized = true;
          try {
            const res = await api.post(`/sessions/${id}/finalize-absent`);
            toast.success(res.data?.message || 'QR timer ended. Unscanned students marked absent.');
          } catch (err) {
            console.error('Finalize absent error:', err);
          } finally {
            loadAttendance();
          }
        }
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [qr?.windowExpiresAt, id, loadAttendance]);

  // Automatic token rotation every 15s (stops when 10m window expires)
  useEffect(() => {
    if (!qr?.rotationIntervalSeconds || isWindowExpired || windowSecondsLeft === 0) return undefined;
    const interval = setInterval(() => {
      generateQR({ showToast: false, isRotation: true });
    }, qr.rotationIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [qr?.rotationIntervalSeconds, isWindowExpired, windowSecondsLeft, generateQR]);

  // Auto-refresh live roll call every 5 seconds while QR window is actively counting down
  useEffect(() => {
    if (!qr || isWindowExpired || windowSecondsLeft === 0) return undefined;
    const interval = setInterval(() => {
      loadAttendance();
    }, 5000);
    return () => clearInterval(interval);
  }, [qr, isWindowExpired, windowSecondsLeft, loadAttendance]);

  // 15-second rotating token countdown timer
  useEffect(() => {
    if (!qr?.expiresAt || isWindowExpired || windowSecondsLeft === 0) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(qr.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [qr?.expiresAt, isWindowExpired, windowSecondsLeft]);

  const setClassroomLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('This browser does not support geolocation lookup.');
      return;
    }
    setUpdatingLocation(true);
    setLocationStatus('Locating your device coordinate...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.put(`/sessions/${id}/location`, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radiusMeters: Number(radiusMeters),
          });
          setLocationStatus('Classroom geofence saved successfully.');
          loadSession();
          toast.success('Geofence coordinate configured');
        } catch (err) {
          setLocationStatus(err.response?.data?.message || 'Could not save classroom location.');
          toast.error('Could not save location');
        } finally {
          setUpdatingLocation(false);
        }
      },
      (error) => {
        setUpdatingLocation(false);
        const messages = {
          1: 'Location permission was denied. Allow location access in browser settings.',
          2: 'Your device location is unavailable. Check GPS/Wi-Fi.',
          3: 'Location lookup timed out. Please try again.',
        };
        setLocationStatus(messages[error.code] || 'Could not read current GPS coordinates.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const markStatus = async (studentId, status) => {
    try {
      await api.post('/attendance/manual', { sessionId: id, studentId, status });
      toast.success('Attendance updated');
      window.dispatchEvent(new Event('refresh-notifications'));
      loadAttendance();
    } catch (err) {
      toast.error('Failed to update attendance');
    }
  };

  // Safe mapping preventing null pointer crashes if a.student is unpopulated
  const attendanceMap = Object.fromEntries(
    attendance.map((a) => [a.student?._id || a.student, a])
  );

  if (!session) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-slate-200/80 bg-white/80 p-8 text-sm font-medium text-slate-500 shadow-soft dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <RefreshCw className="h-5 w-5 animate-spin text-brand-600 dark:text-brand-400" />
      </div>
    );
  }

  const attendanceMarked = attendance.filter((item) => item.status !== 'unmarked').length;
  const presentCount = attendance.filter((item) => ['present', 'late', 'on_duty'].includes(item.status)).length;
  const absentCount = attendance.filter((item) => item.status === 'absent').length;
  const attendancePercent = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link
        to="/faculty"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Sessions
      </Link>

      {/* Session Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <Clock className="h-3.5 w-3.5" /> Session Active
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {session.course?.name || 'Class Session'}
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              {session.classBatch?.name} • {new Date(session.date).toLocaleDateString(undefined, { dateStyle: 'long' })} • {session.startTime} - {session.endTime}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge color={session.type === 'practical' ? 'blue' : session.type === 'project' ? 'purple' : 'gray'}>
              {session.type}
            </Badge>
            <Badge color={session.status === 'held' ? 'green' : 'yellow'} dot>
              {session.status === 'held' ? 'Completed' : 'Live'}
            </Badge>
          </div>
        </div>

        {/* Live Counters */}
        <div className="mt-6 grid gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Cohort Enrolled</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{students.length}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Marked Total</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{attendanceMarked}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Verified Present</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{presentCount}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Marked Absent</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{absentCount}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">Turnout %</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{attendancePercent}%</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* QR Code Projection & Geofencing Card */}
        <div className="space-y-6">
          <Card title="Live QR Check-In" subtitle="Project this rotating code on screen for students to scan">
            <div className="flex flex-col items-center justify-center p-2 text-center">
              {!qr ? (
                <div className="py-10 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <QrCode className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Dynamic QR Code Not Generated
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                    Generate the rotating session check-in code. Tokens rotate every 15s and check-in remains open for 10 minutes.
                  </p>
                  <Button
                    onClick={() => generateQR({ showToast: true, resetWindow: true })}
                    loading={qrLoading}
                    icon={Sparkles}
                    className="shadow-md"
                  >
                    Start 10-Min QR Check-In
                  </Button>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  {/* Validity Time Counter Above QR */}
                  <div
                    className={`w-full max-w-sm mx-auto rounded-2xl border p-3.5 shadow-sm transition-all duration-300 ${
                      isWindowExpired
                        ? 'border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
                        : windowSecondsLeft <= 60
                        ? 'border-rose-300 bg-rose-50/90 text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200 animate-pulse'
                        : windowSecondsLeft <= 180
                        ? 'border-amber-300 bg-amber-50/90 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
                        : 'border-emerald-200/90 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-left">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                            isWindowExpired
                              ? 'bg-rose-200 text-rose-700 dark:bg-rose-900/80 dark:text-rose-300'
                              : windowSecondsLeft <= 60
                              ? 'bg-rose-200 text-rose-700 dark:bg-rose-900 dark:text-rose-200'
                              : windowSecondsLeft <= 180
                              ? 'bg-amber-200 text-amber-700 dark:bg-amber-900/80 dark:text-amber-200'
                              : 'bg-emerald-200 text-emerald-700 dark:bg-emerald-900/80 dark:text-emerald-300'
                          }`}
                        >
                          {isWindowExpired ? <Lock className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isWindowExpired
                                  ? 'bg-rose-500'
                                  : windowSecondsLeft <= 60
                                  ? 'bg-rose-500 animate-ping'
                                  : windowSecondsLeft <= 180
                                  ? 'bg-amber-500 animate-pulse'
                                  : 'bg-emerald-500 animate-pulse'
                              }`}
                            />
                            <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                              {isWindowExpired ? 'Check-In Closed' : 'QR Validity Counter'}
                            </p>
                          </div>
                          <p className="text-xs font-semibold">
                            {isWindowExpired ? '10-Minute Limit Reached' : 'Open for 10 min window'}
                          </p>
                        </div>
                      </div>

                      {/* Monospace Countdown Clock */}
                      <div className="text-right">
                        <div className="font-mono text-2xl font-black tracking-tight leading-none">
                          {formatTime(windowSecondsLeft)}
                        </div>
                        <p className="mt-0.5 text-[10px] font-semibold opacity-75">
                          {isWindowExpired ? 'Expired' : `${Math.ceil(windowSecondsLeft / 60)}m left`}
                        </p>
                      </div>
                    </div>

                    {/* Linear Progress Bar */}
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                      <div
                        className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                          isWindowExpired
                            ? 'bg-rose-500 w-full'
                            : windowSecondsLeft <= 60
                            ? 'bg-rose-500'
                            : windowSecondsLeft <= 180
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: isWindowExpired
                            ? '100%'
                            : `${Math.max(0, Math.min(100, (windowSecondsLeft / (qr.windowTotalSeconds || 600)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* QR Image Box with Expired Overlay */}
                  <div className="relative mx-auto max-w-[240px] rounded-3xl border-2 border-brand-500/30 bg-white p-3 shadow-card dark:border-brand-500/50">
                    <img
                      src={qr.qrDataUrl}
                      alt="Session Check-in QR"
                      className={`mx-auto h-52 w-52 rounded-2xl object-contain transition-all ${
                        isWindowExpired ? 'opacity-20 blur-[2px]' : ''
                      }`}
                    />

                    {isWindowExpired && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center rounded-3xl bg-slate-900/75 backdrop-blur-[2px] text-white">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/40 mb-2">
                          <Lock className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-rose-200">
                          10m Window Expired
                        </p>
                        <p className="mt-1 text-[11px] text-slate-300 leading-tight">
                          Check-in is closed. Students cannot scan this code.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Below QR: Rotation and Status Controls */}
                  {isWindowExpired ? (
                    <div className="pt-2 flex flex-col items-center gap-2">
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        Attendance window closed after 10 minutes.
                      </p>
                      <Button
                        variant="primary"
                        icon={Sparkles}
                        onClick={() => generateQR({ showToast: true, resetWindow: true })}
                        loading={qrLoading}
                        className="shadow-md"
                      >
                        Reopen for 10 Minutes
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Countdown Timer */}
                      <div className="space-y-1.5 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
                          <RefreshCw className={`h-3.5 w-3.5 ${secondsLeft > 0 ? 'animate-spin' : ''}`} />
                          <span>{secondsLeft > 0 ? `Rotates in ${secondsLeft}s` : 'Refreshing token...'}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Tokens change automatically every {qr.rotationIntervalSeconds || 15}s.
                        </p>
                      </div>

                      <div className="pt-2 flex flex-wrap justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={RefreshCw}
                          onClick={() => generateQR({ showToast: true, resetWindow: false })}
                          loading={qrLoading}
                        >
                          Force Regenerate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={XCircle}
                          onClick={() => generateQR({ showToast: true, closeWindow: true })}
                          className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 border-rose-200 dark:border-rose-900/50"
                        >
                          Close Early
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Geofence Configuration Section */}
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Classroom Geofence Fence
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Students must physically be within this GPS perimeter to mark attendance via QR scan.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
                <div className="w-32">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Radius (Meters)
                  </label>
                  <Input
                    type="number"
                    min="10"
                    max="1000"
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(e.target.value)}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  icon={Navigation}
                  loading={updatingLocation}
                  onClick={setClassroomLocation}
                  className="flex-1"
                >
                  Capture Classroom GPS
                </Button>
              </div>

              {locationStatus && (
                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{locationStatus}</span>
                </p>
              )}

              {session.classBatch?.classroom?.latitude != null && (
                <div className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-2.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Active coordinate: {session.classBatch.classroom.latitude.toFixed(4)}, {session.classBatch.classroom.longitude.toFixed(4)} ({session.classBatch.classroom.radiusMeters}m perimeter)
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Manual Roll Call Table Card */}
        <Card
          title={`Student Roll Call (${students.length})`}
          subtitle="Mark or override status manually for students with device issues"
        >
          <Table
            columns={[
              {
                key: 'student',
                header: 'Student',
                render: (r) => (
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{r.name}</p>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{r.rollNo}</p>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => {
                  const record = attendanceMap[r._id];
                  const current = record?.status || 'unmarked';
                  return (
                    <div className="flex items-center gap-2">
                      <Select
                        value={current}
                        onChange={(e) => markStatus(r._id, e.target.value)}
                        className="!py-1 !text-xs min-w-[130px]"
                      >
                        <option value="unmarked">Unmarked</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="on_duty">On Duty (OD)</option>
                      </Select>
                      {current === 'present' && <Badge color="green">Present</Badge>}
                      {current === 'absent' && <Badge color="red">Absent</Badge>}
                      {current === 'late' && <Badge color="yellow">Late</Badge>}
                      {current === 'on_duty' && <Badge color="purple">OD</Badge>}
                    </div>
                  );
                },
              },
              {
                key: 'method',
                header: 'Check-In Method',
                render: (r) => {
                  const record = attendanceMap[r._id];
                  if (!record) {
                    return <span className="text-xs text-slate-400">Not recorded</span>;
                  }
                  return (
                    <div>
                      <Badge color={record.status === 'on_duty' ? 'purple' : 'gray'}>
                        {record.method || 'manual'}
                      </Badge>
                      {record.dutyReason && (
                        <p className="mt-0.5 truncate text-[10px] text-slate-400 max-w-[120px]" title={record.dutyReason}>
                          {record.dutyReason}
                        </p>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={students}
            emptyText="No students registered in this batch."
          />
        </Card>
      </div>
    </div>
  );
}
