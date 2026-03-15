export default function Security() {
  return (
    <section id="security" className="w-full bg-white border-y-[3px] border-brand-slate py-24">
      <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left copy */}
        <div>
          <div className="inline-block bg-brand-teal/10 border-2 border-brand-teal text-brand-teal px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            Risk Management
          </div>
          <h2 className="font-display font-bold text-4xl md:text-5xl mb-6 leading-tight text-brand-slate">
            Monitor your position with clarity.
          </h2>
          <p className="font-body text-lg text-brand-slate/70 mb-8">
            Our dashboard provides transparent, real-time insights into your Borrow Limit and collateral health. We've removed complex execution steps so you always know exactly where you stand.
          </p>
          <ul className="space-y-4 font-semibold text-brand-slate/80">
            {[
              'Real-time LTV calculation',
              'Visual safety indicators',
              'Liquidation price monitoring',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <i className="ph-bold ph-check-circle text-brand-teal text-xl"></i> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Right card */}
        <div className="neo-card p-8 bg-brand-bg relative transform rotate-1 hover:rotate-0 transition-transform duration-300">
          {/* Shield badge */}
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-brand-yellow rounded-full border-[3px] border-brand-slate flex items-center justify-center shadow-solid-sm z-10">
            <i className="ph-bold ph-shield text-xl text-brand-slate"></i>
          </div>

          <h3 className="font-display font-bold text-2xl mb-8 flex items-center gap-2 text-brand-slate">
            <i className="ph-fill ph-heartbeat text-red-500"></i> Position Health
          </h3>

          {/* LTV bar */}
          <div className="p-6 bg-white rounded-2xl border-[3px] border-brand-slate shadow-inner mb-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <span className="block text-xs font-bold text-brand-slate/50 uppercase tracking-widest mb-1">Borrow Limit (LTV)</span>
                <span className="font-display font-bold text-3xl text-brand-teal">45.0%</span>
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold text-brand-slate/50 uppercase tracking-widest mb-1">Max LTV</span>
                <span className="font-display font-bold text-xl text-brand-slate">80.0%</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-8 bg-brand-bg rounded-full border-[3px] border-brand-slate overflow-hidden p-1 relative">
              {/* Warning zone */}
              <div className="absolute top-0 bottom-0 left-[60%] w-[20%] bg-brand-yellow/20 border-l-2 border-dashed border-brand-slate/20"></div>
              {/* Liquidation zone */}
              <div className="absolute top-0 bottom-0 left-[80%] right-0 bg-red-500/10 border-l-2 border-dashed border-brand-slate/20"></div>
              {/* Fill */}
              <div className="h-full bg-brand-teal rounded-full w-[45%] border-r-[3px] border-brand-slate relative flex items-center justify-end pr-2 shadow-[2px_0_0_rgba(0,0,0,0.1)]">
                <div className="absolute top-1 left-1 right-2 h-2 bg-white/30 rounded-full"></div>
                <div className="w-2 h-4 bg-white rounded-full opacity-80"></div>
              </div>
              {/* Max marker */}
              <div className="absolute top-0 bottom-0 left-[80%] w-1 bg-brand-slate z-20"></div>
            </div>

            <div className="flex justify-between text-[10px] font-extrabold text-brand-slate/50 mt-3 px-1 uppercase tracking-widest">
              <span>Safe Zone</span>
              <span className="pl-[10%]">Warning</span>
              <span className="text-red-500">Liquidation</span>
            </div>
          </div>

          {/* Position details */}
          <div className="space-y-4 px-2">
            {[
              { label: 'Total Collateral Value', value: '$32,450.00', color: 'text-brand-slate' },
              { label: 'Total Borrowed',         value: '$14,602.50', color: 'text-brand-slate' },
              { label: 'Liquidation Price (BTC)', value: '$48,200.00', color: 'text-red-500' },
            ].map((row, i) => (
              <div
                key={row.label}
                className={`flex justify-between items-center pb-3 ${i < 2 ? 'border-b-2 border-dashed border-brand-slate/20' : ''}`}
              >
                <span className="text-sm font-semibold text-brand-slate/70">{row.label}</span>
                <span className={`font-bold font-display text-lg ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
