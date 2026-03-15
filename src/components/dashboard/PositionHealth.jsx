import { useVault } from '../../context/VaultContext'
import { formatSbtc, formatUsd, PRECISION } from '../../lib/contracts'

export default function PositionHealth() {
  const { userShares, userAssetValue, btcPrice, loopState, loading } = useVault()

  const hasPosition = userAssetValue > 0n

  // Collateral value in USD
  const collateralUsd = btcPrice > 0n ? (userAssetValue * btcPrice) / BigInt(PRECISION) : 0n

  // USDCx debt from on-chain loop state (6 decimals) - convert to 8-decimal USD for display
  const usdcxDebt6 = loopState.usdcxDebt ?? 0n
  const borrowedUsd = usdcxDebt6 * 100n // 6 decimals -> 8 decimals (multiply by 100)

  const ltv = hasPosition && collateralUsd > 0n
    ? Number((borrowedUsd * 10000n) / collateralUsd) / 100
    : 0

  const ltvColor = ltv < 60 ? 'bg-brand-teal' : ltv < 75 ? 'bg-brand-yellow' : 'bg-red-500'
  const healthLabel = !hasPosition ? 'NO POSITION' : ltv < 60 ? 'HEALTHY' : ltv < 75 ? 'MODERATE' : 'AT RISK'
  const healthColor = !hasPosition ? 'text-brand-slate/40' : ltv < 60 ? 'text-brand-teal' : ltv < 75 ? 'text-brand-yellow' : 'text-red-500'

  // Liquidation price: price at which LTV hits 85% (if there were debt)
  // liqPrice = (debt * 1e8) / (collateral_sats * 0.85)
  const liqPrice = hasPosition && borrowedUsd > 0n
    ? formatUsd((borrowedUsd * BigInt(PRECISION)) / ((userAssetValue * 85n) / 100n))
    : '--'

  const formatUsdcx = (val) => (Number(val) / 1_000_000).toFixed(2)

  const metrics = [
    {
      label: 'Collateral',
      value: loading ? '...' : hasPosition ? `${formatSbtc(userAssetValue)} sBTC` : '0.00000000 sBTC',
      sub: hasPosition && btcPrice > 0n ? `~ ${formatUsd(collateralUsd)}` : '--',
      icon: 'ph-cube',
    },
    {
      label: 'Borrowed',
      value: usdcxDebt6 > 0n ? `$${formatUsdcx(usdcxDebt6)} USDCx` : '$0 USDCx',
      sub: hasPosition ? `${ltv.toFixed(1)}% LTV` : '--',
      icon: 'ph-coins',
    },
    {
      label: 'Liq. Price',
      value: liqPrice,
      sub: 'BTC/USD',
      icon: 'ph-warning',
    },
    {
      label: 'Borrow APR',
      value: '4.8%',
      sub: 'Variable',
      icon: 'ph-percent',
    },
  ]

  return (
    <div className="neo-card p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-teal/20 border-[3px] border-brand-slate flex items-center justify-center">
            <i className="ph-bold ph-activity text-brand-teal text-lg"></i>
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-brand-slate">Position Health</h3>
            <p className="text-xs text-brand-slate/50 font-semibold">
              {loading ? 'Loading...' : 'Live from StackVault contracts'}
            </p>
          </div>
        </div>
        <span className={`font-mono font-bold text-sm border-[3px] border-current rounded-full px-3 py-1 ${healthColor}`}>
          {healthLabel}
        </span>
      </div>

      {/* LTV bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-extrabold tracking-widest text-brand-slate/50 uppercase">Loan-to-Value</span>
          <span className="font-mono font-bold text-brand-slate">{ltv}%</span>
        </div>
        <div className="relative w-full h-5 bg-brand-beige border-[3px] border-brand-slate rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${ltvColor}`}
            style={{ width: `${ltv}%` }}
          ></div>
        </div>
        {/* Zone labels */}
        <div className="flex justify-between mt-1.5 text-[10px] font-bold text-brand-slate/40 uppercase tracking-wider">
          <span>Safe &lt;60%</span>
          <span>Caution 60-75%</span>
          <span>Liquidation &gt;85%</span>
        </div>
      </div>

      {/* 4-metric grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-brand-bg border-[3px] border-brand-slate rounded-2xl p-4 flex flex-col gap-1">
            <i className={`ph-bold ${m.icon} text-brand-slate/40 text-lg`}></i>
            <p className="text-[10px] font-extrabold text-brand-slate/50 tracking-widest uppercase">{m.label}</p>
            <p className="font-mono font-bold text-brand-slate text-base leading-tight">{m.value}</p>
            <p className="text-xs text-brand-slate/50 font-semibold">{m.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
