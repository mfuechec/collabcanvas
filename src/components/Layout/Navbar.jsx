// Navbar Component - Navigation with user info, presence, and logout
import { useAuth } from '../../hooks/useAuth';
import { usePresence } from '../../hooks/usePresence';
import { removeCursor } from '../../services/cursors'; // For debugging
import PresenceList from '../Collaboration/PresenceList';

const Navbar = () => {
  const { currentUser, getDisplayName, logout } = useAuth();
  const { onlineUsers, totalUsers } = usePresence();

  const handleLogout = async () => {
    try {
      console.log('🚪 Logout button clicked for user:', currentUser?.uid);
      await logout();
      console.log('🚪 Logout completed');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  // Debug function to manually test cursor removal
  const handleDebugCleanup = async () => {
    if (currentUser?.uid) {
      console.log('🧪 Debug: Manually removing cursor for current user:', currentUser.uid);
      await removeCursor(currentUser.uid);
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

          {/* Center - Presence List */}
          {currentUser && totalUsers > 0 && (
            <div className="flex items-center">
              <PresenceList 
                onlineUsers={onlineUsers} 
                totalUsers={totalUsers}
                showCurrentUser={true}
                maxVisible={5}
              />
            </div>
          )}

          {/* User info and actions */}
          <div className="flex items-center space-x-4">
            {currentUser && (
              <>
                {/* Debug button - remove in production */}
                <button
                  onClick={handleDebugCleanup}
                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                  title="Debug: Test cursor removal"
                >
                  🧪 Test Cleanup
                </button>

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
