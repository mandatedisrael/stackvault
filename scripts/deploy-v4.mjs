/**
 * StackVault - Deploy vault-aggregator-v4 (auto-loop version) to testnet
 *
 * Steps:
 * 1. Deploy vault-aggregator-v4 contract
 * 2. Set whitelisted-token to sbtc-token
 * 3. Set operator (deployer)
 *
 * Usage: node scripts/deploy-v4.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import {
  makeContractDeploy,
  makeContractCall,
  broadcastTransaction,
  principalCV,
  boolCV,
  AnchorMode,
  PostConditionMode,
} from '@stacks/transactions'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEPLOYER = 'ST2Q7YP8G3VW4HZ40R964B92TA4CCZP02017Y8Y3T'
const PRIVATE_KEY = 'fed151da8a736148e9576f7767a20687d55fd6e1720b56e1bab250745cdead4201'
const API = 'https://api.testnet.hiro.so'

async function getNonce() {
  const res = await fetch(`${API}/v2/accounts/${DEPLOYER}`)
  const data = await res.json()
  return data.nonce
}

async function waitForTx(txid, maxWait = 600000) {
  if (!txid) return false
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(`${API}/extended/v1/tx/${txid}`)
      const data = await res.json()
      if (data.tx_status === 'success') {
        console.log(`  CONFIRMED in block ${data.block_height}`)
        return true
      }
      if (data.tx_status === 'abort_by_response') {
        console.error(`  TX ABORTED: ${JSON.stringify(data.tx_result)}`)
        return false
      }
      if (data.tx_status === 'abort_by_post_condition') {
        console.error(`  TX ABORTED by post-condition`)
        return false
      }
    } catch {}
    process.stdout.write('.')
    await new Promise(r => setTimeout(r, 10000))
  }
  console.log('\n  TIMEOUT waiting for confirmation')
  return false
}

async function main() {
  let nonce = await getNonce()
  console.log(`Deployer: ${DEPLOYER}`)
  console.log(`Starting nonce: ${nonce}`)

  // -----------------------------------------------------------------------
  // Step 1: Deploy vault-aggregator-v4
  // -----------------------------------------------------------------------
  console.log('\n=== Step 1: Deploy vault-aggregator-v4 ===')

  const contractSource = fs.readFileSync(
    path.join(__dirname, '..', 'contracts', 'vault-aggregator.clar'),
    'utf8'
  )

  const deployTx = await makeContractDeploy({
    contractName: 'vault-aggregator-v4',
    codeBody: contractSource,
    senderKey: PRIVATE_KEY,
    network: 'testnet',
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 200000n,
    nonce: nonce++,
    clarityVersion: 2,
  })

  const deployResult = await broadcastTransaction({ transaction: deployTx, network: 'testnet' })
  if (deployResult.error) {
    console.error(`  DEPLOY FAILED: ${deployResult.error} - ${deployResult.reason}`)
    if (deployResult.reason_data) console.error('  Data:', JSON.stringify(deployResult.reason_data))
    process.exit(1)
  }
  console.log(`  TXID: ${deployResult.txid}`)
  console.log(`  https://explorer.hiro.so/txid/${deployResult.txid}?chain=testnet`)

  const deployOk = await waitForTx(deployResult.txid)
  if (!deployOk) {
    console.error('Deploy did not confirm. Aborting.')
    process.exit(1)
  }

  // -----------------------------------------------------------------------
  // Step 2: Set whitelisted-token to sbtc-token
  // -----------------------------------------------------------------------
  console.log('\n=== Step 2: Set whitelisted-token on vault-aggregator-v4 ===')

  const setTokenTx = await makeContractCall({
    contractAddress: DEPLOYER,
    contractName: 'vault-aggregator-v4',
    functionName: 'set-whitelisted-token',
    functionArgs: [principalCV(`${DEPLOYER}.sbtc-token`)],
    senderKey: PRIVATE_KEY,
    network: 'testnet',
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 50000n,
    nonce: nonce++,
  })

  const setTokenResult = await broadcastTransaction({ transaction: setTokenTx, network: 'testnet' })
  if (setTokenResult.error) {
    console.error(`  SET TOKEN FAILED: ${setTokenResult.error} - ${setTokenResult.reason}`)
    process.exit(1)
  }
  console.log(`  TXID: ${setTokenResult.txid}`)
  console.log(`  https://explorer.hiro.so/txid/${setTokenResult.txid}?chain=testnet`)

  const setTokenOk = await waitForTx(setTokenResult.txid)
  if (!setTokenOk) {
    console.error('Set token did not confirm.')
    process.exit(1)
  }

  // -----------------------------------------------------------------------
  // Step 3: Set deployer as operator
  // -----------------------------------------------------------------------
  console.log('\n=== Step 3: Set deployer as operator on vault-aggregator-v4 ===')

  const setOpTx = await makeContractCall({
    contractAddress: DEPLOYER,
    contractName: 'vault-aggregator-v4',
    functionName: 'set-operator',
    functionArgs: [principalCV(DEPLOYER), boolCV(true)],
    senderKey: PRIVATE_KEY,
    network: 'testnet',
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 50000n,
    nonce: nonce++,
  })

  const setOpResult = await broadcastTransaction({ transaction: setOpTx, network: 'testnet' })
  if (setOpResult.error) {
    console.error(`  SET OPERATOR FAILED: ${setOpResult.error} - ${setOpResult.reason}`)
    process.exit(1)
  }
  console.log(`  TXID: ${setOpResult.txid}`)
  console.log(`  https://explorer.hiro.so/txid/${setOpResult.txid}?chain=testnet`)

  const setOpOk = await waitForTx(setOpResult.txid)
  if (!setOpOk) {
    console.error('Set operator did not confirm.')
    process.exit(1)
  }

  // -----------------------------------------------------------------------
  // Done!
  // -----------------------------------------------------------------------
  console.log('\n========================================')
  console.log('DEPLOYMENT COMPLETE!')
  console.log('========================================')
  console.log(`Contract: ${DEPLOYER}.vault-aggregator-v4`)
  console.log('Whitelisted token: sbtc-token')
  console.log('Operator: deployer')
  console.log('\nNext: Run seed-testnet-v4.mjs to seed the vault')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
