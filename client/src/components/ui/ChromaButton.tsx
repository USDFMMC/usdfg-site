import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

interface ChromaButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'purple' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const ChromaButton: React.FC<ChromaButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button'
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const setX = useRef<((v: number) => void) | null>(null);
  const setY = useRef<((v: number) => void) | null>(null);
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    
    setX.current = gsap.quickSetter(el, '--x', 'px');
    setY.current = gsap.quickSetter(el, '--y', 'px');
    const { width, height } = el.getBoundingClientRect();
    pos.current = { x: width / 2, y: height / 2 };
    setX.current(pos.current.x);
    setY.current(pos.current.y);
  }, []);

  const moveTo = (x: number, y: number) => {
    gsap.to(pos.current, {
      x,
      y,
      duration: 0.2,
      ease: "power2.out",
      onUpdate: () => {
        setX.current?.(pos.current.x);
        setY.current?.(pos.current.y);
      },
      overwrite: true
    });
  };

  const handleMove = (e: React.MouseEvent) => {
    const r = buttonRef.current!.getBoundingClientRect();
    moveTo(e.clientX - r.left, e.clientY - r.top);
  };

  const handleLeave = () => {
    const el = buttonRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    moveTo(width / 2, height / 2);
  };

  const getVariantStyles = () => {
    const variants = {
      primary: {
        gradient: 'linear-gradient(145deg, #3B82F6, #000)',
        border: '#3B82F6',
        spotlight: 'rgba(59, 130, 246, 0.3)'
      },
      secondary: {
        gradient: 'linear-gradient(145deg, #6B7280, #000)',
        border: '#6B7280',
        spotlight: 'rgba(107, 114, 128, 0.3)'
      },
      success: {
        gradient: 'linear-gradient(180deg, #10B981, #000)',
        border: '#10B981',
        spotlight: 'rgba(16, 185, 129, 0.3)'
      },
      warning: {
        gradient: 'linear-gradient(165deg, #F59E0B, #000)',
        border: '#F59E0B',
        spotlight: 'rgba(245, 158, 11, 0.3)'
      },
      danger: {
        gradient: 'linear-gradient(195deg, #EF4444, #000)',
        border: '#EF4444',
        spotlight: 'rgba(239, 68, 68, 0.3)'
      },
      purple: {
        gradient: 'linear-gradient(225deg, #8B5CF6, #000)',
        border: '#8B5CF6',
        spotlight: 'rgba(139, 92, 246, 0.3)'
      },
      cyan: {
        gradient: 'linear-gradient(135deg, #06B6D4, #000)',
        border: '#06B6D4',
        spotlight: 'rgba(6, 182, 212, 0.3)'
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
      ref={buttonRef}
      type={type}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      disabled={disabled}
      className={`
        relative overflow-hidden rounded-lg font-semibold transition-all duration-300
        ${getSizeStyles()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
        ${className}
      `}
      style={
        {
          '--r': '100px',
          '--x': '50%',
          '--y': '50%',
          background: styles.gradient,
          border: `2px solid ${styles.border}`,
          '--spotlight-color': styles.spotlight,
          maskImage:
            'radial-gradient(circle var(--r) at var(--x) var(--y), transparent 0%, transparent 30%, rgba(0,0,0,0.2) 60%, black 100%)',
          WebkitMaskImage:
            'radial-gradient(circle var(--r) at var(--x) var(--y), transparent 0%, transparent 30%, rgba(0,0,0,0.2) 60%, black 100%)'
        } as React.CSSProperties
      }
    >
      {/* Spotlight effect */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-0 hover:opacity-100"
        style={{
          background:
            'radial-gradient(circle at var(--mouse-x) var(--mouse-y), var(--spotlight-color), transparent 70%)'
        }}
      />
      
      {/* Button content */}
      <span className="relative z-10 text-white">
        {children}
      </span>
    </button>
  );
};

export default ChromaButton;
