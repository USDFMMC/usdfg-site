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
  // Initialize sheetY to windowHeight (off-screen) - will be set to EXPANDED_HEIGHT when opening
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [sheetY, setSheetY] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
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

  // Update window height on resize
  useEffect(() => {
    const handleResize = () => {
      const newHeight = window.innerHeight;
      setWindowHeight(newHeight);
      // If closed, keep sheet off-screen
      if (!isOpen) {
        setSheetY(newHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Calculate heights based on current window height
  // For bottom sheet: we want to show X% of screen height from the bottom
  // When expanded: show 85% of screen (visibleHeight = 0.85 * windowHeight)
  // When collapsed: show 20% of screen (visibleHeight = 0.2 * windowHeight)
  // sheetY represents translateY - positive moves UP (hides), negative moves DOWN (shows)
  // For expanded: translateY should be small (15% hidden = 0.15 * windowHeight)
  // For collapsed: translateY should be large (80% hidden = 0.8 * windowHeight)
  const EXPANDED_VISIBLE_HEIGHT = windowHeight * 0.85; // 85% visible when expanded
  const COLLAPSED_VISIBLE_HEIGHT = windowHeight * 0.2; // 20% visible when collapsed
  
  // sheetY = how much to translate UP from bottom (positive = hidden, negative = visible)
  // When expanded: hide 15% = translateY(15% of windowHeight)
  // When collapsed: hide 80% = translateY(80% of windowHeight)
  const EXPANDED_SHEET_Y = windowHeight - EXPANDED_VISIBLE_HEIGHT; // 15% hidden = 85% visible
  const COLLAPSED_SHEET_Y = windowHeight - COLLAPSED_VISIBLE_HEIGHT; // 80% hidden = 20% visible

  // Initialize sheetY based on isOpen state - ensure it opens to expanded position
  useEffect(() => {
    if (isOpen && isMobile) {
      // Start expanded when opening (15% hidden = 85% visible)
      // Use a small delay to ensure windowHeight is set
      const timer = setTimeout(() => {
        setSheetY(EXPANDED_SHEET_Y);
      }, 0);
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      // Start completely off-screen when closed (100% hidden)
      setSheetY(windowHeight);
    }
  }, [isOpen, isMobile, EXPANDED_SHEET_Y, windowHeight]);

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
    const deltaY = currentTouchY - dragStartY.current; // Positive = dragging down, Negative = dragging up
    // When dragging down (positive deltaY), we want to hide more (increase sheetY)
    // When dragging up (negative deltaY), we want to show more (decrease sheetY)
    const newY = Math.max(COLLAPSED_SHEET_Y, Math.min(EXPANDED_SHEET_Y, initialSheetY.current + deltaY));
    
    setSheetY(newY);
  }, [isDragging, COLLAPSED_SHEET_Y, EXPANDED_SHEET_Y]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const threshold = (EXPANDED_SHEET_Y - COLLAPSED_SHEET_Y) / 2;
    const midPoint = EXPANDED_SHEET_Y + threshold;
    
    if (sheetY < midPoint) {
      // Closer to expanded - snap to expanded (85% visible)
      setSheetY(EXPANDED_SHEET_Y);
    } else {
      // Closer to collapsed - snap to collapsed (20% visible)
      setSheetY(COLLAPSED_SHEET_Y);
    }
  }, [isDragging, sheetY, COLLAPSED_SHEET_Y, EXPANDED_SHEET_Y]);

  // Mouse drag support for desktop testing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    initialSheetY.current = sheetY;
  }, [sheetY]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = e.clientY - dragStartY.current; // Positive = dragging down
    const newY = Math.max(COLLAPSED_SHEET_Y, Math.min(EXPANDED_SHEET_Y, initialSheetY.current + deltaY));
    
    setSheetY(newY);
  }, [isDragging, COLLAPSED_SHEET_Y, EXPANDED_SHEET_Y]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const threshold = (EXPANDED_SHEET_Y - COLLAPSED_SHEET_Y) / 2;
    const midPoint = EXPANDED_SHEET_Y + threshold;
    
    if (sheetY < midPoint) {
      setSheetY(EXPANDED_SHEET_Y);
    } else {
      setSheetY(COLLAPSED_SHEET_Y);
    }
  }, [isDragging, sheetY, COLLAPSED_SHEET_Y, EXPANDED_SHEET_Y]);

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

  // Ensure sheetY is initialized correctly - default to expanded if not set
  // sheetY = translateY value: how much to move UP from bottom (positive = hide more, negative = show more)
  // When expanded: translateY should be small (15% of windowHeight = hides 15%, shows 85%)
  // When collapsed: translateY should be large (80% of windowHeight = hides 80%, shows 20%)
  // When closed: translateY = 100% of windowHeight (completely hidden)
  const currentSheetY = isOpen && isMobile ? (sheetY >= 0 && sheetY <= windowHeight ? sheetY : EXPANDED_SHEET_Y) : windowHeight;
  const visibleHeight = Math.max(200, windowHeight - currentSheetY); // How much is visible from bottom (minimum 200px)

  // Mobile: Use bottom sheet (draggable)
  if (isMobile) {
    return (
      <>
        {/* Backdrop - lighter so users can see the page behind when collapsed */}
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity md:hidden"
          onClick={onClose}
          style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        />
        
        {/* Bottom Sheet - Draggable - FULLY OPAQUE BACKGROUND (not transparent/foggy) */}
        <div
          ref={panelRef}
          className={`fixed left-0 right-0 z-50 border-t border-amber-400/20 shadow-[0_-4px_40px_rgba(0,0,0,0.9)] md:hidden ${className}`}
          style={{
            height: `${windowHeight}px`, // Full height sheet that we translate
            bottom: 0,
            transform: `translateY(${currentSheetY}px)`, // Translate UP to hide/show
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: '#0f172a', // Solid slate-900 background (fully opaque, not transparent)
            opacity: 1, // Ensure fully opaque
            overflow: 'hidden', // Prevent content from showing outside visible area
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

          {/* Scrollable Content - Normal scrolling, no drag interference - SOLID BACKGROUND */}
          <div
            ref={contentRef}
            className="overflow-y-auto bg-transparent"
            style={{ 
              height: `${visibleHeight - (title ? 80 : 50)}px`, // Use visibleHeight minus header
              maxHeight: `${visibleHeight - (title ? 80 : 50)}px`, // Ensure it doesn't exceed visible area
              touchAction: 'pan-y', // Allow vertical scrolling
              WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
              minHeight: '150px', // Ensure minimum height so content is always visible
            }}
          >
            <div className="p-4 bg-transparent">
              {children}
            </div>
          </div>
          
          {/* Collapsed state indicator - Show when collapsed (when sheet is more than 50% hidden) */}
          {sheetY > EXPANDED_SHEET_Y + ((COLLAPSED_SHEET_Y - EXPANDED_SHEET_Y) * 0.5) && (
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

