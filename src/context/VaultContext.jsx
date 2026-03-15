/**
 * VaultContext - provides live contract data + transaction functions to all dashboard components
 */

import { createContext, useContext, useCallback } from 'react'
import { useWallet } from './WalletContext'
import { useContractData } from '../hooks/useContractData'
import { useTransactions } from '../hooks/useTransactions'

const VaultContext = createContext(null)

export function VaultProvider({ children }) {
  const { stxAddress } = useWallet()

  const contractData = useContractData(stxAddress)

  const handleTxSuccess = useCallback((type, txId) => {
    // Refresh data after a short delay to let the mempool pick it up
    setTimeout(() => contractData.refresh(), 5000)
  }, [contractData.refresh])

  const tx = useTransactions(stxAddress, handleTxSuccess)

  return (
    <VaultContext.Provider value={{ ...contractData, ...tx }}>
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() {
  return useContext(VaultContext)
}
