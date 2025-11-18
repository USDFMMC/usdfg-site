import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handlePhantomReturn, isPhantomReturn } from '@/lib/wallet/phantom-deeplink';

/**
 * Phantom Return Page
 * Handles the return from Phantom deep link connection
 * Decrypts the payload, saves to sessionStorage, then redirects to /app
 */
const PhantomReturnPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Phantom connection...');

  useEffect(() => {
    console.log('🔄 Phantom Return Page Loaded');
    console.log('🔎 URL Search Params:', window.location.search);

    if (!isPhantomReturn()) {
      console.warn('⚠️ Not a Phantom return - redirecting to /app');
      navigate('/app');
      return;
    }

    try {
      console.log('🔍 Processing Phantom return...');
      const result = handlePhantomReturn();

      if (result && result.publicKey) {
        console.log('🔓 Decrypted Phantom payload:', result);
        console.log('💾 Saving payload to sessionStorage');

        // Save the session to sessionStorage
        const sessionData = {
          public_key: result.publicKey,
          session: result.session,
          connected_at: new Date().toISOString(),
        };

        sessionStorage.setItem('phantomSession', JSON.stringify(sessionData));
        console.log('✅ Saved Phantom session to sessionStorage');

        setStatus('success');
        setMessage('Connection successful! Redirecting...');

        // Redirect to /app after a brief delay
        setTimeout(() => {
          console.log('🔄 Redirecting to /app...');
          navigate('/app');
        }, 1000);
      } else {
        console.error('❌ Failed to decrypt Phantom payload');
        setStatus('error');
        setMessage('Failed to process connection. Redirecting...');
        setTimeout(() => {
          navigate('/app');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error processing Phantom return:', error);
      setStatus('error');
      setMessage('Connection error. Redirecting...');
      setTimeout(() => {
        navigate('/app');
      }, 2000);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#07080C] flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          {status === 'processing' && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto"></div>
          )}
          {status === 'success' && (
            <div className="text-green-400 text-4xl mb-2">✅</div>
          )}
          {status === 'error' && (
            <div className="text-red-400 text-4xl mb-2">❌</div>
          )}
        </div>
        <p className="text-white text-lg">{message}</p>
      </div>
    </div>
  );
};

export default PhantomReturnPage;

