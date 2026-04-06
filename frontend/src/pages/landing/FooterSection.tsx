import { ArrowUpRight } from 'lucide-react'

export default function FooterSection() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a1628]">
      {/* CTA banner */}
      <div className="border-b border-white/[0.06] py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-lg text-slate-400">
            Sign in to your workspace and start managing your knowledge bases today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/"
              className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/10 bg-white px-10 text-base font-semibold text-slate-950 shadow-[0_0_40px_-8px_rgba(56,189,248,0.4)] transition-all hover:bg-sky-50 hover:shadow-[0_0_60px_-8px_rgba(56,189,248,0.6)]"
            >
              Get Started
              <ArrowUpRight className="h-5 w-5" />
            </a>
            <a
              href="/docs"
              className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-10 text-base font-semibold text-white/90 backdrop-blur-sm transition-all hover:border-white/25 hover:bg-white/10"
            >
              Read the Docs
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <img src="/logo-icon.png" alt="InsightRAG" className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-lg font-semibold tracking-tight text-white">
                InsightRAG
              </span>
            </div>

            <nav className="flex gap-8 text-sm">
              <a
                href="#features"
                className="text-white/40 transition-colors hover:text-white"
              >
                Features
              </a>
              <a
                href="#demo"
                className="text-white/40 transition-colors hover:text-white"
              >
                Demo
              </a>
              <a
                href="/docs"
                className="text-white/40 transition-colors hover:text-white"
              >
                Docs
              </a>
              <a
                href="/"
                className="text-white/40 transition-colors hover:text-white"
              >
                Workspace
              </a>
            </nav>

            <p className="text-sm text-white/20">
              &copy; {new Date().getFullYear()} InsightRAG
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
