import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface PlayerInfo {
  wallet: string;
  displayName?: string;
  profileImage?: string;
}

interface RightSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  players?: PlayerInfo[];
  gameName?: string;
  onExpand?: () => void;
}

const RightSidePanel: React.FC<RightSidePanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  players = [],
  gameName,
  onExpand,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sheetY, setSheetY] = useState(0);
  const dragStartY = useRef(0);
  const initialSheetY = useRef(0);

  // Ensure players is always an array
  const safePlayers = Array.isArray(players) ? players : [];

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate initial position (collapsed to ~20% of screen, expanded to ~85%)
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const COLLAPSED_HEIGHT = windowHeight * 0.2; // 20% visible when collapsed (shows header, user can still browse)
  const EXPANDED_HEIGHT = windowHeight * 0.85; // 85% when expanded

  // Update window height on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset to expanded when opening
  useEffect(() => {
    if (isOpen && isMobile) {
      setSheetY(EXPANDED_HEIGHT);
    }
  }, [isOpen, isMobile, EXPANDED_HEIGHT]);

  // Touch handlers for mobile drag - only from handle area
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartY.current = e.touches[0].clientY;
    initialSheetY.current = sheetY;
    e.preventDefault(); // Prevent scrolling while dragging handle
  }, [sheetY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevent scrolling while dragging
    
    const currentTouchY = e.touches[0].clientY;
    const deltaY = currentTouchY - dragStartY.current;
    const newY = Math.max(COLLAPSED_HEIGHT, Math.min(EXPANDED_HEIGHT, initialSheetY.current + deltaY));
    
    setSheetY(newY);
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
      // Snap to collapsed (user can still browse site)
      setSheetY(COLLAPSED_HEIGHT);
    }
  }, [isDragging, sheetY, COLLAPSED_HEIGHT, EXPANDED_HEIGHT]);

  // Mouse drag support for desktop testing
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

  // Mobile: Use bottom sheet (draggable)
  if (isMobile) {
    return (
      <>
        {/* Backdrop - lighter so users can see the page behind */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity md:hidden"
          onClick={onClose}
          style={{ opacity: isOpen ? 1 : 0 }}
        />
        
        {/* Bottom Sheet - Draggable */}
        <div
          ref={panelRef}
          className={`fixed left-0 right-0 z-50 bg-gradient-to-br from-gray-900/98 via-gray-900/98 to-black/98 backdrop-blur-md border-t border-amber-400/20 shadow-[0_-4px_40px_rgba(0,0,0,0.8)] md:hidden ${className}`}
          style={{
            height: `${visibleHeight}px`,
            bottom: 0,
            transform: `translateY(${windowHeight - sheetY}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle - Only this area can be dragged */}
          <div
            className="drag-handle flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'none' }}
          >
            <div className="w-12 h-1.5 bg-gray-500/50 rounded-full" />
          </div>

          {/* Header */}
          {title && (
            <div className="px-4 pb-3 border-b border-amber-400/20">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent truncate">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors duration-300 flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Content - Normal scrolling, no drag interference */}
          <div
            ref={contentRef}
            className="overflow-y-auto h-full"
            style={{ 
              height: `calc(100% - ${title ? '80px' : '50px'})`,
              touchAction: 'pan-y', // Allow vertical scrolling
              WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
            }}
          >
            <div className="p-4">
              {children}
            </div>
          </div>
          
          {/* Collapsed state indicator - Show when collapsed (when sheet is more than 50% down) */}
          {sheetY > COLLAPSED_HEIGHT + ((EXPANDED_HEIGHT - COLLAPSED_HEIGHT) * 0.5) && (
            <div className="absolute top-14 left-0 right-0 px-4 py-1.5 bg-amber-500/10 border-b border-amber-400/20 z-10">
              <p className="text-[10px] text-amber-300/70 text-center">
                Drag up ↑ to expand • Browse site below
              </p>
            </div>
          )}
        </div>
      </>
    );
  }

  // Desktop: Use side panel (original behavior)
  return (
    <>
      {/* Subtle backdrop - doesn't close on click, allows main page interaction */}
      <div
        className="fixed inset-0 bg-black/10 z-40 pointer-events-none hidden md:block"
        style={{ opacity: isOpen ? 1 : 0 }}
      />
      
      {/* Right Side Panel - Desktop only */}
      <div
        ref={panelRef}
        className={`hidden md:flex fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-gradient-to-br from-gray-900/98 via-gray-900/98 to-black/98 backdrop-blur-md border-l border-amber-400/20 shadow-[-4px_0_40px_rgba(0,0,0,0.8)] ${className}`}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="px-4 py-3 border-b border-amber-400/20 sticky top-0 bg-gray-900/98 backdrop-blur-sm z-10 w-full">
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
        <div className="overflow-y-auto h-full w-full" style={{ height: `calc(100vh - ${title ? '60px' : '0px'})` }}>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default RightSidePanel;

