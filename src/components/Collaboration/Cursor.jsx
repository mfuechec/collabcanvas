// Cursor Component - Display other users' cursors on the canvas
import React from 'react';

const Cursor = ({ 
  x, 
  y, 
  displayName, 
  color = '#3B82F6',
  userId 
}) => {
  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-2px, -2px)', // Offset for cursor tip
        transition: 'left 0.1s ease-out, top 0.1s ease-out'
      }}
    >
      {/* Cursor Icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden="true"
        style={{
          filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.3))'
        }}
      >
        {/* Cursor arrow shape */}
        <path
          d="M5.5 3L19.5 12L12 14.5L9.5 21L5.5 3Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      
      {/* User name label */}
      <div
        className="absolute left-5 top-2 px-2 py-1 text-xs font-medium text-white rounded shadow-lg whitespace-nowrap"
        style={{
          backgroundColor: color,
          maxWidth: '120px'
        }}
      >
        {displayName}
      </div>
    </div>
  );
};

export default Cursor;
