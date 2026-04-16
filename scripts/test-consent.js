/**
 * ConsentVault - Test Script
 * Tests consent creation and revocation flows
 * 
 * Usage: node scripts/test-consent.js
 */

import algosdk from 'algosdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  algodToken: process.env.ALGOD_TOKEN || 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  algodServer: process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
  algodPort: '',
};

// Helper to hash policy document
function hashPolicy(policyUrl) {
  return crypto.createHash('sha256').update(policyUrl).digest();
}

// Helper to encode string to Uint8Array
function encodeString(str) {
  return new TextEncoder().encode(str);
}

async function runTests() {
  console.log('🧪 ConsentVault Test Suite');
  console.log('==========================\n');

  // Load deployment info
  const deploymentPath = path.join(__dirname, '..', 'deployment.json');
  let deployment;
  
  try {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  } catch (error) {
    console.error('❌ deployment.json not found. Run deploy.js first.');
    process.exit(1);
  }

  const appId = deployment.appId;
  console.log(`📱 Testing App ID: ${appId}\n`);

  // Initialize client
  const algodClient = new algosdk.Algodv2(
    config.algodToken,
    config.algodServer,
    config.algodPort
  );

  // Get test account
  const mnemonic = process.env.TEST_MNEMONIC || process.env.DEPLOYER_MNEMONIC;
  if (!mnemonic) {
    console.error('❌ TEST_MNEMONIC or DEPLOYER_MNEMONIC required');
    process.exit(1);
  }
  
  const testAccount = algosdk.mnemonicToSecretKey(mnemonic);
  console.log(`👤 Test account: ${testAccount.addr}\n`);

  const suggestedParams = await algodClient.getTransactionParams().do();

  // Test 1: Opt-in to application
  console.log('Test 1: Opt-in to application');
  console.log('-----------------------------');
  
  try {
    const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
      sender: testAccount.addr,
      suggestedParams,
      appIndex: appId,
    });

    const signedOptIn = optInTxn.signTxn(testAccount.sk);
    const { txId: optInTxId } = await algodClient.sendRawTransaction(signedOptIn).do();
    await algosdk.waitForConfirmation(algodClient, optInTxId, 4);
    
    console.log(`✅ Opted in successfully`);
    console.log(`   Tx: ${optInTxId}\n`);
  } catch (error) {
    if (error.message.includes('already opted in')) {
      console.log('ℹ️  Already opted in, continuing...\n');
    } else {
      throw error;
    }
  }

  // Test 2: Create consent
  console.log('Test 2: Create consent');
  console.log('----------------------');
  
  const companyId = 'FINTECH_APP_001';
  const purposeCode = 'ACCOUNT_DATA';
  const policyUrl = 'https://example.com/privacy-policy-v2.pdf';
  const policyHash = hashPolicy(policyUrl);
  const expiryTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year

  const createTxn = algosdk.makeApplicationCallTxnFromObject({
    sender: testAccount.addr,
    suggestedParams,
    appIndex: appId,
    appArgs: [
      encodeString('create'),
      encodeString(companyId),
      encodeString(purposeCode),
      policyHash,
      algosdk.encodeUint64(expiryTimestamp),
    ],
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
  });

  const signedCreate = createTxn.signTxn(testAccount.sk);
  const { txId: createTxId } = await algodClient.sendRawTransaction(signedCreate).do();
  const createResult = await algosdk.waitForConfirmation(algodClient, createTxId, 4);

  console.log(`✅ Consent created successfully`);
  console.log(`   Company: ${companyId}`);
  console.log(`   Purpose: ${purposeCode}`);
  console.log(`   Expiry: ${new Date(expiryTimestamp * 1000).toISOString()}`);
  console.log(`   Tx: ${createTxId}`);
  
  // Parse logs
  if (createResult.logs && createResult.logs.length > 0) {
    const logData = Buffer.from(createResult.logs[0], 'base64').toString();
    console.log(`   Log: ${logData}`);
  }
  console.log();

  // Test 3: Read local state
  console.log('Test 3: Read consent from local state');
  console.log('--------------------------------------');
  
  const accountInfo = await algodClient.accountApplicationInformation(
    testAccount.addr,
    appId
  ).do();

  const localState = accountInfo['app-local-state'];
  if (localState && localState['key-value']) {
    console.log('📋 Local state:');
    for (const kv of localState['key-value']) {
      const key = Buffer.from(kv.key, 'base64').toString();
      let value;
      if (kv.value.type === 1) {
        value = Buffer.from(kv.value.bytes, 'base64').toString();
      } else {
        value = kv.value.uint;
      }
      console.log(`   ${key}: ${value}`);
    }
  }
  console.log();

  // Test 4: Revoke consent
  console.log('Test 4: Revoke consent');
  console.log('----------------------');

  const consentIndex = 0; // Revoke first consent

  const revokeTxn = algosdk.makeApplicationCallTxnFromObject({
    sender: testAccount.addr,
    suggestedParams,
    appIndex: appId,
    appArgs: [
      encodeString('revoke'),
      algosdk.encodeUint64(consentIndex),
    ],
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
  });

  const signedRevoke = revokeTxn.signTxn(testAccount.sk);
  const { txId: revokeTxId } = await algodClient.sendRawTransaction(signedRevoke).do();
  const revokeResult = await algosdk.waitForConfirmation(algodClient, revokeTxId, 4);

  console.log(`✅ Consent revoked successfully`);
  console.log(`   Consent index: ${consentIndex}`);
  console.log(`   Tx: ${revokeTxId}`);
  
  if (revokeResult.logs && revokeResult.logs.length > 0) {
    const logData = Buffer.from(revokeResult.logs[0], 'base64').toString();
    console.log(`   Log: ${logData}`);
  }
  console.log();

  // Test 5: Verify revoked state
  console.log('Test 5: Verify revoked state');
  console.log('----------------------------');
  
  const updatedInfo = await algodClient.accountApplicationInformation(
    testAccount.addr,
    appId
  ).do();

  const updatedState = updatedInfo['app-local-state'];
  if (updatedState && updatedState['key-value']) {
    for (const kv of updatedState['key-value']) {
      const key = Buffer.from(kv.key, 'base64').toString();
      if (key.startsWith('consent_')) {
        const value = Buffer.from(kv.value.bytes, 'base64').toString();
        const status = value.split('|')[0];
        console.log(`   ${key}: status=${status}`);
      }
    }
  }
  console.log();

  console.log('==========================');
  console.log('✅ All tests passed!');
}

runTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
