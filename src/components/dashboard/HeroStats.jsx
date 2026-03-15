import { useVault } from '../../context/VaultContext'
import { formatSbtc, formatUsd, PRECISION } from '../../lib/contracts'

export default function HeroStats() {
  const { tvl, btcPrice, btcPriceFresh, userAssetValue, loading } = useVault()

  // TVL in USD: (tvl_sats * btcPrice) / PRECISION
  const tvlUsd = btcPrice > 0n ? (tvl * btcPrice) / BigInt(PRECISION) : 0n
  const tvlDisplay = loading
    ? '...'
    : btcPrice > 0n
      ? formatUsd(tvlUsd)
      : `${formatSbtc(tvl)} sBTC`

  // Combined APY is a protocol-level estimate (StackingDAO ~8.5% + Zest leverage)
  // This is a design parameter, not something stored on-chain yet
  const apyDisplay = '14.2%'

  // User's spending power estimate: asset value in USD at 45% LTV
  const userValueUsd = btcPrice > 0n ? (userAssetValue * btcPrice) / BigInt(PRECISION) : 0n
  const spendingPower = (userValueUsd * 45n) / 100n
  const spendingDisplay = loading
    ? '...'
    : userAssetValue > 0n && btcPrice > 0n
      ? formatUsd(spendingPower)
      : '$0'

  const stats = [
    {
      icon: 'ph-vault',
      iconColor: 'text-brand-yellow',
      iconBg: 'bg-brand-yellow/20',
      label: 'Total Value Locked',
      value: tvlDisplay,
      sub: btcPrice > 0n ? `${formatSbtc(tvl)} sBTC in vault` : 'Oracle price unavailable',
      subColor: 'text-brand-teal',
    },
    {
      icon: 'ph-trend-up',
      iconColor: 'text-brand-teal',
      iconBg: 'bg-brand-teal/20',
      label: 'Combined APY',
      value: apyDisplay,
      sub: 'Dual-stack yield',
      subColor: 'text-brand-slate/60',
    },
    {
      icon: 'ph-coins',
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-100',
      label: 'USDCx Spending Power',
      value: spendingDisplay,
      sub: userAssetValue > 0n ? 'At 45% LTV' : 'Deposit sBTC to start',
      subColor: 'text-brand-slate/60',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
      {stats.map((s) => (
        <div key={s.label} className="neo-card p-6 flex items-center gap-5">
          <div className={`w-14 h-14 rounded-2xl border-[3px] border-brand-slate flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
            <i className={`ph-bold ${s.icon} text-2xl ${s.iconColor}`}></i>
          </div>
          <div>
            <p className="text-xs font-extrabold text-brand-slate/50 tracking-widest uppercase mb-1">{s.label}</p>
            <p className="font-display font-bold text-3xl text-brand-slate leading-none">{s.value}</p>
            <p className={`text-sm font-semibold mt-1 ${s.subColor}`}>{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
