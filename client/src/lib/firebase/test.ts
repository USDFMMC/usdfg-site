// Firebase integration test
import { addChallenge, fetchChallenges, listenToChallenges } from './firestore';

export const testFirebaseIntegration = async () => {
  console.log('🧪 Testing Firebase integration...');
  
  try {
    // Test 1: Fetch existing challenges
    console.log('📦 Testing fetchChallenges...');
    const challenges = await fetchChallenges();
    console.log('✅ Fetched', challenges.length, 'challenges');
    
    // Test 2: Test real-time listener
    console.log('📡 Testing real-time listener...');
    const unsubscribe = listenToChallenges((liveChallenges) => {
      console.log('✅ Real-time listener working:', liveChallenges.length, 'challenges');
    });
    
    // Clean up listener after 5 seconds
    setTimeout(() => {
      unsubscribe();
      console.log('🧹 Cleaned up test listener');
    }, 5000);
    
    console.log('✅ Firebase integration test completed');
    return true;
  } catch (error) {
    console.error('❌ Firebase integration test failed:', error);
    return false;
  }
};

// Auto-run test in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development mode: Running Firebase test...');
  testFirebaseIntegration();
}
