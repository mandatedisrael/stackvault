import DashboardNav from '../components/dashboard/DashboardNav'
import HeroStats from '../components/dashboard/HeroStats'
import PositionHealth from '../components/dashboard/PositionHealth'
import ActionTabs from '../components/dashboard/ActionTabs'
import ActiveLoop from '../components/dashboard/ActiveLoop'
import RecentActivity from '../components/dashboard/RecentActivity'

export default function Dashboard() {
  return (
    <div className="text-brand-slate font-body w-full min-h-screen flex flex-col">
      <DashboardNav />

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
    </div>
  )
}
