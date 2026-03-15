const txns = [
  {
    icon: 'ph-arrow-circle-down',
    iconColor: 'text-brand-teal',
    iconBg: 'bg-brand-teal/10',
    type: 'Deposit',
    amount: '+0.50000000 sBTC',
    amountColor: 'text-brand-teal',
    time: '2 hours ago',
    hash: 'SP3FBR...A4F2',
  },
  {
    icon: 'ph-coins',
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-50',
    type: 'Borrow',
    amount: '+$19,125 USDCx',
    amountColor: 'text-purple-500',
    time: '2 hours ago',
    hash: 'SP3FBR...C8D1',
  },
  {
    icon: 'ph-stack',
    iconColor: 'text-brand-slate',
    iconBg: 'bg-brand-beige',
    type: 'Auto-Route',
    amount: 'StackingDAO',
    amountColor: 'text-brand-slate',
    time: '2 hours ago',
    hash: 'SP3FBR...E2A7',
  },
  {
    icon: 'ph-arrow-circle-up',
    iconColor: 'text-brand-yellow',
    iconBg: 'bg-brand-yellow/10',
    type: 'Yield Harvest',
    amount: '+0.00042 sBTC',
    amountColor: 'text-brand-yellow',
    time: '6 hours ago',
    hash: 'SP3FBR...F9B3',
  },
]

export default function RecentActivity() {
  return (
    <div className="neo-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-bold text-xl text-brand-slate">Recent Activity</h3>
        <a href="#" className="text-xs font-bold text-brand-teal hover:underline flex items-center gap-1">
          View all <i className="ph-bold ph-arrow-up-right text-xs"></i>
        </a>
      </div>

      {/* Transactions */}
      <div className="flex flex-col gap-3">
        {txns.map((tx, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border-[2px] border-brand-slate/20 hover:border-brand-slate hover:bg-brand-bg transition-all">
            <div className={`w-10 h-10 rounded-xl border-[2px] border-brand-slate flex items-center justify-center flex-shrink-0 ${tx.iconBg}`}>
              <i className={`ph-bold ${tx.icon} text-lg ${tx.iconColor}`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-brand-slate text-sm">{tx.type}</p>
              <p className="text-xs text-brand-slate/40 font-mono truncate">{tx.hash}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`font-mono font-bold text-sm ${tx.amountColor}`}>{tx.amount}</p>
              <p className="text-[10px] text-brand-slate/40 font-semibold">{tx.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Explorer link */}
      <div className="mt-4 pt-4 border-t-[2px] border-brand-slate/10">
        <a
          href="https://explorer.hiro.so"
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
