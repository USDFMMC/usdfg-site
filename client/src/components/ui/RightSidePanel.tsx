import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface RightSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const RightSidePanel: React.FC<RightSidePanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
        style={{ opacity: isOpen ? 1 : 0 }}
      />
      
      {/* Right Side Panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-gradient-to-br from-gray-900/98 via-gray-900/98 to-black/98 backdrop-blur-md border-l border-amber-400/20 shadow-[-4px_0_40px_rgba(0,0,0,0.8)] ${className}`}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="px-4 py-3 border-b border-amber-400/20 sticky top-0 bg-gray-900/98 backdrop-blur-sm z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors duration-300"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="overflow-y-auto h-full" style={{ height: `calc(100vh - ${title ? '60px' : '0px'})` }}>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default RightSidePanel;

