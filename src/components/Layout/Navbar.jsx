// Navbar Component - Navigation with user info and logout
import { useAuth } from '../../hooks/useAuth';

const Navbar = () => {
  const { currentUser, getDisplayName, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              CollabCanvas
            </h1>
          </div>

          {/* User info and actions */}
          <div className="flex items-center space-x-4">
            {currentUser && (
              <>
                {/* User display name */}
                <div className="text-sm text-gray-700">
                  Welcome, <span className="font-medium">{getDisplayName()}</span>
                </div>

                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
