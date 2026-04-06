import { m } from 'motion/react'
import { BookOpen } from 'lucide-react'
import { Effect } from '@/components/ui/animate'

export default function DocsHeroSection() {
  return (
    <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden bg-white dark:bg-[#060d1b]">
      {/* Aurora blobs — dark only */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div className="absolute left-1/2 top-[-10%] h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-500/20 via-blue-600/10 to-transparent blur-[120px]" />
        <div className="absolute right-[-5%] top-[15%] h-[400px] w-[400px] rounded-full bg-gradient-to-l from-cyan-400/12 via-teal-500/6 to-transparent blur-[100px]" />
      </div>

      {/* Light-mode subtle gradient */}
      <div className="pointer-events-none absolute inset-0 dark:hidden">
        <div className="absolute left-1/2 top-[-10%] h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-100/80 via-blue-50/60 to-transparent blur-[100px]" />
      </div>

      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:48px_48px] dark:bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <Effect slide="up" blur>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 dark:border-sky-400/20 dark:bg-sky-400/10">
            <BookOpen className="h-8 w-8 text-sky-600 dark:text-sky-400" />
          </div>
        </Effect>

        <m.h1
          className="text-5xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white sm:text-6xl"
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="bg-gradient-to-r from-sky-600 via-blue-500 to-sky-600 bg-clip-text text-transparent dark:from-sky-400 dark:via-blue-300 dark:to-sky-500">
            Documentation
          </span>
        </m.h1>

        <m.p
          className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          Learn how to set up plugins, configure MCP over HTTP, and get started with InsightRAG.
        </m.p>
      </div>
    </section>
  )
}
