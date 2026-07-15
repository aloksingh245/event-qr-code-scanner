import { useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';
import { CheckCircle, XCircle, AlertTriangle, Camera, UploadCloud, Check } from 'lucide-react';

import { useCameraScanner } from './scanner/useCameraScanner';
import { CameraScannerView } from './scanner/CameraScannerView';
import { FileScannerView } from './scanner/FileScannerView';
import { ManualCheckInView } from './scanner/ManualCheckInView';

const ScannerPage = () => {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'file' | 'manual'
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualEmail, setManualEmail] = useState('');

  // Camera scan success handler
  const onCameraScanSuccess = async (decodedText) => {
    if (loading) return;
    
    // Pause immediately to prevent spam scanning
    await pauseScanner();

    await processVerification(decodedText);

    // Auto-resume camera after 4 seconds
    setTimeout(() => {
      if (isMounted.current) {
        setScanResult(null);
        resumeScanner();
      }
    }, 4000);
  };

  const onCameraScanFailure = () => {
    // Noise suppression
  };

  // Wire up the custom camera scanner hook
  const {
    cameras,
    selectedCameraId,
    setSelectedCameraId,
    cameraActive,
    cameraError,
    loadCamerasAndStart,
    pauseScanner,
    resumeScanner,
    isMounted
  } = useCameraScanner(activeTab, onCameraScanSuccess, onCameraScanFailure);

  // File Scanning Handler
  const handleFileScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setScanResult(null);

    try {
      const fileScanner = new Html5Qrcode("file-reader-temp");
      const decodedText = await fileScanner.scanFile(file, false);
      await processVerification(decodedText);
    } catch (err) {
      console.error("File decode error:", err);
      setScanResult({
        type: 'error',
        title: 'Scan Failed',
        message: 'No clear QR ticket code found in the image. Try a sharper screenshot.'
      });
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      e.target.value = '';
    }
  };

  // Manual search check-in handler
  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    if (!manualEmail.trim()) return;

    setLoading(true);
    setScanResult(null);

    try {
      const response = await api.post('/scanner/manual', {
        email: manualEmail.trim()
      });

      if (isMounted.current) {
        setScanResult({
          type: 'success',
          title: 'Check-In Success',
          message: `Attendee checked in successfully. Welcome!`
        });
        setManualEmail('');
      }
    } catch (error) {
      console.error("Manual checkin error:", error);
      const message = error.response?.data?.message || "Failed to process manual check-in.";
      if (isMounted.current) {
        setScanResult({
          type: 'error',
          title: 'Manual Check-in Failed',
          message
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Common ticket verification logic
  const processVerification = async (decodedText) => {
    setLoading(true);
    setScanResult(null); // Clear previous result immediately
    try {
      let qrCodeId = '';
      try {
        const payload = JSON.parse(decodedText);
        qrCodeId = payload.qrCodeId || decodedText;
      } catch (e) {
        qrCodeId = decodedText.trim();
      }

      if (!qrCodeId) {
        throw new Error("Invalid format");
      }

      const response = await api.post('/scanner/verify', { qrCodeId });

      if (isMounted.current) {
        setScanResult({
          type: 'success',
          title: 'Entry Granted',
          message: `${response.data.attendee.name} is verified successfully.`,
          data: response.data
        });
      }
    } catch (error) {
      console.error("Verify API error:", error);
      const errRes = error.response?.data;
      
      if (!isMounted.current) return;

      if (error.response?.status === 401) {
         setScanResult({
             type: 'error',
             title: 'Unauthorized',
             message: 'Your organizer session has expired. Please login again.'
         });
      } else if (errRes?.status === 'ALREADY_SCANNED') {
         setScanResult({
            type: 'warning',
            title: 'Duplicate Ticket!',
            message: `Already scanned at ${new Date(errRes.scanTime).toLocaleTimeString()}.`
         });
      } else if (errRes?.status === 'CANCELLED_TICKET') {
         setScanResult({
             type: 'error',
             title: 'Ticket Revoked',
             message: 'This ticket has been cancelled by event admin.'
         });
      } else if (errRes?.status === 'UNVERIFIED_TICKET') {
         setScanResult({
             type: 'error',
             title: 'Email Unverified',
             message: 'The email address associated with this ticket has not been verified.'
         });
      } else if (errRes?.status === 'INVALID_QR') {
         setScanResult({
             type: 'error',
             title: 'Invalid QR Ticket',
             message: 'Opaque code not recognized. Ticket is not in the system.'
         });
      } else {
         setScanResult({
             type: 'error',
             title: 'Format Error',
             message: 'Could not read ticket. Make sure it is an official EventPass QR Code.'
         });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header & Camera Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gate Ticket Scanner</h1>
          <p className="text-gray-500 text-xs mt-0.5">Scan ticket QR codes, upload screenshots, or use manual check-in</p>
        </div>
        
        {activeTab === 'camera' && cameras.length > 1 && (
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm w-full md:w-auto">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Camera:</span>
            <select 
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="border-none font-semibold text-gray-700 bg-transparent text-xs focus:ring-0 focus:outline-none cursor-pointer w-full"
            >
              {cameras.map(camera => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-200/60 p-1.5 rounded-2xl mb-6 max-w-sm">
        <button
          onClick={() => setActiveTab('camera')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'camera' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Camera scan
        </button>
        <button
          onClick={() => setActiveTab('file')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'file' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          Scan image file
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'manual' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          Manual
        </button>
      </div>

      {/* Main Scanner Area */}
      <div className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 mb-6 overflow-hidden min-h-[340px] flex flex-col justify-center">
        {/* Camera Tab Content */}
        {activeTab === 'camera' && (
          <CameraScannerView
            cameraError={cameraError}
            cameraActive={cameraActive}
            loadCamerasAndStart={loadCamerasAndStart}
            scanResult={scanResult}
          />
        )}

        {/* File Tab Content */}
        {activeTab === 'file' && (
          <FileScannerView 
            loading={loading} 
            handleFileScan={handleFileScan} 
          />
        )}

        {/* Manual Check-in Content */}
        {activeTab === 'manual' && (
          <ManualCheckInView
            manualEmail={manualEmail}
            setManualEmail={setManualEmail}
            handleManualCheckIn={handleManualCheckIn}
            loading={loading}
          />
        )}
      </div>

      {/* Processing Loader */}
      {loading && (
        <div className="text-center py-4 flex flex-col items-center gap-2 mb-6">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          <p className="text-xs text-gray-500 font-medium tracking-wide">Validating ticket in database...</p>
        </div>
      )}

      {/* Result Display Banner (Only for file & manual tabs) */}
      {scanResult && activeTab !== 'camera' && (
        <div className={`p-5 rounded-2xl border transition-all ${
          scanResult.type === 'success' ? 'bg-green-50 border-green-200 text-green-900 shadow-sm' :
          scanResult.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-900 shadow-sm' :
          'bg-red-50 border-red-200 text-red-900 shadow-sm'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            {scanResult.type === 'success' && <CheckCircle className="h-7 w-7 text-green-500" />}
            {scanResult.type === 'warning' && <AlertTriangle className="h-7 w-7 text-yellow-500 animate-bounce" />}
            {scanResult.type === 'error' && <XCircle className="h-7 w-7 text-red-500" />}
            <h2 className="text-lg font-bold tracking-tight">{scanResult.title}</h2>
          </div>
          <p className="text-sm font-medium">{scanResult.message}</p>
        </div>
      )}
    </div>
  );
};

export default ScannerPage;
