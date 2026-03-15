/**
 * useContractData - React hook that fetches live vault state from deployed contracts
 *
 * Provides: tvl, totalShares, sharePrice, userPosition, btcPrice, sBtcBalance
 * Auto-refreshes every 30 seconds and on wallet address change.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { principalCV } from '@stacks/transactions'
import {
  readOnly,
  CONTRACTS,
  STACKS_API,
  SBTC_CONTRACT,
  PRECISION,
  extractUint,
  extractTuple,
  extractOptionalUint,
  splitContract,
} from '../lib/contracts'

const REFRESH_INTERVAL = 30_000 // 30 seconds

/**
 * Fetch the sBTC (SIP-010) balance for an address via the Hiro API.
 * Falls back to 0 on any error.
 */
async function fetchSbtcBalance(address) {
  try {
    const { contractAddress, contractName } = splitContract(SBTC_CONTRACT)
    const url = `${STACKS_API}/extended/v1/address/${address}/balances`
    const res = await fetch(url)
    if (!res.ok) return 0n

    const data = await res.json()
    // fungible_tokens keyed by "<addr>.<name>::<asset-name>"
    const ftKey = Object.keys(data.fungible_tokens || {}).find(
      (k) => k.startsWith(`${contractAddress}.${contractName}`)
    )
    if (ftKey) {
      return BigInt(data.fungible_tokens[ftKey].balance)
    }
    return 0n
  } catch {
    return 0n
  }
}

/**
 * Fetch the STX balance for an address.
 */
async function fetchStxBalance(address) {
  try {
    const url = `${STACKS_API}/extended/v1/address/${address}/stx`
    const res = await fetch(url)
    if (!res.ok) return 0n
    const data = await res.json()
    return BigInt(data.balance || '0')
  } catch {
    return 0n
  }
}

export function useContractData(stxAddress) {
  const [data, setData] = useState({
    tvl: 0n,           // total assets in vault (sats)
    totalShares: 0n,    // total shares outstanding
    sharePrice: 0n,     // share price (PRECISION-scaled)
    userShares: 0n,     // user's shares
    userAssetValue: 0n, // user's share value in sats
    userDeposited: 0n,  // user's total deposited in sats
    btcPrice: 0n,       // BTC/USD price (PRECISION-scaled)
    btcPriceFresh: false,
    sbtcBalance: 0n,    // user's sBTC wallet balance (sats)
    stxBalance: 0n,     // user's STX balance (micro-STX)
    isPaused: false,
    loading: true,
    error: null,
  })

  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      // Build batch of read-only calls
      const calls = [
        readOnly(CONTRACTS.aggregator, 'get-total-assets'),
        readOnly(CONTRACTS.aggregator, 'get-total-shares'),
        readOnly(CONTRACTS.aggregator, 'get-share-price'),
        readOnly(CONTRACTS.aggregator, 'is-paused'),
      ]

      // User-specific calls
      if (stxAddress) {
        calls.push(
          readOnly(CONTRACTS.aggregator, 'get-position', [principalCV(stxAddress)]),
          fetchSbtcBalance(stxAddress),
          fetchStxBalance(stxAddress),
        )
      }

      // Oracle price - try-get-btc-price returns (optional uint), won't revert
      calls.push(readOnly(CONTRACTS.oracle, 'try-get-btc-price'))

      const results = await Promise.allSettled(calls)

      if (!mountedRef.current) return

      const getValue = (idx) => {
        const r = results[idx]
        return r?.status === 'fulfilled' ? r.value : null
      }

      const tvl = extractUint(getValue(0))
      const totalShares = extractUint(getValue(1))
      const sharePrice = extractUint(getValue(2))

      // is-paused returns a bool
      const pausedCV = getValue(3)
      const isPaused = pausedCV?.type === 0x03 ? true : pausedCV?.value === true

      let userShares = 0n, userAssetValue = 0n, userDeposited = 0n
      let sbtcBalance = 0n, stxBalance = 0n

      if (stxAddress) {
        const position = extractTuple(getValue(4))
        userShares = position.shares ?? 0n
        userAssetValue = position['asset-value'] ?? 0n
        userDeposited = position.deposited ?? 0n

        // fetchSbtcBalance returns bigint directly (not a CV)
        const sbtcResult = results[5]
        sbtcBalance = sbtcResult?.status === 'fulfilled' ? sbtcResult.value : 0n

        const stxResult = results[6]
        stxBalance = stxResult?.status === 'fulfilled' ? stxResult.value : 0n
      }

      // Oracle price
      const oracleIdx = stxAddress ? 7 : 4
      const btcPriceOpt = extractOptionalUint(getValue(oracleIdx))
      const btcPrice = btcPriceOpt ?? 0n
      const btcPriceFresh = btcPriceOpt !== null

      setData({
        tvl,
        totalShares,
        sharePrice,
        userShares,
        userAssetValue,
        userDeposited,
        btcPrice,
        btcPriceFresh,
        sbtcBalance,
        stxBalance,
        isPaused,
        loading: false,
        error: null,
      })
    } catch (err) {
      console.error('useContractData fetch error:', err)
      if (mountedRef.current) {
        setData((prev) => ({ ...prev, loading: false, error: err.message }))
      }
    }
  }, [stxAddress])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    const interval = setInterval(fetchData, REFRESH_INTERVAL)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [fetchData])

  return { ...data, refresh: fetchData }
}
