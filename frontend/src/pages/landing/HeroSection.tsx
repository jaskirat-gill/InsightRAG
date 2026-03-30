import { useRef } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { Effect, Effects } from '@/components/ui/animate'
import { Button } from '@/components/ui/button'

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [0, -120])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f7f5] dark:bg-[hsl(240,6%,7%)]"
    >
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 dark:opacity-20" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[11%] top-[16%] h-64 w-64 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute bottom-[12%] right-[10%] h-72 w-72 rounded-full bg-slate-200/50 blur-3xl dark:bg-sky-900/20" />
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-slate-100/40 blur-3xl dark:bg-slate-800/20" />
      </div>

      <m.div
        style={{ y, opacity }}
        className="relative z-10 mx-auto max-w-5xl px-6 text-center"
      >
        <Effects className="space-y-6">
          <Effect slide="up" blur delay={0.1}>
            <div className="mx-auto inline-flex items-center gap-4 rounded-full border border-slate-200/80 bg-white/80 py-2.5 pl-2.5 pr-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] backdrop-blur-lg dark:border-slate-700/80 dark:bg-slate-800/80 dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]">
              <img
                src="/logo-icon.png"
                alt="InsightRAG"
                className="h-14 w-14 rounded-full object-cover"
              />
              <span className="text-base font-semibold tracking-wide text-slate-700 dark:text-slate-300">
                InsightRAG Workspace
              </span>
            </div>
          </Effect>

          <Effect slide="up" blur delay={0.2}>
            <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl dark:text-white">
              Your team knowledge,{' '}
              <span className="bg-gradient-to-r from-sky-500 to-sky-700 bg-clip-text text-transparent dark:from-sky-400 dark:to-sky-600">
                unified and searchable
              </span>
            </h1>
          </Effect>

          <Effect slide="up" blur delay={0.3}>
            <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-500 dark:text-slate-400">
              Connect your storage, sync documents automatically, monitor ingestion health, and
              query everything through a RAG-powered chat — all from one calm workspace.
            </p>
          </Effect>

          <Effect slide="up" blur delay={0.4}>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                className="h-12 rounded-2xl bg-slate-950 px-8 text-base font-medium text-white shadow-[0_18px_36px_-22px_rgba(15,23,42,0.6)] transition-colors hover:bg-sky-700 dark:bg-white dark:text-slate-950 dark:hover:bg-sky-400"
              >
                <a href="/">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="link"
                onClick={scrollToFeatures}
                className="h-12 text-base font-medium text-slate-600 hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-400"
              >
                Learn More
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </Effect>
        </Effects>
      </m.div>

      {/* Scroll indicator */}
      <m.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown className="h-6 w-6 text-slate-400 dark:text-slate-600" />
      </m.div>
    </section>
  )
}
