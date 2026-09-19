import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../api/client';
import { Card, Button } from '../../components/ui';
import toast from 'react-hot-toast';

const SCANNER_ELEMENT_ID = 'qr-reader';

export default function ScanQR() {
  const [scanning, setScanning] = useState(false);
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
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          await handleScanSuccess(decodedText);
        },
        () => {} // ignore per-frame scan failures
      );
    } catch (err) {
      toast.error('Camera access failed. Check permissions.');
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
    try {
      const payload = JSON.parse(decodedText);
      if (!navigator.geolocation) throw new Error('This browser does not support location.');
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
      setResult({ success: true, message: 'Attendance marked successfully!' });
      toast.success('Attendance marked!');
    } catch (err) {
      let message = err.response?.data?.message || 'Invalid or expired QR code';
      if (!err.response && err.code === 1) message = 'Location permission was denied. Allow location access and scan the QR again.';
      if (!err.response && err.code === 2) message = 'Your location is unavailable. Turn on device location and scan again.';
      if (!err.response && err.code === 3) message = 'Location lookup timed out. Move near a window and scan again.';
      if (!err.response && err.message) message = err.message;
      setResult({ success: false, message });
      toast.error(message);
    }
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-[28px] border border-brand-100 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-5 text-white shadow-soft sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-100">Check-in</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Scan QR to Mark Attendance</h1>
        <p className="mt-2 text-sm text-brand-50/90">Use your device camera and current location to verify your presence securely.</p>
      </div>

      <Card>
        <div className="flex flex-col items-center gap-4">
          <div id={SCANNER_ELEMENT_ID} className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner ring-1 ring-slate-200" style={{ minHeight: scanning ? 250 : 0 }} />

          {!scanning && (
            <Button onClick={startScanning} className="min-w-[190px] inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M9 2.75a1 1 0 0 1 1 1V4h4v-.25a1 1 0 1 1 2 0V4h1.25A2.75 2.75 0 0 1 20 6.75v10.5A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25V6.75A2.75 2.75 0 0 1 6.75 4H8v-.25a1 1 0 0 1 1-1Zm3 6.25a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" fill="currentColor"/></svg>
              Start Camera & Scan
            </Button>
          )}
          {scanning && (
            <Button variant="secondary" onClick={stopScanning} className="min-w-[190px]">Stop Scanning</Button>
          )}

          {result && (
            <div
              className={`w-full max-w-sm rounded-2xl border p-4 text-center text-sm font-medium ${
                result.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {result.message}
            </div>
          )}

          <p className="max-w-sm text-center text-xs text-slate-500">
            Ask your faculty to display the rotating session QR code, then scan it here inside the configured classroom. Camera and location permissions are required.
          </p>
        </div>
      </Card>
    </div>
  );
}
