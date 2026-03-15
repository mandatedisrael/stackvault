/**
 * useTransactions - React hook for sending deposit / withdraw contract calls
 *
 * Uses @stacks/connect openContractCall and @stacks/transactions v7 Pc builder
 * for post-conditions.
 */

import { useState, useCallback } from 'react'
import { openContractCall } from '@stacks/connect'
import {
  uintCV,
  contractPrincipalCV,
  Pc,
  PostConditionMode,
} from '@stacks/transactions'
import { CONTRACTS, SBTC_CONTRACT, NETWORK, splitContract } from '../lib/contracts'

const sbtcParts = splitContract(SBTC_CONTRACT)

// Asset name must match the (define-fungible-token <name>) in the contract.
// Mock contract uses 'sbtc-token'; real sBTC mainnet uses 'sbtc-token' as well.
const SBTC_ASSET_NAME = 'sbtc-token'

/**
 * Build post-conditions for a deposit:
 * - User sends exactly `amount` sBTC to the vault contract
 *
 * Note: We use PostConditionMode.Allow because the auto-loop moves sBTC,
 * stSTX, and USDCx through multiple contracts (StackingDAO, Zest, DEX).
 * The user-facing post-condition ensures they only send what they intend.
 */
function depositPostConditions(senderAddress, amount) {
  return [
    Pc.principal(senderAddress)
      .willSendEq(amount)
      .ft(`${sbtcParts.contractAddress}.${sbtcParts.contractName}`, SBTC_ASSET_NAME),
  ]
}

export function useTransactions(stxAddress, onSuccess) {
  const [txStatus, setTxStatus] = useState({ type: null, loading: false, txId: null, error: null })

  const deposit = useCallback(async (amountSats) => {
    if (!stxAddress) return
    setTxStatus({ type: 'deposit', loading: true, txId: null, error: null })

    try {
      const aggParts = splitContract(CONTRACTS.aggregator)
      const sbtcCV = contractPrincipalCV(sbtcParts.contractAddress, sbtcParts.contractName)

      await openContractCall({
        contractAddress: aggParts.contractAddress,
        contractName: aggParts.contractName,
        functionName: 'deposit',
        functionArgs: [
          uintCV(amountSats),   // amount
          uintCV(0),            // min-shares (0 = no slippage protection for simplicity)
          sbtcCV,               // token trait
        ],
        postConditionMode: PostConditionMode.Allow,
        postConditions: depositPostConditions(stxAddress, amountSats),
        network: NETWORK,
        onFinish: (result) => {
          setTxStatus({ type: 'deposit', loading: false, txId: result.txId, error: null })
          if (onSuccess) onSuccess('deposit', result.txId)
        },
        onCancel: () => {
          setTxStatus({ type: 'deposit', loading: false, txId: null, error: 'Transaction cancelled' })
        },
      })
    } catch (err) {
      console.error('Deposit error:', err)
      setTxStatus({ type: 'deposit', loading: false, txId: null, error: err.message })
    }
  }, [stxAddress, onSuccess])

  const withdraw = useCallback(async (shares, minAssets = 0n) => {
    if (!stxAddress) return
    setTxStatus({ type: 'withdraw', loading: true, txId: null, error: null })

    try {
      const aggParts = splitContract(CONTRACTS.aggregator)
      const sbtcCV = contractPrincipalCV(sbtcParts.contractAddress, sbtcParts.contractName)

      // Auto-unwind moves sBTC, stSTX, and USDCx through multiple contracts.
      // We use PostConditionMode.Allow to permit all internal token movements.
      await openContractCall({
        contractAddress: aggParts.contractAddress,
        contractName: aggParts.contractName,
        functionName: 'withdraw',
        functionArgs: [
          uintCV(shares),       // shares to burn
          uintCV(minAssets),    // min-assets (slippage protection)
          sbtcCV,               // token trait
        ],
        postConditionMode: PostConditionMode.Allow,
        postConditions: [],
        network: NETWORK,
        onFinish: (result) => {
          setTxStatus({ type: 'withdraw', loading: false, txId: result.txId, error: null })
          if (onSuccess) onSuccess('withdraw', result.txId)
        },
        onCancel: () => {
          setTxStatus({ type: 'withdraw', loading: false, txId: null, error: 'Transaction cancelled' })
        },
      })
    } catch (err) {
      console.error('Withdraw error:', err)
      setTxStatus({ type: 'withdraw', loading: false, txId: null, error: err.message })
    }
  }, [stxAddress, onSuccess])

  const clearStatus = useCallback(() => {
    setTxStatus({ type: null, loading: false, txId: null, error: null })
  }, [])

  return { deposit, withdraw, txStatus, clearStatus }
}
