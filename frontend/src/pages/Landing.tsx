import { useState, useEffect } from 'react'
import { Sun, Moon, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Effect } from '@/components/ui/animate'
import HeroSection from './landing/HeroSection'
import FeaturesSection from './landing/FeaturesSection'
import StatsSection from './landing/StatsSection'
import DemoSection from './landing/DemoSection'
import FooterSection from './landing/FooterSection'

const THEME_STORAGE_KEY = 'openwebui-theme'
type Theme = 'dark' | 'light'

export default function Landing() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
    root.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme((p) => (p === 'dark' ? 'light' : 'dark'))

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Demo', href: '#demo' },
  ]

  return (
    <div className="min-h-screen scroll-smooth">
      {/* Navbar */}
      <Effect slide="down" blur duration={0.5}>
        <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/80">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            {/* Logo */}
            <a href="/landing" className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 dark:bg-white">
                <span className="text-sm font-bold text-white dark:text-slate-950">IR</span>
              </div>
              <span className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                InsightRAG
              </span>
            </a>

            {/* Desktop nav */}
            <div className="hidden items-center gap-8 sm:flex">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              <button
                onClick={toggleTheme}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Button
                asChild
                className="h-9 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition-colors hover:bg-sky-700 dark:bg-white dark:text-slate-950 dark:hover:bg-sky-400"
              >
                <a href="/">Sign In</a>
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center gap-2 sm:hidden">
              <button
                onClick={toggleTheme}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="border-t border-slate-200/60 bg-white/95 px-6 py-4 backdrop-blur-xl sm:hidden dark:border-slate-800/60 dark:bg-slate-950/95">
              <div className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-slate-600 dark:text-slate-400"
                  >
                    {link.label}
                  </a>
                ))}
                <Button
                  asChild
                  className="mt-2 h-10 w-full rounded-xl bg-slate-950 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
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
