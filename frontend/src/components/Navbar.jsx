import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, QrCode, LayoutDashboard, UserPlus } from 'lucide-react';

const Navbar = () => {
  const { isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <QrCode className="h-8 w-8 text-blue-600" />
            <span className="font-bold text-xl tracking-tight text-gray-900">EventPass</span>
          </div>
          
          <div className="flex gap-4 items-center">
            <Link to="/register" className="text-gray-600 hover:text-blue-600 flex items-center gap-1 font-medium">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Attendee Login</span>
            </Link>

            {isAuthenticated ? (
              <>
                <Link to="/scanner" className="text-gray-600 hover:text-blue-600 flex items-center gap-1 font-medium">
                  <QrCode className="h-4 w-4" />
                  <span className="hidden sm:inline">Scanner</span>
                </Link>
                <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 flex items-center gap-1 font-medium">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="ml-4 flex items-center gap-1 text-red-600 hover:text-red-800 font-medium transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="ml-4 px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm">
                Organizer Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
