import { useNavigate } from 'react-router-dom'

export default function CTA() {
  const navigate = useNavigate()
  return (
    <section className="w-full bg-brand-teal py-24 relative overflow-hidden border-b-[3px] border-brand-slate">
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '30px 30px' }}
      ></div>

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <h2 className="font-display font-bold text-5xl md:text-6xl text-white mb-6">
          Ready to aggregate your yield?
        </h2>
        <p className="font-body text-xl text-white/90 mb-10 font-medium">
          Connect your wallet and start maximizing your Bitcoin on Stacks today.
        </p>
        <button
          onClick={() => navigate('/app')}
          className="bg-brand-yellow text-brand-slate neo-button rounded-2xl px-10 py-5 font-display font-bold text-2xl inline-flex items-center gap-3 hover:bg-[#F9C36B]"
          style={{ boxShadow: '8px 8px 0px 0px #3A4045' }}
        >
          Launch Web App <i className="ph-bold ph-rocket-launch"></i>
        </button>
      </div>
    </section>
  )
}
