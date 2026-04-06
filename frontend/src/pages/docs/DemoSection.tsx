import { useRef } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { Effect } from '@/components/ui/animate'

function BrowserMockup({
  title,
  url,
  children,
}: {
  title: string
  url: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#0d1f3c] dark:shadow-[0_0_60px_-20px_rgba(56,189,248,0.1)]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-white/10" />
          <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-white/10" />
          <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-white/10" />
        </div>
        <div className="ml-4 flex-1 rounded-lg bg-slate-100 px-4 py-1.5 text-xs text-slate-400 dark:bg-white/[0.04] dark:text-white/30">
          {url}
        </div>
      </div>
      {/* Content */}
      <div className="p-6">
        {children}
      </div>
      {/* Caption */}
      <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
      </div>
    </div>
  )
}

export default function DemoSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'center center'],
  })
  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1])

  return (
    <section
      ref={containerRef}
      id="demo"
      className="relative z-20 bg-slate-50 py-24 dark:bg-[#0a1628] lg:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Effect slide="up" blur className="mb-16 text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-sky-300/30 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/5 dark:text-sky-300">
            Demo
          </div>
          <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white sm:text-5xl">
            See it in action
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Screenshots of the key workflows. (Placeholders &mdash; replace with actual screenshots.)
          </p>
        </Effect>

        <m.div style={{ scale, opacity }} className="space-y-8">
          {/* Screenshot 1: Plugin Config */}
          <BrowserMockup title="Plugin Configuration" url="insightrag.app/settings/plugins">
            <div className="flex min-h-[280px] gap-6">
              <div className="hidden w-48 space-y-3 border-r border-slate-100 pr-6 dark:border-white/[0.06] sm:block">
                <div className="h-5 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <div className="space-y-2">
                  {['General', 'Plugins', 'Users', 'API Keys'].map((item, i) => (
                    <div
                      key={item}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        i === 1
                          ? 'bg-sky-50 font-medium text-sky-600 dark:bg-sky-400/10 dark:text-sky-400'
                          : 'text-slate-400 dark:text-white/40'
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="h-6 w-32 rounded bg-slate-100 dark:bg-white/[0.08]" />
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-5 w-20 rounded bg-slate-200 dark:bg-white/[0.08]" />
                      <div className="mt-1 h-3 w-48 rounded bg-slate-100 dark:bg-white/[0.04]" />
                    </div>
                    <div className="h-8 w-20 rounded-lg bg-green-100 dark:bg-green-400/20" />
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400 dark:border-white/[0.1] dark:text-white/30">
                  + Add Plugin
                </div>
              </div>
            </div>
          </BrowserMockup>

          {/* Screenshot 2: MCP Tool Connection */}
          <BrowserMockup title="MCP Tool Connection in OpenWebUI" url="openwebui.local/admin/tools">
            <div className="min-h-[240px] space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-36 rounded bg-slate-100 dark:bg-white/[0.08]" />
                <div className="h-8 w-24 rounded-lg bg-sky-100 dark:bg-sky-500/20" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-400/10 dark:text-sky-300">
                      MCP
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-white/80">
                      InsightRAG KB Search
                    </span>
                    <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-400/10 dark:text-green-400">
                      Connected
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-xs text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/40">
                    http://host.docker.internal:8002/mcp
                  </div>
                </div>
              </div>
            </div>
          </BrowserMockup>

          {/* Screenshot 3: Chat with RAG */}
          <BrowserMockup title="RAG-Powered Chat" url="insightrag.app/chat">
            <div className="min-h-[260px] space-y-4">
              <div className="ml-auto max-w-xs rounded-2xl rounded-br-md bg-sky-100 px-4 py-3 text-sm text-sky-900 dark:bg-sky-400/10 dark:text-sky-200">
                What are our deployment guidelines?
              </div>
              <div className="mr-auto max-w-md space-y-2 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 dark:bg-white/[0.04]">
                <div className="h-3 w-full rounded bg-slate-200 dark:bg-white/[0.08]" />
                <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-white/[0.08]" />
                <div className="h-3 w-4/6 rounded bg-slate-200 dark:bg-white/[0.08]" />
                <div className="mt-3 inline-block rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-500 dark:bg-white/[0.06] dark:text-white/30">
                  Source: Engineering Docs &middot; 3 chunks retrieved
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <div className="h-4 flex-1 rounded bg-slate-100 dark:bg-white/[0.04]" />
                <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-400/20" />
              </div>
            </div>
          </BrowserMockup>
        </m.div>
      </div>
    </section>
  )
}
