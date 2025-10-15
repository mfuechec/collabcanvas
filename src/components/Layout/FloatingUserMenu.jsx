import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePresence } from '../../hooks/usePresence';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/designSystem';

const FloatingUserMenu = () => {
  const { user, signOut } = useAuth();
  const { onlineUsers, totalUsers } = usePresence();
  const { theme, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  
  const colors = COLORS[theme];
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };
  
  const containerStyle = {
    position: 'fixed',
    top: SPACING.lg,
    right: SPACING.lg,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  };
  
  const presenceContainerStyle = {
    backgroundColor: `${colors.sidebar}CC`, // 80% opacity
    backdropFilter: 'blur(10px)',
    padding: `${SPACING.sm} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.toolbar,
    boxShadow: SHADOWS.floating,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    border: `1px solid ${colors.border}`,
  };
  
  const avatarButtonStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: colors.accent,
    border: `2px solid ${colors.border}`,
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 150ms ease',
  };
  
  const menuStyle = {
    position: 'absolute',
    top: '42px',
    right: 0,
    backgroundColor: colors.sidebar,
    border: `1px solid ${colors.border}`,
    borderRadius: BORDER_RADIUS.panel,
    boxShadow: SHADOWS.modal,
    minWidth: '200px',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
  };
  
  const menuItemStyle = {
    padding: `${SPACING.md} ${SPACING.lg}`,
    cursor: 'pointer',
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    color: colors.textPrimary,
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    transition: 'background-color 150ms ease',
  };
  
  const getUserInitials = (email) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };
  
  // Get other users' initials
  const otherUsers = onlineUsers.filter(u => u.userId !== user?.uid).slice(0, 2);
  
  return (
    <div style={containerStyle}>
      {/* Online Users Display */}
      {onlineUsers.length > 0 && (
        <div style={presenceContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
            {[
              ...onlineUsers.slice(0, 3).map((onlineUser, index) => (
                <div
                  key={onlineUser.userId}
                  style={{
                    ...avatarButtonStyle,
                    width: '28px',
                    height: '28px',
                    fontSize: '11px',
                    marginLeft: index > 0 ? '-8px' : '0',
                    zIndex: 10 - index,
                    backgroundColor: onlineUser.userId === user?.uid ? colors.accent : '#9333EA',
                  }}
                  title={onlineUser.displayName || onlineUser.email || 'Anonymous'}
                >
                  {getUserInitials(onlineUser.displayName || onlineUser.email)}
                </div>
              )),
              ...(onlineUsers.length > 3 ? [
                <div 
                  key="more-users"
                  style={{
                    fontSize: '12px',
                    color: colors.textSecondary,
                    fontWeight: 500,
                    marginLeft: SPACING.xs,
                  }}
                >
                  +{onlineUsers.length - 3}
                </div>
              ] : [])
            ]}
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.textSecondary,
            fontWeight: 500,
          }}>
            {totalUsers} online
          </div>
        </div>
      )}
      
      {/* Current User Menu */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button
          style={avatarButtonStyle}
          onClick={() => setShowMenu(!showMenu)}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="User menu"
        >
          {getUserInitials(user?.email)}
        </button>
        
        {showMenu && (
          <div style={menuStyle}>
            {/* User Info */}
            <div style={{
              ...menuItemStyle,
              cursor: 'default',
              borderBottom: `1px solid ${colors.border}`,
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '2px',
            }}>
              <div style={{ fontWeight: 600 }}>{user?.displayName || 'User'}</div>
              <div style={{ fontSize: '11px', color: colors.textSecondary }}>
                {user?.email}
              </div>
            </div>
            
            {/* Theme Toggle */}
            <button
              style={menuItemStyle}
              onClick={() => {
                toggleTheme();
                setShowMenu(false);
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {theme === 'dark' ? (
                  <circle cx="12" cy="12" r="5"/>
                ) : (
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                )}
              </svg>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            
            {/* Settings (Coming Soon) */}
            <button
              style={{...menuItemStyle, opacity: 0.5, cursor: 'not-allowed'}}
              disabled
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6"/>
                <path d="m4.93 4.93 4.24 4.24m5.66 5.66 4.24 4.24"/>
                <path d="M1 12h6m6 0h6"/>
                <path d="m4.93 19.07 4.24-4.24m5.66-5.66 4.24-4.24"/>
              </svg>
              Settings
            </button>
            
            {/* Sign Out */}
            <button
              style={{
                ...menuItemStyle,
                borderTop: `1px solid ${colors.border}`,
                color: '#EF4444',
              }}
              onClick={handleSignOut}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingUserMenu;

