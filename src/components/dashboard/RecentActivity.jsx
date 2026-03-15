import { useState, useEffect } from 'react'
import { useWallet } from '../../context/WalletContext'
import { STACKS_API, DEPLOYER } from '../../lib/contracts'

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function parseTxType(tx) {
  const fnName = tx.contract_call?.function_name || ''
  if (fnName === 'deposit') return { type: 'Deposit', icon: 'ph-arrow-circle-down', iconColor: 'text-brand-teal', iconBg: 'bg-brand-teal/10', amountColor: 'text-brand-teal' }
  if (fnName === 'withdraw') return { type: 'Withdraw', icon: 'ph-arrow-circle-up-right', iconColor: 'text-brand-yellow', iconBg: 'bg-brand-yellow/10', amountColor: 'text-brand-yellow' }
  if (fnName === 'harvest-yield') return { type: 'Yield Harvest', icon: 'ph-arrow-circle-up', iconColor: 'text-brand-teal', iconBg: 'bg-brand-teal/10', amountColor: 'text-brand-teal' }
  return { type: fnName || 'Contract Call', icon: 'ph-code', iconColor: 'text-brand-slate', iconBg: 'bg-brand-beige', amountColor: 'text-brand-slate' }
}

function formatTxAmount(tx) {
  const fnName = tx.contract_call?.function_name || ''
  const args = tx.contract_call?.function_args || []
  if (fnName === 'deposit' && args[0]) {
    const sats = Number(args[0].repr?.replace('u', '') || 0)
    return `+${(sats / 1e8).toFixed(8)} sBTC`
  }
  if (fnName === 'withdraw' && args[0]) {
    const shares = Number(args[0].repr?.replace('u', '') || 0)
    return `-${(shares / 1e8).toFixed(8)} shares`
  }
  return tx.tx_status === 'success' ? 'Success' : tx.tx_status
}

export default function RecentActivity() {
  const { stxAddress } = useWallet()
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!stxAddress) {
      setTxns([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchTxHistory() {
      try {
        // Fetch transactions involving any of our vault contracts
        const url = `${STACKS_API}/extended/v1/address/${stxAddress}/transactions?limit=10`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()

        if (cancelled) return

        // Filter to only vault contract interactions
        const vaultTxs = (data.results || []).filter((tx) => {
          const contractId = tx.contract_call?.contract_id || ''
          return contractId.startsWith(DEPLOYER + '.')
        })

        setTxns(vaultTxs.slice(0, 5))
      } catch (err) {
        console.error('Failed to fetch tx history:', err)
        if (!cancelled) setTxns([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTxHistory()
    const interval = setInterval(fetchTxHistory, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [stxAddress])

  const hasTxns = txns.length > 0

  return (
    <div className="neo-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-bold text-xl text-brand-slate">Recent Activity</h3>
        {stxAddress && (
          <a
            href={`https://explorer.hiro.so/address/${stxAddress}?chain=testnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-brand-teal hover:underline flex items-center gap-1"
          >
            View all <i className="ph-bold ph-arrow-up-right text-xs"></i>
          </a>
        )}
      </div>

      {/* Transactions */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <i className="ph-bold ph-spinner animate-spin text-2xl text-brand-slate/30"></i>
          </div>
        ) : !hasTxns ? (
          <div className="text-center py-8">
            <i className="ph-bold ph-receipt text-4xl text-brand-slate/20 mb-3 block"></i>
            <p className="text-sm font-semibold text-brand-slate/40">No vault transactions yet</p>
            <p className="text-xs text-brand-slate/30 mt-1">Deposit sBTC to get started</p>
          </div>
        ) : (
          txns.map((tx) => {
            const meta = parseTxType(tx)
            const shortHash = tx.tx_id ? `${tx.tx_id.slice(0, 10)}...${tx.tx_id.slice(-6)}` : ''
            const time = tx.burn_block_time_iso ? timeAgo(tx.burn_block_time_iso) : 'pending'

            return (
              <a
                key={tx.tx_id}
                href={`https://explorer.hiro.so/txid/${tx.tx_id}?chain=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl border-[2px] border-brand-slate/20 hover:border-brand-slate hover:bg-brand-bg transition-all"
              >
                <div className={`w-10 h-10 rounded-xl border-[2px] border-brand-slate flex items-center justify-center flex-shrink-0 ${meta.iconBg}`}>
                  <i className={`ph-bold ${meta.icon} text-lg ${meta.iconColor}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold text-brand-slate text-sm">{meta.type}</p>
                    {tx.tx_status !== 'success' && (
                      <span className="text-[9px] font-extrabold bg-red-100 text-red-500 rounded-full px-2 py-0.5">
                        {tx.tx_status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-brand-slate/40 font-mono truncate">{shortHash}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-mono font-bold text-sm ${meta.amountColor}`}>{formatTxAmount(tx)}</p>
                  <p className="text-[10px] text-brand-slate/40 font-semibold">{time}</p>
                </div>
              </a>
            )
          })
        )}
      </div>

      {/* Explorer link */}
      <div className="mt-4 pt-4 border-t-[2px] border-brand-slate/10">
        <a
          href={`https://explorer.hiro.so${stxAddress ? `/address/${stxAddress}` : ''}?chain=testnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 text-sm font-bold text-brand-slate/50 hover:text-brand-slate transition-colors"
        >
          <i className="ph-bold ph-magnifying-glass"></i>
          View on Stacks Explorer
        </a>
      </div>
    </div>
  )
}
