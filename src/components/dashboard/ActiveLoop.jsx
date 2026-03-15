import { useVault } from '../../context/VaultContext'
import { formatSbtc, formatUsd, PRECISION } from '../../lib/contracts'

export default function ActiveLoop() {
  const { userAssetValue, btcPrice, userShares, loading } = useVault()

  const hasPosition = userAssetValue > 0n

  // Estimate annual yield: 14.2% combined APY on user's collateral
  const apyBps = 1420n // 14.2%
  const annualYieldSats = hasPosition ? (userAssetValue * apyBps) / 10000n : 0n
  const annualYieldUsd = btcPrice > 0n ? (annualYieldSats * btcPrice) / BigInt(PRECISION) : 0n

  // Step badges reflect user state
  const depositBadge = hasPosition ? 'ACTIVE' : 'WAITING'
  const depositBadgeColor = hasPosition ? 'bg-brand-teal text-white' : 'bg-brand-slate/20 text-brand-slate/50'

  const steps = [
    {
      num: '01',
      icon: 'ph-arrow-circle-down',
      iconColor: 'text-brand-yellow',
      iconBg: 'bg-brand-yellow/20',
      title: 'Deposit sBTC',
      sub: hasPosition ? `${formatSbtc(userAssetValue)} sBTC deposited` : 'Your BTC enters the vault',
      badge: depositBadge,
      badgeColor: depositBadgeColor,
    },
    {
      num: '02',
      icon: 'ph-stack',
      iconColor: 'text-brand-teal',
      iconBg: 'bg-brand-teal/20',
      title: 'StackingDAO',
      sub: 'Earns stSTXbtc yield ~8.5%',
      badge: hasPosition ? 'LOCKED' : 'PENDING',
      badgeColor: hasPosition ? 'bg-brand-slate text-white' : 'bg-brand-slate/20 text-brand-slate/50',
    },
    {
      num: '03',
      icon: 'ph-bank',
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-100',
      title: 'Zest Protocol',
      sub: 'stSTXbtc used as collateral',
      badge: hasPosition ? 'LOCKED' : 'PENDING',
      badgeColor: hasPosition ? 'bg-brand-slate text-white' : 'bg-brand-slate/20 text-brand-slate/50',
    },
    {
      num: '04',
      icon: 'ph-currency-circle-dollar',
      iconColor: 'text-brand-slate',
      iconBg: 'bg-brand-beige',
      title: 'USDCx Liquidity',
      sub: 'Spendable without selling',
      badge: hasPosition ? 'AVAILABLE' : 'PENDING',
      badgeColor: hasPosition ? 'bg-brand-yellow text-brand-slate' : 'bg-brand-slate/20 text-brand-slate/50',
    },
  ]

  const yieldDisplay = loading
    ? '...'
    : annualYieldUsd > 0n
      ? `${formatUsd(annualYieldUsd)} / yr`
      : '$0 / yr'

  const apyDisplay = hasPosition ? '14.2% APY' : '-- APY'

  return (
    <div className="neo-card p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-bold text-xl text-brand-slate">Active Loop</h3>
        <span className={`border-[2px] rounded-full px-3 py-1 text-[10px] font-extrabold tracking-widest uppercase flex items-center gap-1.5 ${hasPosition ? 'bg-brand-teal/20 text-brand-teal border-brand-teal' : 'bg-brand-slate/10 text-brand-slate/40 border-brand-slate/20'}`}>
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${hasPosition ? 'bg-brand-teal animate-pulse-slow' : 'bg-brand-slate/30'}`}></span>
          {hasPosition ? 'AUTO-ROUTING' : 'INACTIVE'}
        </span>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <div key={step.num}>
            <div className="flex items-center gap-4 p-3 bg-brand-bg border-[3px] border-brand-slate rounded-2xl">
              <div className={`w-11 h-11 rounded-xl border-[3px] border-brand-slate flex items-center justify-center flex-shrink-0 ${step.iconBg}`}>
                <i className={`ph-bold ${step.icon} text-xl ${step.iconColor}`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-brand-slate/30">{step.num}</span>
                  <span className="font-display font-bold text-brand-slate truncate">{step.title}</span>
                </div>
                <p className="text-xs text-brand-slate/50 font-semibold">{step.sub}</p>
              </div>
              <span className={`text-[9px] font-extrabold tracking-widest rounded-full px-2.5 py-1 border-2 border-brand-slate flex-shrink-0 ${step.badgeColor}`}>
                {step.badge}
              </span>
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="flex justify-center my-1">
                <div className="dashed-line-vertical w-[3px] h-5"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Net yield summary */}
      <div className="mt-5 bg-brand-yellow/20 border-[3px] border-brand-slate rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-brand-slate/50 tracking-widest uppercase">Net Annual Yield</p>
          <p className="font-display font-bold text-2xl text-brand-slate">{yieldDisplay}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-extrabold text-brand-slate/50 tracking-widest uppercase">
            {hasPosition ? `On ${formatSbtc(userAssetValue)} sBTC` : 'On your deposit'}
          </p>
          <p className="font-display font-bold text-2xl text-brand-teal">{apyDisplay}</p>
        </div>
      </div>
    </div>
  )
}
