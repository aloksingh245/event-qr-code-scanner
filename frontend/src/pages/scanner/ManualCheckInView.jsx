export const ManualCheckInView = ({
  manualEmail,
  setManualEmail,
  handleManualCheckIn,
  loading
}) => {
  return (
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
  );
};
