import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/ui/scrollLock';

interface ElegantModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  onMinimize?: () => void;
  canMinimize?: boolean;
}

const ElegantModal: React.FC<ElegantModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  onMinimize,
  canMinimize = false
}) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
      setDragY(0);
      setIsDragging(false);
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    dragStartY.current = clientY;
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;
    const deltaY = clientY - dragStartY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    const threshold = 100; // Close if dragged down more than 100px
    if (dragY > threshold) {
      onClose();
    } else {
      // Snap back
      setDragY(0);
    }
    setIsDragging(false);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === modalRef.current || (modalRef.current?.contains(e.target as Node) && (e.target as HTMLElement).closest('.drag-handle'))) {
      handleDragStart(e.clientY);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragY]);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.target === modalRef.current || (modalRef.current?.contains(e.target as Node) && (e.target as HTMLElement).closest('.drag-handle'))) {
      handleDragStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    handleDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  if (!isOpen) return null;

  const opacity = dragY > 0 ? Math.max(0.3, 1 - dragY / 300) : 1;
  const scale = dragY > 0 ? Math.max(0.95, 1 - dragY / 1000) : 1;
  const isTournamentModal = className.includes('tournament-modal');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`
          relative w-full sm:w-[90vw] max-w-2xl max-h-[90vh] sm:max-h-[90vh] ${isTournamentModal ? 'overflow-y-auto' : 'overflow-hidden'} rounded-t-2xl sm:rounded-xl border border-amber-400/20
          bg-gradient-to-br from-gray-900/95 via-gray-900/95 to-black/95 backdrop-blur-md
          shadow-[0_0_40px_rgba(0,0,0,0.6)] shadow-amber-400/8
          transition-transform duration-200 ease-out
          ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
          ${className}
        `}
        style={{
          transform: `translateY(${dragY}px) scale(${scale})`,
          ...(isTournamentModal ? { maxWidth: '1400px', width: '95vw' } : {})
        }}
      >
        {/* Drag Handle */}
        <div className="drag-handle w-full flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1 bg-white/30 rounded-full" />
        </div>
        {/* Header */}
        {title && (
          <div className="p-3 border-b border-amber-400/20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                {title}
              </h2>
              <div className="flex items-center gap-2">
                {canMinimize && onMinimize && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMinimize();
                    }}
                    className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors duration-300"
                    title="Minimize"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors duration-300"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div
          className={`p-3 ${isTournamentModal ? 'overflow-x-auto' : 'overflow-y-auto max-h-[calc(90vh-80px)]'} overscroll-contain`}
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default ElegantModal;
