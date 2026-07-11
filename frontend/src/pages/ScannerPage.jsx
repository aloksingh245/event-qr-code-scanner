import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';
import { CheckCircle, XCircle, AlertTriangle, Camera, UploadCloud, ShieldAlert, Check, RefreshCw } from 'lucide-react';

const ScannerPage = () => {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'file' | 'manual'
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  // Camera selection states
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  
  // Manual check-in state
  const [manualEmail, setManualEmail] = useState('');

  const cameraScannerRef = useRef(null);

  // Load cameras and start scanner
  useEffect(() => {
    if (activeTab === 'camera') {
      loadCamerasAndStart();
    } else {
      stopCamera();
    }
    setScanResult(null);

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Restart camera if selected camera changes
  useEffect(() => {
    if (activeTab === 'camera' && selectedCameraId) {
      startCamera(selectedCameraId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCameraId]);

  const loadCamerasAndStart = async () => {
    setCameraError(null);
    try {
      // 1. Request camera permissions and list cameras
      const devices = await Html5Qrcode.getCameras();
      
      if (devices && devices.length > 0) {
        setCameras(devices);
        
        // Find back camera if available, otherwise default to first camera
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment') || 
          device.label.toLowerCase().includes('rear')
        );
        
        const defaultCameraId = backCamera ? backCamera.id : devices[0].id;
        setSelectedCameraId(defaultCameraId);
        
        // Start the camera
        await startCamera(defaultCameraId);
      } else {
        setCameraError("No cameras detected on this device.");
      }
    } catch (err) {
      console.error("Camera permissions or listing failed:", err);
      setCameraError("Camera permission denied or camera is in use. Please allow camera access in browser settings.");
    }
  };

  const startCamera = async (cameraId) => {
    try {
      await stopCamera();

      const container = document.getElementById("camera-reader");
      if (!container) return;

      const scanner = new Html5Qrcode("camera-reader");
      cameraScannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 15,
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            const boxSize = Math.floor(minSize * 0.7); // Dynamic sizing: 70% of viewport
            return { width: boxSize, height: boxSize };
          }
        },
        onCameraScanSuccess,
        onCameraScanFailure
      );
      setCameraActive(true);
      setCameraError(null);
    } catch (err) {
      console.error("Failed to start camera:", err);
      setCameraError("Failed to initiate camera stream. It might be locked by another application.");
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (cameraScannerRef.current) {
      try {
        if (cameraScannerRef.current.isScanning) {
          await cameraScannerRef.current.stop();
        }
      } catch (err) {
        console.error("Camera stop error:", err);
      } finally {
        cameraScannerRef.current = null;
        setCameraActive(false);
      }
    }
  };

  const onCameraScanSuccess = async (decodedText) => {
    if (loading) return;
    
    // Pause immediately to prevent spam scanning
    if (cameraScannerRef.current && cameraScannerRef.current.isScanning) {
      try {
        await cameraScannerRef.current.pause(true);
      } catch (e) {
        console.error("Pause scan error:", e);
      }
    }

    await processVerification(decodedText);

    // Auto-resume camera after 4 seconds
    setTimeout(() => {
      setScanResult(null);
      if (cameraScannerRef.current && cameraScannerRef.current.isScanning) {
        try {
          cameraScannerRef.current.resume();
        } catch (e) {
          console.error("Resume scan error:", e);
        }
      }
    }, 4000);
  };

  const onCameraScanFailure = () => {
    // Noise suppression
  };

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
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    if (!manualEmail.trim()) return;

    setLoading(true);
    setScanResult(null);

    try {
      const response = await api.post('/scanner/manual', {
        email: manualEmail.trim()
      });

      setScanResult({
        type: 'success',
        title: 'Check-In Success',
        message: `Attendee checked in successfully. Welcome!`
      });
      setManualEmail('');

    } catch (error) {
      console.error("Manual checkin error:", error);
      const message = error.response?.data?.message || "Failed to process manual check-in.";
      setScanResult({
        type: 'error',
        title: 'Manual Check-in Failed',
        message
      });
    } finally {
      setLoading(false);
    }
  };

  const processVerification = async (decodedText) => {
    setLoading(true);
    try {
      // Decode flexible formats
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

      const response = await api.post('/scanner/verify', {
        qrCodeId
      });

      setScanResult({
        type: 'success',
        title: 'Entry Granted',
        message: `${response.data.attendee.name} is verified successfully.`,
        data: response.data
      });

    } catch (error) {
      console.error("Verify API error:", error);
      const errRes = error.response?.data;
      
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
      setLoading(false);
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
        <div className={activeTab === 'camera' ? "block" : "hidden"}>
          <div className="relative">
            {cameraError && (
              <div className="mb-4 bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl text-xs font-medium flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                <div className="flex-grow">
                  <p className="font-semibold">Camera Access Required</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{cameraError}</p>
                </div>
                <button 
                  onClick={loadCamerasAndStart} 
                  className="bg-red-100 hover:bg-red-200 text-red-800 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wide flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}
            
            {/* The html5-qrcode video viewport */}
            <div 
              id="camera-reader" 
              className="w-full overflow-hidden rounded-xl bg-gray-50/50 border border-gray-100 aspect-video min-h-[250px]"
            ></div>
            
            {cameraActive && (
              <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse z-10">
                Live Feed
              </div>
            )}
          </div>
        </div>

        {/* File Tab Content */}
        <div className={activeTab === 'file' ? "block" : "hidden"}>
          <div>
            <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                <UploadCloud className="w-10 h-10 text-blue-500 mb-3" />
                <p className="text-sm font-semibold text-gray-700">Click to upload QR Ticket</p>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">PNG, JPG, or JPEG screenshots</p>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileScan} 
                disabled={loading}
              />
            </label>
            <div id="file-reader-temp" className="hidden"></div>
          </div>
        </div>

        {/* Manual Check-in Content */}
        <div className={activeTab === 'manual' ? "block" : "hidden"}>
          <div className="max-w-md mx-auto py-4">
            <h3 className="text-sm font-bold text-gray-800 mb-1">Manual Attendee Search</h3>
            <p className="text-xs text-gray-400 mb-4">Check in attendees directly using their registered email address.</p>
            
            <form onSubmit={handleManualCheckIn} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email"
                  required
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  placeholder="attendee@example.com"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !manualEmail.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                Perform Check-in
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Processing Loader */}
      {loading && (
        <div className="text-center py-4 flex flex-col items-center gap-2 mb-6">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          <p className="text-xs text-gray-500 font-medium tracking-wide">Validating ticket in database...</p>
        </div>
      )}

      {/* Result Display Banner */}
      {scanResult && (
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
