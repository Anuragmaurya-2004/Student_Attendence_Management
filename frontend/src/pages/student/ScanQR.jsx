import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../api/client';
import { Card, Button, Input } from '../../components/ui';
import toast from 'react-hot-toast';
import {
  QrCode,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Upload,
  RefreshCw,
  SwitchCamera,
  KeyRound,
  Navigation,
} from 'lucide-react';
import { getOrCreateDeviceId, getDeviceSummary } from '../../utils/device';

const SCANNER_ELEMENT_ID = 'qr-reader-container';

/**
 * Checks whether the current window origin is a secure context.
 * Modern browsers strictly require HTTPS or localhost to access navigator.geolocation.
 */
const checkIsSecureContext = () => {
  if (typeof window === 'undefined') return true;
  if (window.isSecureContext !== undefined) return window.isSecureContext;
  const hostname = window.location.hostname;
  return (
    window.location.protocol === 'https:' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  );
};

const cachedCoords = { data: null, timestamp: 0 };

/**
 * Resilient geolocation fetcher with detailed error classification:
 * Classifies issues into:
 *  - INSECURE_CONTEXT (accessed via http://192.168.x.x where browser refuses to prompt)
 *  - NOT_SUPPORTED (device lacks geolocation API)
 *  - PERMISSION_DENIED (blocked in browser site settings)
 *  - POSITION_UNAVAILABLE (GPS/Location turned OFF on phone)
 *  - TIMEOUT (GPS fix timed out)
 */
const fetchCoordinatesWithDiagnostics = async (forceFresh = false) => {
  // 1. Insecure Context check (e.g. mobile accessing http://192.168.x.x:5173)
  if (!checkIsSecureContext()) {
    const isLAN = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return {
      ok: false,
      type: 'INSECURE_CONTEXT',
      title: 'Insecure Connection (HTTP)',
      message: isLAN
        ? `Browsers block GPS location access over unencrypted HTTP (http://${window.location.hostname}:5173).`
        : 'Geolocation requires a secure context (HTTPS or localhost).',
      resolution: isLAN
        ? 'Run the app with HTTPS using "npm run dev:https" and open https://' + window.location.hostname + ':5173, OR test directly on http://localhost:5173 on your PC, OR ask your instructor to disable classroom geofence for testing.'
        : 'Please open this website using https:// or http://localhost.',
    };
  }

  // 2. Browser API check
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      ok: false,
      type: 'NOT_SUPPORTED',
      title: 'Geolocation Unsupported',
      message: 'Your browser or device does not support geolocation lookup.',
      resolution: 'Please open this page in Google Chrome, Microsoft Edge, or Apple Safari.',
    };
  }

  // 3. Return fresh cached coordinates if available
  if (!forceFresh && cachedCoords.data && Date.now() - cachedCoords.timestamp < 45000) {
    return { ok: true, coords: cachedCoords.data };
  }

  // 4. Permissions API check (if supported)
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        return {
          ok: false,
          type: 'PERMISSION_DENIED',
          title: 'Location Permission Blocked in Browser',
          message: 'Location access is blocked for this site in your browser settings.',
          resolution: 'Tap the lock/tune icon in your browser address bar → Site Settings → set Location to "Allow", then refresh or tap Retry.',
        };
      }
    } catch {
      // Permissions API not universally supported; proceed to getCurrentPosition
    }
  }

  const getPositionPromise = (options) =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  // 5. High accuracy attempt (10s timeout to allow GPS satellite/Wi-Fi lock)
  try {
    const highAcc = await getPositionPromise({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 15000,
    });
    const result = {
      latitude: highAcc.coords.latitude,
      longitude: highAcc.coords.longitude,
      accuracy: highAcc.coords.accuracy,
    };
    cachedCoords.data = result;
    cachedCoords.timestamp = Date.now();
    return { ok: true, coords: result };
  } catch (highErr) {
    // If explicitly denied by user
    if (highErr.code === 1) {
      return {
        ok: false,
        type: 'PERMISSION_DENIED',
        title: 'Location Permission Denied',
        message: 'Location access was blocked or denied in your browser.',
        resolution: 'Tap the lock/tune icon in your browser address bar, set Location to "Allow", and tap Retry.',
      };
    }

    // Fallback: try standard / cellular / Wi-Fi accuracy (8s timeout)
    try {
      const lowAcc = await getPositionPromise({
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60000,
      });
      const result = {
        latitude: lowAcc.coords.latitude,
        longitude: lowAcc.coords.longitude,
        accuracy: lowAcc.coords.accuracy,
      };
      cachedCoords.data = result;
      cachedCoords.timestamp = Date.now();
      return { ok: true, coords: result };
    } catch (lowErr) {
      if (lowErr.code === 1) {
        return {
          ok: false,
          type: 'PERMISSION_DENIED',
          title: 'Location Permission Denied',
          message: 'Location access was blocked or denied in your browser.',
          resolution: 'Tap the lock/tune icon in your browser address bar, set Location to "Allow", and tap Retry.',
        };
      }
      if (lowErr.code === 2) {
        return {
          ok: false,
          type: 'POSITION_UNAVAILABLE',
          title: 'Device GPS / Location Turned Off',
          message: 'Your device location could not be determined.',
          resolution: 'Ensure device Location/GPS is turned ON in your phone quick settings/system settings and try again.',
        };
      }
      return {
        ok: false,
        type: 'TIMEOUT',
        title: 'Location Request Timed Out',
        message: 'Could not obtain a GPS fix in time.',
        resolution: 'Move closer to a window or outdoors to get GPS signal, then tap "Retry Location".',
      };
    }
  }
};

export default function ScanQR() {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'file' | 'manual'
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  // Location verification state
  const [locationState, setLocationState] = useState({
    status: 'checking', // 'checking' | 'ready' | 'error'
    coords: null,
    error: null,
  });

  // Camera management
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState('');

  // Manual code entry
  const [manualCode, setManualCode] = useState('');

  const scannerRef = useRef(null);
  const scanHandledRef = useRef(false);
  const fileInputRef = useRef(null);

  const requestLocation = useCallback(async (isUserAction = false) => {
    setLocationState((prev) => ({ ...prev, status: 'checking' }));
    const res = await fetchCoordinatesWithDiagnostics(isUserAction);
    if (res.ok) {
      setLocationState({
        status: 'ready',
        coords: res.coords,
        error: null,
      });
      if (isUserAction) {
        toast.success(`GPS Location verified (±${Math.round(res.coords.accuracy)}m)`);
      }
      return res.coords;
    } else {
      setLocationState({
        status: 'error',
        coords: null,
        error: res,
      });
      if (isUserAction) {
        toast.error(`${res.title}: ${res.message}`);
      }
      return null;
    }
  }, []);

  // Warm up GPS location and load available camera devices on mount
  useEffect(() => {
    requestLocation(false);

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer environment / back camera if available
          const backCam = devices.find((d) => /back|rear|environment/i.test(d.label));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch(() => {
        // Ignored; camera permissions will be asked when starting scanner
      });

    return () => {
      stopScanning();
    };
  }, [requestLocation]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        // Silently ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const processAttendanceCheckIn = async (sessionId, token) => {
    setVerifying(true);
    setResult(null);

    try {
      // Use ready coordinates, or try fetching freshly
      let location = locationState.coords;
      if (!location) {
        location = await requestLocation(false);
      }

      const deviceId = getOrCreateDeviceId();
      const deviceInfo = getDeviceSummary();

      const { data } = await api.post('/attendance/check-in', {
        sessionId,
        token,
        location,
        deviceId,
        deviceInfo,
      });

      // Trigger mobile haptic feedback if available
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 40, 120]);
      }

      setResult({
        success: true,
        message: data.message || 'Attendance marked successfully!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      toast.success('Attendance recorded successfully!');
      window.dispatchEvent(new Event('refresh-notifications'));
    } catch (err) {
      let message = err.response?.data?.message || 'Check-in failed. Please try again.';
      
      // If backend rejected because GPS was required and we have local diagnostic info, append it
      if (!locationState.coords && locationState.error) {
        message = `${message} — ${locationState.error.title}: ${locationState.error.message}`;
      }

      setResult({ success: false, message });
      toast.error(message);
      scanHandledRef.current = false;
    } finally {
      setVerifying(false);
    }
  };

  const handleDecodedText = async (decodedText) => {
    if (scanHandledRef.current) return;
    scanHandledRef.current = true;
    await stopScanning();

    let sessionId = null;
    let token = null;

    try {
      const payload = JSON.parse(decodedText);
      sessionId = payload.sessionId;
      token = payload.token;
    } catch {
      // If not JSON, check if it's formatted as sessionId:token
      if (decodedText.includes(':')) {
        const parts = decodedText.split(':');
        sessionId = parts[0];
        token = parts[1];
      }
    }

    if (!sessionId || !token) {
      setResult({
        success: false,
        message: 'Invalid QR code. Please scan the official attendance code from your instructor.',
      });
      toast.error('Unrecognized QR code format.');
      scanHandledRef.current = false;
      return;
    }

    await processAttendanceCheckIn(sessionId, token);
  };

  const startScanning = async (targetCamId) => {
    setResult(null);
    setCameraError('');
    scanHandledRef.current = false;

    // Clean up any stale scanner instance
    await stopScanning();

    const container = document.getElementById(SCANNER_ELEMENT_ID);
    if (!container) return;

    const html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = html5QrCode;
    setScanning(true);

    const config = {
      fps: 15,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const edge = Math.floor(minEdge * 0.8);
        return {
          width: Math.max(200, Math.min(edge, 340)),
          height: Math.max(200, Math.min(edge, 340)),
        };
      },
      aspectRatio: 1.0,
    };

    const camToUse = targetCamId || selectedCameraId;

    try {
      if (camToUse) {
        await html5QrCode.start(
          camToUse,
          config,
          (decodedText) => handleDecodedText(decodedText),
          () => {} // frame misses
        );
      } else {
        // Fallback: try environment facingMode
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => handleDecodedText(decodedText),
          () => {}
        );
      }
    } catch (primaryErr) {
      console.warn('Primary camera start failed, trying fallback:', primaryErr);
      // Fallback: try user-facing camera or any available video source
      try {
        await html5QrCode.start(
          { facingMode: 'user' },
          config,
          (decodedText) => handleDecodedText(decodedText),
          () => {}
        );
      } catch (fallbackErr) {
        console.error('All camera start attempts failed:', fallbackErr);
        const errMsg = 'Camera access was denied or no compatible camera was found. Ensure camera permissions are allowed in your browser settings.';
        setCameraError(errMsg);
        toast.error(errMsg);
        setScanning(false);
      }
    }
  };

  const handleCameraChange = async (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    if (scanning) {
      await startScanning(newId);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVerifying(true);
    setResult(null);

    // Stop live scanner if running
    await stopScanning();

    let tempScanner = scannerRef.current;
    if (!tempScanner) {
      tempScanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = tempScanner;
    }

    try {
      const decodedText = await tempScanner.scanFile(file, true);
      await handleDecodedText(decodedText);
    } catch (err) {
      setResult({
        success: false,
        message: 'Could not detect a valid QR code in the uploaded image. Please try a clearer screenshot or photograph.',
      });
      toast.error('No QR code detected in image.');
      setVerifying(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      return toast.error('Please enter a session code or token.');
    }

    let sessionId = null;
    let token = null;

    try {
      const parsed = JSON.parse(manualCode.trim());
      sessionId = parsed.sessionId;
      token = parsed.token;
    } catch {
      if (manualCode.includes(':')) {
        const parts = manualCode.trim().split(':');
        sessionId = parts[0];
        token = parts[1];
      }
    }

    if (!sessionId || !token) {
      return toast.error('Code format should be JSON {"sessionId": "...", "token": "..."} or "sessionId:token".');
    }

    await processAttendanceCheckIn(sessionId, token);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md w-fit">
          <QrCode className="h-3.5 w-3.5" /> Check-In Terminal
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Scan QR Code
        </h1>
        <p className="mt-1 text-sm text-indigo-100/90">
          Mark your attendance live via camera scanner, screenshot upload, or manual token code.
        </p>
      </div>

      <Card title="Attendance Check-In" subtitle="Camera scanner and coordinate verification">
        {/* Real-time Location Verification Banner */}
        <div className="mb-5 w-full">
          {locationState.status === 'ready' && (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="font-bold">GPS Location Ready:</span>{' '}
                  <span className="font-mono text-[11px]">
                    {locationState.coords.latitude.toFixed(4)}, {locationState.coords.longitude.toFixed(4)}
                  </span>{' '}
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    (±{Math.round(locationState.coords.accuracy)}m)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => requestLocation(true)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100/70 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors"
                title="Refresh GPS Coordinates"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>
          )}

          {locationState.status === 'checking' && (
            <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
              <span>Verifying GPS location coordinates... Please click "Allow" if your browser prompts.</span>
            </div>
          )}

          {locationState.status === 'error' && (
            <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/40 p-3.5 text-xs text-amber-900 dark:border-amber-900/60 dark:from-amber-950/50 dark:to-orange-950/30 dark:text-amber-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="font-bold text-amber-900 dark:text-amber-100 flex items-center justify-between">
                    <span>{locationState.error.title}</span>
                    <button
                      type="button"
                      onClick={() => requestLocation(true)}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-600 text-white px-2.5 py-1 text-[11px] font-semibold hover:bg-amber-700 transition-colors shadow-xs"
                    >
                      <Navigation className="h-3 w-3" /> Retry Location
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/90">
                    {locationState.error.message}
                  </p>
                  {locationState.error.resolution && (
                    <div className="mt-1.5 rounded-xl border border-amber-200/70 bg-white/70 p-2 text-[11px] text-amber-950 dark:border-amber-800/50 dark:bg-black/20 dark:text-amber-200">
                      <span className="font-semibold">How to fix:</span> {locationState.error.resolution}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              setResult(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'camera'
                ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Camera className="h-4 w-4" /> Live Camera
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('file');
              stopScanning();
              setResult(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'file'
                ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Upload className="h-4 w-4" /> Upload Image
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              stopScanning();
              setResult(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'manual'
                ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <KeyRound className="h-4 w-4" /> Manual Code
          </button>
        </div>

        <div className="flex flex-col items-center gap-5 p-2">
          {/* Celebratory Success View */}
          {result?.success ? (
            <div className="w-full rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/90 to-teal-50/50 p-6 text-center dark:border-emerald-800/60 dark:from-emerald-950/40 dark:to-teal-950/20 animate-in zoom-in-95 duration-300">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                  <CheckCircle2 className="h-9 w-9 stroke-[2.2]" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <Sparkles className="h-4 w-4" /> Attendance Verified
              </div>

              <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                Check-in Confirmed!
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {result.message}
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/90 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-xs dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Timestamp Recorded ({result.timestamp})</span>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/student" className="w-full sm:w-auto">
                  <Button variant="primary" icon={ArrowRight} className="w-full shadow-md">
                    View My Attendance
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setResult(null);
                    if (activeTab === 'camera') startScanning();
                  }}
                  className="w-full sm:w-auto"
                >
                  Scan Another Session
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: Live Camera Scanner */}
              {activeTab === 'camera' && (
                <div className="w-full flex flex-col items-center gap-4">
                  {/* Camera Selection Dropdown (if multiple cameras detected) */}
                  {cameras.length > 1 && (
                    <div className="w-full max-w-sm flex items-center gap-2">
                      <SwitchCamera className="h-4 w-4 text-slate-500 shrink-0" />
                      <select
                        value={selectedCameraId}
                        onChange={handleCameraChange}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {cameras.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label || `Camera ${c.id.substring(0, 5)}...`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Clean scanner viewport container */}
                  <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-900 shadow-inner dark:border-slate-800 min-h-[260px] flex items-center justify-center">
                    {!scanning && (
                      <div className="flex flex-col items-center justify-center p-6 text-slate-400 dark:text-slate-500">
                        <Camera className="h-10 w-10 mb-2 stroke-[1.5]" />
                        <p className="text-xs font-medium">Camera is inactive</p>
                      </div>
                    )}
                    {/* Html5Qrcode renders directly into this dedicated empty DOM node */}
                    <div
                      id={SCANNER_ELEMENT_ID}
                      className={`w-full ${scanning ? 'block' : 'hidden'}`}
                    />
                  </div>

                  {/* Camera Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                    {!scanning ? (
                      <Button
                        onClick={() => startScanning()}
                        icon={Camera}
                        loading={verifying}
                        size="lg"
                        className="w-full sm:w-auto shadow-md"
                      >
                        {verifying ? 'Verifying...' : 'Start Camera & Scan'}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={stopScanning}
                        className="w-full sm:w-auto"
                      >
                        Stop Camera
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Upload QR Image */}
              {activeTab === 'file' && (
                <div className="w-full flex flex-col items-center gap-4 py-2">
                  <div className="w-full max-w-sm rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/20">
                    <Upload className="mx-auto h-10 w-10 text-brand-600 dark:text-brand-400 mb-3" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Upload QR Code Image
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Select a photograph or screenshot containing the active session QR code.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="qr-file-input"
                    />
                    <label htmlFor="qr-file-input">
                      <Button
                        variant="primary"
                        icon={Upload}
                        loading={verifying}
                        className="mt-4 cursor-pointer shadow-md"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {verifying ? 'Scanning Image...' : 'Choose Image File'}
                      </Button>
                    </label>
                  </div>
                  {/* Hidden container needed for Html5Qrcode.scanFile */}
                  <div id={SCANNER_ELEMENT_ID} className="hidden" />
                </div>
              )}

              {/* TAB 3: Manual Code Entry */}
              {activeTab === 'manual' && (
                <form onSubmit={handleManualSubmit} className="w-full max-w-sm space-y-4 py-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Attendance Token or JSON String
                    </label>
                    <Input
                      placeholder='{"sessionId": "...", "token": "..."}'
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      If your camera is unable to focus, paste the token string displayed by your instructor.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={verifying}
                    icon={CheckCircle2}
                    className="w-full shadow-md"
                  >
                    {verifying ? 'Verifying...' : 'Submit Check-In Token'}
                  </Button>
                </form>
              )}

              {/* Error Status Banner */}
              {cameraError && (
                <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-xs font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                </div>
              )}

              {result && !result.success && (
                <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{result.message}</span>
                  </div>
                  {activeTab === 'camera' && !scanning && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RefreshCw}
                      onClick={() => {
                        setResult(null);
                        startScanning();
                      }}
                      className="mt-1 text-xs"
                    >
                      Restart Camera & Try Again
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Helpful Verification Instructions */}
          <div className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" /> Check-In Guidelines:
            </h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Scan the active rotating code directly from your instructor’s display</li>
              <li>Tokens refresh periodically; please scan the currently displayed code</li>
              <li><strong>One Device Policy:</strong> You must check in using your personal device. Marking proxy attendance for other accounts on the same device is blocked.</li>
              <li>If your camera is unavailable, switch to the <strong>Upload Image</strong> tab</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
