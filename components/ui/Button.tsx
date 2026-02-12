
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ children, className = '', variant, ...props }) => {
  const hasTextColor = className.includes('text-');

  // Base classes always applied
  const baseClasses = "px-4 py-2 text-sm font-bold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";

  // Variant styles
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100 shadow-none"
  };

  // Determine classes
  // If variant is provided, use it.
  // If no variant, but className has 'bg-', assume manual styling (legacy).
  // If no variant and no manual styling, default to primary? 
  // BETTER: If no variant, do not apply variant classes, allowing className to control fully. 
  // BUT: existing "invisible" buttons have no variant AND no class.
  // So: If no variant is passed, we check if generic styling is needed? 
  // To be safe: I will explicitely add variant="primary" to the new buttons. 
  // For existing buttons in ShiftForm, they have no variant but have classes. They will rely on className.

  const variantClass = variant ? variants[variant] : "";

  // If no variant and no text color in className, default to white text (legacy behavior for buttons with manual bg)
  // The original code was: `!hasTextColor ? 'text-white' : ''`
  const textColorClass = (!variant && !hasTextColor) ? 'text-white' : '';

  return (
    <button
      className={`${baseClasses} ${variantClass} ${textColorClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};