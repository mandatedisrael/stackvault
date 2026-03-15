import { Link } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'

export default function DashboardNav() {
  const { isConnected, isConnecting, shortAddress, connect, disconnect } = useWallet()

  return (
    <nav className="bg-brand-bg border-b-[3px] border-brand-slate sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 h-20 flex justify-between items-center">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 bg-brand-yellow rounded-full border-[3px] border-brand-slate flex items-center justify-center shadow-solid-sm">
            <i className="ph-bold ph-currency-btc text-xl text-brand-slate"></i>
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl leading-none text-brand-slate">StackVault</h1>
            <p className="text-[10px] font-extrabold text-brand-slate/60 tracking-widest mt-0.5">DASHBOARD</p>
          </div>
        </Link>

        {/* Center badge */}
        <div className="hidden md:flex items-center gap-2 bg-brand-teal/10 border-[3px] border-brand-teal rounded-full px-4 py-1.5">
          <div className="w-2 h-2 rounded-full bg-brand-teal animate-pulse-slow"></div>
          <span className="text-xs font-bold font-display text-brand-teal uppercase tracking-wide">Stacks Mainnet</span>
        </div>

        {/* Right: balance + wallet */}
        <div className="flex items-center gap-4">
          {isConnected && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-extrabold text-brand-slate/50 tracking-widest uppercase">sBTC Balance</span>
              <span className="font-mono font-bold text-brand-slate">0.00000000</span>
            </div>
          )}

          {isConnected ? (
            <div className="flex items-center gap-2">
              {/* Address pill */}
              <div className="hidden sm:flex items-center gap-2 bg-white border-[3px] border-brand-slate rounded-xl px-4 py-2.5 shadow-solid-sm">
                <div className="w-2 h-2 rounded-full bg-brand-teal"></div>
                <span className="font-mono font-bold text-sm text-brand-slate">{shortAddress}</span>
              </div>
              {/* Disconnect */}
              <button
                onClick={disconnect}
                aria-label="Disconnect wallet"
                className="bg-white text-brand-slate neo-button rounded-xl px-4 py-2.5 font-display font-bold text-sm flex items-center gap-2 hover:bg-red-50 hover:text-red-500 hover:border-red-500 transition-colors"
              >
                <i className="ph-bold ph-sign-out text-base"></i>
                <span className="hidden sm:inline">Disconnect</span>
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="bg-brand-yellow text-brand-slate neo-button rounded-xl px-5 py-2.5 font-display font-bold text-base flex items-center gap-2 hover:bg-[#F9C36B] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <i className="ph-bold ph-wallet text-lg"></i>
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>

      </div>
    </nav>
  )
}
