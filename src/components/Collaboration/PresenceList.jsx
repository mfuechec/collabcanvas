// PresenceList Component - Display list of online users with theme support
import React from 'react';
import UserPresence from './UserPresence';

const PresenceList = ({ 
  onlineUsers = [], 
  totalUsers = 0,
  showCurrentUser = true,
  maxVisible = 5,
  className = ""
}) => {
  // Filter users based on showCurrentUser preference
  const usersToShow = showCurrentUser 
    ? onlineUsers 
    : onlineUsers.filter(user => !user.isCurrentUser);
  
  // Limit visible users
  const visibleUsers = usersToShow.slice(0, maxVisible);
  const remainingCount = Math.max(0, usersToShow.length - maxVisible);
  
  // Don't render anything if no users
  if (totalUsers === 0) {
    return null;
  }
  
  return (
    <div className={`flex items-center ${className}`} style={{ gap: '8px' }}>
      {/* User avatars only */}
      {visibleUsers.map((user) => (
        <UserPresence
          key={user.id}
          user={user}
          size="sm"
        />
      ))}
      
      {/* Show remaining count if there are more users */}
      {remainingCount > 0 && (
        <div 
          className="rounded-full flex items-center justify-center text-xs font-medium border-2"
          style={{ 
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            borderColor: 'var(--bg-primary)',
            width: '32px',
            height: '32px',
            flexShrink: 0
          }}
          title={`${remainingCount} more user${remainingCount > 1 ? 's' : ''} online`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default PresenceList;
