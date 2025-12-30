import React, { useEffect } from 'react';
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
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          relative w-[90vw] max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-amber-400/20
          bg-gradient-to-br from-gray-900/95 via-gray-900/95 to-black/95 backdrop-blur-md
          shadow-[0_0_40px_rgba(0,0,0,0.6)] shadow-amber-400/8
          ${className}
        `}
      >
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
        <div className="p-3 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ElegantModal;
