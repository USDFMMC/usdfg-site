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
        return <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-purple-300 shrink-0" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'error':
        return {
          border: 'border-red-400/25',
          text: 'text-red-100/90',
          title: 'text-red-200',
          glow: 'rgba(248, 113, 113, 0.15)',
          topBar: 'from-transparent via-red-300/50 to-transparent',
        };
      case 'warning':
        return {
          border: 'border-orange-500/30',
          text: 'text-orange-100/90',
          title: 'text-orange-200',
          glow: 'rgba(251, 146, 60, 0.12)',
          topBar: 'from-transparent via-orange-300/50 to-transparent',
        };
      case 'success':
        return {
          border: 'border-green-400/25',
          text: 'text-green-100/90',
          title: 'text-green-200',
          glow: 'rgba(74, 222, 128, 0.12)',
          topBar: 'from-transparent via-green-300/50 to-transparent',
        };
      default:
        return {
          border: 'border-white/10',
          text: 'text-white/75',
          title: 'text-purple-200',
          glow: 'rgba(124, 58, 237, 0.12)',
          topBar: 'from-transparent via-purple-300/40 to-transparent',
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed z-[100] pointer-events-none top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm sm:left-auto sm:right-4 sm:translate-x-0 sm:w-full sm:max-w-md"
          role="status"
          aria-live="polite"
        >
          <motion.div
            className={`relative rounded-xl border ${colors.border} bg-[#07080C]/85 ring-1 ring-white/5 backdrop-blur-xl pointer-events-auto shadow-lg`}
            style={{ boxShadow: `0 8px 32px ${colors.glow}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${colors.topBar} rounded-t-xl`}
            />

            <motion.div className="p-3.5 sm:p-4">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5">{getIcon()}</div>

                <div className="flex-1 min-w-0">
                  {title && (
                    <h3 className={`text-sm font-semibold ${colors.title} mb-0.5 leading-snug`}>
                      {title}
                    </h3>
                  )}
                  <p className={`text-xs sm:text-sm ${colors.text} leading-relaxed`}>
                    {message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 p-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5 text-zinc-400" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ElegantNotification;
