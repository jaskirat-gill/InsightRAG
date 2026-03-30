export default function FooterSection() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a1628] py-12">
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
              href="/"
              className="text-white/40 transition-colors hover:text-white"
            >
              Sign In
            </a>
          </nav>

          <p className="text-sm text-white/20">
            &copy; {new Date().getFullYear()} InsightRAG
          </p>
        </div>
      </div>
    </footer>
  )
}
