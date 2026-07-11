import { useState, useEffect } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { Users, UserCheck, Clock, ShieldCheck } from 'lucide-react';

const DashboardPage = () => {
  const [eventInfo, setEventInfo] = useState({ name: 'Loading Event...', capacity: 300, registeredCount: 0 });
  const [dashboardData, setDashboardData] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await api.get('/scanner/dashboard');
        setEventInfo(res.data.eventInfo);
        setDashboardData(res.data.stats);
        setRecentScans(res.data.recentScans);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();

    // Setup Socket.io connection for real-time updates globally
    socket.connect();

    socket.on('attendanceUpdate', (data) => {
      // Update counts
      setDashboardData(prev => ({
        ...prev,
        totalScanned: data.totalScanned,
        pending: prev ? (eventInfo.registeredCount - data.totalScanned) : 0
      }));

      // Prepend new scan to list
      setRecentScans(prev => [
        {
          name: data.name,
          scanTime: data.scanTime,
          _id: Math.random().toString() // temp key
        },
        ...prev
      ].slice(0, 50));
    });

    return () => {
      socket.off('attendanceUpdate');
      socket.disconnect();
    };
  }, [eventInfo.registeredCount]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{eventInfo.name}</h1>
        <p className="text-gray-500 text-sm mt-1">Live Event Attendance & Entry Dashboard</p>
      </div>

      {dashboardData ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 transition-all hover:shadow-md">
              <div className="p-6 flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-xl p-3.5">
                   <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Registered</dt>
                    <dd className="text-3xl font-extrabold text-gray-900 mt-1">{eventInfo.registeredCount}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 transition-all hover:shadow-md">
              <div className="p-6 flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-xl p-3.5">
                   <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Checked In</dt>
                    <dd className="text-3xl font-extrabold text-gray-900 mt-1">{dashboardData.totalScanned}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 transition-all hover:shadow-md">
              <div className="p-6 flex items-center">
                <div className="flex-shrink-0 bg-orange-100 rounded-xl p-3.5">
                   <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Arrival</dt>
                    <dd className="text-3xl font-extrabold text-gray-900 mt-1">{Math.max(0, eventInfo.registeredCount - dashboardData.totalScanned)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Scans Table */}
          <div className="bg-white shadow-md rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg leading-6 font-semibold text-gray-950">Recent Activity</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Attendee</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {recentScans.map((scan, idx) => (
                    <tr key={scan._id || idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{scan.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{new Date(scan.scanTime).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-800">
                          Present
                        </span>
                      </td>
                    </tr>
                  ))}
                  
                  {recentScans.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-6 py-16 text-center text-gray-400 font-medium">
                        No scans recorded yet. Verify tickets at gates to view activity!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-red-500 font-semibold">Failed to load dashboard.</div>
      )}
    </div>
  );
};

export default DashboardPage;
