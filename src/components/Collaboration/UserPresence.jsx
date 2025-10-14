// UserPresence Component - Individual user presence badge with avatar and theme support
import React from 'react';

const UserPresence = ({ 
  user, 
  size = 'md', 
  showTooltip = true,
  className = ""
}) => {
  // Size configurations
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  
  // Get user initials for avatar
  const getInitials = (displayName) => {
    if (!displayName) return '?';
    
    const words = displayName.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };
  
  const initials = getInitials(user.displayName);
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  // Create tooltip content with activity status
  const activityStatus = user.isActive ? 'Active' : 'Away';
  const tooltipContent = user.isCurrentUser 
    ? `${user.displayName} (You) - ${activityStatus}`
    : `${user.displayName} - ${activityStatus}`;
  
  return (
    <div 
      className={`relative ${className}`}
      style={{ flexShrink: 0 }}
      title={showTooltip ? tooltipContent : undefined}
    >
      {/* Avatar circle */}
      <div 
        className={`
          ${sizeClass} 
          rounded-full 
          flex 
          items-center 
          justify-center 
          font-medium 
          text-white 
          border-2 
          shadow-sm
          ${user.isCurrentUser ? 'ring-2' : ''}
          ${!user.isActive ? 'opacity-75' : ''}
        `}
        style={{ 
          backgroundColor: user.cursorColor || '#3B82F6',
          borderColor: 'var(--bg-primary)',
          ringColor: user.isCurrentUser ? 'var(--accent-primary)' : 'transparent',
          flexShrink: 0,
          width: '32px',
          height: '32px'
        }}
      >
        {initials}
      </div>
      
      {/* Activity indicator (replaces simple online indicator) */}
      <div 
        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
        style={{ 
          backgroundColor: user.isActive ? 'var(--success)' : 'var(--warning)',
          borderColor: 'var(--bg-primary)'
        }}
        title={user.isActive ? 'Active' : 'Away'}
      ></div>
      
      {/* Current user indicator */}
      {user.isCurrentUser && (
        <div 
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-primary)' }}
          title="You"
        >
          <svg 
            className="w-2.5 h-2.5 text-white" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default UserPresence;
