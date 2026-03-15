import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  return (
    <nav className="bg-brand-bg border-b-[3px] border-brand-slate sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 h-20 flex justify-between items-center">

        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 bg-brand-yellow rounded-full border-[3px] border-brand-slate flex items-center justify-center shadow-solid-sm">
            <i className="ph-bold ph-currency-btc text-xl text-brand-slate"></i>
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl leading-none text-brand-slate">StackVault</h1>
            <p className="text-[10px] font-extrabold text-brand-slate/60 tracking-widest mt-0.5">PROTOCOL</p>
          </div>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-10 font-display font-bold text-lg">
          <a href="#how-it-works" className="nav-link text-brand-slate transition-colors">How it Works</a>
          <a href="#security" className="nav-link text-brand-slate transition-colors">Security</a>
          <a href="#stats" className="nav-link text-brand-slate transition-colors">Stats</a>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 bg-white border-2 border-brand-slate rounded-full px-3 py-1.5 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-brand-teal animate-pulse-slow"></div>
            <span className="text-xs font-bold font-display uppercase tracking-wide">Mainnet Live</span>
          </div>
          <button onClick={() => navigate('/app')} className="bg-brand-slate text-white neo-button rounded-xl px-6 py-2.5 font-display font-bold text-lg flex items-center gap-2 hover:bg-[#2a2f33]">
            Launch App <i className="ph-bold ph-arrow-up-right"></i>
          </button>
        </div>

      </div>
    </nav>
  )
}
