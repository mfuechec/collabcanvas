// PresenceList Component - Display list of online users
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
  
  if (totalUsers === 0) {
    return (
      <div className={`flex items-center text-gray-500 text-sm ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
        No users online
      </div>
    );
  }
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* User count */}
      <div className="flex items-center text-sm text-gray-600 mr-2">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        <span className="font-medium">
          {totalUsers} {totalUsers === 1 ? 'user' : 'users'} online
        </span>
      </div>
      
      {/* User avatars */}
      <div className="flex items-center space-x-1">
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
            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white"
            title={`${remainingCount} more user${remainingCount > 1 ? 's' : ''} online`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default PresenceList;
