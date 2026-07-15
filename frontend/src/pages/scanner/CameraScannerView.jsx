import { ShieldAlert, RefreshCw, Check, AlertTriangle, XCircle } from 'lucide-react';

export const CameraScannerView = ({
  cameraError,
  cameraActive,
  loadCamerasAndStart,
  scanResult
}) => {
  return (
    <div className="relative overflow-hidden rounded-xl">
      {cameraError && (
        <div className="mb-4 bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl text-xs font-medium flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
          <div className="flex-grow">
            <p className="font-semibold">Camera Access Required</p>
            <p className="text-gray-500 text-[11px] mt-0.5">{cameraError}</p>
          </div>
          <button 
            type="button"
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

      {/* Success Overlay over the camera scanner */}
      {scanResult && scanResult.type === 'success' && (
        <div className="absolute inset-0 bg-green-600/95 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 p-6 text-center animate-fade-in transition-all duration-300">
          <div className="bg-white/20 p-4 rounded-full mb-3 animate-bounce">
            <Check className="w-16 h-16 text-white stroke-[3px]" />
          </div>
          <h3 className="text-2xl font-bold tracking-wider uppercase">Ticket Scanned</h3>
          <p className="text-sm font-medium opacity-90 mt-1 max-w-md">{scanResult.message}</p>
        </div>
      )}

      {/* Warning Overlay over the camera scanner */}
      {scanResult && scanResult.type === 'warning' && (
        <div className="absolute inset-0 bg-yellow-500/95 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 p-6 text-center animate-fade-in transition-all duration-300">
          <div className="bg-white/20 p-4 rounded-full mb-3 animate-pulse">
            <AlertTriangle className="w-16 h-16 text-white stroke-[2.5px]" />
          </div>
          <h3 className="text-2xl font-bold tracking-wider uppercase">{scanResult.title}</h3>
          <p className="text-sm font-medium opacity-90 mt-1 max-w-md">{scanResult.message}</p>
        </div>
      )}

      {/* Error Overlay over the camera scanner */}
      {scanResult && scanResult.type === 'error' && (
        <div className="absolute inset-0 bg-red-600/95 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 p-6 text-center animate-fade-in transition-all duration-300">
          <div className="bg-white/20 p-4 rounded-full mb-3 animate-pulse">
            <XCircle className="w-16 h-16 text-white stroke-[2.5px]" />
          </div>
          <h3 className="text-2xl font-bold tracking-wider uppercase">{scanResult.title}</h3>
          <p className="text-sm font-medium opacity-90 mt-1 max-w-md">{scanResult.message}</p>
        </div>
      )}
    </div>
  );
};
