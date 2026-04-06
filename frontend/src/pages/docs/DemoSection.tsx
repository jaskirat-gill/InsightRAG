import { useRef } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { Effect } from '@/components/ui/animate'
import docsViewImage from '../../../screenshot/docs-view.png'
import openWebUIMcpImage from '../../../screenshot/openWebUI-mcp.png'
import pluginConfigImage from '../../../screenshot/plugin-config.png'

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
            Screenshots of the key setup screens in InsightRAG and OpenWebUI.
          </p>
        </Effect>

        <m.div style={{ scale, opacity }} className="space-y-8">
          {/* Screenshot 1: Docs view */}
          <BrowserMockup title="OpenWebUI docs and setup view" url="localhost/docs">
            <img
              src={docsViewImage}
              alt="OpenWebUI docs page used during setup"
              className="w-full rounded-xl border border-slate-200 shadow-sm dark:border-white/[0.08]"
            />
          </BrowserMockup>

          {/* Screenshot 2: MCP Tool Connection */}
          <BrowserMockup title="MCP Tool Connection in OpenWebUI" url="openwebui.local/admin/tools">
            <img
              src={openWebUIMcpImage}
              alt="OpenWebUI MCP tool configuration screen"
              className="w-full rounded-xl border border-slate-200 shadow-sm dark:border-white/[0.08]"
            />
          </BrowserMockup>

          {/* Screenshot 3: Plugin Config */}
          <BrowserMockup title="Plugin Configuration" url="insightrag.app/settings/plugins">
            <img
              src={pluginConfigImage}
              alt="InsightRAG plugin configuration screen"
              className="w-full rounded-xl border border-slate-200 shadow-sm dark:border-white/[0.08]"
            />
          </BrowserMockup>
        </m.div>
      </div>
    </section>
  )
}
