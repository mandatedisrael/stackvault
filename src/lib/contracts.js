/**
 * StackVault - Contract addresses, network config, and read-only call helpers
 *
 * All deployed contracts are on Stacks testnet under the deployer address.
 * The sBTC token is a mock SIP-010 faucet deployed for demo/testing purposes.
 */

import { fetchCallReadOnlyFunction, cvToJSON, uintCV, principalCV, ClarityType } from '@stacks/transactions'

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------
export const NETWORK = 'testnet'
export const STACKS_API = 'https://api.testnet.hiro.so'

// ---------------------------------------------------------------------------
// Deployer + Contract names
// ---------------------------------------------------------------------------
export const DEPLOYER = 'ST2Q7YP8G3VW4HZ40R964B92TA4CCZP02017Y8Y3T'

export const CONTRACTS = {
  aggregator: `${DEPLOYER}.vault-aggregator-v2`,
  math:       `${DEPLOYER}.vault-math`,
  oracle:     `${DEPLOYER}.vault-oracle`,
  dao:        `${DEPLOYER}.vault-dao`,
  timelock:   `${DEPLOYER}.vault-timelock`,
}

// Mock sBTC on testnet (deployed as faucet for demo purposes)
export const SBTC_CONTRACT = `${DEPLOYER}.sbtc-token`

// Precision constant (8 decimals, matching sBTC / satoshi)
export const PRECISION = 100_000_000

// ---------------------------------------------------------------------------
// Helpers: split "ADDR.name" into [addr, name]
// ---------------------------------------------------------------------------
export function splitContract(contractId) {
  const [addr, name] = contractId.split('.')
  return { contractAddress: addr, contractName: name }
}

// ---------------------------------------------------------------------------
// Generic read-only call (v7 API: fetchCallReadOnlyFunction)
// ---------------------------------------------------------------------------
export async function readOnly(contractId, functionName, args = []) {
  const { contractAddress, contractName } = splitContract(contractId)

  const result = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName,
    functionName,
    functionArgs: args,
    network: NETWORK,
    senderAddress: DEPLOYER, // sender doesn't matter for read-only
  })

  return result
}

// ---------------------------------------------------------------------------
// Convenience: extract uint from Clarity value (handles ok-wrapped and raw)
// ---------------------------------------------------------------------------
export function extractUint(cv) {
  if (!cv) return 0n
  // Unwrap (ok ...) wrapper
  if (cv.type === ClarityType.ResponseOk) {
    return extractUint(cv.value)
  }
  if (cv.type === ClarityType.UInt) {
    return cv.value // bigint
  }
  // Try cvToJSON fallback
  const json = cvToJSON(cv)
  if (json?.value?.value) return BigInt(json.value.value)
  if (json?.value) return BigInt(json.value)
  return 0n
}

// ---------------------------------------------------------------------------
// Convenience: extract a tuple/object from Clarity value
// ---------------------------------------------------------------------------
export function extractTuple(cv) {
  if (!cv) return {}
  // Unwrap (ok ...)
  if (cv.type === ClarityType.ResponseOk) {
    return extractTuple(cv.value)
  }
  if (cv.type === ClarityType.Tuple) {
    // v7 may use cv.data or cv.value (object of ClarityValues)
    const tupleData = cv.data || cv.value
    if (tupleData && typeof tupleData === 'object') {
      const out = {}
      for (const [key, val] of Object.entries(tupleData)) {
        out[key] = extractUint(val)
      }
      return out
    }
  }
  // Fallback: use cvToJSON
  try {
    const json = cvToJSON(cv)
    if (json?.value && typeof json.value === 'object') {
      const out = {}
      for (const [key, val] of Object.entries(json.value)) {
        out[key] = BigInt(val?.value ?? val ?? 0)
      }
      return out
    }
    return json
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// Convenience: extract optional uint
// ---------------------------------------------------------------------------
export function extractOptionalUint(cv) {
  if (!cv) return null
  if (cv.type === ClarityType.OptionalSome) {
    return extractUint(cv.value)
  }
  if (cv.type === ClarityType.OptionalNone) {
    return null
  }
  return extractUint(cv)
}

// ---------------------------------------------------------------------------
// Format sats to sBTC display string (8 decimals)
// ---------------------------------------------------------------------------
export function formatSbtc(sats) {
  const n = Number(sats)
  return (n / PRECISION).toFixed(8)
}

// ---------------------------------------------------------------------------
// Format USD value (8-decimal scaled) to display string
// ---------------------------------------------------------------------------
export function formatUsd(scaledUsd) {
  const n = Number(scaledUsd) / PRECISION
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

// ---------------------------------------------------------------------------
// Format USD value with decimals
// ---------------------------------------------------------------------------
export function formatUsdDecimals(scaledUsd, decimals = 2) {
  const n = Number(scaledUsd) / PRECISION
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
