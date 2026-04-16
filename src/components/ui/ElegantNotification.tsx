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
        return <AlertTriangle className="h-5 w-5 text-orange-400" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      default:
        return <Info className="h-5 w-5 text-purple-300" />;
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
          glow: 'rgba(248, 113, 113, 0.12)',
          topBar: 'from-transparent via-red-300/60 to-transparent',
        };
      case 'warning':
        return {
          bg: 'from-orange-950/40 via-orange-950/20 to-orange-950/40',
          border: 'border-orange-500/35',
          text: 'text-orange-100',
          title: 'text-orange-200',
          glow: 'rgba(251, 146, 60, 0.12)',
          topBar: 'from-transparent via-orange-300/60 to-transparent',
        };
      case 'success':
        return {
          bg: 'from-green-500/10 via-green-500/5 to-green-500/10',
          border: 'border-green-400/30',
          text: 'text-green-200',
          title: 'text-green-300',
          glow: 'rgba(74, 222, 128, 0.12)',
          topBar: 'from-transparent via-green-300/60 to-transparent',
        };
      default:
        return {
          bg: 'from-[#07080C]/95 via-purple-950/25 to-[#07080C]/95',
          border: 'border-white/10',
          text: 'text-white/80',
          title: 'text-purple-200',
          glow: 'rgba(124, 58, 237, 0.12)',
          topBar: 'from-transparent via-purple-300/50 to-transparent',
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
            className={`relative w-[90vw] max-w-md rounded-xl bg-gradient-to-br ${colors.bg} border ${colors.border} ring-1 ring-white/5 backdrop-blur-md pointer-events-auto`}
            style={{ boxShadow: `0 12px 40px ${colors.glow}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${colors.topBar}`} />
            
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
                  className="flex-shrink-0 p-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
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

