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
      className="relative z-20 bg-[#0a1628] py-24 lg:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Effect slide="up" blur className="mb-16 text-center">
          <h2 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            See it in action
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            A clean, focused interface designed for knowledge operations.
          </p>
        </Effect>

        <m.div
          style={{ scale, opacity }}
          className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1f3c] shadow-[0_0_80px_-20px_rgba(56,189,248,0.15)]"
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-white/10" />
            </div>
            <div className="ml-4 flex-1 rounded-lg bg-white/[0.04] px-4 py-1.5 text-xs text-white/30">
              insightrag.app/dashboard
            </div>
          </div>

          {/* Mock dashboard */}
          <div className="flex min-h-[400px] sm:min-h-[480px]">
            {/* Sidebar mock */}
            <div className="hidden w-56 border-r border-white/[0.06] bg-white/[0.02] p-4 sm:block">
              <div className="mb-6 h-6 w-28 rounded bg-white/[0.06]" />
              <div className="space-y-3">
                {['Home', 'Knowledge Bases', 'Chat', 'Users'].map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                      i === 1
                        ? 'bg-sky-400/10 font-medium text-sky-400'
                        : 'text-white/40'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded ${
                        i === 1
                          ? 'bg-sky-400/30'
                          : 'bg-white/10'
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
                  <div className="h-7 w-40 rounded bg-white/[0.08]" />
                  <div className="mt-2 h-4 w-64 rounded bg-white/[0.04]" />
                </div>
                <div className="h-9 w-32 rounded-xl bg-sky-500/80" />
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { name: 'Engineering Docs', count: '142 docs', color: 'bg-sky-400/15' },
                  { name: 'Product Specs', count: '87 docs', color: 'bg-blue-400/15' },
                  { name: 'Research Papers', count: '256 docs', color: 'bg-sky-300/15' },
                ].map((kb) => (
                  <div
                    key={kb.name}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div className={`mb-3 h-8 w-8 rounded-lg ${kb.color}`} />
                    <div className="text-sm font-medium text-white/80">
                      {kb.name}
                    </div>
                    <div className="mt-1 text-xs text-white/30">
                      {kb.count}
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-sky-500/60"
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
