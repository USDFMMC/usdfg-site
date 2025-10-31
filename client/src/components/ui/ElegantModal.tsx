import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ElegantModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const ElegantModal: React.FC<ElegantModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = ''
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
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
        className={`
          relative w-[90vw] max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-amber-400/20
          bg-gradient-to-br from-gray-900/95 via-gray-900/95 to-black/95 backdrop-blur-md
          shadow-[0_25px_50px_rgba(0,0,0,0.8)] shadow-amber-400/10
          ${className}
        `}
      >
        {/* Header */}
        {title && (
          <div className="p-6 border-b border-amber-400/20">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors duration-300"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ElegantModal;
