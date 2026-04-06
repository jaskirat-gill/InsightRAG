import { m, useReducedMotion } from 'motion/react'
import { Effect } from '@/components/ui/animate'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

function CodeBlock({ children, label }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative mt-2 rounded-lg border border-slate-200 bg-slate-100 dark:border-white/[0.08] dark:bg-white/[0.04]">
      {label && (
        <div className="border-b border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-400 dark:border-white/[0.06] dark:text-white/30">
          {label}
        </div>
      )}
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-sky-700 dark:text-sky-300">
          {children}
        </pre>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-white/[0.08] dark:hover:text-white/60"
          aria-label="Copy"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

const steps = [
  {
    step: '1',
    title: 'Install prerequisites',
    description: (
      <>
        <span className="block text-slate-700 dark:text-slate-300">
          Make sure you have these installed on your computer before starting:
        </span>
        <ul className="mt-2 list-inside list-disc space-y-1.5 text-slate-700 dark:text-slate-300">
          <li>
            <strong>Git</strong> &mdash; to clone the repository (
            <a href="https://git-scm.com/downloads" target="_blank" rel="noopener noreferrer" className="text-sky-600 underline dark:text-sky-400">
              download here
            </a>
            )
          </li>
          <li>
            <strong>Docker Desktop</strong> &mdash; to run all the services (
            <a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noopener noreferrer" className="text-sky-600 underline dark:text-sky-400">
              download here
            </a>
            )
          </li>
          <li>
            <strong>Node.js 18+</strong> &mdash; for the frontend dev server (
            <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer" className="text-sky-600 underline dark:text-sky-400">
              download here
            </a>
            )
          </li>
        </ul>
      </>
    ),
  },
  {
    step: '2',
    title: 'Clone the repository',
    description: (
      <>
        <span className="block text-slate-700 dark:text-slate-300">
          Open a terminal and run this command to download the project:
        </span>
        <CodeBlock label="Terminal">
          {`git clone https://github.com/jaskirat-gill/OpenWebUI-Project.git\ncd OpenWebUI-Project`}
        </CodeBlock>
      </>
    ),
  },
  {
    step: '3',
    title: 'Set up environment variables',
    description: (
      <>
        <span className="block text-slate-700 dark:text-slate-300">
          Copy the example environment file and fill in your values:
        </span>
        <CodeBlock label="Terminal">{`cp .env.example .env`}</CodeBlock>
        <span className="mt-3 block text-sm text-slate-700 dark:text-slate-300">
          Open the <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">.env</code> file in a text editor and fill in:
        </span>
        <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
          <li>
            <strong>AWS credentials</strong> (if you want S3 sync &mdash; optional for initial setup)
          </li>
          <li>
            <strong>VITE_API_URL</strong> &mdash; leave as{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">
              http://localhost:8000
            </code>
          </li>
        </ul>
        <span className="mt-2 block text-xs text-slate-400">
          You can skip the AWS fields if you just want to explore the UI first. Everything else works
          without them.
        </span>
      </>
    ),
  },
  {
    step: '4',
    title: 'Start all backend services with Docker',
    description: (
      <>
        <span className="block text-slate-700 dark:text-slate-300">
          Make sure Docker Desktop is <strong>running</strong>, then start everything:
        </span>
        <CodeBlock label="Terminal">{`docker-compose up --build`}</CodeBlock>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-400/20 dark:bg-amber-400/5">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            The first build will take a while (5&ndash;15 minutes)
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400/80">
            Docker needs to download Python, Node.js, PostgreSQL, Qdrant, and Redis images, plus
            install all Python and npm dependencies. Subsequent runs will be much faster because
            Docker caches the layers.
          </p>
        </div>
        <span className="mt-3 block text-sm text-slate-600 dark:text-slate-400">
          Wait until you see log lines from all services (sync-service, query-engine, mcp-server,
          etc.). When the logs settle down and you see{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">
            Application startup complete
          </code>{' '}
          from the sync-service, the backend is ready.
        </span>
      </>
    ),
  },
  {
    step: '5',
    title: 'Start the frontend dev server',
    description: (
      <>
        <span className="block text-slate-700 dark:text-slate-300">
          Open a <strong>new terminal tab/window</strong> (keep Docker running in the first one) and run:
        </span>
        <CodeBlock label="Terminal">{`cd frontend\nnpm ci\nnpm run dev -- --host`}</CodeBlock>
        <span className="mt-2 block text-sm text-slate-600 dark:text-slate-400">
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">
            npm ci
          </code>{' '}
          installs dependencies (only needed the first time).{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">
            npm run dev
          </code>{' '}
          starts the development server.
        </span>
      </>
    ),
  },
  {
    step: '6',
    title: 'Open the app in your browser',
    description: (
      <>
        <span className="block text-slate-700 dark:text-slate-300">
          Go to{' '}
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sky-600 underline dark:text-sky-400"
          >
            http://localhost:5173
          </a>{' '}
          in your browser. You should see the login page.
        </span>
        <span className="mt-3 block text-sm text-slate-700 dark:text-slate-300">
          The database is automatically seeded with demo accounts. Log in with:
        </span>
        <div className="mt-2 space-y-2">
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                  Admin account
                </span>
                <p className="mt-0.5 font-mono text-sm text-slate-700 dark:text-slate-300">
                  admin@example.com / Admin123!
                </p>
              </div>
              <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-400/10 dark:text-sky-300">
                Full access
              </span>
            </div>
          </div>
        </div>
        <span className="mt-3 block text-sm text-slate-600 dark:text-slate-400">
          That's it! You're running InsightRAG locally. Explore the Knowledge Bases page, set up
          plugins, and try the MCP integration.
        </span>
      </>
    ),
  },
]

export default function QuickStartSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="quick-start"
      className="relative overflow-hidden bg-white py-16 dark:bg-[#060d1b] lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div className="absolute left-1/2 top-[-15%] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-500/12 via-blue-600/6 to-transparent blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl px-6">
        <Effect slide="up" blur className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-sky-300/30 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/5 dark:text-sky-300">
            Quick Start
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white sm:text-4xl">
            Run InsightRAG locally
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-400">
            Clone the repo, start Docker, and you'll have a fully working knowledge base system in
            minutes.
          </p>
        </Effect>

        {/* Timeline */}
        <div className="relative space-y-6">
          <div className="absolute left-6 top-0 hidden h-full w-px bg-slate-200 dark:bg-white/[0.08] sm:block" />

          {steps.map((item, i) => (
            <m.div
              key={item.step}
              initial={reduceMotion ? false : { opacity: 0, x: -20 }}
              whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: 0.05 + i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex gap-5"
            >
              <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-lg font-bold text-sky-600 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-400">
                {item.step}
              </div>
              <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03] dark:shadow-none">
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
