import { m, useReducedMotion } from 'motion/react'
import { Effect } from '@/components/ui/animate'

const steps = [
  {
    step: '1',
    title: 'Log in and open Settings',
    description: (
      <>
        <ol className="list-inside list-decimal space-y-1.5 text-slate-700 dark:text-slate-300">
          <li>
            Open InsightRAG in your browser at{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">
              http://localhost:5173
            </code>
          </li>
          <li>Log in with your email and password</li>
          <li>
            Click the <strong>gear icon</strong> in the bottom-left of the sidebar to open{' '}
            <strong>Settings</strong>
          </li>
          <li>
            Click the <strong>"Plugins"</strong> tab on the left side
          </li>
        </ol>
      </>
    ),
  },
  {
    step: '2',
    title: 'Discover available plugins',
    description: (
      <>
        <span className="block text-slate-700 dark:text-slate-300">
          On the Plugins page you will see a list of <strong>discovered plugins</strong> — these are
          the sync sources that InsightRAG can connect to. Currently the only available plugin is the{' '}
          <strong>S3Plugin</strong> (Amazon S3 / compatible storage).
        </span>
        <span className="mt-2 block text-xs text-slate-400">
          New plugin types will appear here automatically when developers add them to the codebase.
          No restart required.
        </span>
      </>
    ),
  },
  {
    step: '3',
    title: 'Add a new plugin instance',
    description: (
      <>
        <ol className="list-inside list-decimal space-y-1.5 text-slate-700 dark:text-slate-300">
          <li>
            Click the <strong>"Add Plugin"</strong> button
          </li>
          <li>
            Select the plugin type from the dropdown (e.g.{' '}
            <strong>S3Plugin</strong>)
          </li>
          <li>
            Fill in the configuration fields that appear. For S3, you need:
          </li>
        </ol>
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
              Bucket Name
            </span>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
              The name of your S3 bucket (e.g. <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">my-company-docs</code>)
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
              Region
            </span>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
              AWS region (e.g. <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">us-east-1</code>)
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
              AWS Credentials
            </span>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
              If not already set via environment variables in Docker, enter your Access Key ID and
              Secret Access Key here.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    step: '4',
    title: 'Test the connection',
    description: (
      <>
        <ol className="list-inside list-decimal space-y-1.5 text-slate-700 dark:text-slate-300">
          <li>
            Click the <strong>"Test Connection"</strong> button on your plugin card
          </li>
          <li>
            Wait a few seconds — you should see a <strong>green success message</strong>
          </li>
          <li>
            If it fails, double-check your bucket name, region, and credentials. Make sure the S3
            bucket exists and your IAM user has read access.
          </li>
        </ol>
      </>
    ),
  },
  {
    step: '5',
    title: 'Activate the plugin',
    description: (
      <>
        <ol className="list-inside list-decimal space-y-1.5 text-slate-700 dark:text-slate-300">
          <li>
            Toggle the plugin to <strong>Active</strong> (the switch should turn green/blue)
          </li>
          <li>
            Click <strong>"Save Changes"</strong>
          </li>
        </ol>
        <span className="mt-2 block text-sm text-slate-600 dark:text-slate-400">
          Once active, the plugin will participate in sync cycles. Documents from your S3 bucket will
          be pulled, parsed, chunked, and indexed automatically.
        </span>
      </>
    ),
  },
  {
    step: '6',
    title: 'Create a Knowledge Base and trigger sync',
    description: (
      <>
        <ol className="list-inside list-decimal space-y-1.5 text-slate-700 dark:text-slate-300">
          <li>
            Go back to the main page and click <strong>"Knowledge Bases"</strong> in the sidebar
          </li>
          <li>
            Click <strong>"Create Knowledge Base"</strong>
          </li>
          <li>
            Give it a name and description, select the plugin as the source, and set the sync paths
            (the S3 key prefixes you want to import, e.g.{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">
              docs/engineering
            </code>
            )
          </li>
          <li>
            Choose a processing strategy (Semantic, Fixed, or Dynamic chunking)
          </li>
          <li>
            Save the KB, then click <strong>"Sync Now"</strong> or wait for the automatic scheduler
          </li>
        </ol>
        <span className="mt-3 block text-sm text-slate-600 dark:text-slate-400">
          Documents will appear in the Knowledge Base dashboard as they are processed. You can
          monitor their status (processing, completed, failed) in real time.
        </span>
      </>
    ),
  },
]

export default function PluginSetupSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="plugin-setup"
      className="relative overflow-hidden bg-slate-50 py-16 dark:bg-[#0a1628] lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div className="absolute left-1/2 top-[-18%] h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-500/15 via-blue-600/8 to-transparent blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl px-6">
        <Effect slide="up" blur className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-sky-300/30 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/5 dark:text-sky-300">
            Getting Started
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white sm:text-4xl">
            Set up your sync plugin
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-400">
            Follow these steps to connect your cloud storage and start syncing documents into
            InsightRAG. This guide uses the <strong>S3 Plugin</strong> as an example.
          </p>
        </Effect>

        {/* Timeline steps */}
        <div className="relative space-y-6">
          <div className="absolute left-6 top-0 hidden h-full w-px bg-slate-300 dark:bg-white/[0.08] sm:block" />

          {steps.map((item, i) => (
            <m.div
              key={item.step}
              initial={reduceMotion ? false : { opacity: 0, x: -20 }}
              whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.05 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex gap-5"
            >
              <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-lg font-bold text-sky-600 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-400">
                {item.step}
              </div>
              <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03] dark:shadow-none">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {item.description}
                </div>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}
