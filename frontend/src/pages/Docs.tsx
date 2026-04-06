import { useState, useEffect } from 'react'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Effect } from '@/components/ui/animate'
import DocsHeroSection from './docs/DocsHeroSection'
import PluginSetupSection from './docs/PluginSetupSection'
import MCPSetupSection from './docs/MCPSetupSection'
import DemoSection from './docs/DemoSection'
import TeamSection from './docs/TeamSection'
import FooterSection from './landing/FooterSection'

type Theme = 'dark' | 'light'
const THEME_STORAGE_KEY = 'openwebui-theme'

export default function Docs() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

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

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))

  const navLinks = [
    { label: 'Plugin Setup', href: '#plugin-setup' },
    { label: 'MCP Setup', href: '#mcp-setup' },
    { label: 'Demo', href: '#demo' },
    { label: 'Team', href: '#team' },
  ]

  return (
    <div className="min-h-screen scroll-smooth bg-white dark:bg-[#060d1b]">
      {/* Navbar */}
      <Effect slide="down" blur duration={0.5}>
        <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/60">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            {/* Logo */}
            <a href="/landing" className="flex items-center gap-3">
              <img
                src="/logo-icon.png"
                alt="InsightRAG"
                className="h-8 w-8 rounded-lg object-cover"
              />
              <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                InsightRAG
              </span>
            </a>

            {/* Desktop nav */}
            <div className="hidden items-center gap-6 sm:flex">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
                >
                  {link.label}
                </a>
              ))}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              <Button
                asChild
                className="h-9 rounded-xl border border-slate-200 bg-slate-100 px-5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-200 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                <a href="/">Sign In</a>
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center gap-2 sm:hidden">
              <button
                onClick={toggleTheme}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="border-t border-slate-200/60 bg-white/95 px-6 py-4 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/90 sm:hidden">
              <div className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-slate-600 dark:text-white/60"
                  >
                    {link.label}
                  </a>
                ))}
                <Button
                  asChild
                  className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-white"
                >
                  <a href="/">Sign In</a>
                </Button>
              </div>
            </div>
          )}
        </nav>
      </Effect>

      {/* Sections */}
      <DocsHeroSection />
      <PluginSetupSection />
      <MCPSetupSection />
      <DemoSection />
      <TeamSection />
      <FooterSection />
    </div>
  )
}
