import { useState } from 'react'
import { useVault } from '../../context/VaultContext'
import { formatSbtc, formatUsd, PRECISION, STACKS_API } from '../../lib/contracts'

const TABS = ['Deposit', 'Borrow', 'Repay', 'Withdraw']

function TxStatusBanner({ txStatus, clearStatus }) {
  if (!txStatus.txId && !txStatus.error) return null

  if (txStatus.txId) {
    return (
      <div className="bg-brand-teal/10 border-[3px] border-brand-teal rounded-2xl p-4 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <i className="ph-bold ph-check-circle text-brand-teal text-xl"></i>
          <div>
            <p className="font-display font-bold text-brand-teal text-sm">Transaction Submitted</p>
            <a
              href={`https://explorer.hiro.so/txid/${txStatus.txId}?chain=testnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-brand-teal/70 hover:underline"
            >
              {txStatus.txId.slice(0, 10)}...{txStatus.txId.slice(-6)}
            </a>
          </div>
        </div>
        <button onClick={clearStatus} className="text-brand-teal hover:text-brand-slate">
          <i className="ph-bold ph-x text-lg"></i>
        </button>
      </div>
    )
  }

  if (txStatus.error) {
    return (
      <div className="bg-red-50 border-[3px] border-red-400 rounded-2xl p-4 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <i className="ph-bold ph-warning-circle text-red-500 text-xl"></i>
          <p className="font-display font-bold text-red-500 text-sm">{txStatus.error}</p>
        </div>
        <button onClick={clearStatus} className="text-red-400 hover:text-red-600">
          <i className="ph-bold ph-x text-lg"></i>
        </button>
      </div>
    )
  }

  return null
}

function DepositTab() {
  const [amount, setAmount] = useState('')
  const { sbtcBalance, sharePrice, deposit, txStatus, clearStatus, loading } = useVault()

  const amountSats = Math.floor(parseFloat(amount || '0') * 1e8)
  const isValid = amountSats > 0 && BigInt(amountSats) <= sbtcBalance

  // Estimate shares to receive
  const estimatedShares = amountSats > 0 && sharePrice > 0n
    ? (BigInt(amountSats) * BigInt(PRECISION)) / sharePrice
    : 0n

  const handleDeposit = () => {
    if (!isValid) return
    deposit(BigInt(amountSats))
  }

  const handleMax = () => {
    setAmount(formatSbtc(sbtcBalance))
  }

  return (
    <div className="flex flex-col gap-5">
      <TxStatusBanner txStatus={txStatus} clearStatus={clearStatus} />

      <div>
        <label htmlFor="deposit-amount" className="block text-xs font-extrabold text-brand-slate/50 tracking-widest uppercase mb-2">
          Amount to Deposit
        </label>
        <div className="flex items-center border-[3px] border-brand-slate rounded-2xl bg-white overflow-hidden focus-within:shadow-solid transition-all">
          <input
            id="deposit-amount"
            type="number"
            placeholder="0.00000000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.00000001"
            min="0"
            className="flex-1 px-5 py-4 font-mono text-xl font-bold bg-transparent outline-none text-brand-slate placeholder-brand-slate/30"
          />
          <div className="px-4 py-4 border-l-[3px] border-brand-slate bg-brand-beige flex items-center gap-2 font-display font-bold text-brand-slate">
            <i className="ph-bold ph-currency-btc text-brand-yellow text-lg"></i>
            sBTC
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs font-semibold text-brand-slate/50">
          <span>Wallet Balance: {formatSbtc(sbtcBalance)} sBTC</span>
          <button onClick={handleMax} className="font-bold text-brand-teal hover:underline">MAX</button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-brand-bg border-[3px] border-brand-slate rounded-2xl p-4 space-y-2">
        <p className="text-xs font-extrabold text-brand-slate/50 tracking-widest uppercase mb-3">You will receive</p>
        <div className="flex justify-between font-semibold text-sm">
          <span className="text-brand-slate/60">Vault shares</span>
          <span className="font-mono font-bold text-brand-slate">
            {amountSats > 0 ? formatSbtc(estimatedShares) : '--'}
          </span>
        </div>
        <div className="flex justify-between font-semibold text-sm">
          <span className="text-brand-slate/60">Est. BTC APY</span>
          <span className="font-mono font-bold text-brand-teal">~8.5%</span>
        </div>
        <div className="flex justify-between font-semibold text-sm">
          <span className="text-brand-slate/60">Auto-routed to</span>
          <span className="font-mono font-bold text-brand-slate">StackingDAO + Zest</span>
        </div>
      </div>

      <button
        onClick={handleDeposit}
        disabled={!isValid || txStatus.loading}
        className="w-full bg-brand-yellow text-brand-slate neo-button rounded-2xl py-4 font-display font-bold text-xl flex items-center justify-center gap-3 hover:bg-[#F9C36B] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {txStatus.loading ? (
          <>
            <i className="ph-bold ph-spinner animate-spin"></i>
            Confirming...
          </>
        ) : (
          <>
            <i className="ph-bold ph-arrow-circle-down"></i>
            Deposit sBTC
          </>
        )}
      </button>
    </div>
  )
}

function BorrowTab() {
  const { userAssetValue, btcPrice } = useVault()
  const hasPosition = userAssetValue > 0n

  const collateralUsd = btcPrice > 0n ? Number((userAssetValue * btcPrice) / BigInt(PRECISION)) / 1e8 : 0
  const [ltv, setLtv] = useState(45)
  const ltvColor = ltv < 60 ? 'bg-brand-teal' : ltv < 75 ? 'bg-brand-yellow' : 'bg-red-500'
  const textColor = ltv < 60 ? 'text-brand-teal' : ltv < 75 ? 'text-brand-yellow' : 'text-red-500'
  const borrowAmount = ((ltv / 100) * collateralUsd).toLocaleString('en-US', { maximumFractionDigits: 0 })

  return (
    <div className="flex flex-col gap-5">
      {!hasPosition && (
        <div className="bg-brand-beige border-[3px] border-brand-slate rounded-2xl p-4 flex gap-3">
          <i className="ph-bold ph-info text-brand-slate text-xl flex-shrink-0 mt-0.5"></i>
          <p className="text-sm font-semibold text-brand-slate/80">
            Deposit sBTC first to use as collateral for borrowing.
          </p>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="borrow-ltv" className="text-xs font-extrabold text-brand-slate/50 tracking-widest uppercase">Borrow LTV</label>
          <span className={`font-mono font-bold text-lg ${textColor}`}>{ltv}%</span>
        </div>
        <input
          id="borrow-ltv"
          type="range"
          min={0}
          max={85}
          value={ltv}
          onChange={(e) => setLtv(Number(e.target.value))}
          className="w-full accent-brand-teal cursor-pointer h-2"
        />
        <div className="flex justify-between mt-1.5 text-[10px] font-bold text-brand-slate/40 uppercase tracking-wider">
          <span>0%</span>
          <span className="text-brand-teal">Safe &lt;60%</span>
          <span className="text-brand-yellow">Caution</span>
          <span className="text-red-500">Max 85%</span>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-brand-bg border-[3px] border-brand-slate rounded-2xl p-4 space-y-2">
        <p className="text-xs font-extrabold text-brand-slate/50 tracking-widest uppercase mb-3">Borrow Summary</p>
        <div className="flex justify-between font-semibold text-sm">
          <span className="text-brand-slate/60">You receive</span>
          <span className="font-mono font-bold text-brand-slate">${borrowAmount} USDCx</span>
        </div>
        <div className="flex justify-between font-semibold text-sm">
          <span className="text-brand-slate/60">Borrow APR</span>
          <span className="font-mono font-bold text-brand-slate">4.8%</span>
        </div>
        <div className="flex justify-between font-semibold text-sm">
          <span className="text-brand-slate/60">Collateral</span>
          <span className="font-mono font-bold text-brand-slate">
            {hasPosition ? `${formatSbtc(userAssetValue)} sBTC` : '--'}
          </span>
        </div>
      </div>

      {/* LTV visual bar */}
      <div className="w-full h-3 bg-brand-beige border-[3px] border-brand-slate rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${ltvColor}`} style={{ width: `${(ltv / 85) * 100}%` }}></div>
      </div>

      <button
        disabled
        className="w-full neo-button rounded-2xl py-4 font-display font-bold text-xl flex items-center justify-center gap-3 bg-brand-slate/30 text-brand-slate/50 cursor-not-allowed"
      >
        <i className="ph-bold ph-coins"></i>
        Borrow (Coming Soon)
      </button>
    </div>
  )
}

function RepayTab() {
  const [amount, setAmount] = useState('')
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor="repay-amount" className="block text-xs font-extrabold text-brand-slate/50 tracking-widest uppercase mb-2">
          Amount to Repay
        </label>
        <div className="flex items-center border-[3px] border-brand-slate rounded-2xl bg-white overflow-hidden focus-within:shadow-solid transition-all">
          <input
            id="repay-amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 px-5 py-4 font-mono text-xl font-bold bg-transparent outline-none text-brand-slate placeholder-brand-slate/30"
          />
          <div className="px-4 py-4 border-l-[3px] border-brand-slate bg-brand-beige flex items-center gap-2 font-display font-bold text-brand-slate">
            <i className="ph-bold ph-currency-circle-dollar text-brand-teal text-lg"></i>
            USDCx
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs font-semibold text-brand-slate/50">
          <span>Outstanding: $0.00 USDCx</span>
          <button className="font-bold text-brand-teal hover:underline">MAX</button>
        </div>
      </div>
      <div className="bg-brand-bg border-[3px] border-brand-slate rounded-2xl p-4 space-y-2">
        <p className="text-xs font-extrabold text-brand-slate/50 tracking-widest uppercase mb-3">After Repay</p>
        <div className="flex justify-between font-semibold text-sm">
          <span className="text-brand-slate/60">New LTV</span>
          <span className="font-mono font-bold text-brand-teal">--</span>
        </div>
        <div className="flex justify-between font-semibold text-sm">
          <span className="text-brand-slate/60">Remaining Debt</span>
          <span className="font-mono font-bold text-brand-slate">--</span>
        </div>
      </div>
      <button
        disabled
        className="w-full neo-button rounded-2xl py-4 font-display font-bold text-xl flex items-center justify-center gap-3 bg-brand-slate/30 text-brand-slate/50 cursor-not-allowed"
      >
        <i className="ph-bold ph-arrow-circle-up"></i>
        Repay (Coming Soon)
      </button>
    </div>
  )
}

function WithdrawTab() {
  const [amount, setAmount] = useState('')
  const { userShares, userAssetValue, sharePrice, tvl, withdraw, txStatus, clearStatus } = useVault()

  const hasPosition = userAssetValue > 0n

  // Rate limit: max 10% of TVL per epoch
  const maxWithdrawable = tvl > 0n ? tvl / 10n : 0n
  // Cap at user's own position
  const effectiveMax = hasPosition
    ? (maxWithdrawable < userAssetValue ? maxWithdrawable : userAssetValue)
    : 0n

  // Convert input sBTC amount to shares
  const amountSats = Math.floor(parseFloat(amount || '0') * 1e8)
  const sharesToBurn = amountSats > 0 && sharePrice > 0n
    ? (BigInt(amountSats) * BigInt(PRECISION)) / sharePrice
    : 0n

  const overLimit = BigInt(amountSats) > effectiveMax && amountSats > 0
  const isValid = sharesToBurn > 0n && sharesToBurn <= userShares && !overLimit

  const handleWithdraw = () => {
    if (!isValid) return
    withdraw(sharesToBurn, BigInt(Math.floor(amountSats * 0.99))) // 1% slippage tolerance
  }

  const handleMax = () => {
    setAmount(formatSbtc(effectiveMax))
  }

  return (
    <div className="flex flex-col gap-5">
      <TxStatusBanner txStatus={txStatus} clearStatus={clearStatus} />

      <div>
        <label htmlFor="withdraw-amount" className="block text-xs font-extrabold text-brand-slate/50 tracking-widest uppercase mb-2">
          Amount to Withdraw
        </label>
        <div className="flex items-center border-[3px] border-brand-slate rounded-2xl bg-white overflow-hidden focus-within:shadow-solid transition-all">
          <input
            id="withdraw-amount"
            type="number"
            placeholder="0.00000000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.00000001"
            min="0"
            className="flex-1 px-5 py-4 font-mono text-xl font-bold bg-transparent outline-none text-brand-slate placeholder-brand-slate/30"
          />
          <div className="px-4 py-4 border-l-[3px] border-brand-slate bg-brand-beige flex items-center gap-2 font-display font-bold text-brand-slate">
            <i className="ph-bold ph-currency-btc text-brand-yellow text-lg"></i>
            sBTC
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs font-semibold text-brand-slate/50">
          <span>Deposited: {formatSbtc(userAssetValue)} sBTC</span>
          <button onClick={handleMax} className="font-bold text-brand-teal hover:underline">MAX</button>
        </div>
        {overLimit && (
          <p className="mt-1 text-xs font-bold text-red-500">
            Exceeds rate limit. Max withdrawable this epoch: {formatSbtc(effectiveMax)} sBTC
          </p>
        )}
      </div>

      {hasPosition && (
        <div className="bg-amber-50 border-[3px] border-brand-yellow rounded-2xl p-4 flex gap-3">
          <i className="ph-bold ph-warning text-brand-yellow text-xl flex-shrink-0 mt-0.5"></i>
          <p className="text-sm font-semibold text-brand-slate/80">
            Withdrawals are rate-limited to 10% of TVL per epoch (~1 day) to protect the vault.
          </p>
        </div>
      )}

      <button
        onClick={handleWithdraw}
        disabled={!isValid || txStatus.loading}
        className="w-full bg-brand-beige text-brand-slate neo-button rounded-2xl py-4 font-display font-bold text-xl flex items-center justify-center gap-3 hover:bg-[#cfc0a5] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {txStatus.loading ? (
          <>
            <i className="ph-bold ph-spinner animate-spin"></i>
            Confirming...
          </>
        ) : (
          <>
            <i className="ph-bold ph-arrow-circle-up-right"></i>
            Withdraw sBTC
          </>
        )}
      </button>
    </div>
  )
}

export default function ActionTabs() {
  const [active, setActive] = useState('Deposit')

  return (
    <div className="neo-card p-6">
      {/* Tab bar */}
      <div className="flex border-[3px] border-brand-slate rounded-2xl overflow-hidden mb-6">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`flex-1 py-3 font-display font-bold text-base transition-colors
              ${i > 0 ? 'border-l-[3px] border-brand-slate' : ''}
              ${active === tab
                ? 'bg-brand-slate text-white'
                : 'bg-white text-brand-slate hover:bg-brand-beige'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === 'Deposit'  && <DepositTab />}
      {active === 'Borrow'   && <BorrowTab />}
      {active === 'Repay'    && <RepayTab />}
      {active === 'Withdraw' && <WithdrawTab />}
    </div>
  )
}
