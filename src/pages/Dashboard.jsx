import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import DashboardNav from '../components/dashboard/DashboardNav'
import HeroStats from '../components/dashboard/HeroStats'
import PositionHealth from '../components/dashboard/PositionHealth'
import ActionTabs from '../components/dashboard/ActionTabs'
import ActiveLoop from '../components/dashboard/ActiveLoop'
import RecentActivity from '../components/dashboard/RecentActivity'

function ConnectPrompt() {
  const { connect, isConnecting } = useWallet()

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="neo-card p-10 text-center max-w-lg">
        <div className="w-20 h-20 bg-brand-yellow border-[3px] border-brand-slate rounded-full flex items-center justify-center mx-auto mb-6 shadow-solid">
          <i className="ph-bold ph-wallet text-4xl text-brand-slate"></i>
        </div>
        <h2 className="font-display font-bold text-3xl text-brand-slate mb-3">Connect Your Wallet</h2>
        <p className="text-brand-slate/60 font-semibold mb-8 leading-relaxed">
          Connect a Stacks wallet to deposit sBTC, track your position, and manage your yield strategy.
        </p>
        <button
          onClick={connect}
          disabled={isConnecting}
          className="bg-brand-yellow text-brand-slate neo-button rounded-xl px-8 py-4 font-display font-bold text-lg flex items-center gap-3 mx-auto hover:bg-[#F9C36B] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <i className="ph-bold ph-plugs-connected text-xl"></i>
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
        <Link
          to="/"
          className="inline-block mt-6 text-sm font-bold text-brand-teal hover:underline"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { isConnected } = useWallet()

  return (
    <div className="text-brand-slate font-body w-full min-h-screen flex flex-col">
      <DashboardNav />

      {!isConnected ? (
        <ConnectPrompt />
      ) : (
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-10">

          {/* Top 3-column stat row */}
          <HeroStats />

          {/* Main layout: left (actions) | right (loop + activity) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">

            {/* Left column */}
            <div className="flex flex-col gap-8">
              <PositionHealth />
              <ActionTabs />
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-8">
              <ActiveLoop />
              <RecentActivity />
            </div>

          </div>
        </main>
      )}
    </div>
  )
}
