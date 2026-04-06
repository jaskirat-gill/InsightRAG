import { m, useReducedMotion } from 'motion/react'
import { Effect } from '@/components/ui/animate'
import { ArrowUpRight } from 'lucide-react'

const steps = [
  {
    step: '1',
    title: 'Open External Tools',
    description: (
      <>
        In OpenWebUI, navigate to{' '}
        <span className="font-medium text-slate-900 dark:text-white">
          Settings &rarr; Admin Settings &rarr; External Tools
        </span>{' '}
        and click the <strong>+</strong> icon to add a new tool.
      </>
    ),
  },
  {
    step: '2',
    title: 'Set MCP Transport',
    description: (
      <>
        Change the type from <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">OpenAPI</code> to{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">MCP</code>.
        Set the URL to:
        <span className="mt-2 block rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 font-mono text-sm text-sky-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-sky-300">
          http://host.docker.internal:8002/mcp
        </span>
      </>
    ),
  },
  {
    step: '3',
    title: 'Configure Bearer Auth',
    description: (
      <>
        If your OpenWebUI build supports MCP auth headers, add a bearer token issued by the
        sync-service. This enables per-user KB scoping. The token format is:
        <span className="mt-2 block rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 font-mono text-sm text-sky-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-sky-300">
          Authorization: Bearer &lt;jwt_access_token&gt;
        </span>
      </>
    ),
  },
  {
    step: '4',
    title: 'Verify & Save',
    description:
      'Set an ID and name (arbitrary), check the connection to make sure the MCP server responds, then save. The MCP tools will now be available in your chat sessions.',
  },
]

const externalLinks = [
  {
    label: 'Getting Started — Quick Start',
    href: 'https://docs.openwebui.com/getting-started/quick-start',
  },
  {
    label: 'OpenWebUI Features',
    href: 'https://docs.openwebui.com/features',
  },
]

export default function MCPSetupSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="mcp-setup"
      className="relative overflow-hidden bg-white py-24 dark:bg-[#060d1b] lg:py-32"
    >
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div className="absolute right-[-8%] top-[10%] h-[400px] w-[400px] rounded-full bg-gradient-to-l from-cyan-400/10 via-teal-500/5 to-transparent blur-[100px]" />
      </div>

      <div className="mx-auto max-w-4xl px-6">
        <Effect slide="up" blur className="mb-16 text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-sky-300/30 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/5 dark:text-sky-300">
            MCP Setup
          </div>
          <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white sm:text-5xl">
            Connect MCP over HTTP
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Register the InsightRAG MCP server in OpenWebUI to enable knowledge base search
            directly from chat.
          </p>
        </Effect>

        {/* Timeline steps */}
        <div className="relative space-y-8">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 hidden h-full w-px bg-slate-200 dark:bg-white/[0.08] sm:block" />

          {steps.map((item, i) => (
            <m.div
              key={item.step}
              initial={reduceMotion ? false : { opacity: 0, x: -20 }}
              whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex gap-6"
            >
              {/* Step number */}
              <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-lg font-bold text-sky-600 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-400">
                {item.step}
              </div>

              {/* Content */}
              <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {item.description}
                </div>
              </div>
            </m.div>
          ))}
        </div>

        {/* External links */}
        <Effect slide="up" blur className="mt-16">
          <div className="flex flex-wrap justify-center gap-4">
            {externalLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-sky-300 hover:text-sky-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-sky-400/30 dark:hover:text-sky-400"
              >
                {link.label}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ))}
          </div>
        </Effect>
      </div>
    </section>
  )
}
