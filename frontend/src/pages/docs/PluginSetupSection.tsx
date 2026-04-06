import { m, useReducedMotion } from 'motion/react'
import { Effect } from '@/components/ui/animate'
import { Search, Plus, TestTube, ToggleRight, RefreshCw } from 'lucide-react'

const steps = [
  {
    icon: Search,
    title: '1. Discover Plugins',
    description:
      'The system scans for available plugin classes automatically. Go to Settings > Plugins to see discovered plugins, or call GET /plugins/discovered.',
  },
  {
    icon: Plus,
    title: '2. Create Instance',
    description:
      'Click "Add Plugin" and select a plugin type (e.g., S3Plugin). Fill in the configuration fields like bucket name, region, and credentials.',
  },
  {
    icon: TestTube,
    title: '3. Test Connection',
    description:
      'Click "Test Connection" to validate credentials and connectivity before activating. The system verifies access to your storage provider.',
  },
  {
    icon: ToggleRight,
    title: '4. Activate',
    description:
      'Toggle the plugin to active and save. Active plugins participate in sync cycles and will begin ingesting documents.',
  },
  {
    icon: RefreshCw,
    title: '5. Sync',
    description:
      'Trigger a manual sync or wait for the background scheduler. Documents are automatically parsed, chunked, embedded, and indexed into Qdrant.',
  },
]

export default function PluginSetupSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="plugin-setup"
      className="relative overflow-hidden bg-slate-50 py-24 dark:bg-[#0a1628] lg:py-32"
    >
      {/* Dark aurora blobs */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div className="absolute left-1/2 top-[-18%] h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-500/15 via-blue-600/8 to-transparent blur-[120px]" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <Effect slide="up" blur className="mb-16 text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-sky-300/30 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/5 dark:text-sky-300">
            Plugin Setup
          </div>
          <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white sm:text-5xl">
            Set up your sync plugin
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Connect your cloud storage in five steps. InsightRAG currently ships with an S3
            plugin, with more sources coming soon.
          </p>
        </Effect>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <m.div
              key={step.title}
              initial={reduceMotion ? false : { opacity: 0, y: 30 }}
              whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-sky-300 dark:border-white/[0.06] dark:bg-white/[0.03] dark:shadow-none dark:hover:border-sky-400/30 dark:hover:bg-sky-400/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-400 dark:group-hover:bg-sky-400/20">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {step.description}
              </p>
            </m.div>
          ))}
        </div>

        <Effect slide="up" blur className="mt-12 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-500">
            For the full API reference and S3 config examples, see{' '}
            <a
              href="https://docs.openwebui.com/getting-started/quick-start"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sky-600 underline decoration-sky-600/30 hover:decoration-sky-600 dark:text-sky-400 dark:decoration-sky-400/30 dark:hover:decoration-sky-400"
            >
              docs.openwebui.com &mdash; Quick Start
            </a>
          </p>
        </Effect>
      </div>
    </section>
  )
}
