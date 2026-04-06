import { useState } from 'react'
import { m, useReducedMotion } from 'motion/react'
import { Effect } from '@/components/ui/animate'
import { ArrowUpRight, Globe, Terminal } from 'lucide-react'

const httpSteps = [
  {
    step: '1',
    title: 'Make sure the MCP server is running',
    description: (
      <>
        Before anything else, confirm that InsightRAG is running. If you used{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">
          docker-compose up
        </code>
        , the MCP server starts automatically on port <strong>8002</strong>. You can verify by
        opening this URL in your browser:
        <span className="mt-2 block rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 font-mono text-sm text-sky-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-sky-300">
          http://localhost:8002/mcp
        </span>
        <span className="mt-1 block text-xs text-slate-400">
          If you see a response (even an error JSON), the server is running. If the page won't load,
          make sure Docker is running and the containers are up.
        </span>
      </>
    ),
  },
  {
    step: '2',
    title: 'Copy your Access Token from InsightRAG',
    description: (
      <>
        <span className="block">
          You need an access token so the MCP client knows who you are. Here's exactly how to get it:
        </span>
        <ol className="mt-2 list-inside list-decimal space-y-1.5 text-slate-700 dark:text-slate-300">
          <li>
            Log in to your InsightRAG workspace at{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">
              http://localhost:5173
            </code>
          </li>
          <li>
            Click the <strong>gear icon</strong> in the sidebar to open <strong>Settings</strong>
          </li>
          <li>
            You should already be on the <strong>General</strong> tab (it's the default)
          </li>
          <li>
            Scroll down to the <strong>"Session Tokens"</strong> section
          </li>
          <li>
            Find the <strong>"Access Token"</strong> box — it contains a long string starting with{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">
              eyJhb...
            </code>
          </li>
          <li>
            Click the <strong>"Copy"</strong> button next to it. The token is now in your clipboard.
          </li>
        </ol>
        <span className="mt-3 block rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/5 dark:text-amber-300">
          Important: This is your personal token. Do not share it. It controls which knowledge bases
          you can access through the MCP tools.
        </span>
      </>
    ),
  },
  {
    step: '3',
    title: 'Open OpenWebUI and add a new External Tool',
    description: (
      <>
        <ol className="list-inside list-decimal space-y-1.5 text-slate-700 dark:text-slate-300">
          <li>
            Open OpenWebUI in your browser (usually{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">
              http://localhost:3000
            </code>
            )
          </li>
          <li>
            Click on your <strong>profile icon</strong> (bottom-left corner)
          </li>
          <li>
            Go to{' '}
            <strong>Settings &rarr; Admin Settings &rarr; External Tools</strong>
          </li>
          <li>
            Click the <strong>+ (plus)</strong> button to add a new tool connection
          </li>
        </ol>
      </>
    ),
  },
  {
    step: '4',
    title: 'Configure the MCP connection',
    description: (
      <>
        <span className="block">Fill in these fields in the form that appears:</span>
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
              Type
            </span>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
              Change from the default <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">OpenAPI</code> to{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-bold text-sky-700 dark:bg-white/[0.06] dark:text-sky-300">MCP</code>{' '}
              (click the dropdown and select MCP)
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
              URL
            </span>
            <p className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm text-sky-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-sky-300">
              http://host.docker.internal:8002/mcp
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Use <code className="font-mono">host.docker.internal</code> if OpenWebUI runs in Docker.
              Use <code className="font-mono">localhost</code> if it runs directly on your machine.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
              Auth Header / Bearer Token
            </span>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
              Paste the Access Token you copied in Step 2. If OpenWebUI asks for a header format, enter:
            </p>
            <p className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm text-sky-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-sky-300">
              Bearer &lt;paste-your-token-here&gt;
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
              ID &amp; Name
            </span>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
              Enter any name you like, e.g. <strong>"InsightRAG"</strong> and ID <strong>"insightrag"</strong>.
              These are just labels for your reference.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    step: '5',
    title: 'Test the connection and save',
    description: (
      <>
        <ol className="list-inside list-decimal space-y-1.5 text-slate-700 dark:text-slate-300">
          <li>
            Click <strong>"Check Connection"</strong> or the verify button. You should see a success message.
          </li>
          <li>
            If it fails, double-check: Is Docker running? Is the URL correct? Did you paste the full token?
          </li>
          <li>
            Click <strong>"Save"</strong> to finish.
          </li>
        </ol>
        <span className="mt-3 block text-sm text-slate-600 dark:text-slate-400">
          That's it! The MCP tools (<strong>search_knowledge_base</strong>,{' '}
          <strong>get_available_collections</strong>, <strong>list_kb_resources</strong>) are now
          available in your OpenWebUI chat sessions. Start a new chat and the AI can search your
          knowledge bases automatically.
        </span>
      </>
    ),
  },
]

const stdioSteps = [
  {
    step: '1',
    title: 'Prerequisites',
    description: (
      <>
        <span className="block">
          STDIO mode is for <strong>local development only</strong> — it runs the MCP server as a
          local command and communicates over stdin/stdout. Use the provided shell wrapper instead
          of launching the Python server manually.
        </span>
        <span className="mt-2 block">Make sure you have:</span>
        <ul className="mt-1 list-inside list-disc space-y-1 text-slate-700 dark:text-slate-300">
          <li>Docker running on your machine</li>
          <li>PostgreSQL and Qdrant accessible from Docker</li>
        </ul>
      </>
    ),
  },
  {
    step: '2',
    title: 'Use the helper script as the command',
    description: (
      <>
        <span className="block">
          The repository already includes a wrapper script that starts the MCP server in STDIO mode:
        </span>
        <span className="mt-2 block rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 font-mono text-sm text-sky-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-sky-300">
          &lt;your-project-root&gt;/scripts/run_mcp_stdio.sh
        </span>
        <span className="mt-2 block text-xs text-slate-400">
          Do not prefix it with <code className="font-mono">bash</code> in the MCP client config.
          Point the client directly at the script path so it can execute the wrapper as-is. For
          example: <code className="font-mono">InsightRAG/scripts/run_mcp_stdio.sh</code>
        </span>
      </>
    ),
  },
  {
    step: '3',
    title: 'What the script does',
    description: (
      <>
        <span className="block">
          The wrapper launches the MCP container with STDIO transport already enabled and keeps
          stdout protocol-clean for MCP clients.
        </span>
        <span className="mt-2 block text-xs text-slate-400">
          It also passes through <code className="font-mono">QDRANT_URL</code> and{' '}
          <code className="font-mono">DATABASE_URL</code> defaults, so the client only needs to run
          the script.
        </span>
      </>
    ),
  },
  {
    step: '4',
    title: 'Connect your MCP client',
    description: (
      <>
        <span className="block">
          Point your MCP client (e.g. Claude Desktop) to the server command. In your MCP client
          config, add a server entry like:
        </span>
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 font-mono text-xs leading-relaxed text-sky-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-sky-300">
          <div>{'{'}</div>
          <div className="ml-4">"command": "&lt;your-project-root&gt;/scripts/run_mcp_stdio.sh"</div>
          <div>{'}'}</div>
        </div>
        <span className="mt-2 block text-xs text-slate-400">
          If your MCP client supports arguments, leave them empty. The wrapper script already
          contains the startup command.
        </span>
      </>
    ),
  },
]

const externalLinks = [
  {
    label: 'OpenWebUI Quick Start',
    href: 'https://docs.openwebui.com/getting-started/quick-start',
  },
  {
    label: 'OpenWebUI Features',
    href: 'https://docs.openwebui.com/features',
  },
]

function StepTimeline({
  steps,
}: {
  steps: { step: string; title: string; description: React.ReactNode }[]
}) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative space-y-6">
      <div className="absolute left-6 top-0 hidden h-full w-px bg-slate-200 dark:bg-white/[0.08] sm:block" />
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
          <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/[0.06] dark:bg-white/[0.03]">
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
  )
}

export default function MCPSetupSection() {
  const [activeTab, setActiveTab] = useState<'http' | 'stdio'>('http')

  return (
    <section
      id="mcp-setup"
      className="relative overflow-hidden bg-white py-16 dark:bg-[#060d1b] lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div className="absolute right-[-8%] top-[10%] h-[400px] w-[400px] rounded-full bg-gradient-to-l from-cyan-400/10 via-teal-500/5 to-transparent blur-[100px]" />
      </div>

      <div className="mx-auto max-w-3xl px-6">
        <Effect slide="up" blur className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-sky-300/30 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/5 dark:text-sky-300">
            MCP Setup
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white sm:text-4xl">
            Connect the MCP Server
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-400">
            Choose your connection method below. <strong>HTTP</strong> is recommended for most users.
            <strong> STDIO</strong> is for local development without a network.
          </p>
        </Effect>

        {/* Tab switcher */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/[0.08] dark:bg-white/[0.04]">
            <button
              onClick={() => setActiveTab('http')}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
                activeTab === 'http'
                  ? 'bg-white text-sky-700 shadow-sm dark:bg-sky-400/10 dark:text-sky-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-white/40 dark:hover:text-white/70'
              }`}
            >
              <Globe className="h-4 w-4" />
              HTTP (Recommended)
            </button>
            <button
              onClick={() => setActiveTab('stdio')}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
                activeTab === 'stdio'
                  ? 'bg-white text-sky-700 shadow-sm dark:bg-sky-400/10 dark:text-sky-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-white/40 dark:hover:text-white/70'
              }`}
            >
              <Terminal className="h-4 w-4" />
              STDIO (Local Dev)
            </button>
          </div>
        </div>

        {/* Steps */}
        {activeTab === 'http' ? (
          <StepTimeline steps={httpSteps} />
        ) : (
          <StepTimeline steps={stdioSteps} />
        )}

        {/* External links */}
        <Effect slide="up" blur className="mt-12">
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
