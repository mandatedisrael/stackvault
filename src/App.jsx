import { Component } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center px-6">
          <div className="neo-card p-10 text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 border-[3px] border-brand-slate rounded-full flex items-center justify-center mx-auto mb-5">
              <i className="ph-bold ph-warning text-3xl text-red-500"></i>
            </div>
            <h2 className="font-display font-bold text-2xl text-brand-slate mb-3">Something went wrong</h2>
            <p className="text-brand-slate/60 font-semibold mb-6">
              An unexpected error occurred. Please refresh the page and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-brand-yellow text-brand-slate neo-button rounded-xl px-6 py-3 font-display font-bold"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function NotFound() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-6">
      <div className="neo-card p-10 text-center max-w-md">
        <div className="w-16 h-16 bg-brand-yellow border-[3px] border-brand-slate rounded-full flex items-center justify-center mx-auto mb-5">
          <i className="ph-bold ph-map-trifold text-3xl text-brand-slate"></i>
        </div>
        <h2 className="font-display font-bold text-4xl text-brand-slate mb-2">404</h2>
        <p className="text-brand-slate/60 font-semibold mb-6">
          This page doesn't exist. Let's get you back on track.
        </p>
        <Link
          to="/"
          className="inline-block bg-brand-yellow text-brand-slate neo-button rounded-xl px-6 py-3 font-display font-bold"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </WalletProvider>
    </BrowserRouter>
  )
}
