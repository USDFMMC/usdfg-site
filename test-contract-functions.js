import { Connection, PublicKey } from '@solana/web3.js';

// Configuration
const PROGRAM_ID = new PublicKey('BRY2pCUWF4hq6cxz6Sm4BwG9NdurVqrgMneXA97JX8wu');
const RPC_URL = 'https://api.devnet.solana.com';

async function testContractFunctions() {
  console.log('🔍 Testing smart contract functions...');
  const connection = new Connection(RPC_URL, 'confirmed');
  
  try {
    // Check if program exists
    const programInfo = await connection.getAccountInfo(PROGRAM_ID);
    if (!programInfo) {
      console.log('❌ Program does not exist at:', PROGRAM_ID.toString());
      return;
    }
    
    console.log('✅ Program exists at:', PROGRAM_ID.toString());
    console.log('   Owner:', programInfo.owner.toString());
    console.log('   Executable:', programInfo.executable);
    console.log('   Data length:', programInfo.data.length);
    
    // Try to get program data (this might not work for all programs)
    try {
      const programData = await connection.getAccountInfo(PROGRAM_ID);
      console.log('   Program data available');
    } catch (error) {
      console.log('   Program data not accessible:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Error checking program:', error.message);
  }
}

testContractFunctions().catch(console.error);
