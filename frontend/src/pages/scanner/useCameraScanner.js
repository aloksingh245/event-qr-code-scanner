import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export const useCameraScanner = (activeTab, onCameraScanSuccess, onCameraScanFailure) => {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const cameraScannerRef = useRef(null);
  const isMountedRef = useRef(true);
  const videoStreamRef = useRef(null);

  // Maintain refs for callbacks to prevent infinite re-renders and camera restarts
  const successRef = useRef(onCameraScanSuccess);
  const failureRef = useRef(onCameraScanFailure);

  useEffect(() => {
    successRef.current = onCameraScanSuccess;
  }, [onCameraScanSuccess]);

  useEffect(() => {
    failureRef.current = onCameraScanFailure;
  }, [onCameraScanFailure]);

  const pauseScanner = useCallback(async () => {
    if (cameraScannerRef.current && cameraScannerRef.current.isScanning) {
      try {
        await cameraScannerRef.current.pause(true);
      } catch (e) {
        console.error("Pause scan error:", e);
      }
    }
  }, []);

  const resumeScanner = useCallback(async () => {
    if (cameraScannerRef.current && cameraScannerRef.current.isScanning) {
      try {
        cameraScannerRef.current.resume();
      } catch (e) {
        console.error("Resume scan error:", e);
      }
    }
  }, []);

  const stopCamera = useCallback(async () => {
    // 1. Manually stop the tracks via the stored stream reference (highly robust when unmounted)
    try {
      if (videoStreamRef.current && typeof videoStreamRef.current.getTracks === 'function') {
        videoStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log("Successfully stopped camera track manually from stored stream ref:", track.label);
        });
        videoStreamRef.current = null;
      }

      // Fallback: try to find it in the DOM in case start was super fast or reference was missed
      const videoEl = document.querySelector("#camera-reader video");
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject;
        if (stream && typeof stream.getTracks === 'function') {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log("Successfully stopped camera track manually from DOM:", track.label);
          });
        }
      }
    } catch (err) {
      console.error("Error stopping tracks manually:", err);
    }

    // 2. Clear HTML5-QR Code library instances
    if (cameraScannerRef.current) {
      try {
        if (cameraScannerRef.current.isScanning) {
          await cameraScannerRef.current.stop();
        }
      } catch (err) {
        console.error("Camera stop error:", err);
      } finally {
        cameraScannerRef.current = null;
        if (isMountedRef.current) {
          setCameraActive(false);
        }
      }
    }
  }, []);

  const startCamera = useCallback(async (cameraId) => {
    try {
      await stopCamera();

      if (!isMountedRef.current) return;

      const container = document.getElementById("camera-reader");
      if (!container) return;

      const scanner = new Html5Qrcode("camera-reader");
      cameraScannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 5,
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            const boxSize = Math.floor(minSize * 0.7); // Dynamic sizing: 70% of viewport
            return { width: boxSize, height: boxSize };
          }
        },
        (decodedText) => successRef.current(decodedText),
        (errorMessage) => failureRef.current(errorMessage)
      );

      // Store the stream reference for robust cleanup even if unmounted later
      const videoEl = document.querySelector("#camera-reader video");
      if (videoEl && videoEl.srcObject) {
        videoStreamRef.current = videoEl.srcObject;
      }

      if (!isMountedRef.current) {
        console.log("Component unmounted during scanner startup. Shutting down.");
        await stopCamera();
        return;
      }

      setCameraActive(true);
      setCameraError(null);
    } catch (err) {
      console.error("Failed to start camera:", err);
      if (isMountedRef.current) {
        setCameraError("Failed to initiate camera stream. It might be locked by another application.");
        setCameraActive(false);
      }
    }
  }, [stopCamera]);

  const loadCamerasAndStart = useCallback(async () => {
    setCameraError(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      
      if (!isMountedRef.current) return;
      
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
        
        await startCamera(defaultCameraId);
      } else {
        setCameraError("No cameras detected on this device.");
      }
    } catch (err) {
      console.error("Camera permissions or listing failed:", err);
      if (isMountedRef.current) {
        setCameraError("Camera permission denied or camera is in use. Please allow camera access in browser settings.");
      }
    }
  }, [startCamera]);

  // Load cameras and start scanner
  useEffect(() => {
    if (activeTab === 'camera') {
      loadCamerasAndStart();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab, loadCamerasAndStart, stopCamera]);

  // Restart camera if selected camera changes
  useEffect(() => {
    if (activeTab === 'camera' && selectedCameraId) {
      startCamera(selectedCameraId);
    }
  }, [selectedCameraId, activeTab, startCamera]);

  return {
    cameras,
    selectedCameraId,
    setSelectedCameraId,
    cameraActive,
    cameraError,
    loadCamerasAndStart,
    startCamera,
    stopCamera,
    pauseScanner,
    resumeScanner,
    isMounted: isMountedRef
  };
};
