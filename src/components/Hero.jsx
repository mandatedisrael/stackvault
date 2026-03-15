import { useNavigate } from 'react-router-dom'

export default function Hero() {
  const navigate = useNavigate()
  return (
    <section className="relative w-full max-w-[1280px] mx-auto px-6 pt-16 pb-24 flex flex-col items-center justify-center text-center overflow-hidden">

      {/* Background blobs */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-brand-teal/20 rounded-full blur-2xl z-0"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-brand-yellow/30 rounded-full blur-2xl z-0"></div>

      {/* Floating APY card */}
      <div className="absolute top-20 right-20 animate-float hidden lg:block z-0">
        <div className="bg-white border-[3px] border-brand-slate rounded-2xl p-4 shadow-solid transform rotate-6">
          <div className="flex items-center gap-2 mb-1">
            <i className="ph-fill ph-trend-up text-brand-teal"></i>
            <span className="text-xs font-extrabold text-brand-slate/60 tracking-widest uppercase">Max APY</span>
          </div>
          <span className="font-display font-bold text-3xl text-brand-teal">14.2%</span>
        </div>
      </div>

      {/* Floating security card */}
      <div className="absolute bottom-32 left-16 animate-float-delayed hidden lg:block z-0">
        <div className="bg-white border-[3px] border-brand-slate rounded-2xl p-4 shadow-solid transform -rotate-3">
          <div className="flex items-center gap-2 mb-1">
            <i className="ph-fill ph-shield-check text-brand-yellow"></i>
            <span className="text-xs font-extrabold text-brand-slate/60 tracking-widest uppercase">Secured by</span>
          </div>
          <span className="font-display font-bold text-xl text-brand-slate">Stacks &amp; Bitcoin</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-3xl flex flex-col items-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white border-[3px] border-brand-slate rounded-full px-4 py-1.5 mb-8 shadow-solid-sm">
          <div className="w-6 h-6 rounded-full bg-brand-yellow border-2 border-brand-slate flex items-center justify-center">
            <i className="ph-bold ph-lightning text-xs text-brand-slate"></i>
          </div>
          <span className="font-bold font-display text-sm tracking-wide">V2 Auto-Routing is now live</span>
        </div>

        {/* Headline */}
        <h1 className="font-display font-bold text-6xl md:text-7xl lg:text-8xl mb-6 leading-[1.1] text-brand-slate tracking-tight">
          Your BTC is <br />
          <span className="relative inline-block">
            <span className="relative z-10">working.</span>
            <span className="absolute bottom-2 left-0 w-full h-4 bg-brand-yellow -z-10 transform -skew-x-12"></span>
          </span>
        </h1>

        <p className="font-body text-xl md:text-2xl font-medium opacity-90 mb-10 max-w-2xl text-brand-slate/80">
          The premier automated dual-yield and liquidity loop protocol on Stacks. Deposit once, maximize returns, and unlock liquidity without selling.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <button onClick={() => navigate('/app')} className="bg-brand-yellow text-brand-slate neo-button rounded-2xl px-8 py-4 font-display font-bold text-xl flex items-center gap-3 w-full sm:w-auto justify-center hover:bg-[#F9C36B]">
            Start Earning Now
            <i className="ph-bold ph-arrow-right"></i>
          </button>
          <button className="bg-white text-brand-slate neo-button rounded-2xl px-8 py-4 font-display font-bold text-xl flex items-center gap-3 w-full sm:w-auto justify-center hover:bg-gray-50">
            Read the Docs
            <i className="ph-bold ph-book-open"></i>
          </button>
        </div>
      </div>

    </section>
  )
}
