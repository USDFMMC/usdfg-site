import React from 'react';

interface ElegantButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'purple' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const ElegantButton: React.FC<ElegantButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button'
}) => {
  const getVariantStyles = () => {
    const variants = {
      primary: {
        gradient: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
        glow: '0 0 20px rgba(59, 130, 246, 0.3)',
        border: '1px solid rgba(59, 130, 246, 0.4)'
      },
      secondary: {
        gradient: 'linear-gradient(135deg, #6B7280, #374151)',
        glow: '0 0 20px rgba(107, 114, 128, 0.3)',
        border: '1px solid rgba(107, 114, 128, 0.4)'
      },
      success: {
        gradient: 'linear-gradient(135deg, #10B981, #047857)',
        glow: '0 0 20px rgba(16, 185, 129, 0.3)',
        border: '1px solid rgba(16, 185, 129, 0.4)'
      },
      warning: {
        gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
        glow: '0 0 20px rgba(245, 158, 11, 0.3)',
        border: '1px solid rgba(245, 158, 11, 0.4)'
      },
      danger: {
        gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
        glow: '0 0 20px rgba(239, 68, 68, 0.3)',
        border: '1px solid rgba(239, 68, 68, 0.4)'
      },
      purple: {
        gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
        glow: '0 0 20px rgba(139, 92, 246, 0.3)',
        border: '1px solid rgba(139, 92, 246, 0.4)'
      },
      cyan: {
        gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
        glow: '0 0 20px rgba(6, 182, 212, 0.3)',
        border: '1px solid rgba(6, 182, 212, 0.4)'
      }
    };
    return variants[variant];
  };

  const getSizeStyles = () => {
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };
    return sizes[size];
  };

  const styles = getVariantStyles();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden rounded-lg font-semibold transition-all duration-300
        ${getSizeStyles()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 hover:brightness-110'}
        ${className}
      `}
      style={{
        background: styles.gradient,
        boxShadow: styles.glow,
        border: styles.border,
        color: 'white'
      }}
    >
      {/* Subtle inner glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 rounded-lg"></div>
      
      {/* Button content */}
      <span className="relative z-10">
        {children}
      </span>
    </button>
  );
};

export default ElegantButton;
