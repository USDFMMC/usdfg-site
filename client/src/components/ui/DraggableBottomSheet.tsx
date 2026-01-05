import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface DraggableBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const DraggableBottomSheet: React.FC<DraggableBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const initialSheetY = useRef(0);

  // Calculate initial position (collapsed to ~20% of screen, expanded to ~85%)
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const COLLAPSED_HEIGHT = windowHeight * 0.2;
  const EXPANDED_HEIGHT = windowHeight * 0.85;
  const [sheetY, setSheetY] = useState(EXPANDED_HEIGHT);

  // Update window height on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSheetY(EXPANDED_HEIGHT);
    }
  }, [isOpen, EXPANDED_HEIGHT]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartY.current = e.touches[0].clientY;
    initialSheetY.current = sheetY;
  }, [sheetY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentTouchY = e.touches[0].clientY;
    const deltaY = currentTouchY - dragStartY.current;
    const newY = Math.max(COLLAPSED_HEIGHT, Math.min(EXPANDED_HEIGHT, initialSheetY.current + deltaY));
    
    setSheetY(newY);
    setCurrentY(currentTouchY);
  }, [isDragging, COLLAPSED_HEIGHT, EXPANDED_HEIGHT]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const threshold = (EXPANDED_HEIGHT - COLLAPSED_HEIGHT) / 2;
    const midPoint = COLLAPSED_HEIGHT + threshold;
    
    if (sheetY < midPoint) {
      // Snap to expanded
      setSheetY(EXPANDED_HEIGHT);
    } else {
      // Snap to collapsed
      setSheetY(COLLAPSED_HEIGHT);
    }
  }, [isDragging, sheetY, COLLAPSED_HEIGHT, EXPANDED_HEIGHT]);

  // Mouse drag support for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    initialSheetY.current = sheetY;
  }, [sheetY]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = e.clientY - dragStartY.current;
    const newY = Math.max(COLLAPSED_HEIGHT, Math.min(EXPANDED_HEIGHT, initialSheetY.current + deltaY));
    
    setSheetY(newY);
    setCurrentY(e.clientY);
  }, [isDragging, COLLAPSED_HEIGHT, EXPANDED_HEIGHT]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const threshold = (EXPANDED_HEIGHT - COLLAPSED_HEIGHT) / 2;
    const midPoint = COLLAPSED_HEIGHT + threshold;
    
    if (sheetY < midPoint) {
      setSheetY(EXPANDED_HEIGHT);
    } else {
      setSheetY(COLLAPSED_HEIGHT);
    }
  }, [isDragging, sheetY, COLLAPSED_HEIGHT, EXPANDED_HEIGHT]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  const visibleHeight = windowHeight - sheetY;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
        style={{ opacity: isOpen ? 1 : 0 }}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`fixed left-0 right-0 z-50 bg-gradient-to-br from-gray-900/98 via-gray-900/98 to-black/98 backdrop-blur-md border-t border-amber-400/20 shadow-[0_-4px_40px_rgba(0,0,0,0.8)] ${className}`}
        style={{
          height: `${visibleHeight}px`,
          bottom: 0,
          transform: `translateY(${windowHeight - sheetY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          touchAction: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div
          className="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="w-12 h-1.5 bg-gray-500/50 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-4 pb-3 border-b border-amber-400/20">
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
        <div
          ref={contentRef}
          className="overflow-y-auto h-full"
          style={{ height: `calc(100% - ${title ? '80px' : '50px'})` }}
        >
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default DraggableBottomSheet;

