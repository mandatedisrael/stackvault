import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Stats from '../components/Stats'
import HowItWorks from '../components/HowItWorks'
import Security from '../components/Security'
import CTA from '../components/CTA'
import Footer from '../components/Footer'

export default function LandingPage() {
  return (
    <div className="text-brand-slate font-body w-full min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full flex flex-col">
        <Hero />
        <Stats />
        <HowItWorks />
        <Security />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
