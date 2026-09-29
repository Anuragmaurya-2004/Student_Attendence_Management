import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../api/client';
import { Card, Button } from '../../components/ui';
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
} from 'lucide-react';

const SCANNER_ELEMENT_ID = 'qr-reader';

export default function ScanQR() {
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const scannerRef = useRef(null);
  const scanHandledRef = useRef(false);

  const startScanning = async () => {
    setResult(null);
    scanHandledRef.current = false;
    setScanning(true);
    const html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = html5QrCode;
    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await handleScanSuccess(decodedText);
        },
        () => {} // ignore frame scan misses
      );
    } catch (err) {
      toast.error('Camera access failed. Check browser permissions.');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (e) {
        /* ignore */
      }
    }
    setScanning(false);
  };

  const handleScanSuccess = async (decodedText) => {
    if (scanHandledRef.current) return;
    scanHandledRef.current = true;
    await stopScanning();
    setVerifying(true);
    try {
      const payload = JSON.parse(decodedText);
      if (!navigator.geolocation) {
        throw new Error('This browser does not support geolocation lookup.');
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { data } = await api.post('/attendance/check-in', {
        sessionId: payload.sessionId,
        token: payload.token,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        },
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
      toast.success('Attendance marked successfully!');
      window.dispatchEvent(new Event('refresh-notifications'));
    } catch (err) {
      let message = err.response?.data?.message || 'Invalid or expired QR code';
      if (!err.response && err.code === 1) {
        message = 'Location permission was denied. Allow location access and scan again.';
      } else if (!err.response && err.code === 2) {
        message = 'Your device location is unavailable. Check GPS/Wi-Fi and scan again.';
      } else if (!err.response && err.code === 3) {
        message = 'Location lookup timed out. Move closer to the classroom window and scan again.';
      } else if (!err.response && err.message) {
        message = err.message;
      }
      setResult({ success: false, message });
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

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
          Point your device camera at the rotating code displayed by your instructor inside the classroom.
        </p>
      </div>

      <Card title="Camera Scanner" subtitle="Camera access and current GPS coordinate verification required">
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
                <span>Geofence & Timestamp Verified ({result.timestamp})</span>
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
                    startScanning();
                  }}
                  className="w-full sm:w-auto"
                >
                  Scan Another Session
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Scanner Viewport */}
              <div
                id={SCANNER_ELEMENT_ID}
                className={`w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-900 shadow-inner dark:border-slate-800 transition-all ${
                  scanning ? 'min-h-[280px]' : 'min-h-[60px] flex items-center justify-center bg-slate-100 dark:bg-slate-800/40'
                }`}
              >
                {!scanning && (
                  <div className="flex flex-col items-center justify-center p-6 text-slate-400 dark:text-slate-500">
                    <Camera className="h-10 w-10 mb-2 stroke-[1.5]" />
                    <p className="text-xs font-medium">Camera is inactive</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                {!scanning ? (
                  <Button
                    onClick={startScanning}
                    icon={Camera}
                    loading={verifying}
                    size="lg"
                    className="w-full sm:w-auto shadow-md"
                  >
                    {verifying ? 'Verifying Coordinates...' : 'Start Camera & Scan'}
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

              {/* Error Status Banner */}
              {result && !result.success && (
                <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    <span>{result.message}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Helpful Instructions */}
          <div className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" /> Verification Requirements:
            </h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Ensure browser location and camera permissions are granted</li>
              <li>Scan while physically situated inside the designated classroom boundary</li>
              <li>Scan directly from the active live projector screen (screenshots expire)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
