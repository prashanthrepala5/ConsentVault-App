/**
 * ConsentVault - Indexer Query Script
 * Queries consent history from Algorand Indexer for audit purposes
 * 
 * Usage: 
 *   node scripts/indexer-query.js --address <ALGO_ADDRESS>
 *   node scripts/indexer-query.js --all
 *   node scripts/indexer-query.js --company <COMPANY_ID>
 */

import algosdk from 'algosdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  indexerToken: process.env.INDEXER_TOKEN || '',
  indexerServer: process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud',
  indexerPort: '',
};

// Parse consent data from log
function parseConsentLog(logBase64) {
  try {
    const logData = Buffer.from(logBase64, 'base64').toString();
    
    if (logData.startsWith('ConsentCreated:')) {
      const parts = logData.split(':');
      return {
        type: 'created',
        consentId: parts[1],
        userAddress: parts[2],
        companyId: parts[3],
        purposeCode: parts[4],
      };
    }
    
    if (logData.startsWith('ConsentRevoked:')) {
      const parts = logData.split(':');
      return {
        type: 'revoked',
        consentIndex: parts[1],
        userAddress: parts[2],
        timestamp: parts[3],
      };
    }
    
    if (logData.startsWith('ConsentVerified:')) {
      const parts = logData.split(':');
      return {
        type: 'verified',
        userAddress: parts[1],
        consentIndex: parts[2],
        verifierAddress: parts[3],
      };
    }
    
    return { type: 'unknown', raw: logData };
  } catch (error) {
    return { type: 'parse_error', error: error.message };
  }
}

async function queryConsentHistory(options) {
  console.log('🔍 ConsentVault Indexer Query');
  console.log('=============================\n');

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
  console.log(`📱 Application ID: ${appId}`);
  console.log(`🌐 Network: ${deployment.network}\n`);

  // Initialize indexer client
  const indexerClient = new algosdk.Indexer(
    config.indexerToken,
    config.indexerServer,
    config.indexerPort
  );

  // Query application transactions
  console.log('📥 Fetching transaction history...\n');

  let query = indexerClient.searchForTransactions()
    .applicationID(appId)
    .limit(100);

  // Filter by address if provided
  if (options.address) {
    query = query.address(options.address);
    console.log(`🔎 Filtering by address: ${options.address}\n`);
  }

  const response = await query.do();
  const transactions = response.transactions || [];

  console.log(`📊 Found ${transactions.length} transactions\n`);

  if (transactions.length === 0) {
    console.log('No transactions found for this application.');
    return;
  }

  // Process and display transactions
  const consentEvents = [];

  for (const txn of transactions) {
    const event = {
      txId: txn.id,
      timestamp: new Date(txn['round-time'] * 1000).toISOString(),
      sender: txn.sender,
      type: 'unknown',
    };

    // Parse application args
    if (txn['application-transaction']) {
      const appTxn = txn['application-transaction'];
      
      if (appTxn['on-completion'] === 'optin') {
        event.type = 'opt-in';
      } else if (appTxn['application-args'] && appTxn['application-args'].length > 0) {
        const method = Buffer.from(appTxn['application-args'][0], 'base64').toString();
        event.method = method;
        
        if (method === 'create') {
          event.type = 'consent-created';
          if (appTxn['application-args'].length > 1) {
            event.companyId = Buffer.from(appTxn['application-args'][1], 'base64').toString();
          }
          if (appTxn['application-args'].length > 2) {
            event.purposeCode = Buffer.from(appTxn['application-args'][2], 'base64').toString();
          }
        } else if (method === 'revoke') {
          event.type = 'consent-revoked';
          if (appTxn['application-args'].length > 1) {
            event.consentIndex = algosdk.decodeUint64(
              Buffer.from(appTxn['application-args'][1], 'base64'),
              'safe'
            );
          }
        } else if (method === 'verify') {
          event.type = 'consent-verified';
        }
      }
    }

    // Parse logs
    if (txn.logs && txn.logs.length > 0) {
      event.parsedLogs = txn.logs.map(parseConsentLog);
    }

    consentEvents.push(event);
  }

  // Filter by company if provided
  let filteredEvents = consentEvents;
  if (options.company) {
    filteredEvents = consentEvents.filter(e => 
      e.companyId && e.companyId.toLowerCase().includes(options.company.toLowerCase())
    );
    console.log(`🔎 Filtering by company: ${options.company}`);
    console.log(`📊 Matching events: ${filteredEvents.length}\n`);
  }

  // Display results
  console.log('📋 Consent Event History');
  console.log('========================\n');

  for (const event of filteredEvents) {
    console.log(`🕐 ${event.timestamp}`);
    console.log(`   Type: ${event.type}`);
    console.log(`   Sender: ${event.sender}`);
    
    if (event.companyId) {
      console.log(`   Company: ${event.companyId}`);
    }
    if (event.purposeCode) {
      console.log(`   Purpose: ${event.purposeCode}`);
    }
    if (event.consentIndex !== undefined) {
      console.log(`   Consent Index: ${event.consentIndex}`);
    }
    
    console.log(`   Tx: ${event.txId}`);
    console.log();
  }

  // Summary statistics
  console.log('📈 Summary');
  console.log('----------');
  console.log(`Total transactions: ${filteredEvents.length}`);
  console.log(`Opt-ins: ${filteredEvents.filter(e => e.type === 'opt-in').length}`);
  console.log(`Consents created: ${filteredEvents.filter(e => e.type === 'consent-created').length}`);
  console.log(`Consents revoked: ${filteredEvents.filter(e => e.type === 'consent-revoked').length}`);
  console.log(`Verifications: ${filteredEvents.filter(e => e.type === 'consent-verified').length}`);

  // Export to JSON
  const exportPath = path.join(__dirname, '..', 'audit-export.json');
  fs.writeFileSync(exportPath, JSON.stringify({
    queryTime: new Date().toISOString(),
    appId,
    network: deployment.network,
    filters: options,
    totalEvents: filteredEvents.length,
    events: filteredEvents,
  }, null, 2));
  
  console.log(`\n💾 Full audit log exported to: audit-export.json`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--address' && args[i + 1]) {
    options.address = args[i + 1];
    i++;
  } else if (args[i] === '--company' && args[i + 1]) {
    options.company = args[i + 1];
    i++;
  } else if (args[i] === '--all') {
    options.all = true;
  } else if (args[i] === '--help') {
    console.log('Usage:');
    console.log('  node scripts/indexer-query.js --all');
    console.log('  node scripts/indexer-query.js --address <ALGO_ADDRESS>');
    console.log('  node scripts/indexer-query.js --company <COMPANY_ID>');
    process.exit(0);
  }
}

queryConsentHistory(options)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Query failed:', error);
    process.exit(1);
  });
