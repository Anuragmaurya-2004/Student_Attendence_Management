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
} from 'lucide-react';

const SCANNER_ELEMENT_ID = 'qr-reader-container';

/**
 * Resilient geolocation fetcher:
 * 1. Tries high accuracy with a 5s timeout.
 * 2. Falls back to standard accuracy with a 7s timeout.
 * 3. Returns null if unavailable or denied so backend can allow check-in
 *    if classroom does not mandate a geofence.
 */
const fetchStudentCoordinates = async () => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return null;
  }

  const getPosition = (options) =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  try {
    const highAcc = await getPosition({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 5000,
    });
    return {
      latitude: highAcc.coords.latitude,
      longitude: highAcc.coords.longitude,
      accuracy: highAcc.coords.accuracy,
    };
  } catch (highErr) {
    // If high accuracy timed out or failed, try standard accuracy
    try {
      const lowAcc = await getPosition({
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 30000,
      });
      return {
        latitude: lowAcc.coords.latitude,
        longitude: lowAcc.coords.longitude,
        accuracy: lowAcc.coords.accuracy,
      };
    } catch {
      return null;
    }
  }
};

export default function ScanQR() {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'file' | 'manual'
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  // Camera management
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState('');

  // Manual code entry
  const [manualCode, setManualCode] = useState('');

  const scannerRef = useRef(null);
  const scanHandledRef = useRef(false);
  const fileInputRef = useRef(null);

  // Load available camera devices on mount
  useEffect(() => {
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
  }, []);

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
      const location = await fetchStudentCoordinates();

      const { data } = await api.post('/attendance/check-in', {
        sessionId,
        token,
        location,
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
      setResult({ success: false, message });
      toast.error(message);
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
      fps: 10,
      qrbox: { width: 250, height: 250 },
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
                <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{result.message}</span>
                  </div>
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
              <li>If your camera is unavailable, switch to the <strong>Upload Image</strong> tab</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
