import { useState } from 'react'

const TABS = ['Deposit', 'Borrow', 'Repay', 'Withdraw']

function DepositTab() {
  const [amount, setAmount] = useState('')
  return (
    <div className="flex flex-col gap-5">
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
            className="flex-1 px-5 py-4 font-mono text-xl font-bold bg-transparent outline-none text-brand-slate placeholder-brand-slate/30"
          />
          <div className="px-4 py-4 border-l-[3px] border-brand-slate bg-brand-beige flex items-center gap-2 font-display font-bold text-brand-slate">
            <i className="ph-bold ph-currency-btc text-brand-yellow text-lg"></i>
            sBTC
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs font-semibold text-brand-slate/50">
          <span>Wallet Balance: 0.00000000 sBTC</span>
          <button className="font-bold text-brand-teal hover:underline">MAX</button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-brand-bg border-[3px] border-brand-slate rounded-2xl p-4 space-y-2">
        <p className="text-xs font-extrabold text-brand-slate/50 tracking-widest uppercase mb-3">You will receive</p>
        <div className="flex justify-between font-semibold text-sm">
          <span className="text-brand-slate/60">stSTXbtc shares</span>
          <span className="font-mono font-bold text-brand-slate">—</span>
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

      <button className="w-full bg-brand-yellow text-brand-slate neo-button rounded-2xl py-4 font-display font-bold text-xl flex items-center justify-center gap-3 hover:bg-[#F9C36B]">
        <i className="ph-bold ph-arrow-circle-down"></i>
        Deposit sBTC
      </button>
    </div>
  )
}

function BorrowTab() {
  const [ltv, setLtv] = useState(45)
  const ltvColor = ltv < 60 ? 'bg-brand-teal' : ltv < 75 ? 'bg-brand-yellow' : 'bg-red-500'
  const textColor = ltv < 60 ? 'text-brand-teal' : ltv < 75 ? 'text-brand-yellow' : 'text-red-500'
  const borrowAmount = ((ltv / 100) * 42500).toLocaleString('en-US', { maximumFractionDigits: 0 })

  return (
    <div className="flex flex-col gap-5">
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
          <span className="text-brand-slate/60">Liq. Price (BTC)</span>
          <span className="font-mono font-bold text-red-500">${Math.round(85000 * (ltv / 85) * 0.68).toLocaleString()}</span>
        </div>
      </div>

      {/* LTV visual bar */}
      <div className="w-full h-3 bg-brand-beige border-[3px] border-brand-slate rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${ltvColor}`} style={{ width: `${(ltv / 85) * 100}%` }}></div>
      </div>

      <button className={`w-full neo-button rounded-2xl py-4 font-display font-bold text-xl flex items-center justify-center gap-3 transition-colors ${ltv > 75 ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-brand-teal text-white hover:bg-[#479E9B]'}`}>
        <i className="ph-bold ph-coins"></i>
        Borrow ${borrowAmount} USDCx
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
          <span>Outstanding: $19,125.00 USDCx</span>
          <button className="font-bold text-brand-teal hover:underline">MAX</button>
        </div>
      </div>
      <div className="bg-brand-bg border-[3px] border-brand-slate rounded-2xl p-4 space-y-2">
        <p className="text-xs font-extrabold text-brand-slate/50 tracking-widest uppercase mb-3">After Repay</p>
        <div className="flex justify-between font-semibold text-sm">
          <span className="text-brand-slate/60">New LTV</span>
          <span className="font-mono font-bold text-brand-teal">—</span>
        </div>
        <div className="flex justify-between font-semibold text-sm">
          <span className="text-brand-slate/60">Remaining Debt</span>
          <span className="font-mono font-bold text-brand-slate">—</span>
        </div>
      </div>
      <button className="w-full bg-brand-slate text-white neo-button rounded-2xl py-4 font-display font-bold text-xl flex items-center justify-center gap-3 hover:bg-[#2a2f33]">
        <i className="ph-bold ph-arrow-circle-up"></i>
        Repay USDCx
      </button>
    </div>
  )
}

function WithdrawTab() {
  const [amount, setAmount] = useState('')
  return (
    <div className="flex flex-col gap-5">
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
            className="flex-1 px-5 py-4 font-mono text-xl font-bold bg-transparent outline-none text-brand-slate placeholder-brand-slate/30"
          />
          <div className="px-4 py-4 border-l-[3px] border-brand-slate bg-brand-beige flex items-center gap-2 font-display font-bold text-brand-slate">
            <i className="ph-bold ph-currency-btc text-brand-yellow text-lg"></i>
            sBTC
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs font-semibold text-brand-slate/50">
          <span>Deposited: 0.50000000 sBTC</span>
          <button className="font-bold text-brand-teal hover:underline">MAX</button>
        </div>
      </div>
      <div className="bg-amber-50 border-[3px] border-brand-yellow rounded-2xl p-4 flex gap-3">
        <i className="ph-bold ph-warning text-brand-yellow text-xl flex-shrink-0 mt-0.5"></i>
        <p className="text-sm font-semibold text-brand-slate/80">
          Repay outstanding USDCx debt before withdrawing collateral to avoid liquidation.
        </p>
      </div>
      <button className="w-full bg-brand-beige text-brand-slate neo-button rounded-2xl py-4 font-display font-bold text-xl flex items-center justify-center gap-3 hover:bg-[#cfc0a5]">
        <i className="ph-bold ph-arrow-circle-up-right"></i>
        Withdraw sBTC
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
