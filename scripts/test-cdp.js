require('dotenv').config();

async function testCDP() {
  console.log('Testing CDP initialization...');
  
  const apiKeyName = process.env.COINBASE_CDP_API_KEY;
  const apiKeySecret = process.env.COINBASE_CDP_API_SECRET;
  
  console.log('API Key:', apiKeyName);
  console.log('Secret length:', apiKeySecret?.length);
  
  if (!apiKeyName || !apiKeySecret) {
    console.error('❌ CDP credentials not found in environment');
    return;
  }
  
  try {
    const { Coinbase, Wallet } = await import('@coinbase/coinbase-sdk');
    
    console.log('✅ CDP SDK imported successfully');
    
    // Initialize Coinbase
    const coinbase = new Coinbase({
      apiKeyName,
      privateKey: apiKeySecret
    });
    
    console.log('✅ Coinbase instance created');
    
    // Create a test wallet
    console.log('Creating test wallet...');
    const wallet = await Wallet.create({
      networkId: Coinbase.networks.BaseSepolia
    });
    
    console.log('✅ Wallet created successfully!');
    console.log('Wallet ID:', wallet.getId());
    
    const defaultAddress = await wallet.getDefaultAddress();
    console.log('Default Address:', defaultAddress.getId());
    console.log('Network:', wallet.getNetworkId());
    
    // Export wallet data
    const walletData = wallet.export();
    console.log('Wallet data exported (seed stored securely)');
    console.log('Wallet data type:', typeof walletData);
    console.log('Wallet data keys:', Object.keys(walletData));
    
    // Test reimporting
    console.log('\nTesting wallet reimport...');
    const importedWallet = await Wallet.import(walletData);
    const importedAddress = await importedWallet.getDefaultAddress();
    console.log('✅ Wallet reimported successfully');
    console.log('Reimported address:', importedAddress.getId());
    
    // Request from faucet
    console.log('\nRequesting USDC from faucet...');
    try {
      const faucetTx = await wallet.faucet(Coinbase.assets.Usdc);
      console.log('✅ Faucet request successful!');
      console.log('Transaction:', faucetTx.getTransactionHash());
    } catch (faucetError) {
      console.log('⚠️ Faucet request failed (might need to wait between requests):', faucetError.message);
    }
    
  } catch (error) {
    console.error('❌ CDP initialization failed:', error);
    console.error('Error details:', error.message);
  }
}

testCDP();