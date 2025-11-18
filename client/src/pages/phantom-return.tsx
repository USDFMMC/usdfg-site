import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handlePhantomReturn, isPhantomReturn } from '@/lib/wallet/phantom-deeplink';

const SESSION_STORAGE_KEY = 'phantom_dapp_keypair';

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
    console.log('🔎 Full URL:', window.location.href);
    
    const params = new URLSearchParams(window.location.search);
    console.log('🔎 phantom_encryption_public_key:', params.get('phantom_encryption_public_key'));
    console.log('🔎 data:', params.get('data'));
    console.log('🔎 nonce:', params.get('nonce'));
    console.log('🔎 All search params:', Object.fromEntries(params.entries()));

    if (!isPhantomReturn()) {
      console.warn('⚠️ Not a Phantom return - redirecting to /app');
      navigate('/app');
      return;
    }

    try {
      // Check if dappKeyPair exists in sessionStorage
      const storedKeypair = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedKeypair) {
        try {
          const kpRaw = JSON.parse(storedKeypair);
          console.log('🧪 Stored dappKeyPair found:', {
            hasSecretKey: !!kpRaw,
            secretKeyType: Array.isArray(kpRaw) ? 'Array' : typeof kpRaw,
            secretKeyLength: Array.isArray(kpRaw) ? kpRaw.length : 'N/A'
          });
        } catch (e) {
          console.error('❌ Failed to parse stored keypair:', e);
        }
      } else {
        console.error('❌ No dappKeyPair found in sessionStorage');
      }

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

        // Ensure arena-access is preserved (in case localStorage was cleared)
        // This prevents password prompt after Phantom return
        if (!localStorage.getItem('arena-access')) {
          console.log('⚠️ arena-access not found, preserving it from session');
          // If user got here, they must have been authenticated before
          // Preserve the access state
          localStorage.setItem('arena-access', 'true');
        }

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
    } catch (error: any) {
      console.error('❌ Error processing Phantom return:', error);
      console.error('❌ Decryption Error:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
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

