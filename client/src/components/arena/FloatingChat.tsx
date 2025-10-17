import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Mic, MicOff, Minimize2, Maximize2, X } from "lucide-react";
import { ChatBox } from "./ChatBox";
import { VoiceChat } from "./VoiceChat";

interface FloatingChatProps {
  challengeId: string;
  currentWallet: string;
  isVisible: boolean;
  onClose: () => void;
}

export const FloatingChat: React.FC<FloatingChatProps> = ({
  challengeId,
  currentWallet,
  isVisible,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const chatRef = useRef<HTMLDivElement>(null);

  // Handle drag functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMinimized) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  }, [isMinimized, position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && isMinimized) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - 60; // 60px for bubble width
      const maxY = window.innerHeight - 60; // 60px for bubble height
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  }, [isDragging, isMinimized, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isMinimized) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      });
    }
  }, [isMinimized, position]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging && isMinimized) {
      e.preventDefault();
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  }, [isDragging, isMinimized, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Prevent audio interruption on mobile
  useEffect(() => {
    if (isVisible && !isMinimized) {
      // Keep audio context alive
      const keepAlive = () => {
        // This helps prevent audio interruption on mobile
        if (window.AudioContext || (window as any).webkitAudioContext) {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }
        }
      };

      // Resume audio context on user interaction
      document.addEventListener('touchstart', keepAlive, { once: true });
      document.addEventListener('click', keepAlive, { once: true });

      return () => {
        document.removeEventListener('touchstart', keepAlive);
        document.removeEventListener('click', keepAlive);
      };
    }
  }, [isVisible, isMinimized]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={chatRef}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className={`fixed z-50 ${
          isMinimized 
            ? 'cursor-move' 
            : 'cursor-default'
        }`}
        style={{
          left: isMinimized ? position.x : 'auto',
          top: isMinimized ? position.y : 'auto',
          right: isMinimized ? 'auto' : '20px',
          bottom: isMinimized ? 'auto' : '20px',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {isMinimized ? (
          // Minimized bubble
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full shadow-lg flex items-center justify-center cursor-pointer"
            onClick={() => setIsMinimized(false)}
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </motion.div>
        ) : (
          // Expanded chat panel
          <motion.div
            initial={{ height: 0, width: 0 }}
            animate={{ height: 'auto', width: '320px' }}
            exit={{ height: 0, width: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-black/20 border-b border-purple-500/20">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium text-sm">Challenge Chat</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors rounded"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors rounded"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
              {/* Voice Chat */}
              <div className="bg-black/20 rounded-lg p-2">
                <VoiceChat 
                  challengeId={challengeId} 
                  currentWallet={currentWallet} 
                />
              </div>

              {/* Text Chat */}
              <div className="bg-black/20 rounded-lg">
                <ChatBox 
                  challengeId={challengeId} 
                  currentWallet={currentWallet} 
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-2 bg-black/20 border-t border-purple-500/20">
              <p className="text-xs text-gray-400 text-center">
                💡 Drag the bubble to move it around
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
