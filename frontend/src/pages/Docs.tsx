import { useState, useEffect } from 'react'
import { Menu, X, Sun, Moon, Github } from 'lucide-react'
import QuickStartSection from './docs/QuickStartSection'
import DocsFeaturesSection from './docs/DocsFeaturesSection'
import LiveDemoSection from './docs/LiveDemoSection'
import PluginSetupSection from './docs/PluginSetupSection'
import MCPSetupSection from './docs/MCPSetupSection'
import DemoSection from './docs/DemoSection'
import SkillSection from './docs/SkillSection'
import TeamSection from './docs/TeamSection'

type Theme = 'dark' | 'light'
const THEME_STORAGE_KEY = 'openwebui-theme'

const sidebarLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Quick Start', href: '#quick-start' },
  { label: 'Features', href: '#features' },
  { label: 'Live Demo', href: '#live-demo' },
  { label: 'Plugin Setup', href: '#plugin-setup' },
  { label: 'MCP Setup', href: '#mcp-setup' },
  { label: 'Skill.md', href: '#skill-md' },
  { label: 'Screenshots', href: '#demo' },
  { label: 'Our Team', href: '#team' },
]

export default function Docs() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('#home')
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

  // Track active section on scroll
  useEffect(() => {
    const ids = ['home', 'quick-start', 'features', 'live-demo', 'plugin-setup', 'mcp-setup', 'skill-md', 'demo', 'team']
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`)
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))

  return (
    <div className="min-h-screen scroll-smooth bg-white dark:bg-[#060d1b]">
      {/* Top bar */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#060d1b]/90">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Left: logo */}
          <a href="/landing" className="flex items-center gap-2.5">
            <img
              src="/logo-icon.png"
              alt="InsightRAG"
              className="h-7 w-7 rounded-lg object-cover"
            />
            <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              InsightRAG
            </span>
          </a>

          {/* Right: icons */}
          <div className="flex items-center gap-1">
            <a
              href="https://github.com/jaskirat-gill/OpenWebUI-Project"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/70"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/70"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-white/40 dark:hover:bg-white/[0.06] lg:hidden"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-64 overflow-y-auto border-r border-slate-200/80 bg-white transition-transform dark:border-white/[0.06] dark:bg-[#060d1b] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="px-4 py-6">
          <ul className="space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = activeSection === link.href
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-400'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/[0.04] dark:hover:text-white/80'
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              )
            })}
          </ul>

          {/* Sidebar external links */}
          <div className="mt-8 border-t border-slate-200/80 pt-6 dark:border-white/[0.06]">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
              External
            </p>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://docs.openwebui.com/getting-started/quick-start"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:text-white/40 dark:hover:bg-white/[0.04] dark:hover:text-white/70"
                >
                  OpenWebUI Quick Start
                </a>
              </li>
              <li>
                <a
                  href="https://docs.openwebui.com/features"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:text-white/40 dark:hover:bg-white/[0.04] dark:hover:text-white/70"
                >
                  OpenWebUI Features
                </a>
              </li>
            </ul>
          </div>

          {/* Sign In link */}
          <div className="mt-6 px-3">
            <a
              href="/"
              className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/[0.08]"
            >
              Sign In to Workspace
            </a>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="pt-14 lg:pl-64">
        <div className="scroll-smooth">
          {/* Home / hero section */}
          <section
            id="home"
            className="relative overflow-hidden border-b border-slate-100 bg-white px-6 py-16 dark:border-white/[0.04] dark:bg-[#060d1b] lg:px-12 lg:py-24"
          >
            {/* Dark aurora */}
            <div className="pointer-events-none absolute inset-0 hidden dark:block">
              <div className="absolute left-1/2 top-[-20%] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-500/15 via-blue-600/8 to-transparent blur-[120px]" />
            </div>
            {/* Light gradient */}
            <div className="pointer-events-none absolute inset-0 dark:hidden">
              <div className="absolute left-1/2 top-[-20%] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-100/60 via-blue-50/40 to-transparent blur-[100px]" />
            </div>

            <div className="relative mx-auto max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                InsightRAG
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-400">
                InsightRAG is a{' '}
                <span className="font-medium text-slate-900 dark:text-white">
                  knowledge base control plane
                </span>{' '}
                for RAG systems. It syncs documents from cloud storage, processes them into searchable
                vector indexes, and exposes hybrid search through an{' '}
                <span className="font-medium text-slate-900 dark:text-white">MCP server</span> — all
                with a clean web interface for managing knowledge bases, monitoring document health,
                and querying via RAG-powered chat.
              </p>

              {/* Quick stats */}
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  'Knowledge Bases',
                  'RAG Search',
                  'Cloud Sync',
                  'MCP Tools',
                  'Document Health',
                ].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/5 dark:text-sky-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <QuickStartSection />
          <DocsFeaturesSection />
          <LiveDemoSection />
          <PluginSetupSection />
          <MCPSetupSection />
          <SkillSection />
          <DemoSection />
          <TeamSection />

          {/* Footer */}
          <footer className="border-t border-slate-200/80 bg-slate-50 px-6 py-8 dark:border-white/[0.06] dark:bg-[#0a1628]">
            <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo-icon.png"
                  alt="InsightRAG"
                  className="h-6 w-6 rounded-md object-cover"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-white/70">
                  InsightRAG
                </span>
              </div>
              <p className="text-sm text-slate-400 dark:text-white/30">
                &copy; {new Date().getFullYear()} InsightRAG
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
