import { UploadCloud } from 'lucide-react';

export const FileScannerView = ({ loading, handleFileScan }) => {
  return (
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
  );
};
