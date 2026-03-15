export default function Footer() {
  return (
    <footer className="bg-brand-bg py-12">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8 pb-8 border-b-[3px] border-brand-slate/10">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-yellow rounded-full border-[3px] border-brand-slate flex items-center justify-center">
              <i className="ph-bold ph-currency-btc text-xl text-brand-slate"></i>
            </div>
            <span className="font-display font-bold text-2xl text-brand-slate">StackVault</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-8 text-sm font-bold text-brand-slate/70 uppercase tracking-wide">
            {['Documentation', 'Security Audits', 'Terms of Service', 'Privacy Policy'].map((l) => (
              <a key={l} href="#" className="hover:text-brand-teal transition-colors">{l}</a>
            ))}
          </div>

          {/* Social icons */}
          <div className="flex gap-4">
            {[
              { icon: 'ph-fill ph-twitter-logo', label: 'Twitter' },
              { icon: 'ph-fill ph-discord-logo', label: 'Discord' },
              { icon: 'ph-fill ph-github-logo',  label: 'GitHub'  },
            ].map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                className="w-12 h-12 rounded-full bg-white border-[3px] border-brand-slate flex items-center justify-center hover:bg-brand-yellow hover:-translate-y-1 transition-all shadow-solid-sm"
              >
                <i className={`${s.icon} text-xl text-brand-slate`}></i>
              </a>
            ))}
          </div>
        </div>

        <div className="text-center text-sm font-bold text-brand-slate/40">
          © 2026 StackVault Protocol. Built natively on Stacks. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
