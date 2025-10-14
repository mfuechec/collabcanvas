// Navbar Component - Modern minimalist top bar with theme toggle
import { useAuth } from '../../hooks/useAuth';
import { usePresence } from '../../hooks/usePresence';
import { useTheme } from '../../contexts/ThemeContext';
import PresenceList from '../Collaboration/PresenceList';

const Navbar = () => {
  const { currentUser, getDisplayName, logout } = useAuth();
  const { onlineUsers, totalUsers } = usePresence();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav 
      className="flex items-center border-b transition-colors duration-200"
      style={{ 
        backgroundColor: 'var(--bg-primary)', 
        borderColor: 'var(--border-primary)',
        boxShadow: 'var(--shadow-sm)',
        padding: '16px 24px'
      }}
    >
      {/* Left side - App title with spacing */}
      <div className="flex items-center" style={{ flex: '1', paddingLeft: '8px' }}>
        <h1 
          className="text-xl font-semibold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          CollabCanvas
        </h1>
      </div>

      {/* Center - Welcome message (absolutely centered) */}
      <div 
        className="flex items-center justify-center"
        style={{ 
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      >
        {currentUser && (
          <div 
            className="text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Welcome, <span style={{ color: 'var(--text-primary)' }}>{getDisplayName()}</span>
          </div>
        )}
      </div>

      {/* Right side - Presence, Theme toggle, and Logout */}
      <div className="flex items-center" style={{ gap: '24px' }}>
        {/* Presence List - Just user avatars */}
        {currentUser && totalUsers > 0 && (
          <PresenceList 
            onlineUsers={onlineUsers} 
            totalUsers={totalUsers}
            showCurrentUser={true}
            maxVisible={3}
          />
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn-modern btn-icon theme-toggle"
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? (
            // Sun icon for light mode
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            // Moon icon for dark mode
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Logout Button */}
        {currentUser && (
          <button
            onClick={handleLogout}
            className="btn-modern"
            style={{ 
              color: 'var(--danger)',
              borderColor: 'var(--border-primary)'
            }}
          >
            Sign out
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
