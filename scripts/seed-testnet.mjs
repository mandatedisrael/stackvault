/**
 * StackVault - Seed testnet for demo
 *
 * Transactions (in order):
 * 1. Refresh oracle BTC price ($85,000)
 * 2. Mint 2 sBTC to deployer
 * 3. Add 1 sBTC liquidity to DEX mock (transfer from deployer to dex-mock contract)
 * 4. Deposit 0.5 sBTC into vault-aggregator-v3
 * 5. Execute loop step on vault-aggregator-v3
 *
 * Usage: node scripts/seed-testnet.mjs
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

const BTC_PRICE = 8_500_000_000_000n   // $85,000 at 8 decimals
const SBTC_MINT = 200_000_000n         // 2 sBTC (8 decimals)
const DEX_LIQUIDITY = 100_000_000n     // 1 sBTC for DEX pool
const VAULT_DEPOSIT = 50_000_000n      // 0.5 sBTC deposit into vault

// Trait-implementing contract principals (passed as trait args)
const SBTC_TRAIT = contractPrincipalCV(DEPLOYER, 'sbtc-token')
const STSTX_TRAIT = contractPrincipalCV(DEPLOYER, 'ststx-token-mock')
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
  console.log(`STX will be spent on fees (~0.05 STX per tx, 5 txs = ~0.25 STX)`)

  // -----------------------------------------------------------------------
  // TX 1: Refresh Oracle Price
  // -----------------------------------------------------------------------
  const tx1 = await sendTx('TX 1: Update Oracle BTC Price to $85,000', {
    contractAddress: DEPLOYER,
    contractName: 'vault-oracle',
    functionName: 'update-btc-price',
    functionArgs: [uintCV(BTC_PRICE)],
    nonce: nonce++,
  })
  if (!tx1) { console.error('Aborting: oracle update failed to broadcast'); process.exit(1) }
  const ok1 = await waitForTx(tx1)
  if (!ok1) { console.error('Aborting: oracle update did not confirm'); process.exit(1) }

  // -----------------------------------------------------------------------
  // TX 2: Mint 2 sBTC to deployer
  // -----------------------------------------------------------------------
  const tx2 = await sendTx('TX 2: Mint 2 sBTC to deployer', {
    contractAddress: DEPLOYER,
    contractName: 'sbtc-token',
    functionName: 'mint',
    functionArgs: [uintCV(SBTC_MINT), principalCV(DEPLOYER)],
    nonce: nonce++,
  })
  if (!tx2) { console.error('Aborting: mint failed to broadcast'); process.exit(1) }
  const ok2 = await waitForTx(tx2)
  if (!ok2) { console.error('Aborting: mint did not confirm'); process.exit(1) }

  // -----------------------------------------------------------------------
  // TX 3: Add 1 sBTC liquidity to DEX mock
  // -----------------------------------------------------------------------
  const tx3 = await sendTx('TX 3: Add 1 sBTC liquidity to DEX', {
    contractAddress: DEPLOYER,
    contractName: 'dex-mock',
    functionName: 'add-sbtc-liquidity',
    functionArgs: [uintCV(DEX_LIQUIDITY), SBTC_TRAIT],
    nonce: nonce++,
  })
  if (!tx3) { console.error('Aborting: DEX liquidity failed to broadcast'); process.exit(1) }
  const ok3 = await waitForTx(tx3)
  if (!ok3) { console.error('Aborting: DEX liquidity did not confirm'); process.exit(1) }

  // -----------------------------------------------------------------------
  // TX 4: Deposit 0.5 sBTC into vault-aggregator-v3
  // -----------------------------------------------------------------------
  const tx4 = await sendTx('TX 4: Deposit 0.5 sBTC into vault', {
    contractAddress: DEPLOYER,
    contractName: 'vault-aggregator-v3',
    functionName: 'deposit',
    functionArgs: [
      uintCV(VAULT_DEPOSIT),   // amount
      uintCV(0n),              // min-shares (0 = no slippage protection for demo)
      SBTC_TRAIT,              // token trait
    ],
    nonce: nonce++,
  })
  if (!tx4) { console.error('Aborting: deposit failed to broadcast'); process.exit(1) }
  const ok4 = await waitForTx(tx4)
  if (!ok4) { console.error('Aborting: deposit did not confirm'); process.exit(1) }

  // -----------------------------------------------------------------------
  // TX 5: Execute loop step (uses all idle sBTC in vault = 0.5 sBTC)
  // -----------------------------------------------------------------------
  const tx5 = await sendTx('TX 5: Execute loop step (0.5 sBTC)', {
    contractAddress: DEPLOYER,
    contractName: 'vault-aggregator-v3',
    functionName: 'execute-loop-step',
    functionArgs: [
      uintCV(VAULT_DEPOSIT),   // sbtc-amount (use all idle)
      SBTC_TRAIT,              // sbtc-token trait
      STSTX_TRAIT,             // ststx-token trait
      USDCX_TRAIT,             // usdcx-token trait
    ],
    nonce: nonce++,
  })
  if (!tx5) { console.error('Loop step failed to broadcast'); process.exit(1) }
  const ok5 = await waitForTx(tx5)
  if (!ok5) { console.error('Loop step did not confirm'); process.exit(1) }

  // -----------------------------------------------------------------------
  // Done!
  // -----------------------------------------------------------------------
  console.log('\n\n========================================')
  console.log('ALL TRANSACTIONS CONFIRMED!')
  console.log('========================================')
  console.log('Oracle: $85,000 BTC price set')
  console.log('DEX: 1 sBTC liquidity added')
  console.log('Vault: 0.5 sBTC deposited')
  console.log('Loop: 1 iteration executed')
  console.log('Check the frontend at /app to see live loop state!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
