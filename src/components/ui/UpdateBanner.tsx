import React from 'react';
import { forceReload } from '@/lib/version';

interface UpdateBannerProps {
  onDismiss?: () => void;
}

const UpdateBanner: React.FC<UpdateBannerProps> = ({ onDismiss }) => {
  const handleUpdate = () => {
    console.log('🔄 User clicked update button');
    forceReload();
  };

  const handleDismiss = () => {
    console.log('⏭️ User dismissed update banner');
    onDismiss?.();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🆕</span>
          <div>
            <p className="font-semibold">New Version Available!</p>
            <p className="text-sm opacity-90">Click Update to get the latest features and fixes.</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-white text-cyan-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Update Now
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 bg-transparent border border-white text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateBanner;

