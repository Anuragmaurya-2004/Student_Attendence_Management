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

  const startScanning = async () => {
    setResult(null);
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
    await stopScanning();
    try {
      const payload = JSON.parse(decodedText);
      const { data } = await api.post('/attendance/check-in', {
        sessionId: payload.sessionId,
        token: payload.token,
      });
      setResult({ success: true, message: 'Attendance marked successfully!' });
      toast.success('Attendance marked!');
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid or expired QR code';
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
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Scan QR to Mark Attendance</h1>
      <Card>
        <div className="flex flex-col items-center gap-4">
          <div id={SCANNER_ELEMENT_ID} className="w-full max-w-sm rounded-lg overflow-hidden bg-gray-100" style={{ minHeight: scanning ? 250 : 0 }} />

          {!scanning && (
            <Button onClick={startScanning}>📷 Start Camera & Scan</Button>
          )}
          {scanning && (
            <Button variant="secondary" onClick={stopScanning}>Stop Scanning</Button>
          )}

          {result && (
            <div
              className={`w-full max-w-sm text-center p-4 rounded-lg ${
                result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {result.message}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center max-w-sm">
            Ask your faculty to display the session QR code, then scan it here within the class period. Camera permission is required.
          </p>
        </div>
      </Card>
    </div>
  );
}
