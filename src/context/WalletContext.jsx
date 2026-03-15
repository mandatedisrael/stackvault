import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { connect, disconnect, isConnected, getLocalStorage } from '@stacks/connect'

const WalletContext = createContext(null)

function getAddressFromStorage() {
  try {
    const data = getLocalStorage()
    return data?.addresses?.stx?.[0]?.address ?? null
  } catch {
    return null
  }
}

export function WalletProvider({ children }) {
  const [stxAddress, setStxAddress] = useState(() => getAddressFromStorage())
  const [isConnecting, setIsConnecting] = useState(false)

  // Sync on mount in case localStorage was already set
  useEffect(() => {
    if (isConnected()) {
      setStxAddress(getAddressFromStorage())
    }
  }, [])

  const connectWallet = useCallback(async () => {
    setIsConnecting(true)
    try {
      const response = await connect({
        appDetails: {
          name: 'StackVault',
          icon: window.location.origin + '/favicon.svg',
        },
      })
      const addr = response?.addresses?.stx?.[0]?.address ?? getAddressFromStorage()
      setStxAddress(addr)
    } catch (err) {
      console.error('Connect error:', err)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    disconnect()
    setStxAddress(null)
  }, [])

  const shortAddress = stxAddress
    ? stxAddress.slice(0, 7) + '...' + stxAddress.slice(-4)
    : null

  return (
    <WalletContext.Provider value={{
      stxAddress,
      shortAddress,
      isConnected: !!stxAddress,
      isConnecting,
      connect: connectWallet,
      disconnect: disconnectWallet,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
