import { type FC } from 'react';

export const Logo: FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      
      {/* Neural Network Nodes and Connections forming an 'S' */}
      <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        {/* Top Curve */}
        <path d="M75 25 C 75 10, 25 10, 25 25 C 25 40, 75 60, 75 75 C 75 90, 25 90, 25 75" stroke="url(#logo-gradient)" fill="none" />
        
        {/* Nodes */}
        <circle cx="75" cy="25" r="4" fill="url(#logo-gradient)" stroke="none" />
        <circle cx="25" cy="25" r="4" fill="url(#logo-gradient)" stroke="none" />
        <circle cx="50" cy="50" r="5" fill="url(#logo-gradient)" stroke="none" />
        <circle cx="75" cy="75" r="4" fill="url(#logo-gradient)" stroke="none" />
        <circle cx="25" cy="75" r="4" fill="url(#logo-gradient)" stroke="none" />
        
        {/* Circuit lines */}
        <line x1="25" y1="25" x2="45" y2="45" stroke="url(#logo-gradient)" strokeWidth="2" opacity="0.5" />
        <line x1="75" y1="75" x2="55" y2="55" stroke="url(#logo-gradient)" strokeWidth="2" opacity="0.5" />
      </g>
    </svg>
  );
};
