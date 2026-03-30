export default function FooterSection() {
  return (
    <footer className="border-t border-slate-200 bg-[#f7f7f5] py-12 dark:border-slate-800 dark:bg-[hsl(240,6%,7%)]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 dark:bg-white">
              <span className="text-sm font-bold text-white dark:text-slate-950">IR</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              InsightRAG
            </span>
          </div>

          <nav className="flex gap-8 text-sm">
            <a
              href="#features"
              className="text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
            >
              Features
            </a>
            <a
              href="#demo"
              className="text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
            >
              Demo
            </a>
            <a
              href="/"
              className="text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
            >
              Sign In
            </a>
          </nav>

          <p className="text-sm text-slate-400 dark:text-slate-600">
            &copy; {new Date().getFullYear()} InsightRAG
          </p>
        </div>
      </div>
    </footer>
  )
}
