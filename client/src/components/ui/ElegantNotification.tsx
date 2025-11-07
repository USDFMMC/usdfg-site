import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react";

interface ElegantNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  duration?: number; // Auto-close duration in ms (0 = no auto-close)
}

const ElegantNotification: React.FC<ElegantNotificationProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  duration = 5000
}) => {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      default:
        return <Info className="h-5 w-5 text-amber-300" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'from-red-500/10 via-red-500/5 to-red-500/10',
          border: 'border-red-400/30',
          text: 'text-red-200',
          title: 'text-red-300',
          glow: 'rgba(248, 113, 113, 0.15)'
        };
      case 'warning':
        return {
          bg: 'from-amber-500/20 via-orange-500/15 to-amber-500/20',
          border: 'border-amber-400/40',
          text: 'text-amber-200',
          title: 'text-amber-300',
          glow: 'rgba(255, 215, 130, 0.15)'
        };
      case 'success':
        return {
          bg: 'from-green-500/10 via-green-500/5 to-green-500/10',
          border: 'border-green-400/30',
          text: 'text-green-200',
          title: 'text-green-300',
          glow: 'rgba(74, 222, 128, 0.15)'
        };
      default:
        return {
          bg: 'from-amber-500/20 via-orange-500/15 to-amber-500/20',
          border: 'border-amber-400/40',
          text: 'text-amber-200',
          title: 'text-amber-300',
          glow: 'rgba(255, 215, 130, 0.15)'
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`relative w-[90vw] max-w-md rounded-xl bg-gradient-to-br ${colors.bg} border ${colors.border} shadow-[0_0_30px_${colors.glow}] backdrop-blur-md pointer-events-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Border Glow */}
            <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-${type === 'error' ? 'red' : type === 'success' ? 'green' : 'amber'}-300/60 to-transparent`} />
            
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon()}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  {title && (
                    <h3 className={`text-sm font-semibold ${colors.title} mb-1`}>
                      {title}
                    </h3>
                  )}
                  <p className={`text-sm ${colors.text} leading-relaxed`}>
                    {message}
                  </p>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-1 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
                >
                  <X className="h-4 w-4 text-zinc-400" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ElegantNotification;

