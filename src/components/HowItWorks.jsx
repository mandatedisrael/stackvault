const steps = [
  {
    step: 'STEP 1',
    title: 'Deposit sBTC',
    desc: 'Supply initial capital to the protocol.',
    stepColor: 'bg-brand-slate text-white',
    cardClass: 'bg-white border-[3px] border-brand-slate',
    icon: (
      <div className="w-12 h-12 bg-[#F7931A] rounded-full flex items-center justify-center border-2 border-brand-slate">
        <i className="ph-bold ph-currency-btc text-white text-2xl"></i>
      </div>
    ),
    hoverBg: 'group-hover:bg-brand-yellow',
  },
  {
    step: 'STEP 2',
    title: 'StackingDAO',
    desc: 'Auto-staked to earn base Stacks yield.',
    stepColor: 'bg-brand-teal text-white border border-white',
    cardClass: 'bg-brand-teal/10 border-[3px] border-brand-teal',
    icon: (
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-brand-teal text-brand-teal font-display font-black text-lg">
        st
      </div>
    ),
    hoverBg: 'group-hover:bg-brand-teal',
  },
  {
    step: 'STEP 3',
    title: 'Zest Protocol',
    desc: 'Supplied as collateral for borrowing.',
    stepColor: 'bg-brand-slate text-white',
    cardClass: 'bg-brand-bg border-[3px] border-brand-slate',
    icon: (
      <div className="w-12 h-12 bg-brand-slate rounded-full flex items-center justify-center border-2 border-white text-white font-display font-black text-xl">
        Z
      </div>
    ),
    hoverBg: 'group-hover:bg-brand-beige',
  },
  {
    step: 'STEP 4',
    title: 'Borrow USDCx',
    desc: 'Unlock liquid cash against your yield.',
    stepColor: 'bg-brand-yellow text-brand-slate border border-brand-slate',
    cardClass: 'bg-brand-yellow/20 border-[3px] border-brand-yellow',
    icon: (
      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center border-2 border-brand-slate">
        <span className="text-white text-2xl font-bold font-display">$</span>
      </div>
    ),
    hoverBg: 'group-hover:bg-[#2775CA]',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full max-w-[1280px] mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <h2 className="font-display font-bold text-4xl md:text-5xl mb-4 text-brand-slate">The Auto-Routing Engine</h2>
        <p className="font-body text-lg font-medium text-brand-slate/70 max-w-2xl mx-auto">
          We've abstracted away the complexity. Behind the scenes, our smart contracts route your deposit through the optimal yield-generating protocols.
        </p>
      </div>

      {/* Desktop flow */}
      <div className="hidden lg:flex items-center justify-between relative px-10">
        {/* Dashed connector line */}
        <div className="absolute left-20 right-20 top-10 h-1 dashed-line z-0"></div>

        {steps.map((s) => (
          <div key={s.title} className="relative z-10 flex flex-col items-center group w-64">
            <div className={`w-20 h-20 bg-white rounded-2xl border-4 border-brand-slate shadow-solid flex items-center justify-center mb-6 transform transition-transform group-hover:-translate-y-2 ${s.hoverBg}`}>
              {s.icon}
            </div>
            <div className={`${s.cardClass} rounded-xl p-4 w-full text-center shadow-solid-sm relative`}>
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.stepColor}`}>
                {s.step}
              </div>
              <h4 className="font-display font-bold text-xl mb-1 text-brand-slate">{s.title}</h4>
              <p className="text-xs font-semibold text-brand-slate/60">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile flow */}
      <div className="lg:hidden flex flex-col gap-8 relative max-w-sm mx-auto">
        <div className="absolute top-10 bottom-10 left-10 w-1 dashed-line-vertical z-0"></div>

        {steps.map((s) => (
          <div key={s.title} className="relative z-10 flex items-center gap-6">
            <div className="w-20 h-20 flex-shrink-0 bg-white rounded-2xl border-4 border-brand-slate shadow-solid flex items-center justify-center">
              {s.icon}
            </div>
            <div className={`${s.cardClass} rounded-xl p-4 flex-1 shadow-solid-sm`}>
              <div className="text-[10px] font-bold text-brand-slate/50 mb-1">{s.step}</div>
              <h4 className="font-display font-bold text-lg mb-0.5 text-brand-slate">{s.title}</h4>
              <p className="text-xs font-semibold text-brand-slate/60">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
