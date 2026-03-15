const stats = [
  {
    icon: 'ph-bold ph-lock-key',
    iconColor: 'text-brand-yellow',
    label: 'Total Value Locked',
    value: '$42.5M',
    valueColor: 'text-white',
  },
  {
    icon: 'ph-bold ph-coins',
    iconColor: 'text-brand-teal',
    label: 'Total Yield Generated',
    value: '+$3.2M',
    valueColor: 'text-brand-teal',
  },
  {
    icon: 'ph-bold ph-users',
    iconColor: 'text-brand-beige',
    label: 'Active Yielders',
    value: '12,450+',
    valueColor: 'text-white',
  },
]

export default function Stats() {
  return (
    <section id="stats" className="w-full bg-brand-slate text-white py-16 border-y-[3px] border-brand-slate relative overflow-hidden">
      <div className="absolute inset-0 pattern-bg opacity-10"></div>

      <div className="max-w-[1280px] mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 divide-y-2 md:divide-y-0 md:divide-x-2 divide-white/10">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center text-center px-4 py-4 md:py-0">
              <div className="w-12 h-12 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mb-4">
                <i className={`${s.icon} text-2xl ${s.iconColor}`}></i>
              </div>
              <p className="text-sm font-extrabold tracking-widest text-white/60 uppercase mb-2">{s.label}</p>
              <p className={`font-display font-bold text-5xl lg:text-6xl ${s.valueColor}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
