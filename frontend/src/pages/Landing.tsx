import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Effect } from '@/components/ui/animate'
import HeroSection from './landing/HeroSection'
import FeaturesSection from './landing/FeaturesSection'
import StatsSection from './landing/StatsSection'
import DemoSection from './landing/DemoSection'
import FooterSection from './landing/FooterSection'

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Demo', href: '#demo' },
    { label: 'Docs', href: '/docs' },
  ]

  return (
    <div className="min-h-screen scroll-smooth">
      {/* Navbar */}
      <Effect slide="down" blur duration={0.5}>
        <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            {/* Logo */}
            <a href="/landing" className="flex items-center gap-3">
              <img src="/logo-icon.png" alt="InsightRAG" className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-lg font-semibold tracking-tight text-white">
                InsightRAG
              </span>
            </a>

            {/* Desktop nav */}
            <div className="hidden items-center gap-8 sm:flex">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-white/50 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              <Button
                asChild
                className="h-9 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <a href="/">Sign In</a>
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center gap-2 sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg p-2 text-white/60 hover:bg-white/10"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="border-t border-white/5 bg-slate-950/90 px-6 py-4 backdrop-blur-xl sm:hidden">
              <div className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-white/60"
                  >
                    {link.label}
                  </a>
                ))}
                <Button
                  asChild
                  className="mt-2 h-10 w-full rounded-xl border border-white/15 bg-white/10 text-sm font-medium text-white"
                >
                  <a href="/">Sign In</a>
                </Button>
              </div>
            </div>
          )}
        </nav>
      </Effect>

      {/* Sections */}
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <DemoSection />
      <FooterSection />
    </div>
  )
}
