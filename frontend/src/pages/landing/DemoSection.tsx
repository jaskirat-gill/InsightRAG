import { useRef } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { Effect } from '@/components/ui/animate'

export default function DemoSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'center center'],
  })
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1])

  return (
    <section
      ref={containerRef}
      id="demo"
      className="relative z-20 bg-[#f7f7f5] py-24 dark:bg-[hsl(240,6%,7%)] lg:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Effect slide="up" blur className="mb-16 text-center">
          <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl dark:text-white">
            See it in action
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            A clean, focused interface designed for knowledge operations.
          </p>
        </Effect>

        <m.div
          style={{ scale, opacity }}
          className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-700/50 dark:bg-slate-900"
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/80">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
              <div className="h-3 w-3 rounded-full bg-green-400/80" />
            </div>
            <div className="ml-4 flex-1 rounded-lg bg-white/80 px-4 py-1.5 text-xs text-slate-400 dark:bg-slate-700/50 dark:text-slate-500">
              insightrag.app/dashboard
            </div>
          </div>

          {/* Mock dashboard */}
          <div className="flex min-h-[400px] sm:min-h-[480px]">
            {/* Sidebar mock */}
            <div className="hidden w-56 border-r border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 sm:block">
              <div className="mb-6 h-6 w-28 rounded bg-slate-200/60 dark:bg-slate-700/60" />
              <div className="space-y-3">
                {['Home', 'Knowledge Bases', 'Chat', 'Users'].map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                      i === 1
                        ? 'bg-sky-50 font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-400'
                        : 'text-slate-500 dark:text-slate-500'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded ${
                        i === 1
                          ? 'bg-sky-200 dark:bg-sky-800'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Main content mock */}
            <div className="flex-1 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <div className="h-7 w-40 rounded bg-slate-200/60 dark:bg-slate-700/60" />
                  <div className="mt-2 h-4 w-64 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="h-9 w-32 rounded-xl bg-slate-900 dark:bg-white" />
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { name: 'Engineering Docs', count: '142 docs', color: 'bg-sky-100 dark:bg-sky-950' },
                  { name: 'Product Specs', count: '87 docs', color: 'bg-emerald-100 dark:bg-emerald-950' },
                  { name: 'Research Papers', count: '256 docs', color: 'bg-amber-100 dark:bg-amber-950' },
                ].map((kb) => (
                  <div
                    key={kb.name}
                    className="rounded-xl border border-slate-100 p-4 dark:border-slate-800"
                  >
                    <div className={`mb-3 h-8 w-8 rounded-lg ${kb.color}`} />
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {kb.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {kb.count}
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${60 + Math.random() * 35}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </m.div>
      </div>
    </section>
  )
}
