import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { X } from 'lucide-react';

interface ChromaModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const ChromaModal: React.FC<ChromaModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const setX = useRef<((v: number) => void) | null>(null);
  const setY = useRef<((v: number) => void) | null>(null);
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    
    setX.current = gsap.quickSetter(el, '--x', 'px');
    setY.current = gsap.quickSetter(el, '--y', 'px');
    const { width, height } = el.getBoundingClientRect();
    pos.current = { x: width / 2, y: height / 2 };
    setX.current(pos.current.x);
    setY.current(pos.current.y);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Animate in
      gsap.fromTo(backdropRef.current, 
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
      gsap.fromTo(modalRef.current,
        { scale: 0.8, opacity: 0, y: 50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
      );
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  const moveTo = (x: number, y: number) => {
    gsap.to(pos.current, {
      x,
      y,
      duration: 0.3,
      ease: "power2.out",
      onUpdate: () => {
        setX.current?.(pos.current.x);
        setY.current?.(pos.current.y);
      },
      overwrite: true
    });
  };

  const handleMove = (e: React.PointerEvent) => {
    const r = modalRef.current!.getBoundingClientRect();
    moveTo(e.clientX - r.left, e.clientY - r.top);
  };

  const handleLeave = () => {
    const el = modalRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    moveTo(width / 2, height / 2);
  };

  const handleClose = () => {
    gsap.to(modalRef.current, {
      scale: 0.8,
      opacity: 0,
      y: 50,
      duration: 0.3,
      ease: "power2.in",
      onComplete: onClose
    });
    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.in"
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        className={`
          relative w-[90vw] max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-cyan-400/30
          ${className}
        `}
        style={
          {
            '--r': '300px',
            '--x': '50%',
            '--y': '50%',
            background: 'linear-gradient(145deg, #1a142e, #181c2f, #0c1222)',
            maskImage:
              'radial-gradient(circle var(--r) at var(--x) var(--y), transparent 0%, transparent 20%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 70%, black 100%)',
            WebkitMaskImage:
              'radial-gradient(circle var(--r) at var(--x) var(--y), transparent 0%, transparent 20%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 70%, black 100%)'
          } as React.CSSProperties
        }
      >
        {/* Spotlight effect */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-0 hover:opacity-100"
          style={{
            background:
              'radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(0, 232, 252, 0.2), transparent 70%)'
          }}
        />
        
        {/* Header */}
        {title && (
          <div className="relative z-10 p-6 border-b border-cyan-400/20">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                {title}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors duration-300"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="relative z-10 p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ChromaModal;
