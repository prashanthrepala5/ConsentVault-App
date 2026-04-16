/**
 * ConsentVault - Deployment Script
 * Deploys the smart contract to Algorand TestNet
 * 
 * Usage: node scripts/deploy.js
 * 
 * Required env vars:
 * - ALGOD_TOKEN: Algorand node API token
 * - ALGOD_SERVER: Algorand node URL
 * - DEPLOYER_MNEMONIC: 25-word mnemonic for deployment account
 */

import algosdk from 'algosdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  algodToken: process.env.ALGOD_TOKEN || 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  algodServer: process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
  algodPort: process.env.ALGOD_PORT || '',
};

async function deployContract() {
  console.log('🚀 ConsentVault Deployment Script');
  console.log('==================================\n');

  // Initialize Algod client
  const algodClient = new algosdk.Algodv2(
    config.algodToken,
    config.algodServer,
    config.algodPort
  );

  // Get deployer account
  const mnemonic = process.env.DEPLOYER_MNEMONIC;
  if (!mnemonic) {
    console.error('❌ DEPLOYER_MNEMONIC environment variable is required');
    console.log('\nTo generate a new account for testing:');
    console.log('const account = algosdk.generateAccount();');
    console.log('console.log(algosdk.secretKeyToMnemonic(account.sk));');
    process.exit(1);
  }

  const deployer = algosdk.mnemonicToSecretKey(mnemonic);
  console.log(`📍 Deployer address: ${deployer.addr}`);

  // Check deployer balance
  const accountInfo = await algodClient.accountInformation(deployer.addr).do();
  const balance = accountInfo.amount / 1e6;
  console.log(`💰 Deployer balance: ${balance} ALGO\n`);

  if (balance < 1) {
    console.error('❌ Insufficient balance. Need at least 1 ALGO for deployment.');
    console.log('Get testnet ALGO from: https://bank.testnet.algorand.network/');
    process.exit(1);
  }

  // Read TEAL files
  const approvalPath = path.join(__dirname, '..', 'contracts', 'consent_approval.teal');
  const clearPath = path.join(__dirname, '..', 'contracts', 'consent_clear.teal');

  let approvalProgram, clearProgram;

  try {
    approvalProgram = fs.readFileSync(approvalPath, 'utf8');
    clearProgram = fs.readFileSync(clearPath, 'utf8');
  } catch (error) {
    console.error('❌ Could not read TEAL files. Run the Python compile scripts first:');
    console.log('   cd contracts && python approval.py && python clear.py');
    process.exit(1);
  }

  // Compile TEAL to bytecode
  console.log('📝 Compiling TEAL programs...');
  const approvalCompiled = await algodClient.compile(approvalProgram).do();
  const clearCompiled = await algodClient.compile(clearProgram).do();
  
  const approvalBytes = new Uint8Array(Buffer.from(approvalCompiled.result, 'base64'));
  const clearBytes = new Uint8Array(Buffer.from(clearCompiled.result, 'base64'));

  console.log(`   Approval program: ${approvalBytes.length} bytes`);
  console.log(`   Clear program: ${clearBytes.length} bytes\n`);

  // Get suggested params
  const suggestedParams = await algodClient.getTransactionParams().do();

  // Define schema
  const globalSchema = new algosdk.modelsv2.ApplicationStateSchema({
    numUint: 1,    // consent_counter
    numByteSlice: 1 // admin address
  });

  const localSchema = new algosdk.modelsv2.ApplicationStateSchema({
    numUint: 1,     // consent_count per user
    numByteSlice: 16 // up to 16 consent records per user
  });

  // Create application transaction
  console.log('📤 Creating application...');
  const txn = algosdk.makeApplicationCreateTxnFromObject({
    sender: deployer.addr,
    suggestedParams,
    approvalProgram: approvalBytes,
    clearProgram: clearBytes,
    numGlobalByteSlices: 1,
    numGlobalInts: 1,
    numLocalByteSlices: 16,
    numLocalInts: 1,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
  });

  // Sign and send
  const signedTxn = txn.signTxn(deployer.sk);
  const { txid } = await algodClient.sendRawTransaction(signedTxn).do();
  console.log(`   Transaction ID: ${txid}`);

  // Wait for confirmation
  console.log('⏳ Waiting for confirmation...');
  const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txid, 4);
  
  const appId = confirmedTxn['application-index'];
  const appAddress = algosdk.getApplicationAddress(appId);

  console.log('\n✅ Deployment successful!');
  console.log('==================================');
  console.log(`📱 Application ID: ${appId}`);
  console.log(`📍 Application Address: ${appAddress}`);
  console.log(`🔗 View on explorer: https://testnet.algoexplorer.io/application/${appId}`);
  console.log(`📄 Transaction: https://testnet.algoexplorer.io/tx/${txid}`);

  // Save deployment info
  const deploymentInfo = {
    appId,
    appAddress,
    deployer: deployer.addr,
    txId: txid,
    network: 'testnet',
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, '..', 'deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: deployment.json`);

  return deploymentInfo;
}

// Run deployment
deployContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
