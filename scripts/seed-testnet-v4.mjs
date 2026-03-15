/**
 * StackVault - Seed testnet for vault-aggregator-v4 (auto-loop version)
 *
 * Transactions (in order):
 * 1. Refresh oracle BTC price ($85,000)
 * 2. Mint 5 sBTC to deployer
 * 3. Mint 500k USDCx to deployer (for DEX liquidity)
 * 4. Add 2 sBTC liquidity to DEX
 * 5. Add 200k USDCx liquidity to DEX
 * 6. Deposit 0.5 sBTC into vault-aggregator-v4 (auto-loops 3x!)
 *
 * Usage: node scripts/seed-testnet-v4.mjs
 */

import {
  makeContractCall,
  broadcastTransaction,
  uintCV,
  principalCV,
  contractPrincipalCV,
  AnchorMode,
  PostConditionMode,
} from '@stacks/transactions'

const DEPLOYER = 'ST2Q7YP8G3VW4HZ40R964B92TA4CCZP02017Y8Y3T'
const PRIVATE_KEY = 'fed151da8a736148e9576f7767a20687d55fd6e1720b56e1bab250745cdead4201'
const API = 'https://api.testnet.hiro.so'

const BTC_PRICE = 8_500_000_000_000n
const SBTC_MINT = 500_000_000n            // 5 sBTC
const USDCX_MINT = 500_000_000_000n       // 500k USDCx (6 decimals)
const DEX_SBTC_LIQ = 200_000_000n         // 2 sBTC for DEX
const DEX_USDCX_LIQ = 200_000_000_000n    // 200k USDCx for DEX
const VAULT_DEPOSIT = 50_000_000n          // 0.5 sBTC

const SBTC_TRAIT = contractPrincipalCV(DEPLOYER, 'sbtc-token')
const USDCX_TRAIT = contractPrincipalCV(DEPLOYER, 'usdcx-token-mock')

async function getNonce() {
  const res = await fetch(`${API}/v2/accounts/${DEPLOYER}`)
  const data = await res.json()
  return data.nonce
}

async function sendTx(label, opts) {
  console.log(`\n=== ${label} ===`)
  try {
    const txn = await makeContractCall({
      ...opts,
      senderKey: PRIVATE_KEY,
      network: 'testnet',
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: 50000n,
    })
    const result = await broadcastTransaction({ transaction: txn, network: 'testnet' })
    if (result.error) {
      console.error(`  BROADCAST FAILED: ${result.error} - ${result.reason}`)
      if (result.reason_data) console.error('  Data:', JSON.stringify(result.reason_data))
      return null
    }
    console.log(`  TXID: ${result.txid}`)
    console.log(`  https://explorer.hiro.so/txid/${result.txid}?chain=testnet`)
    return result.txid
  } catch (err) {
    console.error(`  ERROR: ${err.message}`)
    return null
  }
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

  // TX 1: Refresh Oracle
  const tx1 = await sendTx('TX 1: Update Oracle BTC Price to $85,000', {
    contractAddress: DEPLOYER,
    contractName: 'vault-oracle',
    functionName: 'update-btc-price',
    functionArgs: [uintCV(BTC_PRICE)],
    nonce: nonce++,
  })
  if (!tx1) { console.error('Aborting'); process.exit(1) }
  const ok1 = await waitForTx(tx1)
  if (!ok1) { console.error('Oracle update failed'); process.exit(1) }

  // TX 2: Mint 5 sBTC
  const tx2 = await sendTx('TX 2: Mint 5 sBTC to deployer', {
    contractAddress: DEPLOYER,
    contractName: 'sbtc-token',
    functionName: 'mint',
    functionArgs: [uintCV(SBTC_MINT), principalCV(DEPLOYER)],
    nonce: nonce++,
  })
  if (!tx2) { console.error('Aborting'); process.exit(1) }
  const ok2 = await waitForTx(tx2)
  if (!ok2) { console.error('Mint sBTC failed'); process.exit(1) }

  // TX 3: Mint 500k USDCx
  const tx3 = await sendTx('TX 3: Mint 500k USDCx to deployer', {
    contractAddress: DEPLOYER,
    contractName: 'usdcx-token-mock',
    functionName: 'mint',
    functionArgs: [uintCV(USDCX_MINT), principalCV(DEPLOYER)],
    nonce: nonce++,
  })
  if (!tx3) { console.error('Aborting'); process.exit(1) }
  const ok3 = await waitForTx(tx3)
  if (!ok3) { console.error('Mint USDCx failed'); process.exit(1) }

  // TX 4: Add 2 sBTC liquidity to DEX
  const tx4 = await sendTx('TX 4: Add 2 sBTC liquidity to DEX', {
    contractAddress: DEPLOYER,
    contractName: 'dex-mock',
    functionName: 'add-sbtc-liquidity',
    functionArgs: [uintCV(DEX_SBTC_LIQ), SBTC_TRAIT],
    nonce: nonce++,
  })
  if (!tx4) { console.error('Aborting'); process.exit(1) }
  const ok4 = await waitForTx(tx4)
  if (!ok4) { console.error('DEX sBTC liquidity failed'); process.exit(1) }

  // TX 5: Add 200k USDCx liquidity to DEX
  const tx5 = await sendTx('TX 5: Add 200k USDCx liquidity to DEX', {
    contractAddress: DEPLOYER,
    contractName: 'dex-mock',
    functionName: 'add-usdcx-liquidity',
    functionArgs: [uintCV(DEX_USDCX_LIQ), USDCX_TRAIT],
    nonce: nonce++,
  })
  if (!tx5) { console.error('Aborting'); process.exit(1) }
  const ok5 = await waitForTx(tx5)
  if (!ok5) { console.error('DEX USDCx liquidity failed'); process.exit(1) }

  // TX 6: Deposit 0.5 sBTC into vault-aggregator-v4 (AUTO-LOOPS!)
  const tx6 = await sendTx('TX 6: Deposit 0.5 sBTC into vault-aggregator-v4 (auto-loop!)', {
    contractAddress: DEPLOYER,
    contractName: 'vault-aggregator-v4',
    functionName: 'deposit',
    functionArgs: [
      uintCV(VAULT_DEPOSIT),
      uintCV(0n),
      SBTC_TRAIT,
    ],
    nonce: nonce++,
  })
  if (!tx6) { console.error('Aborting'); process.exit(1) }
  const ok6 = await waitForTx(tx6)
  if (!ok6) { console.error('Deposit failed'); process.exit(1) }

  console.log('\n========================================')
  console.log('ALL TRANSACTIONS CONFIRMED!')
  console.log('========================================')
  console.log('Oracle: $85,000 BTC price set')
  console.log('DEX: +2 sBTC + 200k USDCx liquidity')
  console.log('Vault v4: 0.5 sBTC deposited (auto-looped 3x!)')
  console.log('Check the frontend at /app to see live auto-loop state!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
